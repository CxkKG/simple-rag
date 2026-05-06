package com.cxk.simple_rag.rag;

import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.llm.LLMService;
import com.cxk.simple_rag.vector.VectorSearchService;
import com.cxk.simple_rag.websearch.WebSearchProperties;
import com.cxk.simple_rag.websearch.WebSearchService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    private final VectorSearchService vectorSearchService;
    private final ConversationService conversationService;
    private final LLMService llmService;
    private final WebSearchService webSearchService;
    private final WebSearchProperties webSearchProperties;

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
            answer = llmService.generate(systemPrompt, retrieval.getPromptContext());
        }

        conversationService.addMessage(conversationId, "user", question, null);
        conversationService.addMessage(conversationId, "assistant", answer, null);

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
            result.setUsedWebSearch(false);
            result.setSources(extractContextSources(kbResults));
            result.setPromptContext(buildKbContext(kbResults, question));
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
        if (webResults.isEmpty()) {
            // 联网搜索调用失败 / 无配置 → 不影响主流程，给出明确提示
            result.setUsedWebSearch(false);
            result.setFallbackHint(true);
            result.setDirectAnswer("知识库与联网搜索均未返回有效结果，请稍后重试或调整提问。");
            result.setSources(Collections.emptyList());
            return result;
        }

        result.setUsedWebSearch(true);
        result.setSources(extractWebSources(webResults));
        result.setPromptContext(buildWebContext(webResults, question));
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
     * 保存消息
     */
    public void saveMessage(String conversationId, String role, String content) {
        conversationService.addMessage(conversationId, role, content, null);
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
        for (VectorSearchService.SearchResult result : results) {
            ContextSource source = new ContextSource();
            source.setType(SOURCE_TYPE_KNOWLEDGE_BASE);
            source.setChunkId(result.getChunkId());
            source.setDocId(result.getDocId());
            source.setScore(result.getScore());
            source.setContent(result.getContent());
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
    }
}
