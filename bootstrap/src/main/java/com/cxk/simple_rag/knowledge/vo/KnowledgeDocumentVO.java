package com.cxk.simple_rag.knowledge.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库文档 VO
 *
 * @author wangxin
 */
@Data
@Builder
public class KnowledgeDocumentVO {

    private String id;

    private String kbId;

    private String docName;

    private Integer enabled;

    private Integer chunkCount;

    private String fileUrl;

    private String fileType;

    private Long fileSize;

    private String processMode;

    private String status;

    private String sourceType;

    private String summary;

    private String keywords;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
