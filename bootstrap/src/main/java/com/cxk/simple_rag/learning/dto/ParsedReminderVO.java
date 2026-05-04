package com.cxk.simple_rag.learning.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 自然语言解析结果 VO
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsedReminderVO {

    /**
     * 解析得到的提醒时间
     */
    private Date remindTime;

    /**
     * 解析得到的复习主题
     */
    private String topic;

    /**
     * 备注信息
     */
    private String remark;

    /**
     * 解析方式：llm / regex / explicit
     */
    private String source;
}
