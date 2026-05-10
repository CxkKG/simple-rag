package com.cxk.simple_rag.rag;

import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.conversation.entity.MessageDO;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeDocumentMapper;
import com.cxk.simple_rag.llm.LLMService;
import com.cxk.simple_rag.vector.VectorSearchService;
import com.cxk.simple_rag.websearch.WebSearchProperties;
import com.cxk.simple_rag.websearch.WebSearchService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RAG 智能问答服务
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    public static final String SOURCE_TYPE_KNOWLEDGE_BASE = "KNOWLEDGE_BASE";
    public static final String SOURCE_TYPE_WEB_SEARCH = "WEB_SEARCH";

    public static final String EMPTY_KB_HINT =
            "知识库中未找到相关内容，请开启联网搜索后重试。";

    /** 多轮对话滑动窗口：最多保留近 N 轮（一轮 = 一条 user + 一条 assistant）。 */
    private static final int HISTORY_MAX_TURNS = 6;
    /** 历史消息总字符上限（粗略近似 token 预算，避免拼接后超模型上下文）。 */
    private static final int HISTORY_CHAR_BUDGET = 6000;

    private final VectorSearchService vectorSearchService;
    private final ConversationService conversationService;
    private final LLMService llmService;
    private final WebSearchService webSearchService;
    private final WebSearchProperties webSearchProperties;
    private final KnowledgeDocumentMapper knowledgeDocumentMapper;
    private final ObjectMapper objectMapper;

    // 简单的会话存储（生产环境建议使用 Redis）
    private final Map<String, Conversation> conversations = new ConcurrentHashMap<>();

    /**
     * 创建会话
     */
    public String createConversation(String kbId, String userId) {
        String conversationId = conversationService.createConversation(kbId, userId);
        log.info("Conversation created: conversationId={}, kbId={}, userId={}", conversationId, kbId, userId);
        return conversationId;
    }

    /**
     * 智能问答（默认不开启联网搜索）
     */
    public String chat(String conversationId, String question, int topK, String userId) {
        return chat(conversationId, question, topK, userId, false);
    }

    /**
     * 智能问答
     *
     * @param webSearch 是否开启联网搜索（兜底降级）
     */
    public String chat(String conversationId, String question, int topK, String userId, boolean webSearch) {
        var conversationDO = conversationService.getConversation(conversationId, userId);
        if (conversationDO == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        RetrievalResult retrieval = prepareRetrievalContext(
                conversationDO.getKbId(), question, topK, webSearch);

        String answer;
        if (retrieval.isFallbackHint()) {
            // 知识库无命中且未开启联网搜索 → 直接返回提示
            answer = retrieval.getDirectAnswer();
        } else {
            String systemPrompt = buildSystemPrompt(retrieval.isUsedWebSearch());
            // 带历史滑窗的多轮调用，支持跨轮上下文记忆
            List<LLMService.Message> messages = buildChatMessages(
                    conversationId, systemPrompt, retrieval.getPromptContext());
            answer = llmService.generate(messages);
        }

        // 根据回答里的 [N] 角标过滤实际被引用的来源（保持下标顺序，仅打标）
        markCitedSources(answer, retrieval.getSources());

        conversationService.addMessage(conversationId, "user", question, null);
        conversationService.addMessage(conversationId, "assistant", answer, serializeSources(retrieval.getSources()));

        log.info("Chat completed: conversationId={}, question={}, webSearch={}, usedWebSearch={}, answerLength={}",
                conversationId, question, webSearch, retrieval.isUsedWebSearch(), answer.length());
        return answer;
    }

    /**
     * 检索并构造上下文。先走知识库向量检索，命中不足时按 webSearch 开关决定是否走联网兜底。
     *
     * @param kbId 知识库 ID
     * @param question 用户问题
     * @param topK 知识库检索 topK
     * @param webSearch 前端联网搜索开关
     * @return 检索结果（包含可直接使用的提示词上下文 / 引用来源 / 兜底文案）
     */
    public RetrievalResult prepareRetrievalContext(String kbId, String question, int topK, boolean webSearch) {
        RetrievalResult result = new RetrievalResult();

        // 1. 知识库向量检索（保持原有逻辑不变）
        List<VectorSearchService.SearchResult> kbResults;
        try {
            kbResults = vectorSearchService.search(kbId, question, topK);
        } catch (Exception e) {
            log.error("Knowledge base search failed: kbId={}, question={}", kbId, question, e);
            kbResults = Collections.emptyList();
        }

        boolean kbHit = isKnowledgeBaseHit(kbResults);
        if (kbHit) {
            List<VectorSearchService.SearchResult> dedupedKb = dedupKbByDocId(kbResults);
            result.setUsedWebSearch(false);
            result.setSources(extractContextSources(dedupedKb));
            result.setPromptContext(buildKbContext(dedupedKb, question));
            return result;
        }

        // 2. 知识库未命中（空或低分） → 兜底
        log.info("Knowledge base miss: kbId={}, question={}, results={}, threshold={}",
                kbId, question, kbResults.size(), webSearchProperties.getScoreThreshold());

        if (!webSearch || !webSearchProperties.isEnabled()) {
            result.setUsedWebSearch(false);
            result.setFallbackHint(true);
            result.setDirectAnswer(EMPTY_KB_HINT);
            result.setSources(Collections.emptyList());
            return result;
        }

        // 3. 联网搜索兜底
        List<WebSearchService.WebSearchResult> webResults = webSearchService.search(question);
        log.info("Web search returned: question={}, rawCount={}", question,
                webResults == null ? 0 : webResults.size());
        if (webResults.isEmpty()) {
            // 联网搜索调用失败 / 无配置 → 不影响主流程，给出明确提示
            result.setUsedWebSearch(false);
            result.setFallbackHint(true);
            result.setDirectAnswer("知识库与联网搜索均未返回有效结果，请稍后重试或调整提问。");
            result.setSources(Collections.emptyList());
            return result;
        }

        result.setUsedWebSearch(true);
        List<WebSearchService.WebSearchResult> dedupedWeb = dedupWebByUrl(webResults);
        List<ContextSource> webSources = extractWebSources(dedupedWeb);
        log.info("Web search dedup result: rawCount={}, dedupedCount={}, sourcesCount={}, firstUrl={}",
                webResults.size(), dedupedWeb.size(), webSources.size(),
                webSources.isEmpty() ? "<empty>" : webSources.get(0).getUrl());
        result.setSources(webSources);
        result.setPromptContext(buildWebContext(dedupedWeb, question));
        return result;
    }

    /**
     * 判定知识库是否"命中" —— 命中要求：结果非空且 top1 分数 >= 阈值。
     */
    private boolean isKnowledgeBaseHit(List<VectorSearchService.SearchResult> results) {
        if (results == null || results.isEmpty()) {
            return false;
        }
        float topScore = results.get(0).getScore();
        return topScore >= webSearchProperties.getScoreThreshold();
    }

    /**
     * 按 docId 聚合知识库检索片段：同一文档只保留最高分的那一片，
     * 既避免引用列表冗余，又让 LLM 看到的 [N] 编号与 sources 严格对齐。
     */
    private List<VectorSearchService.SearchResult> dedupKbByDocId(List<VectorSearchService.SearchResult> results) {
        if (results == null || results.isEmpty()) {
            return Collections.emptyList();
        }
        Map<String, VectorSearchService.SearchResult> kept = new LinkedHashMap<>();
        for (VectorSearchService.SearchResult r : results) {
            if (r == null) continue;
            String key;
            if (r.getDocId() != null && !r.getDocId().isBlank()) {
                key = "doc:" + r.getDocId();
            } else if (r.getChunkId() != null && !r.getChunkId().isBlank()) {
                key = "chunk:" + r.getChunkId();
            } else {
                // 没有任何稳定标识时不参与合并，保留原条目
                key = "raw:" + System.identityHashCode(r);
            }
            VectorSearchService.SearchResult prev = kept.get(key);
            if (prev == null || r.getScore() > prev.getScore()) {
                kept.put(key, r);
            }
        }
        return new ArrayList<>(kept.values());
    }

    /**
     * 按 URL 聚合联网搜索结果：同一 URL 只保留首次命中的那条。
     */
    private List<WebSearchService.WebSearchResult> dedupWebByUrl(List<WebSearchService.WebSearchResult> results) {
        if (results == null || results.isEmpty()) {
            return Collections.emptyList();
        }
        Map<String, WebSearchService.WebSearchResult> kept = new LinkedHashMap<>();
        for (WebSearchService.WebSearchResult r : results) {
            if (r == null) continue;
            String key;
            if (r.getUrl() != null && !r.getUrl().isBlank()) {
                key = "url:" + r.getUrl();
            } else if (r.getTitle() != null && !r.getTitle().isBlank()) {
                key = "title:" + r.getTitle();
            } else {
                key = "raw:" + System.identityHashCode(r);
            }
            kept.putIfAbsent(key, r);
        }
        return new ArrayList<>(kept.values());
    }

    private String buildKbContext(List<VectorSearchService.SearchResult> results, String question) {
        StringBuilder sb = new StringBuilder("基于以下已知信息：\n\n");
        for (int i = 0; i < results.size(); i++) {
            sb.append("[").append(i + 1).append("] ")
                    .append(results.get(i).getContent())
                    .append("\n\n");
        }
        sb.append("请根据以上信息回答用户的问题：").append(question);
        return sb.toString();
    }

    private String buildWebContext(List<WebSearchService.WebSearchResult> results, String question) {
        StringBuilder sb = new StringBuilder("以下是来自联网搜索的实时信息：\n\n");
        for (int i = 0; i < results.size(); i++) {
            WebSearchService.WebSearchResult r = results.get(i);
            sb.append("[").append(i + 1).append("] ");
            if (r.getTitle() != null && !r.getTitle().isBlank()) {
                sb.append(r.getTitle()).append("\n");
            }
            if (r.getUrl() != null && !r.getUrl().isBlank()) {
                sb.append("来源：").append(r.getUrl()).append("\n");
            }
            sb.append(r.getSnippet()).append("\n\n");
        }
        sb.append("请根据以上联网信息回答用户的问题，并在引用时标注对应编号 [1]、[2] 等：")
                .append(question);
        return sb.toString();
    }

    private String buildSystemPrompt(boolean usedWebSearch) {
        if (usedWebSearch) {
            return "你是一个智能助手。当前知识库未命中相关内容，以下信息来自联网搜索结果。" +
                    "请基于这些联网信息客观、简洁地回答用户的问题，并在引用时标注对应的编号 [1]、[2] 等。" +
                    "注明信息来源于联网搜索，提醒用户内容时效与准确性可能存在差异。";
        }
        return "你是一个智能助手，能够根据提供的知识库内容回答用户的问题。" +
                "请仔细阅读提供的信息，用简洁明了的语言回答问题。" +
                "如果提供的信息不足以回答问题，请如实告知用户。" +
                "回答中引用的信息请标注对应的编号 [1]、[2] 等。";
    }

    /**
     * 暴露给 Controller 流式调用，复用提示词构造逻辑。
     */
    public String systemPromptFor(boolean usedWebSearch) {
        return buildSystemPrompt(usedWebSearch);
    }

    /**
     * 构造送入 LLM 的多轮消息列表：[system, ...history(滑窗), user(当前轮 RAG 上下文)]。
     * <p>历史只取已落库的会话消息（当前轮 user/assistant 在 LLM 调用之后才写库），
     * 角色限定为 user/assistant，并按 {@link #HISTORY_MAX_TURNS} 与
     * {@link #HISTORY_CHAR_BUDGET} 双重裁剪，避免超 token。</p>
     *
     * @param conversationId      会话 ID（null/空时不带历史，等价于单轮）
     * @param systemPrompt        本轮 system prompt（与是否联网相关，按当前轮取值）
     * @param currentUserContent  本轮 user 消息内容（已包含 RAG 上下文 / 联网搜索片段）
     */
    public List<LLMService.Message> buildChatMessages(
            String conversationId, String systemPrompt, String currentUserContent) {
        List<LLMService.Message> messages = new ArrayList<>();
        messages.add(new LLMService.Message("system", systemPrompt));
        messages.addAll(loadHistoryWindow(conversationId));
        messages.add(new LLMService.Message("user", currentUserContent));
        return messages;
    }

    /**
     * 加载会话历史的滑动窗口部分，已按时间正序返回 List&lt;LLMService.Message&gt;。
     * 裁剪规则：从最新一条往前累计，不超过 maxTurns*2 条且总字符不超过 charBudget；
     * 截取后若首条为 assistant（孤儿），逐条丢弃直到首条为 user。
     */
    private List<LLMService.Message> loadHistoryWindow(String conversationId) {
        if (conversationId == null || conversationId.isBlank()) {
            return Collections.emptyList();
        }
        List<MessageDO> raw;
        try {
            raw = conversationService.getMessages(conversationId);
        } catch (Exception e) {
            log.warn("Failed to load history for sliding window: conversationId={}, fallback to empty", conversationId, e);
            return Collections.emptyList();
        }
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyList();
        }

        List<MessageDO> filtered = new ArrayList<>();
        for (MessageDO m : raw) {
            if (m == null || m.getContent() == null || m.getContent().isBlank()) continue;
            if ("user".equals(m.getRole()) || "assistant".equals(m.getRole())) {
                filtered.add(m);
            }
        }
        if (filtered.isEmpty()) {
            return Collections.emptyList();
        }

        // 从尾部往前累计，直到触达条数或字符预算
        int maxMessages = HISTORY_MAX_TURNS * 2;
        int charsUsed = 0;
        int startIdx = filtered.size();
        for (int i = filtered.size() - 1; i >= 0 && (filtered.size() - i) <= maxMessages; i--) {
            int len = filtered.get(i).getContent().length();
            if (charsUsed + len > HISTORY_CHAR_BUDGET) {
                break;
            }
            charsUsed += len;
            startIdx = i;
        }

        // 跳过首部的孤儿 assistant，保证历史以 user 开头
        while (startIdx < filtered.size() && !"user".equals(filtered.get(startIdx).getRole())) {
            startIdx++;
        }
        if (startIdx >= filtered.size()) {
            return Collections.emptyList();
        }

        List<LLMService.Message> window = new ArrayList<>(filtered.size() - startIdx);
        for (int i = startIdx; i < filtered.size(); i++) {
            MessageDO m = filtered.get(i);
            window.add(new LLMService.Message(m.getRole(), m.getContent()));
        }
        log.debug("History window loaded: conversationId={}, kept={}, totalChars={}, totalAvailable={}",
                conversationId, window.size(), charsUsed, filtered.size());
        return window;
    }

    /**
     * 保存消息
     */
    public void saveMessage(String conversationId, String role, String content) {
        conversationService.addMessage(conversationId, role, content, null);
    }

    /**
     * 保存助手消息并携带引用来源 JSON
     */
    public void saveAssistantMessage(String conversationId, String content, List<ContextSource> sources) {
        conversationService.addMessage(conversationId, "assistant", content, serializeSources(sources));
    }

    /**
     * 将引用来源序列化为 JSON 字符串，失败时回退为 null 不阻断主流程。
     */
    public String serializeSources(List<ContextSource> sources) {
        if (sources == null || sources.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(sources);
        } catch (Exception e) {
            log.warn("Failed to serialize context sources, fallback to null", e);
            return null;
        }
    }

    /**
     * 将 JSON 字符串反序列化为引用来源列表，失败时返回空列表不阻断主流程。
     */
    public List<ContextSource> deserializeSources(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ContextSource>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize context sources: {}", json, e);
            return Collections.emptyList();
        }
    }

    /**
     * 获取会话历史
     */
    public List<Message> getConversationHistory(String conversationId, String userId) {
        var conversationDO = conversationService.getConversation(conversationId, userId);
        if (conversationDO == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        List<Message> messages = new ArrayList<>();
        var messageDOs = conversationService.getMessages(conversationId);
        for (var messageDO : messageDOs) {
            Message message = new Message();
            message.setRole(messageDO.getRole());
            message.setContent(messageDO.getContent());
            message.setTimestamp(messageDO.getCreateTime().toInstant()
                    .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime());
            message.setContextSources(deserializeSources(messageDO.getContextSources()));
            messages.add(message);
        }
        return messages;
    }

    /**
     * 删除会话
     */
    public void deleteConversation(String conversationId, String userId) {
        conversationService.deleteConversation(conversationId, userId);
        log.info("Conversation deleted: conversationId={}", conversationId);
    }

    private List<ContextSource> extractContextSources(List<VectorSearchService.SearchResult> results) {
        List<ContextSource> sources = new ArrayList<>();
        if (results == null || results.isEmpty()) {
            return sources;
        }

        // 批量拉取文档元数据，避免 N+1 查询
        Set<String> docIds = new LinkedHashSet<>();
        for (VectorSearchService.SearchResult r : results) {
            if (r.getDocId() != null && !r.getDocId().isBlank()) {
                docIds.add(r.getDocId());
            }
        }
        Map<String, KnowledgeDocumentDO> docMap = new HashMap<>();
        if (!docIds.isEmpty()) {
            try {
                List<KnowledgeDocumentDO> docs = knowledgeDocumentMapper.selectBatchIds(docIds);
                if (docs != null) {
                    for (KnowledgeDocumentDO doc : docs) {
                        if (doc != null && doc.getId() != null) {
                            docMap.put(doc.getId(), doc);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to batch load knowledge documents for sources: docIds={}", docIds, e);
            }
        }

        for (VectorSearchService.SearchResult result : results) {
            ContextSource source = new ContextSource();
            source.setType(SOURCE_TYPE_KNOWLEDGE_BASE);
            source.setChunkId(result.getChunkId());
            source.setDocId(result.getDocId());
            source.setScore(result.getScore());
            source.setContent(result.getContent());

            KnowledgeDocumentDO doc = docMap.get(result.getDocId());
            if (doc != null) {
                source.setDocName(doc.getDocName());
                // fileUrl 存放的是 RustFS 对象键（与存储路径一致，无需二次拼接）
                source.setFileUrl(doc.getFileUrl());
                source.setFileType(doc.getFileType());
            }
            sources.add(source);
        }
        return sources;
    }

    private List<ContextSource> extractWebSources(List<WebSearchService.WebSearchResult> results) {
        List<ContextSource> sources = new ArrayList<>();
        for (WebSearchService.WebSearchResult r : results) {
            ContextSource source = new ContextSource();
            source.setType(SOURCE_TYPE_WEB_SEARCH);
            source.setTitle(r.getTitle());
            source.setUrl(r.getUrl());
            source.setContent(r.getSnippet());
            sources.add(source);
        }
        return sources;
    }

    /**
     * 解析回答文本中出现的 [N] 角标，把对应位置的 source 标记为 cited=true，
     * 其余的标记为 cited=false。前端用此标记过滤 "参考来源" 面板，
     * 但保留 sources 数组的原下标顺序，确保正文里的 [N] 仍能正确映射到 sources[N-1]。
     *
     * @param answer  LLM 完整输出
     * @param sources 与 [N] 同序的引用来源列表（下标 0 对应 [1]）
     */
    public static void markCitedSources(String answer, List<ContextSource> sources) {
        if (sources == null || sources.isEmpty()) {
            return;
        }
        Set<Integer> cited = new HashSet<>();
        if (answer != null && !answer.isBlank()) {
            Matcher m = CITATION_PATTERN.matcher(answer);
            while (m.find()) {
                try {
                    cited.add(Integer.parseInt(m.group(1)));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        for (int i = 0; i < sources.size(); i++) {
            ContextSource source = sources.get(i);
            if (source != null) {
                source.setCited(cited.contains(i + 1));
            }
        }
    }

    private static final Pattern CITATION_PATTERN = Pattern.compile("\\[(\\d+)]");

    /**
     * 检索结果（共享给 Controller 流式调用）
     */
    @Data
    public static class RetrievalResult {
        /** 拼接后的提示词上下文（送入 LLM） */
        private String promptContext;
        /** 是否走了联网搜索 */
        private boolean usedWebSearch;
        /** 是否需要直接返回提示文案而不调用 LLM */
        private boolean fallbackHint;
        /** 直接返回的提示文案（fallbackHint=true 时有效） */
        private String directAnswer;
        /** 上下文引用来源 */
        private List<ContextSource> sources = Collections.emptyList();
    }

    @Data
    public static class Conversation {
        private String id;
        private String kbId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<Message> messages;
    }

    @Data
    public static class Message {
        private String role;
        private String content;
        private LocalDateTime timestamp;
        private List<ContextSource> contextSources;
    }

    /**
     * 上下文来源 —— 兼容知识库与联网搜索两种类型
     */
    @Data
    public static class ContextSource {
        /** KNOWLEDGE_BASE / WEB_SEARCH */
        private String type;
        // 知识库类型字段
        private String chunkId;
        private String docId;
        private float score;
        // 联网搜索类型字段
        private String title;
        private String url;
        // 通用：原文片段
        private String content;
        // 知识库文档元数据（用于前端展示来源文件名及预览跳转，R1/R4）
        private String docName;
        private String fileUrl;
        private String fileType;
        /**
         * 是否真正被本次回答引用（即回答文本中出现了对应的 [N] 标号）。
         * <p>检索阶段构造 sources 时无法预知 LLM 会引用哪些条目，此字段需要在
         * 回答生成完成后由 {@link #markCitedSources(String, java.util.List)} 回填。
         * 前端 "参考来源" 面板据此过滤掉未实际引用的来源；为了保持回答正文中
         * 已经写入的 [N] 与 sources[N-1] 的下标对齐，array 长度本身不会变。</p>
         */
        private boolean cited;
    }
}
