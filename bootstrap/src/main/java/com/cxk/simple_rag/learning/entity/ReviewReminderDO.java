package com.cxk.simple_rag.learning.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 复习提醒表实体类
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_review_reminder")
public class ReviewReminderDO {

    /**
     * 主键 ID
     */
    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    /**
     * 用户 ID
     */
    private String userId;

    /**
     * 关联的知识库 ID（可空）
     */
    private String kbId;

    /**
     * 复习主题
     */
    private String topic;

    /**
     * 备注信息
     */
    private String remark;

    /**
     * 用户原始输入文本
     */
    private String rawText;

    /**
     * 提醒时间
     */
    private Date remindTime;

    /**
     * 状态：0-待提醒，1-已提醒，2-已完成，3-已取消
     */
    private Integer status;

    /**
     * 实际通知时间
     */
//    @TableField(updateStrategy = FieldStrategy.IGNORED)
    private Date notifiedAt;

    /**
     * 关联的学习记录 ID
     */
    private String sourceRecordId;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    /**
     * 更新时间
     */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Date updateTime;

    /**
     * 逻辑删除标志
     */
    @TableLogic
    private Integer deleted;
}
