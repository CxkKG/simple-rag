package com.cxk.simple_rag.dashboard.controller;

import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.service.KnowledgeDocumentService;
import com.cxk.simple_rag.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 仪表板控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final KnowledgeBaseService knowledgeBaseService;
    private final KnowledgeDocumentService knowledgeDocumentService;
    private final UserService userService;

    /**
     * 获取仪表板统计数据
     *
     * @return 统计数据
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");

        Map<String, Object> data = new HashMap<>();
        data.put("knowledgeBaseCount", knowledgeBaseService.countKnowledgeBases());
        data.put("documentCount", knowledgeDocumentService.countDocuments());
        data.put("userCount", userService.getTotalUsers());

        response.put("data", data);
        return ResponseEntity.ok(response);
    }
}
