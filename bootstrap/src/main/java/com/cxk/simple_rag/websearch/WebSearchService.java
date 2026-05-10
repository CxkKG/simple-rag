package com.cxk.simple_rag.websearch;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 联网搜索服务
 *
 * <p>基于 Spring AI MCP（Model Context Protocol）调用支持 Web Search 的 MCP Server
 * （如 Brave Search、Tavily）。MCP Client 自动配置后会暴露一组 {@link ToolCallback}，
 * 这里按工具名关键字挑选第一个匹配的"搜索"工具进行调用。</p>
 *
 * <p>{@link ToolCallback} 通过 {@link ObjectProvider} 懒加载，避免本服务比
 * MCP Client 自动配置更早实例化时拿到空列表；同时当 MCP 未配置/调用失败时会
 * 优雅降级返回空结果，保证主流程不受影响。</p>
 *
 * @author wangxin
 */
@Slf4j
@Service
@EnableConfigurationProperties(WebSearchProperties.class)
public class WebSearchService {

    private final WebSearchProperties properties;
    private final ObjectProvider<ToolCallbackProvider> toolCallbackProviders;

    public WebSearchService(WebSearchProperties properties,
                            ObjectProvider<ToolCallbackProvider> toolCallbackProviders) {
        this.properties = properties;
        this.toolCallbackProviders = toolCallbackProviders;
        log.info("WebSearchService initialized (tool callbacks will be resolved lazily on first search)");
    }

