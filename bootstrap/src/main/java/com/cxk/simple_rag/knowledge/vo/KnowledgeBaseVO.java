package com.cxk.simple_rag.knowledge.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库 VO
 *
 * @author wangxin
 */
@Data
@Builder
public class KnowledgeBaseVO {

    private String id;

    private String name;

    private String embeddingModel;

    private String collectionName;

    private String createdBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
