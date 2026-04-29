package com.cxk.simple_rag.knowledge.service;

import com.cxk.simple_rag.knowledge.dto.QueryDocumentRequest;
import com.cxk.simple_rag.knowledge.dto.UploadDocumentRequest;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentContentVO;
import com.cxk.simple_rag.knowledge.vo.KnowledgeDocumentVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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

    Page<KnowledgeDocumentVO> queryDocuments(QueryDocumentRequest request);

    KnowledgeDocumentVO getDocument(String docId);

    String getDocumentContent(String docId);

    KnowledgeDocumentContentVO getDocumentContent(String docId, int pageNum, int pageSize);

    KnowledgeDocumentDO getDocumentById(String docId);

    void deleteDocument(String docId);

    void deleteDocuments(List<String> docIds);

    void rebuildVectors(String docId);

    void updateSummaryAndKeywords(String docId, String summary, List<String> keywords);

    void updateDocumentInfo(String docId, String docName, String summary, List<String> keywords);

    int countDocuments();

    int countDocumentsByKbId(String kbId);
}
