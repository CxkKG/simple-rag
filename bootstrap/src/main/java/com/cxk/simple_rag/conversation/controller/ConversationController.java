package com.cxk.simple_rag.conversation.controller;

import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.conversation.entity.ConversationDO;
import com.cxk.simple_rag.conversation.entity.MessageDO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 会话控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    /**
     * 创建会话
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createConversation(
            @RequestBody Map<String, String> request) {
        String kbId = request.get("kbId");
        String userId = request.get("userId");

        if (kbId == null) {
            throw new IllegalArgumentException("kbId is required");
        }

        String conversationId = conversationService.createConversation(kbId, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", Map.of(
                "conversationId", conversationId,
                "kbId", kbId
        ));
        return ResponseEntity.ok(response);
    }

    /**
     * 获取会话详情
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<Map<String, Object>> getConversation(@PathVariable String conversationId) {
        ConversationDO conversation = conversationService.getConversation(conversationId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", conversation);
        return ResponseEntity.ok(response);
    }

    /**
     * 重命名会话
     */
    @PutMapping("/{conversationId}")
    public ResponseEntity<Map<String, Object>> renameConversation(
            @PathVariable String conversationId,
            @RequestBody Map<String, String> request) {
        String title = request.get("title");
        conversationService.renameConversation(conversationId, title);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);
        return ResponseEntity.ok(response);
    }

    /**
     * 删除会话
     */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Map<String, Object>> deleteConversation(@PathVariable String conversationId) {
        conversationService.deleteConversation(conversationId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取用户会话列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listConversations(
            @RequestParam String userId) {
        List<ConversationDO> conversations = conversationService.listConversations(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", conversations);
        response.put("total", conversations.size());
        return ResponseEntity.ok(response);
    }

    /**
     * 获取会话消息列表
     */
    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<Map<String, Object>> getMessages(@PathVariable("conversationId") String conversationId) {
        List<MessageDO> messages = conversationService.getMessages(conversationId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", messages);
        return ResponseEntity.ok(response);
    }

    /**
     * 添加消息
     */
    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<Map<String, Object>> addMessage(
            @PathVariable String conversationId,
            @RequestBody Map<String, String> request) {
        String role = request.get("role");
        String content = request.get("content");
        String contextSources = request.get("contextSources");

        String messageId = conversationService.addMessage(conversationId, role, content, contextSources);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", Map.of("id", messageId));
        return ResponseEntity.ok(response);
    }
}
