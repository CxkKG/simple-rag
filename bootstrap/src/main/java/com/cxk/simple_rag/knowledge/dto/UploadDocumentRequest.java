package com.cxk.simple_rag.knowledge.dto;

import lombok.Builder;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

/**
 * 知识库文档上传请求 DTO
 *
 * @author wangxin
 */
@Data
@Builder
public class UploadDocumentRequest {

    private String kbId;

    private MultipartFile file;

    private String docName;

    private String processMode;

    private String chunkStrategy;

    private String chunkConfig;
}
