package com.cxk.simple_rag.rag;

import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.llm.LLMService;
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
    private final ConversationService conversationService;
    private final LLMService llmService;

    // 简单的会话存储（生产环境建议使用 Redis）
    private final Map<String, Conversation> conversations = new ConcurrentHashMap<>();

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @param userId 用户 ID
     * @return 会话 ID
     */
    public String createConversation(String kbId, String userId) {
        String conversationId = conversationService.createConversation(kbId, userId);
        log.info("Conversation created: conversationId={}, kbId={}, userId={}", conversationId, kbId, userId);
        return conversationId;
    }

    /**
     * 智能问答
     *
     * @param conversationId 会话 ID
     * @param question 用户问题
     * @param topK 引用分块数量
     * @param userId 用户 ID
     * @return 回答
     */
    public String chat(String conversationId, String question, int topK, String userId) {
        // 获取会话信息（带用户权限校验）
        var conversationDO = conversationService.getConversation(conversationId, userId);
        if (conversationDO == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        // 向量检索相关分块
        List<VectorSearchService.SearchResult> searchResults = vectorSearchService.search(
                conversationDO.getKbId(), question, topK
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

        // 构建系统提示词
        String systemPrompt = "你是一个智能助手，能够根据提供的知识库内容回答用户的问题。" +
                "请仔细阅读提供的信息，用简洁明了的语言回答问题。" +
                "如果提供的信息不足以回答问题，请如实告知用户。" +
                "回答中引用的信息请标注对应的编号 [1]、[2] 等。";

        // 调用 LLM 生成回答
        String answer = llmService.generate(systemPrompt, contextBuilder.toString());

        // 记录对话到数据库
        conversationService.addMessage(conversationId, "user", question, null);
        conversationService.addMessage(conversationId, "assistant", answer, null);

        log.info("Chat completed: conversationId={}, question={}, answerLength={}",
                conversationId, question, answer.length());

        return answer;
    }

    /**
     * 保存消息
     *
     * @param conversationId 会话 ID
     * @param role 消息角色
     * @param content 消息内容
     */
    public void saveMessage(String conversationId, String role, String content) {
        conversationService.addMessage(conversationId, role, content, null);
    }

    /**
     * 获取会话历史
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     * @return 消息列表
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
            message.setTimestamp(messageDO.getCreateTime().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime());
            messages.add(message);
        }

        return messages;
    }

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     */
    public void deleteConversation(String conversationId, String userId) {
        conversationService.deleteConversation(conversationId, userId);
        log.info("Conversation deleted: conversationId={}", conversationId);
    }

    /**
     * 生成回答（伪实现，后续可对接真实 LLM）
     */
    private String generateAnswer(String context, List<VectorSearchService.SearchResult> searchResults) {
        if (searchResults.isEmpty()) {
            return "抱歉，我没有找到相关的信息来回答您的问题。";
        }

        StringBuilder answer = new StringBuilder();
        answer.append("根据知识库中的信息回答您的问题：\n\n");
        answer.append("以下是可以参考的相关信息：\n\n");
        answer.append(context).append("\n\n");
        answer.append("基于以上信息，我的回答是：\n");
        answer.append("这是根据知识库内容生成的回答示例。实际应用中会调用 LLM 生成更准确的答案。");

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
