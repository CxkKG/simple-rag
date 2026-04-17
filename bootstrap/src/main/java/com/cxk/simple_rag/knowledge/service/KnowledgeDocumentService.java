package com.cxk.simple_rag.knowledge.service;

import com.cxk.simple_rag.knowledge.dto.UploadDocumentRequest;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 知识库文档服务接口
 *
 * @author wangxin
 */
public interface KnowledgeDocumentService {

    KnowledgeDocumentVO uploadDocument(UploadDocumentRequest request);

    KnowledgeDocumentVO uploadDocument(String kbId, MultipartFile file, String docName,
                                        String processMode, String chunkStrategy, String chunkConfig);

    void triggerChunking(String docId);

    void executeChunking(String docId);

    List<KnowledgeDocumentVO> listDocuments(String kbId, int pageNum, int pageSize);

    KnowledgeDocumentVO getDocument(String docId);

    KnowledgeDocumentDO getDocumentById(String docId);

    void deleteDocument(String docId);

    void rebuildVectors(String docId);

    void updateSummaryAndKeywords(String docId, String summary, List<String> keywords);
}