    /**
     * 联网搜索
     *
     * @param query 用户查询
     * @return 搜索结果列表（失败/未配置时返回空集合）
     */
    public List<WebSearchResult> search(String query) {
        if (!properties.isEnabled()) {
            log.debug("Web search is disabled by configuration");
            return Collections.emptyList();
        }

        List<ToolCallback> toolCallbacks = resolveToolCallbacks();
        if (toolCallbacks.isEmpty()) {
            log.warn("No MCP ToolCallback available, web search returns empty");
            return Collections.emptyList();
        }

        ToolCallback target = pickSearchTool(toolCallbacks);
        if (target == null) {
            log.warn("No MCP search tool matched among {} callbacks: {}",
                    toolCallbacks.size(),
                    toolCallbacks.stream().map(c -> c.getToolDefinition().name()).toList());
            return Collections.emptyList();
        }

        String toolName = target.getToolDefinition().name();
        try {
            Map<String, Object> args = new LinkedHashMap<>();
            args.put("query", query);
            // 不同 MCP Server 用的入参名不同：Tavily=max_results、Brave=count，
            // JSON Schema 默认允许 additionalProperties，所以两个一起带上更稳。
            args.put("max_results", properties.getTopK());
            args.put("count", properties.getTopK());

            String requestJson = JSONUtil.toJsonStr(args);
            log.info("Invoking MCP search tool: name={}, args={}", toolName, requestJson);

            String responseJson = target.call(requestJson);
            log.debug("MCP search tool response: name={}, response={}", toolName, responseJson);

            return parseResults(responseJson);
        } catch (Exception e) {
            log.error("Web search failed via MCP tool {}: {}", toolName, e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private List<ToolCallback> resolveToolCallbacks() {
        List<ToolCallback> all = new ArrayList<>();
        toolCallbackProviders.orderedStream().forEach(provider -> {
            ToolCallback[] callbacks = provider.getToolCallbacks();
            if (callbacks != null && callbacks.length > 0) {
                all.addAll(Arrays.asList(callbacks));
            }
        });
        return all;
    }

    private ToolCallback pickSearchTool(List<ToolCallback> toolCallbacks) {
        for (String keyword : properties.getToolNameKeywords()) {
            for (ToolCallback cb : toolCallbacks) {
                String name = cb.getToolDefinition().name();
                if (name != null && name.toLowerCase().contains(keyword.toLowerCase())) {
                    return cb;
                }
            }
        }
        return null;
    }

    /**
     * 解析 MCP 工具返回的 JSON。不同 MCP Server 返回结构差异较大，
     * 这里做尽量宽松的兼容：优先按 results / web.results / 顶层数组等几种常见形态解析；
     * Tavily 等 MCP 把搜索结果放在 content[0].text 的纯文本里，需要再做一次文本解析。
     */
    private List<WebSearchResult> parseResults(String responseJson) {
        if (responseJson == null || responseJson.isBlank()) {
            return Collections.emptyList();
        }
        List<WebSearchResult> results = new ArrayList<>();
        try {
            Object parsed = JSONUtil.parse(responseJson);
            JSONArray candidates = locateResultsArray(parsed);
            if (candidates != null) {
                // Spring AI MCP 1.0 在某些情况下会把 CallToolResult 直接序列化为顶层
                // JSONArray（[{"type":"text","text":"..."}]），此时数组装的是 MCP 协议
                // 的 content item，不是搜索结果对象。需要先把 text 拼接起来再交给
                // parsePlainTextBlocks，否则会被当成一条搜索结果（title/url 永远为空）。
                if (isMcpContentItemArray(candidates)) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < candidates.size(); i++) {
                        JSONObject fo = (JSONObject) candidates.get(i);
                        String text = fo.getStr("text");
                        if (text != null && !text.isBlank()) {
                            if (sb.length() > 0) sb.append("\n\n");
                            sb.append(text);
                        }
                    }
                    List<WebSearchResult> textResults = parsePlainTextBlocks(sb.toString());
                    if (!textResults.isEmpty()) {
                        return textResults;
                    }
                } else {
                    for (int i = 0; i < candidates.size(); i++) {
                        Object item = candidates.get(i);
                        if (item instanceof JSONObject jo) {
                            String title = firstNonBlank(jo.getStr("title"), jo.getStr("name"));
                            String url = firstNonBlank(jo.getStr("url"), jo.getStr("link"));
                            String snippet = firstNonBlank(
                                    jo.getStr("snippet"),
                                    jo.getStr("description"),
                                    jo.getStr("content"),
                                    jo.getStr("text")
                            );
                            if (snippet == null) {
                                snippet = jo.toString();
                            }
                            results.add(new WebSearchResult(
                                    title != null ? title : "",
                                    url != null ? url : "",
                                    snippet));
                        } else if (item != null) {
                            results.add(new WebSearchResult("", "", item.toString()));
                        }
                    }
                    if (!results.isEmpty()) {
                        return results;
                    }
                }
            }

            // MCP CallToolResult 形态：{ "content": [ { "type":"text", "text":"..." } ] }
            // Tavily 把 "Title: ...\nURL: ...\nContent: ..." 这样的纯文本塞在 text 里。
            String mcpText = extractMcpText(parsed);
            if (mcpText != null && !mcpText.isBlank()) {
                List<WebSearchResult> textResults = parsePlainTextBlocks(mcpText);
                if (!textResults.isEmpty()) {
                    return textResults;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse MCP search response, fallback to plain-text scan: {}", e.getMessage());
        }

        // 兜底：直接按 Tavily 文本格式扫一遍原始 responseJson，
        // 至少能把 URL / Title 提出来，供前端渲染可点击链接。
        List<WebSearchResult> textResults = parsePlainTextBlocks(responseJson);
        if (!textResults.isEmpty()) {
            return textResults;
        }
        log.warn("MCP search response did not match any known structure, falling back to single raw item. response={}",
                responseJson);
        results.add(new WebSearchResult("", "", responseJson));
        return results;
    }

    private JSONArray locateResultsArray(Object parsed) {
        if (parsed instanceof JSONArray arr) {
            return arr;
        }
        if (!(parsed instanceof JSONObject obj)) {
            return null;
        }
        for (String key : new String[]{"results", "items", "data"}) {
            Object v = obj.get(key);
            if (v instanceof JSONArray arr) {
                return arr;
            }
        }
        Object web = obj.get("web");
        if (web instanceof JSONObject webObj) {
            Object inner = webObj.get("results");
            if (inner instanceof JSONArray arr) {
                return arr;
            }
        }
        // MCP CallToolResult 形态：{ "content": [ { "type": "text", "text": "..." } ] }
        Object content = obj.get("content");
        if (content instanceof JSONArray arr && !arr.isEmpty()) {
            Object first = arr.get(0);
            if (first instanceof JSONObject fo) {
                String text = fo.getStr("text");
                if (text != null && !text.isBlank()) {
                    try {
                        Object inner = JSONUtil.parse(text);
                        return locateResultsArray(inner);
                    } catch (Exception ignored) {
                    }
                }
            }
        }
        return null;
    }

    /**
     * 判断 JSONArray 是否是 MCP CallToolResult 的 content 数组
     * （[{"type":"text","text":"..."}, ...]）。Spring AI MCP 1.0 在某些情况下
     * 会把整个 CallToolResult 直接序列化为顶层 JSONArray，需要先识别出来再
     * 把 text 拼接后交给 parsePlainTextBlocks，否则会被误当成搜索结果对象。
     */
    private static boolean isMcpContentItemArray(JSONArray arr) {
        if (arr == null || arr.isEmpty()) {
            return false;
        }
        for (int i = 0; i < arr.size(); i++) {
            Object o = arr.get(i);
            if (!(o instanceof JSONObject jo)) {
                return false;
            }
            if (!"text".equals(jo.getStr("type"))) {
                return false;
            }
            if (jo.getStr("text") == null) {
                return false;
            }
        }
        return true;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }

    /**
     * 从 MCP CallToolResult（{"content":[{"type":"text","text":"..."}]}）中抽取
     * 第一段文本。无文本时返回 null。
     */
    private static String extractMcpText(Object parsed) {
        if (!(parsed instanceof JSONObject obj)) {
            return null;
        }
        Object content = obj.get("content");
        if (!(content instanceof JSONArray arr) || arr.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.size(); i++) {
            Object item = arr.get(i);
            if (item instanceof JSONObject fo) {
                String text = fo.getStr("text");
                if (text != null && !text.isBlank()) {
                    if (sb.length() > 0) sb.append("\n\n");
                    sb.append(text);
                }
            }
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    /**
     * Tavily / Brave 等 MCP 常返回 "Title: ...\nURL: ...\nContent: ..." 这种纯文本块；
     * 实际还会夹杂 Score: / Published Date: / Raw Content: 等行，且字段顺序未必严格，
     * 因此用按行分块的方式做容错解析，每遇到一行 "Title:" 就开新块，块内逐字段抽取。
     */
    private static final Pattern URL_FALLBACK = Pattern.compile("https?://\\S+");

    private static List<WebSearchResult> parsePlainTextBlocks(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        List<WebSearchResult> out = new ArrayList<>();

        String[] lines = text.split("\\R");
        List<List<String>> blocks = new ArrayList<>();
        List<String> current = null;
        for (String raw : lines) {
            String line = raw.trim();
            if (startsWithIgnoreCase(line, "Title:") || startsWithIgnoreCase(line, "Name:")) {
                if (current != null && !current.isEmpty()) {
                    blocks.add(current);
                }
                current = new ArrayList<>();
                current.add(line);
            } else if (current != null) {
                current.add(line);
            }
        }
        if (current != null && !current.isEmpty()) {
            blocks.add(current);
        }

        for (List<String> block : blocks) {
            String title = "";
            String url = "";
            StringBuilder snippetBuf = new StringBuilder();
            boolean inContent = false;
            for (String line : block) {
                String value;
                if ((value = stripPrefix(line, "Title:")) != null
                        || (value = stripPrefix(line, "Name:")) != null) {
                    title = value;
                    inContent = false;
                } else if ((value = stripPrefix(line, "URL:")) != null
                        || (value = stripPrefix(line, "Link:")) != null) {
                    url = trimTrailingPunct(value);
                    inContent = false;
                } else if ((value = stripPrefix(line, "Content:")) != null
                        || (value = stripPrefix(line, "Snippet:")) != null
                        || (value = stripPrefix(line, "Description:")) != null) {
                    if (!value.isEmpty()) {
                        snippetBuf.append(value);
                    }
                    inContent = true;
                } else if (startsWithIgnoreCase(line, "Score:")
                        || startsWithIgnoreCase(line, "Published Date:")
                        || startsWithIgnoreCase(line, "Raw Content:")
                        || startsWithIgnoreCase(line, "Source:")) {
                    // 元数据行不参与 snippet 拼接，但也不应中断后续 Content 的延续
                    inContent = false;
                } else if (inContent && !line.isEmpty()) {
                    if (snippetBuf.length() > 0) {
                        snippetBuf.append(' ');
                    }
                    snippetBuf.append(line);
                }
            }
            String snippet = snippetBuf.toString().trim();
            if (!url.isBlank()) {
                out.add(new WebSearchResult(title, url, snippet));
            }
        }

        if (!out.isEmpty()) {
            return out;
        }

        // 二级兜底：扫描所有 http(s) URL，每个 URL 自成一条
        Matcher um = URL_FALLBACK.matcher(text);
        while (um.find()) {
            String url = trimTrailingPunct(um.group());
            if (url.isBlank()) continue;
            String title = url;
            try {
                java.net.URI u = java.net.URI.create(url);
                if (u.getHost() != null) title = u.getHost();
            } catch (Exception ignored) {
            }
            out.add(new WebSearchResult(title, url, ""));
        }
        return out;
    }

    private static boolean startsWithIgnoreCase(String s, String prefix) {
        return s != null && s.length() >= prefix.length()
                && s.regionMatches(true, 0, prefix, 0, prefix.length());
    }

    /** 若 line 以 prefix（忽略大小写）开头则返回去掉前缀并 trim 的剩余部分，否则 null。 */
    private static String stripPrefix(String line, String prefix) {
        if (!startsWithIgnoreCase(line, prefix)) return null;
        return line.substring(prefix.length()).trim();
    }

    private static String trimTrailingPunct(String s) {
        if (s == null || s.isEmpty()) return s;
        int end = s.length();
        while (end > 0 && ",.;)\"'".indexOf(s.charAt(end - 1)) >= 0) {
            end--;
        }
        return s.substring(0, end);
    }

    /**
     * 联网搜索结果
     */
    @Data
    public static class WebSearchResult {
        private final String title;
        private final String url;
        private final String snippet;
    }
}
