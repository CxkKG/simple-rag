package com.cxk.simple_rag.knowledge.service;

import com.cxk.simple_rag.knowledge.entity.KnowledgeBaseDO;
import com.cxk.simple_rag.knowledge.vo.KnowledgeBaseVO;

import java.util.List;

/**
 * 知识库服务接口
 *
 * @author wangxin
 */
public interface KnowledgeBaseService {

    KnowledgeBaseVO createKnowledgeBase(String name, String embeddingModel, String createdBy);

    KnowledgeBaseVO getKnowledgeBase(String id);

    List<KnowledgeBaseVO> listKnowledgeBases(int pageNum, int pageSize);

    KnowledgeBaseVO updateKnowledgeBase(String id, String name);

    void deleteKnowledgeBase(String id);

    int countKnowledgeBases();
}
