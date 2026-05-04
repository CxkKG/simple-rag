package com.cxk.simple_rag.learning.dto;

import lombok.Data;

/**
 * 创建复习提醒请求
 *
 * @author wangxin
 */
@Data
public class ReviewReminderCreateRequest {

    /**
     * 用户原始输入文本（用于自然语言时间解析）
     */
    private String rawText;

    /**
     * 复习主题（可选；为空时由 LLM/解析器从 rawText 推断）
     */
    private String topic;

    /**
     * 备注信息
     */
    private String remark;

    /**
     * 关联知识库 ID
     */
    private String kbId;

    /**
     * 关联学习记录 ID
     */
    private String sourceRecordId;

    /**
     * 显式提醒时间（yyyy-MM-dd HH:mm:ss）；不为空时优先使用
     */
    private String remindTime;
}
