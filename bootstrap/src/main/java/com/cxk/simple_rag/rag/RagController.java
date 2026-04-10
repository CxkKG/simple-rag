package com.cxk.simple_rag.rag;

import com.cxk.simple_rag.rag.RagService;
import com.cxk.simple_rag.rag.RagService.Conversation;
import com.cxk.simple_rag.rag.RagService.Message;
import com.cxk.simple_rag.rag.RagService.ContextSource;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RAG 智能问答控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @return 会话 ID
     */
    @PostMapping("/conversation")
    public Map<String, String> createConversation(@RequestParam String kbId) {
        String conversationId = ragService.createConversation(kbId);
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
    public List<Message> getConversationHistory(@PathVariable String conversationId) {
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
        String conversationId = ragService.createConversation(kbId);
        String answer = ragService.chat(conversationId, question, topK);

        Map<String, Object> result = new HashMap<>();
        result.put("answer", answer);
        result.put("conversationId", conversationId);
        return result;
    }
}
