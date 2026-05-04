package com.cxk.simple_rag.learning.dto;

import lombok.Data;

/**
 * 复习提醒查询请求
 *
 * @author wangxin
 */
@Data
public class ReviewReminderQueryRequest {

    /**
     * 知识库 ID
     */
    private String kbId;

    /**
     * 状态：0-待提醒，1-已提醒，2-已完成，3-已取消
     */
    private Integer status;

    /**
     * 起始时间
     */
    private String startTime;

    /**
     * 截止时间
     */
    private String endTime;

    private Integer pageNum = 1;

    private Integer pageSize = 10;
}
