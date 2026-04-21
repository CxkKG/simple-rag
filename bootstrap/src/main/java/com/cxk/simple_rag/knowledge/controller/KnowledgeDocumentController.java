package com.cxk.simple_rag.knowledge.controller;

import com.cxk.simple_rag.knowledge.dto.ChunkDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.QueryDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.UploadDocumentRequest;
import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.service.KnowledgeDocumentService;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 知识库文档控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/knowledge/document")
@RequiredArgsConstructor
@Slf4j
public class KnowledgeDocumentController {

    private final KnowledgeDocumentService documentService;
    private final KnowledgeBaseService knowledgeBaseService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @RequestParam("kbId") String kbId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "docName", required = false) String docName,
            @RequestParam(value = "processMode", required = false, defaultValue = "chunk") String processMode,
            @RequestParam(value = "chunkStrategy", required = false, defaultValue = "structure_aware") String chunkStrategy,
            @RequestParam(value = "chunkConfig", required = false) String chunkConfig) {

        UploadDocumentRequest request = UploadDocumentRequest.builder()
                .kbId(kbId)
                .file(file)
                .docName(docName)
                .processMode(processMode)
                .chunkStrategy(chunkStrategy)
                .chunkConfig(chunkConfig)
                .build();

        KnowledgeDocumentVO documentVO = documentService.uploadDocument(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", documentVO);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/chunk")
    public ResponseEntity<Map<String, Object>> chunkDocument(@RequestBody ChunkDocumentRequest request) {
        documentService.triggerChunking(request.getDocId());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "Chunking triggered");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/page")
    public ResponseEntity<Map<String, Object>> listDocuments(
            @RequestParam("kbId") String kbId,
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {

        List<KnowledgeDocumentVO> documents = documentService.listDocuments(kbId, pageNum, pageSize);
        int total = documentService.countDocumentsByKbId(kbId);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", documents);
        response.put("total", total);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateDocumentInfo(
            @PathVariable("id") String docId,
            @RequestBody Map<String, Object> request) {

        String docName = (String) request.get("docName");
        String summary = (String) request.get("summary");
        List<String> keywords = (List<String>) request.get("keywords");

        documentService.updateDocumentInfo(docId, docName, summary, keywords);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDocument(@PathVariable("id") String docId) {
        KnowledgeDocumentVO documentVO = documentService.getDocument(docId);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", documentVO);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDocument(@PathVariable("id") String docId) {
        documentService.deleteDocument(docId);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> queryDocuments(@RequestBody QueryDocumentRequest request) {
        Page<KnowledgeDocumentVO> page = documentService.queryDocuments(request);

        // 为每个文档添加所属知识库信息
        List<KnowledgeDocumentVO> documentsWithKBInfo = page.getRecords().stream()
                .map(vo -> {
                    try {
                        var knowledgeBase = knowledgeBaseService.getKnowledgeBase(vo.getKbId());
                        vo.setKbName(knowledgeBase.getName());
                    } catch (Exception e) {
                        log.warn("Failed to get knowledge base info for docId: {}, kbId: {}", vo.getId(), vo.getKbId(), e);
                        vo.setKbName("未知知识库");
                    }
                    return vo;
                })
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", documentsWithKBInfo);
        response.put("total", page.getTotal());
        response.put("pageNum", page.getCurrent());
        response.put("pageSize", page.getSize());
        response.put("pages", page.getPages());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> deleteDocuments(@RequestBody List<String> docIds) {
        documentService.deleteDocuments(docIds);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/rebuild")
    public ResponseEntity<Map<String, Object>> rebuildVectors(@PathVariable("id") String docId) {
        documentService.rebuildVectors(docId);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "Vector rebuild triggered");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }
}
