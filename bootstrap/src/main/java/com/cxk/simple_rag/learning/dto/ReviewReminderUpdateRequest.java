package com.cxk.simple_rag.learning.dto;

import lombok.Data;

/**
 * 更新复习提醒请求
 *
 * @author wangxin
 */
@Data
public class ReviewReminderUpdateRequest {

    /**
     * 复习主题
     */
    private String topic;

    /**
     * 备注信息
     */
    private String remark;

    /**
     * 提醒时间（yyyy-MM-dd HH:mm:ss）
     */
    private String remindTime;

    /**
     * 状态：0-待提醒，1-已提醒，2-已完成，3-已取消
     */
    private Integer status;
}
