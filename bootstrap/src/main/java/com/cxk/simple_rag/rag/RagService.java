package com.cxk.simple_rag.rag;

import com.cxk.simple_rag.vector.VectorSearchService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    private final VectorSearchService vectorSearchService;

    // 简单的会话存储（生产环境建议使用 Redis）
    private final Map<String, Conversation> conversations = new ConcurrentHashMap<>();

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @return 会话 ID
     */
    public String createConversation(String kbId) {
        String conversationId = generateConversationId();
        Conversation conversation = new Conversation();
        conversation.setId(conversationId);
        conversation.setKbId(kbId);
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());
        conversation.setMessages(new ArrayList<>());

        conversations.put(conversationId, conversation);
        log.info("Conversation created: conversationId={}, kbId={}", conversationId, kbId);
        return conversationId;
    }

    /**
     * 智能问答
     *
     * @param conversationId 会话 ID
     * @param question 用户问题
     * @param topK 引用分块数量
     * @return 回答
     */
    public String chat(String conversationId, String question, int topK) {
        Conversation conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        // 向量检索相关分块
        List<VectorSearchService.SearchResult> searchResults = vectorSearchService.search(
                conversation.getKbId(), question, topK
        );

        // 构建上下文
        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("基于以下已知信息：\n\n");
        for (int i = 0; i < searchResults.size(); i++) {
            VectorSearchService.SearchResult result = searchResults.get(i);
            contextBuilder.append("[").append(i + 1).append("] ")
                    .append(result.getContent())
                    .append("\n\n");
        }

        contextBuilder.append("请根据以上信息回答用户的问题：").append(question);

        // 调用 LLM 生成回答（这里先使用伪回答，后续可对接真实 LLM）
        String answer = generateAnswer(conversation, contextBuilder.toString(), searchResults);

        // 记录对话
        Message userMessage = new Message();
        userMessage.setRole("user");
        userMessage.setContent(question);
        userMessage.setTimestamp(LocalDateTime.now());

        Message assistantMessage = new Message();
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(answer);
        assistantMessage.setTimestamp(LocalDateTime.now());
        assistantMessage.setContextSources(extractContextSources(searchResults));

        conversation.getMessages().add(userMessage);
        conversation.getMessages().add(assistantMessage);
        conversation.setUpdatedAt(LocalDateTime.now());

        log.info("Chat completed: conversationId={}, question={}, answerLength={}",
                conversationId, question, answer.length());

        return answer;
    }

    /**
     * 获取会话详情
     *
     * @param conversationId 会话 ID
     * @return 会话对象
     */
    public Conversation getConversation(String conversationId) {
        return conversations.get(conversationId);
    }

    /**
     * 获取会话历史
     *
     * @param conversationId 会话 ID
     * @return 消息列表
     */
    public List<Message> getConversationHistory(String conversationId) {
        Conversation conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }
        return conversation.getMessages();
    }

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     */
    public void deleteConversation(String conversationId) {
        conversations.remove(conversationId);
        log.info("Conversation deleted: conversationId={}", conversationId);
    }

    /**
     * 生成回答（伪实现，后续可对接真实 LLM）
     */
    private String generateAnswer(Conversation conversation, String context,
                                   List<VectorSearchService.SearchResult> searchResults) {
        // TODO: 对接真实 LLM API（如 SilconFlow、阿里云百炼等）
        // 当前返回伪回答

        if (searchResults.isEmpty()) {
            return "抱歉，我没有找到相关的信息来回答您的问题。";
        }

        // 简单的伪回答：返回最相关的分块内容
        StringBuilder answer = new StringBuilder();
        answer.append("根据知识库中的信息，");
        answer.append(searchResults.get(0).getContent());
        answer.append("\n\n以上是为您找到的相关信息。如有更多问题，欢迎继续提问。");

        return answer.toString();
    }

    private List<ContextSource> extractContextSources(List<VectorSearchService.SearchResult> results) {
        List<ContextSource> sources = new ArrayList<>();
        for (VectorSearchService.SearchResult result : results) {
            ContextSource source = new ContextSource();
            source.setChunkId(result.getChunkId());
            source.setDocId(result.getDocId());
            source.setScore(result.getScore());
            sources.add(source);
        }
        return sources;
    }

    private String generateConversationId() {
        return "conv_" + System.currentTimeMillis() + "_" +
                java.util.UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * 会话类
     */
    @Data
    public static class Conversation {
        private String id;
        private String kbId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<Message> messages;
    }

    /**
     * 消息类
     */
    @Data
    public static class Message {
        private String role; // user / assistant
        private String content;
        private LocalDateTime timestamp;
        private List<ContextSource> contextSources;
    }

    /**
     * 上下文来源类
     */
    @Data
    public static class ContextSource {
        private String chunkId;
        private String docId;
        private float score;
    }
}
