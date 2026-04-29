package com.cxk.simple_rag.knowledge.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cxk.simple_rag.core.chunk.ChunkConfig;
import com.cxk.simple_rag.core.chunk.ChunkingStrategy;
import com.cxk.simple_rag.core.chunk.StructureAwareTextChunker;
import com.cxk.simple_rag.core.chunk.VectorChunk;
import com.cxk.simple_rag.core.embedding.ChunkEmbeddingService;
import com.cxk.simple_rag.ai.AISummaryService;
import com.cxk.simple_rag.core.parser.ParserSelector;
import com.cxk.simple_rag.core.parser.ParserType;
import com.cxk.simple_rag.knowledge.dto.QueryDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.UploadDocumentRequest;
import com.cxk.simple_rag.knowledge.entity.KnowledgeChunkDO;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentChunkLogDO;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeChunkMapper;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeDocumentChunkLogMapper;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeDocumentMapper;
import com.cxk.simple_rag.knowledge.mq.KnowledgeDocumentChunkProducer;
import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.service.KnowledgeDocumentService;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentVO;
import com.cxk.simple_rag.storage.RustFsStorageService;
import com.cxk.simple_rag.vector.MilvusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 知识库文档服务实现类
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeDocumentServiceImpl implements KnowledgeDocumentService {

    private final KnowledgeDocumentMapper documentMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final KnowledgeDocumentChunkLogMapper chunkLogMapper;
    private final ParserSelector parserSelector;
    private final ChunkEmbeddingService chunkEmbeddingService;
    private final ObjectMapper objectMapper;
    private final RustFsStorageService rustFsStorageService;
    private final MilvusService milvusService;
    private final KnowledgeDocumentChunkProducer chunkProducer;
    private final KnowledgeBaseService knowledgeBaseService;
    private final AISummaryService aiSummaryService;

    private final Map<String, ChunkingStrategy> strategyCache = Map.of(
            "structure_aware", new StructureAwareTextChunker()
    );

    @Override
    public KnowledgeDocumentVO uploadDocument(UploadDocumentRequest request) {
        return uploadDocument(request.getKbId(), request.getFile(), request.getDocName(),
                request.getProcessMode(), request.getChunkStrategy(), request.getChunkConfig());
    }

    @Override
    public KnowledgeDocumentVO uploadDocument(String kbId, MultipartFile file, String docName,
                                               String processMode, String chunkStrategy, String chunkConfig) {
        Instant startTime = Instant.now();

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String fileUrl = rustFsStorageService.uploadFile(file, "documents/" + kbId);

        KnowledgeDocumentDO documentDO = new KnowledgeDocumentDO();
        documentDO.setId(generateDocId());
        documentDO.setKbId(kbId);
        documentDO.setDocName(StrUtil.isNotBlank(docName) ? docName : file.getOriginalFilename());
        documentDO.setEnabled(1);
        documentDO.setChunkCount(0);
        documentDO.setFileUrl(fileUrl);
        documentDO.setFileType(getFileType(file));
        documentDO.setFileSize(file.getSize());
        documentDO.setProcessMode(StrUtil.isNotBlank(processMode) ? processMode : "chunk");
        documentDO.setStatus("pending");
        documentDO.setSourceType("file");
        documentDO.setChunkStrategy(StrUtil.isNotBlank(chunkStrategy) ? chunkStrategy : "structure_aware");
        documentDO.setChunkConfig(chunkConfig);
        documentDO.setCreatedBy("system");
        documentDO.setCreateTime(LocalDateTime.now());
        documentDO.setUpdateTime(LocalDateTime.now());
        documentDO.setDeleted(0);

        documentMapper.insert(documentDO);

        log.info("Document uploaded: docId={}, kbId={}, fileName={}, size={}",
                documentDO.getId(), kbId, documentDO.getDocName(), file.getSize());

        return toVO(documentDO);
    }

    @Override
    public void triggerChunking(String docId) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }

        if ("success".equals(documentDO.getStatus())) {
            log.warn("Document already processed: docId={}", docId);
            return;
        }

        documentDO.setStatus("running");
        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);

        // 发送 MQ 消息，异步处理分块
        chunkProducer.sendChunkMessage(docId);

        log.info("Chunking triggered for document: docId={}", docId);
    }

    @Override
    public void executeChunking(String docId) {
        Instant totalStart = Instant.now();

        KnowledgeDocumentChunkLogDO logDO = new KnowledgeDocumentChunkLogDO();
        logDO.setId(generateLogId());
        logDO.setDocId(docId);
        logDO.setStatus("running");
        logDO.setStartTime(LocalDateTime.now());
        logDO.setCreateTime(LocalDateTime.now());

        try {
            KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
            if (documentDO == null) {
                throw new IllegalArgumentException("Document not found: " + docId);
            }

            logDO.setProcessMode(documentDO.getProcessMode());
            logDO.setChunkStrategy(documentDO.getChunkStrategy());

            Instant extractStart = Instant.now();
            String text = extractText(documentDO);
            long extractDuration = Duration.between(extractStart, Instant.now()).toMillis();
            logDO.setExtractDuration(extractDuration);
            log.info("Text extracted: docId={}, duration={}ms, textLength={}", docId, extractDuration, text.length());

            // 生成摘要和关键词
            Instant summaryStart = Instant.now();
            String summary = aiSummaryService.generateSummary(text);
            List<String> keywords = aiSummaryService.extractKeywords(text, 5);
            long summaryDuration = Duration.between(summaryStart, Instant.now()).toMillis();
            log.info("Summary and keywords generated: docId={}, duration={}ms", docId, summaryDuration);

            Instant chunkStart = Instant.now();
            List<VectorChunk> chunks = chunkText(text, documentDO);
            long chunkDuration = Duration.between(chunkStart, Instant.now()).toMillis();
            logDO.setChunkDuration(chunkDuration);
            log.info("Text chunked: docId={}, duration={}ms, chunkCount={}", docId, chunkDuration, chunks.size());

            Instant embedStart = Instant.now();
            String embeddingModel = getEmbeddingModel(documentDO.getKbId());
            chunkEmbeddingService.embed(chunks, embeddingModel);
            long embedDuration = Duration.between(embedStart, Instant.now()).toMillis();
            logDO.setEmbedDuration(embedDuration);
            log.info("Chunks embedded: docId={}, duration={}ms", docId, embedDuration);

            Instant persistStart = Instant.now();
            persistChunksAndVectors(documentDO, chunks, summary, keywords);
            long persistDuration = Duration.between(persistStart, Instant.now()).toMillis();
            logDO.setPersistDuration(persistDuration);

            long totalDuration = Duration.between(totalStart, Instant.now()).toMillis();
            logDO.setStatus("success");
            logDO.setTotalDuration(totalDuration);
            logDO.setChunkCount(chunks.size());
            logDO.setEndTime(LocalDateTime.now());

            log.info("Document chunking completed: docId={}, totalDuration={}ms, chunkCount={}",
                    docId, totalDuration, chunks.size());

        } catch (Exception e) {
            log.error("Document chunking failed: docId={}", docId, e);
            logDO.setStatus("failed");
            logDO.setErrorMessage(e.getMessage());
            logDO.setEndTime(LocalDateTime.now());

            KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
            if (documentDO != null) {
                documentDO.setStatus("failed");
                documentDO.setUpdateTime(LocalDateTime.now());
                documentMapper.updateById(documentDO);
            }
        } finally {
            chunkLogMapper.insert(logDO);
        }
    }

    private String extractText(KnowledgeDocumentDO documentDO) {
        String fileUrl = documentDO.getFileUrl();
        log.debug("Extracting text from file: fileUrl={}, docName={}", fileUrl, documentDO.getDocName());

        try (InputStream is = getFileInputStream(fileUrl)) {
            String text = parserSelector
                    .select(ParserType.TIKA.getType())
                    .extractText(is, documentDO.getDocName());

            log.debug("Raw extracted text length: {}", text.length());

            // 检查提取的文本是否为空或太短
            if (StrUtil.isBlank(text)) {
                log.warn("Extracted text is empty or blank! docId={}", documentDO.getId());
                throw new RuntimeException("Failed to extract text from document: extracted text is empty");
            }

            if (text.length() < 10) {
                log.warn("Extracted text is too short ({} chars)! docId={}", text.length(), documentDO.getId());
            }

            return text;
        } catch (Exception e) {
            log.error("Failed to extract text from document: docId={}, fileUrl={}", documentDO.getId(), fileUrl, e);
            throw new RuntimeException("Failed to extract text from document: " + documentDO.getId(), e);
        }
    }

    private List<VectorChunk> chunkText(String text, KnowledgeDocumentDO documentDO) {
        String strategy = documentDO.getChunkStrategy();
        ChunkingStrategy chunkingStrategy = strategyCache.getOrDefault(
                strategy, new StructureAwareTextChunker());

        ChunkConfig config = parseChunkConfig(documentDO.getChunkConfig());
        return chunkingStrategy.chunk(text, config);
    }

    private ChunkConfig parseChunkConfig(String configJson) {
        if (StrUtil.isBlank(configJson)) {
            return ChunkConfig.builder()
                    .maxChunkSize(500)
                    .overlapSize(50)
                    .minChunkSize(100)
                    .structured(true)
                    .build();
        }
        try {
            return objectMapper.readValue(configJson, ChunkConfig.class);
        } catch (Exception e) {
            log.warn("Failed to parse chunk config, using defaults", e);
            return ChunkConfig.builder()
                    .maxChunkSize(500)
                    .overlapSize(50)
                    .minChunkSize(100)
                    .structured(true)
                    .build();
        }
    }

    @Transactional(rollbackFor = Exception.class)
    protected void persistChunksAndVectors(KnowledgeDocumentDO documentDO, List<VectorChunk> chunks,
                                           String summary, List<String> keywords) {
        String docId = documentDO.getId();
        String kbId = documentDO.getKbId();

        // Milvus 集合名称必须以字母或下划线开头，不能以数字开头
        // 如果 kbId 以数字开头，添加前缀
        String collectionName = kbId;
        if (kbId != null && kbId.length() > 0 && !Character.isLetter(kbId.charAt(0)) && kbId.charAt(0) != '_') {
            collectionName = "kb_" + kbId;
            log.debug("Converted kbId to collection name: {} -> {}", kbId, collectionName);
        }

        // 确保 Milvus 集合存在（自动创建索引并加载）
        try {
            // 获取知识库以获取描述
            var knowledgeBase = knowledgeBaseService.getKnowledgeBase(kbId);
            String description = knowledgeBase.getName();
            milvusService.createCollection(collectionName, description);
            log.info("Collection ensured: collectionName={}, description={}", collectionName, description);
        } catch (Exception e) {
            log.error("Failed to ensure collection: collectionName={}", collectionName, e);
            throw new RuntimeException("Failed to ensure Milvus collection: " + collectionName, e);
        }

        // 删除旧的分块数据
        LambdaQueryWrapper<KnowledgeChunkDO> deleteWrapper = new LambdaQueryWrapper<>();
        deleteWrapper.eq(KnowledgeChunkDO::getDocId, docId);
        chunkMapper.delete(deleteWrapper);

        // 删除 Milvus 中的旧向量数据
        milvusService.deleteByDocId(collectionName, docId);

        List<KnowledgeChunkDO> chunkDOs = new ArrayList<>();
        List<MilvusService.VectorData> vectorDataList = new ArrayList<>();

        for (VectorChunk chunk : chunks) {
            KnowledgeChunkDO chunkDO = new KnowledgeChunkDO();
            chunkDO.setId(generateChunkId());
            chunkDO.setKbId(kbId);
            chunkDO.setDocId(docId);
            chunkDO.setChunkIndex(chunk.getIndex());
            chunkDO.setContent(chunk.getContent());
            chunkDO.setContentHash(chunk.getContentHash());
            chunkDO.setCharCount(chunk.getCharCount());
            chunkDO.setTokenCount(chunk.getTokenCount());
            chunkDO.setEnabled(1);
            chunkDO.setCreatedBy("system");
            chunkDO.setCreateTime(LocalDateTime.now());
            chunkDO.setUpdateTime(LocalDateTime.now());
            chunkDO.setDeleted(0);
            chunkDOs.add(chunkDO);

            vectorDataList.add(new MilvusService.VectorData(
                    chunkDO.getId(),
                    chunk.getContent(),
                    chunk.getEmbedding()
            ));
        }

        // 持久化分块数据到数据库
        for (KnowledgeChunkDO chunkDO : chunkDOs) {
            chunkMapper.insert(chunkDO);
        }

        // 批量插入向量到 Milvus
        var knowledgeBase = knowledgeBaseService.getKnowledgeBase(kbId);
        String description = knowledgeBase.getName();
        milvusService.batchInsertVectors(collectionName, docId, vectorDataList, description);

        documentDO.setStatus("success");
        documentDO.setChunkCount(chunks.size());
        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);

        log.info("Chunks persisted: docId={}, chunkCount={}", docId, chunks.size());

        // 更新摘要和关键词
        documentDO.setSummary(summary);
        documentDO.setKeywords(String.join(",", keywords));
        documentMapper.updateById(documentDO);

        log.info("Summary and keywords updated: docId={}, summaryLength={}, keywords={}",
                docId, summary.length(), keywords);
    }

    private InputStream getFileInputStream(String fileUrl) {
        return rustFsStorageService.downloadFile(fileUrl);
    }

    private String getEmbeddingModel(String kbId) {
        // 使用默认的 Embedding 模型
        return "BAAI/bge-large-zh-v1.5";
    }

    private String generateDocId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }

    private String generateChunkId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }

    private String generateLogId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }

    private String getFileType(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (StrUtil.isBlank(originalFilename)) {
            return "unknown";
        }
        String extension = getFileExtension(originalFilename);
        return switch (extension.toLowerCase()) {
            case "pdf" -> "pdf";
            case "doc", "docx" -> "word";
            case "xls", "xlsx" -> "excel";
            case "ppt", "pptx" -> "powerpoint";
            case "md" -> "markdown";
            case "txt" -> "text";
            default -> "other";
        };
    }

    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1) : "";
    }

    private KnowledgeDocumentVO toVO(KnowledgeDocumentDO documentDO) {
        // 获取所属知识库名称
        String kbName = null;
        try {
            var knowledgeBase = knowledgeBaseService.getKnowledgeBase(documentDO.getKbId());
            kbName = knowledgeBase.getName();
        } catch (Exception e) {
            log.warn("Failed to get knowledge base name for docId: {}, kbId: {}", documentDO.getId(), documentDO.getKbId(), e);
            kbName = "未知知识库";
        }

        return KnowledgeDocumentVO.builder()
                .id(documentDO.getId())
                .kbId(documentDO.getKbId())
                .kbName(kbName)
                .docName(documentDO.getDocName())
                .enabled(documentDO.getEnabled())
                .chunkCount(documentDO.getChunkCount())
                .fileUrl(documentDO.getFileUrl())
                .fileType(documentDO.getFileType())
                .fileSize(documentDO.getFileSize())
                .processMode(documentDO.getProcessMode())
                .status(documentDO.getStatus())
                .sourceType(documentDO.getSourceType())
                .summary(documentDO.getSummary())
                .keywords(documentDO.getKeywords())
                .createTime(documentDO.getCreateTime())
                .updateTime(documentDO.getUpdateTime())
                .build();
    }

    @Override
    public List<KnowledgeDocumentVO> listDocuments(String kbId, int pageNum, int pageSize) {
        Page<KnowledgeDocumentDO> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<KnowledgeDocumentDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeDocumentDO::getKbId, kbId)
                .eq(KnowledgeDocumentDO::getDeleted, 0)
                .orderByDesc(KnowledgeDocumentDO::getCreateTime);

        Page<KnowledgeDocumentDO> resultPage = documentMapper.selectPage(page, wrapper);

        return resultPage.getRecords().stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    public KnowledgeDocumentVO getDocument(String docId) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }
        return toVO(documentDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDocument(String docId) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }

        documentDO.setDeleted(1);
        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);
        documentMapper.deleteById(docId);

        LambdaQueryWrapper<KnowledgeChunkDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeChunkDO::getDocId, docId);
        chunkMapper.delete(wrapper);

        log.info("Document deleted: docId={}", docId);
    }

    @Override
    public void rebuildVectors(String docId) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }

        documentDO.setStatus("pending");
        documentDO.setChunkCount(0);
        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);

        triggerChunking(docId);

        log.info("Vector rebuild triggered: docId={}", docId);
    }

    @Override
    public KnowledgeDocumentDO getDocumentById(String docId) {
        return documentMapper.selectById(docId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateSummaryAndKeywords(String docId, String summary, List<String> keywords) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }

        documentDO.setSummary(summary);
        documentDO.setKeywords(String.join(",", keywords));
        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);

        log.info("Summary and keywords updated: docId={}, summaryLength={}, keywords={}",
                docId, summary != null ? summary.length() : 0, keywords.size());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateDocumentInfo(String docId, String docName, String summary, List<String> keywords) {
        KnowledgeDocumentDO documentDO = documentMapper.selectById(docId);
        if (documentDO == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }

        if (StrUtil.isNotBlank(docName)) {
            documentDO.setDocName(docName);
        }

        if (StrUtil.isNotBlank(summary)) {
            documentDO.setSummary(summary);
        }

        if (keywords != null && !keywords.isEmpty()) {
            documentDO.setKeywords(String.join(",", keywords));
        }

        documentDO.setUpdateTime(LocalDateTime.now());
        documentMapper.updateById(documentDO);

        log.info("Document info updated: docId={}, docName={}, summaryLength={}, keywords={}",
                docId, docName, summary != null ? summary.length() : 0, keywords);
    }

    @Override
    public int countDocuments() {
        LambdaQueryWrapper<KnowledgeDocumentDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeDocumentDO::getDeleted, 0);
        return Math.toIntExact(documentMapper.selectCount(wrapper));
    }

    @Override
    public Page<KnowledgeDocumentVO> queryDocuments(QueryDocumentRequest request) {
        Page<KnowledgeDocumentDO> page = new Page<>(request.getPageNum(), request.getPageSize());
        LambdaQueryWrapper<KnowledgeDocumentDO> wrapper = new LambdaQueryWrapper<>();

        // 文档名称模糊查询
        if (StrUtil.isNotBlank(request.getDocName())) {
            wrapper.like(KnowledgeDocumentDO::getDocName, request.getDocName());
        }

        // 所属知识库查询
        if (StrUtil.isNotBlank(request.getKbId())) {
            wrapper.eq(KnowledgeDocumentDO::getKbId, request.getKbId());
        }

        // 文档状态查询
        if (StrUtil.isNotBlank(request.getStatus())) {
            wrapper.eq(KnowledgeDocumentDO::getStatus, request.getStatus());
        }

        // 文件类型查询
        if (StrUtil.isNotBlank(request.getFileType())) {
            wrapper.eq(KnowledgeDocumentDO::getFileType, request.getFileType());
        }

        // 创建时间范围查询
        if (request.getStartTime() != null) {
            wrapper.ge(KnowledgeDocumentDO::getCreateTime, request.getStartTime());
        }
        if (request.getEndTime() != null) {
            wrapper.le(KnowledgeDocumentDO::getCreateTime, request.getEndTime());
        }

        // 只查询未删除的文档
        wrapper.eq(KnowledgeDocumentDO::getDeleted, 0);

        // 按创建时间降序排序
        wrapper.orderByDesc(KnowledgeDocumentDO::getCreateTime);

        Page<KnowledgeDocumentDO> resultPage = documentMapper.selectPage(page, wrapper);

        // 转换为VO对象
        Page<KnowledgeDocumentVO> voPage = new Page<>();
        voPage.setCurrent(resultPage.getCurrent());
        voPage.setSize(resultPage.getSize());
        voPage.setTotal(resultPage.getTotal());
        voPage.setPages(resultPage.getPages());
        voPage.setRecords(resultPage.getRecords().stream().map(this::toVO).toList());

        return voPage;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDocuments(List<String> docIds) {
        if (docIds == null || docIds.isEmpty()) {
            return;
        }

        // 逻辑删除文档
        LambdaQueryWrapper<KnowledgeDocumentDO> updateWrapper = new LambdaQueryWrapper<>();
        updateWrapper.in(KnowledgeDocumentDO::getId, docIds);
        KnowledgeDocumentDO updateDO = new KnowledgeDocumentDO();
        updateDO.setDeleted(1);
        updateDO.setUpdateTime(LocalDateTime.now());
        documentMapper.update(updateDO, updateWrapper);
        documentMapper.delete(updateWrapper);

        // 删除对应的分块数据
        LambdaQueryWrapper<KnowledgeChunkDO> deleteChunkWrapper = new LambdaQueryWrapper<>();
        deleteChunkWrapper.in(KnowledgeChunkDO::getDocId, docIds);
        chunkMapper.delete(deleteChunkWrapper);

        log.info("Documents deleted: docIds={}", docIds);
    }

    @Override
    public int countDocumentsByKbId(String kbId) {
        LambdaQueryWrapper<KnowledgeDocumentDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeDocumentDO::getKbId, kbId)
                .eq(KnowledgeDocumentDO::getDeleted, 0);
        return Math.toIntExact(documentMapper.selectCount(wrapper));
    }
}
