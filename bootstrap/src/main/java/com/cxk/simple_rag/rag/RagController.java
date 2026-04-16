package com.cxk.simple_rag.rag;

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

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @param userId 用户 ID
     * @return 会话 ID
     */
    @PostMapping("/conversation")
    public Map<String, String> createConversation(
            @RequestParam String kbId,
            @RequestParam String userId) {
        String conversationId = ragService.createConversation(kbId, userId);
        Map<String, String> result = new HashMap<>();
        result.put("conversationId", conversationId);
        return result;
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
        String answer = ragService.chat(conversationId, question, topK);

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
        return ragService.getConversationHistory(conversationId);
    }

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     */
    @DeleteMapping("/conversation/{conversationId}")
    public void deleteConversation(@PathVariable String conversationId) {
        ragService.deleteConversation(conversationId);
    }

    /**
     * 快捷问答（无需创建会话）
     *
     * @param kbId 知识库 ID
     * @param question 问题
     * @param topK 引用分块数量（可选，默认 3）
     * @return 回答
     */
    @PostMapping("/query")
    public Map<String, Object> query(
            @RequestParam String kbId,
            @RequestParam String question,
            @RequestParam(defaultValue = "3") int topK) {
        // 创建临时会话
        String conversationId = ragService.createConversation(kbId, "system");
        String answer = ragService.chat(conversationId, question, topK);

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
    @PostMapping(value = "/stream-chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @ResponseBody
    public SseEmitter streamChat(
            @RequestParam String kbId,
            @RequestParam String question,
            @RequestParam(required = false) String conversationId,
            @RequestParam(defaultValue = "3") int topK) {
        SseEmitter emitter = new SseEmitter(0L);

        // 使用数组包装变量以在 lambda 中修改
        String[] finalConvId = { conversationId };

        // 异步处理对话
        CompletableFuture.runAsync(() -> {
            // 如果没有会话 ID，创建新的
            if (finalConvId[0] == null || finalConvId[0].trim().isEmpty()) {
                finalConvId[0] = ragService.createConversation(kbId, "system");
            }

            try {
                // 发送会话 ID
                emitter.send(SseEmitter.event()
                        .name("conversationId")
                        .data(finalConvId[0]));

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

                // 调用 LLM 生成回答
                String answer = llmService.generate(systemPrompt, contextBuilder.toString() + "\n\n请根据以上信息回答用户的问题：" + question);

                // 发送回答内容（分段发送模拟流式）
                int chunkSize = 50;
                for (int i = 0; i < answer.length(); i += chunkSize) {
                    int end = Math.min(i + chunkSize, answer.length());
                    String chunk = answer.substring(i, end);
                    emitter.send(SseEmitter.event().name("content").data(chunk));
                    Thread.sleep(50); // 模拟流式生成
                }

                // 发送完成事件
                emitter.send(SseEmitter.event().name("end").data("end"));

                // 保存对话记录
                ragService.saveMessage(finalConvId[0], "user", question);
                ragService.saveMessage(finalConvId[0], "assistant", answer);

            } catch (Exception e) {
                log.error("Stream chat error", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                } catch (IOException ex) {
                    log.error("Failed to send error event", ex);
                }
            } finally {
                emitter.complete();
            }
        });

        return emitter;
    }
}
