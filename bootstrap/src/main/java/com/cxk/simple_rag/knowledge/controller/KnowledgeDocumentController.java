package com.cxk.simple_rag.knowledge.controller;

import com.cxk.simple_rag.knowledge.dto.ChunkDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.QueryDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.UploadDocumentRequest;
import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.service.KnowledgeDocumentService;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentContentVO;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentVO;
import com.cxk.simple_rag.storage.RustFsStorageService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
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
    private final RustFsStorageService rustFsStorageService;

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
        List<String> keywords = parseKeywords(request.get("keywords"));

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

    @GetMapping("/{id}/content")
    public ResponseEntity<Map<String, Object>> getDocumentContent(
            @PathVariable("id") String docId,
            @RequestParam(value = "pageNum", required = false) Integer pageNum,
            @RequestParam(value = "pageSize", required = false) Integer pageSize) {

        Object data;
        if (pageNum == null && pageSize == null) {
            data = documentService.getDocumentContent(docId);
        } else {
            KnowledgeDocumentContentVO contentVO = documentService.getDocumentContent(
                    docId,
                    pageNum != null ? pageNum : 1,
                    pageSize != null ? pageSize : 2000);
            data = contentVO;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    /**
     * 下载/在线查看文档原始文件（未经解析、未分块、未向量化）。
     * 直接从 RustFS 流式读取原始字节，由前端按文件类型决定渲染方式（PDF/图片/文本/下载）。
     */
    @GetMapping("/{id}/raw")
    public ResponseEntity<InputStreamResource> getDocumentRaw(@PathVariable("id") String docId) {
        KnowledgeDocumentVO documentVO = documentService.getDocument(docId);
        if (documentVO == null || documentVO.getFileUrl() == null || documentVO.getFileUrl().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        String objectKey = documentVO.getFileUrl();
        InputStream stream = rustFsStorageService.downloadFile(objectKey);
        InputStreamResource resource = new InputStreamResource(stream);

        MediaType contentType = resolveMediaType(documentVO.getFileType(), objectKey);
        String filename = documentVO.getDocName() != null && !documentVO.getDocName().isBlank()
                ? documentVO.getDocName()
                : objectKey.substring(objectKey.lastIndexOf('/') + 1);
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(resource);
    }

    private MediaType resolveMediaType(String fileType, String objectKey) {
        String type = fileType != null ? fileType.toLowerCase() : "";
        String ext = objectKey != null && objectKey.lastIndexOf('.') >= 0
                ? objectKey.substring(objectKey.lastIndexOf('.') + 1).toLowerCase()
                : "";
        return switch (type.isEmpty() ? ext : type) {
            case "pdf" -> MediaType.APPLICATION_PDF;
            case "png" -> MediaType.IMAGE_PNG;
            case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
            case "gif" -> MediaType.IMAGE_GIF;
            case "txt", "text", "md", "markdown", "csv" -> new MediaType("text", "plain", StandardCharsets.UTF_8);
            case "html", "htm" -> MediaType.TEXT_HTML;
            case "json" -> MediaType.APPLICATION_JSON;
            case "doc" -> MediaType.parseMediaType("application/msword");
            case "docx", "word" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            case "xls" -> MediaType.parseMediaType("application/vnd.ms-excel");
            case "xlsx", "excel" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
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

    private List<String> parseKeywords(Object keywords) {
        if (keywords == null) {
            return null;
        }
        if (keywords instanceof List<?> keywordList) {
            return keywordList.stream()
                    .map(String::valueOf)
                    .map(String::trim)
                    .filter(keyword -> !keyword.isEmpty())
                    .toList();
        }
        return Arrays.stream(String.valueOf(keywords).split(","))
                .map(String::trim)
                .filter(keyword -> !keyword.isEmpty())
                .toList();
    }
}
