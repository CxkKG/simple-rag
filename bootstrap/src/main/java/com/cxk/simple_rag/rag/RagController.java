package com.cxk.simple_rag.rag;

import cn.dev33.satoken.stp.StpUtil;
import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.llm.LLMService;
import com.cxk.simple_rag.rag.RagService;
import com.cxk.simple_rag.vector.VectorSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * RAG 智能问答控制器
 * 支持 SSE 流式对话和会话管理
 *
 * @author wangxin
 */
@Slf4j
@RestController
@RequestMapping("/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;
    private final VectorSearchService vectorSearchService;
    private final LLMService llmService;
    private final ConversationService conversationService;

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @return 会话 ID
     */
    @PostMapping("/conversation")
    public Map<String, String> createConversation(@RequestParam String kbId) {
        String userId = StpUtil.getLoginIdAsString();
        String conversationId = ragService.createConversation(kbId, userId);
        Map<String, String> result = new HashMap<>();
        result.put("conversationId", conversationId);
        return result;
    }

    /**
     * 重命名会话
     */
    @PutMapping("/conversation/{conversationId}")
    public void renameConversation(
            @PathVariable String conversationId,
            @RequestBody Map<String, String> request) {
        String userId = StpUtil.getLoginIdAsString();
        String title = request.get("title");
        conversationService.renameConversation(conversationId, userId, title);
    }

    /**
     * 智能问答
     *
     * @param conversationId 会话 ID
     * @param question 问题
     * @param topK 引用分块数量（可选，默认 3）
     * @return 回答
     */
    @PostMapping("/chat")
    public Map<String, Object> chat(
            @RequestParam String conversationId,
            @RequestParam String question,
            @RequestParam(defaultValue = "3") int topK) {
        String userId = StpUtil.getLoginIdAsString();
        String answer = ragService.chat(conversationId, question, topK, userId);

        Map<String, Object> result = new HashMap<>();
        result.put("answer", answer);
        return result;
    }

    /**
     * 获取会话历史
     *
     * @param conversationId 会话 ID
     * @return 消息列表
     */
    @GetMapping("/conversation/{conversationId}")
    public List<RagService.Message> getConversationHistory(@PathVariable String conversationId) {
        String userId = StpUtil.getLoginIdAsString();
        return ragService.getConversationHistory(conversationId, userId);
    }

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     */
    @DeleteMapping("/conversation/{conversationId}")
    public void deleteConversation(@PathVariable String conversationId) {
        String userId = StpUtil.getLoginIdAsString();
        ragService.deleteConversation(conversationId, userId);
    }

    /**
     * 获取会话列表（支持分页）
     */
    @GetMapping("/conversation/list")
    public Map<String, Object> listConversations(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        String userId = StpUtil.getLoginIdAsString();
        List<com.cxk.simple_rag.conversation.entity.ConversationDO> conversations =
                conversationService.listConversations(userId);

        int total = conversations.size();
        int start = (pageNum - 1) * pageSize;
        int end = Math.min(start + pageSize, total);

        List<Map<String, Object>> sessionList = new ArrayList<>();
        for (int i = start; i < end; i++) {
            com.cxk.simple_rag.conversation.entity.ConversationDO conv = conversations.get(i);
            Map<String, Object> session = new HashMap<>();
            session.put("conversationId", conv.getConversationId());
            session.put("kbId", conv.getKbId());
            session.put("title", conv.getTitle());
            session.put("lastTime", conv.getLastTime());
            session.put("createTime", conv.getCreateTime());
            session.put("updateTime", conv.getUpdateTime());
            sessionList.add(session);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("data", sessionList);
        result.put("total", total);
        return result;
    }

    /**
     * 快捷问答（无需创建会话）
     *
     * @param kbId 知识库 ID
     * @param question 问题
     * @param topK 检索数量（可选，默认 3）
     * @return 回答
     */
    @PostMapping("/query")
    public Map<String, Object> query(
            @RequestParam String kbId,
            @RequestParam String question,
            @RequestParam(defaultValue = "3") int topK) {
        String userId = StpUtil.getLoginIdAsString();
        // 创建临时会话
        String conversationId = ragService.createConversation(kbId, userId);
        String answer = ragService.chat(conversationId, question, topK, userId);

        Map<String, Object> result = new HashMap<>();
        result.put("answer", answer);
        result.put("conversationId", conversationId);
        return result;
    }

    /**
     * SSE 流式对话
     *
     * @param kbId 知识库 ID
     * @param question 用户问题
     * @param conversationId 会话 ID（可选）
     * @param topK 检索数量（可选，默认 3）
     * @return SSE 流
     */
    @GetMapping(value = "/stream-chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @ResponseBody
    public SseEmitter streamChat(
            @RequestParam String kbId,
            @RequestParam String question,
            @RequestParam(required = false) String conversationId,
            @RequestParam(defaultValue = "3") int topK) {

        String userId = StpUtil.getLoginIdAsString();

        // 如果提供了会话 ID，校验该会话属于当前用户
        if (conversationId != null && !conversationId.trim().isEmpty()) {
            conversationService.getConversation(conversationId, userId);
        }

        // 设置超时时间为 0 表示永不超时（由异步任务控制）
        SseEmitter emitter = new SseEmitter(0L);

        // 使用原子布尔标记是否已完成，避免重复完成
        AtomicBoolean completed = new AtomicBoolean(false);

        // 异步处理对话
        CompletableFuture.runAsync(() -> {
            String finalConvId = conversationId;

            try {
                // 设置完成回调，确保资源正确释放
                String finalConvId1 = finalConvId;
                emitter.onCompletion(() -> {
                    log.info("SSE connection completed: conversationId={}", finalConvId1);
                    completed.set(true);
                });

                String finalConvId2 = finalConvId;
                emitter.onTimeout(() -> {
                    log.warn("SSE connection timed out: conversationId={}", finalConvId2);
                    completed.set(true);
                });

                String finalConvId3 = finalConvId;
                emitter.onError(throwable -> {
                    log.error("SSE connection error: conversationId={}", finalConvId3, throwable);
                    completed.set(true);
                });

                // 如果没有会话 ID，创建新的
                if (finalConvId == null || finalConvId.trim().isEmpty()) {
                    finalConvId = ragService.createConversation(kbId, userId);
                }

                // 发送会话 ID
                emitter.send(SseEmitter.event()
                        .name("conversationId")
                        .data(finalConvId));

                // 发送开始事件
                emitter.send(SseEmitter.event().name("start").data("start"));

                // 向量检索
                List<VectorSearchService.SearchResult> searchResults = vectorSearchService.search(kbId, question, topK);

                // 发送检索结果
                emitter.send(SseEmitter.event()
                        .name("retrieved")
                        .data(Map.of("count", searchResults.size())));

                // 构建上下文
                StringBuilder contextBuilder = new StringBuilder();
                for (int i = 0; i < searchResults.size(); i++) {
                    VectorSearchService.SearchResult result = searchResults.get(i);
                    contextBuilder.append("[").append(i + 1).append("] ")
                            .append(result.getContent())
                            .append("\n\n");
                }

                // 发送上下文
                emitter.send(SseEmitter.event().name("context").data(contextBuilder.toString()));

                // 构建系统提示词
                String systemPrompt = "你是一个智能助手，能够根据提供的知识库内容回答用户的问题。" +
                        "请仔细阅读提供的信息，用简洁明了的语言回答问题。" +
                        "如果提供的信息不足以回答问题，请如实告知用户。" +
                        "回答中引用的信息请标注对应的编号 [1]、[2] 等。";

                // 构建用户消息
                String userMessage = contextBuilder.toString() + "\n\n请根据以上信息回答用户的问题：" + question;

                // 用于累积完整回答
                StringBuilder fullAnswer = new StringBuilder();

                // 调用 LLM 流式生成回答
                llmService.streamGenerate(systemPrompt, userMessage, emitter, text -> {
                    // 内容消费回调，累积完整回答
                    fullAnswer.append(text);
                });

                // 检查是否在流式过程中已完成
                if (completed.get()) {
                    log.warn("Stream already completed, skipping save");
                    return;
                }

                // 发送完成事件
                emitter.send(SseEmitter.event().name("end").data("end"));

                // 保存对话记录
                ragService.saveMessage(finalConvId, "user", question);
                ragService.saveMessage(finalConvId, "assistant", fullAnswer.toString());

                log.info("Stream chat completed: conversationId={}, question={}, answerLength={}",
                        finalConvId, question, fullAnswer.length());

            } catch (Exception e) {
                log.error("Stream chat error: conversationId={}", finalConvId, e);
                if (!completed.get()) {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data("处理失败：" + e.getMessage()));
                    } catch (IOException ex) {
                        log.error("Failed to send error event", ex);
                    }
                }
            } finally {
                if (!completed.get()) {
                    completed.set(true);
                    emitter.complete();
                }
            }
        });

        return emitter;
    }
}
