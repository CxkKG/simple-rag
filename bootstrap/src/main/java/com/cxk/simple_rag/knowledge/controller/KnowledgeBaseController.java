package com.cxk.simple_rag.knowledge.controller;

import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.vo.KnowledgeBaseVO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 知识库控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/knowledge/base")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createKnowledgeBase(
            @RequestBody Map<String, String> request) {

        String name = request.get("name");
        String embeddingModel = request.get("embeddingModel");
        String createdBy = request.get("createdBy");

        if (name == null || embeddingModel == null) {
            throw new IllegalArgumentException("name and embeddingModel are required");
        }

        KnowledgeBaseVO knowledgeBaseVO = knowledgeBaseService.createKnowledgeBase(
                name, embeddingModel, createdBy != null ? createdBy : "system");

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", knowledgeBaseVO);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getKnowledgeBase(@PathVariable("id") String id) {
        KnowledgeBaseVO knowledgeBaseVO = knowledgeBaseService.getKnowledgeBase(id);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", knowledgeBaseVO);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/page")
    public ResponseEntity<Map<String, Object>> listKnowledgeBases(
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {

        List<KnowledgeBaseVO> knowledgeBases = knowledgeBaseService.listKnowledgeBases(pageNum, pageSize);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", knowledgeBases);
        response.put("total", knowledgeBases.size());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateKnowledgeBase(
            @PathVariable("id") String id,
            @RequestBody Map<String, String> request) {

        String name = request.get("name");
        if (name == null) {
            throw new IllegalArgumentException("name is required");
        }

        KnowledgeBaseVO knowledgeBaseVO = knowledgeBaseService.updateKnowledgeBase(id, name);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", knowledgeBaseVO);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteKnowledgeBase(@PathVariable("id") String id) {
        knowledgeBaseService.deleteKnowledgeBase(id);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }
}
