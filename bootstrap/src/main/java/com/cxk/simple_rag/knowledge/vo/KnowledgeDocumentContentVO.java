package com.cxk.simple_rag.knowledge.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class KnowledgeDocumentContentVO {

    private String content;

    private Integer total;

    private Integer pageNum;

    private Integer pageSize;

    private Integer pages;

    private String fileType;

    private String docName;

    private Boolean previewOnly;

    private Boolean oversized;

    private String errorMessage;
}
