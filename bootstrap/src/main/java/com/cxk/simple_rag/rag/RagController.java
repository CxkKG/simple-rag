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
     *
     * @param conversationId 会话 ID
     * @param request 重命名请求
     */
    @PutMapping("/conversation/{conversationId}")
    public Map<String, Object> renameConversation(
            @PathVariable String conversationId,
            @RequestBody com.cxk.simple_rag.conversation.dto.RenameConversationRequest request) {
        String userId = StpUtil.getLoginIdAsString();
        conversationService.renameConversation(conversationId, userId, request.getTitle());
        Map<String, Object> result = new HashMap<>();
        result.put("conversationId", conversationId);
        result.put("title", request.getTitle());
        return result;
    }

    /**
     * AI 自动总结会话标题
     *
     * @param conversationId 会话 ID
     * @return 生成的新标题
     */
    @PostMapping("/conversation/{conversationId}/summarize")
    public Map<String, Object> summarizeConversationTitle(@PathVariable String conversationId) {
        String userId = StpUtil.getLoginIdAsString();
        String title = conversationService.summarizeConversationTitle(conversationId, userId);
        Map<String, Object> result = new HashMap<>();
        result.put("conversationId", conversationId);
        result.put("title", title);
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
            @RequestParam(defaultValue = "3") int topK,
            @RequestParam(defaultValue = "false") boolean webSearch) {
        String userId = StpUtil.getLoginIdAsString();
        String answer = ragService.chat(conversationId, question, topK, userId, webSearch);

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
     * 搜索会话（按标题或消息内容）
     *
     * @param keyword 搜索关键词
     * @param pageNum 页码
     * @param pageSize 每页大小
     * @return 分页会话列表
     */
    @GetMapping("/conversation/search")
    public Map<String, Object> searchConversations(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        String userId = StpUtil.getLoginIdAsString();
        com.cxk.simple_rag.conversation.dto.SearchConversationRequest request =
                new com.cxk.simple_rag.conversation.dto.SearchConversationRequest();
        request.setKeyword(keyword);
        request.setPageNum(pageNum);
        request.setPageSize(pageSize);

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<com.cxk.simple_rag.conversation.entity.ConversationDO> page =
                conversationService.searchConversations(userId, request);

        List<Map<String, Object>> sessionList = page.getRecords().stream().map(conv -> {
            Map<String, Object> session = new HashMap<>();
            session.put("conversationId", conv.getConversationId());
            session.put("kbId", conv.getKbId());
            session.put("title", conv.getTitle());
            session.put("lastTime", conv.getLastTime());
            session.put("createTime", conv.getCreateTime());
            session.put("updateTime", conv.getUpdateTime());
            return session;
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("data", sessionList);
        result.put("total", page.getTotal());
        result.put("pageNum", page.getCurrent());
        result.put("pageSize", page.getSize());
        result.put("pages", page.getPages());
        return result;
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
            @RequestParam(defaultValue = "3") int topK,
            @RequestParam(defaultValue = "false") boolean webSearch) {
        String userId = StpUtil.getLoginIdAsString();
        // 创建临时会话
        String conversationId = ragService.createConversation(kbId, userId);
        String answer = ragService.chat(conversationId, question, topK, userId, webSearch);

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
            @RequestParam(defaultValue = "3") int topK,
            @RequestParam(defaultValue = "false") boolean webSearch) {

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

                if (finalConvId == null || finalConvId.trim().isEmpty()) {
                    finalConvId = ragService.createConversation(kbId, userId);
                }

                emitter.send(SseEmitter.event()
                        .name("conversationId")
                        .data(finalConvId));

                emitter.send(SseEmitter.event().name("start").data("start"));

                // 统一走 RagService.prepareRetrievalContext —— 知识库未命中时按 webSearch 开关兜底
                RagService.RetrievalResult retrieval = ragService.prepareRetrievalContext(
                        kbId, question, topK, webSearch);

                // 通知前端检索来源（KNOWLEDGE_BASE / WEB_SEARCH / FALLBACK_HINT）
                String sourceType = retrieval.isFallbackHint()
                        ? "FALLBACK_HINT"
                        : (retrieval.isUsedWebSearch()
                                ? RagService.SOURCE_TYPE_WEB_SEARCH
                                : RagService.SOURCE_TYPE_KNOWLEDGE_BASE);
                Map<String, Object> retrievedPayload = new HashMap<>();
                retrievedPayload.put("sourceType", sourceType);
                retrievedPayload.put("count", retrieval.getSources() != null ? retrieval.getSources().size() : 0);
                retrievedPayload.put("sources", retrieval.getSources() != null ? retrieval.getSources() : Collections.emptyList());
                emitter.send(SseEmitter.event()
                        .name("retrieved")
                        .data(retrievedPayload));

                String fullAnswer;
                if (retrieval.isFallbackHint()) {
                    // 知识库未命中且未开启联网搜索 → 直接把提示文案推给前端，不调用 LLM
                    fullAnswer = retrieval.getDirectAnswer();
                    emitter.send(SseEmitter.event().name("content").data(fullAnswer));
                } else {
                    emitter.send(SseEmitter.event().name("context").data(retrieval.getPromptContext()));

                    String systemPrompt = ragService.systemPromptFor(retrieval.isUsedWebSearch());
                    // 带历史滑窗的多轮调用，支持跨轮上下文记忆
                    List<LLMService.Message> messages = ragService.buildChatMessages(
                            finalConvId, systemPrompt, retrieval.getPromptContext());

                    StringBuilder buf = new StringBuilder();
                    llmService.streamGenerate(messages, emitter, buf::append);
                    fullAnswer = buf.toString();
                }

                if (completed.get()) {
                    log.warn("Stream already completed, skipping save");
                    return;
                }

                // 回答生成完毕后，根据 [N] 角标回填 cited 标记，并把更新后的 sources
                // 再发一次 retrieved 事件，让前端 "参考来源" 面板只展示真正被引用的条目。
                // sources 数组下标保持不变，正文里 [N] → sources[N-1] 的映射不会被破坏。
                if (!retrieval.isFallbackHint()
                        && retrieval.getSources() != null
                        && !retrieval.getSources().isEmpty()) {
                    RagService.markCitedSources(fullAnswer, retrieval.getSources());

                    Map<String, Object> retrievedFinalPayload = new HashMap<>();
                    retrievedFinalPayload.put("sourceType", sourceType);
                    retrievedFinalPayload.put("count", retrieval.getSources().size());
                    retrievedFinalPayload.put("sources", retrieval.getSources());
                    emitter.send(SseEmitter.event()
                            .name("retrieved")
                            .data(retrievedFinalPayload));
                }

                emitter.send(SseEmitter.event().name("end").data("end"));

                ragService.saveMessage(finalConvId, "user", question);
                ragService.saveAssistantMessage(finalConvId, fullAnswer, retrieval.getSources());

                log.info("Stream chat completed: conversationId={}, question={}, webSearch={}, sourceType={}, answerLength={}",
                        finalConvId, question, webSearch, sourceType, fullAnswer.length());

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
