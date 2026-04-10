package com.cxk.simple_rag.knowledge.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 知识库文档分块请求 DTO
 *
 * @author wangxin
 */
@Data
@Builder
public class ChunkDocumentRequest {

    private String docId;

    private String processMode;

    private String chunkStrategy;

    private String chunkConfig;
}
