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
     * 这里做尽量宽松的兼容：优先按 results / web.results / 顶层数组等几种常见形态解析。
     */
    private List<WebSearchResult> parseResults(String responseJson) {
        if (responseJson == null || responseJson.isBlank()) {
            return Collections.emptyList();
        }
        List<WebSearchResult> results = new ArrayList<>();
        try {
            Object parsed = JSONUtil.parse(responseJson);
            JSONArray candidates = locateResultsArray(parsed);
            if (candidates == null) {
                results.add(new WebSearchResult("", "", responseJson));
                return results;
            }
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
        } catch (Exception e) {
            log.warn("Failed to parse MCP search response, fallback to raw text: {}", e.getMessage());
            results.add(new WebSearchResult("", "", responseJson));
        }
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

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
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
