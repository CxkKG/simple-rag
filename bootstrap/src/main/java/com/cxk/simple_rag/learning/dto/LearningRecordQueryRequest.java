package com.cxk.simple_rag.learning.dto;

import lombok.Data;

/**
 * 学习记录查询请求
 *
 * @author wangxin
 */
@Data
public class LearningRecordQueryRequest {

    /**
     * 知识库 ID（按课程过滤）
     */
    private String kbId;

    /**
     * 关键字（提问/答复内容模糊匹配）
     */
    private String keyword;

    /**
     * 知识点标签（精确匹配单个标签）
     */
    private String tag;

    /**
     * 起始时间（yyyy-MM-dd HH:mm:ss）
     */
    private String startTime;

    /**
     * 截止时间
     */
    private String endTime;

    private Integer pageNum = 1;

    private Integer pageSize = 10;
}
