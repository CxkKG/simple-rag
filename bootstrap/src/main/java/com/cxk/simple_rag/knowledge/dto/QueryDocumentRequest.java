package com.cxk.simple_rag.knowledge.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 文档查询请求 DTO
 *
 * @author wangxin
 */
@Data
public class QueryDocumentRequest {

    /**
     * 文档名称（模糊匹配）
     */
    private String docName;

    /**
     * 所属知识库 ID
     */
    private String kbId;

    /**
     * 创建时间范围 - 开始时间
     */
    private LocalDateTime startTime;

    /**
     * 创建时间范围 - 结束时间
     */
    private LocalDateTime endTime;

    /**
     * 文档状态（pending/running/success/failed）
     */
    private String status;

    /**
     * 文件类型（pdf/word/excel/powerpoint/markdown/text/other）
     */
    private String fileType;

    /**
     * 页码
     */
    private Integer pageNum = 1;

    /**
     * 每页大小
     */
    private Integer pageSize = 10;
}
