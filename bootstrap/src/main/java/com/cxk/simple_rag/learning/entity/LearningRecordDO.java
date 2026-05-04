package com.cxk.simple_rag.learning.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 学习记录表实体类
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_learning_record")
public class LearningRecordDO {

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
     * 知识库 ID（课程）
     */
    private String kbId;

    /**
     * 关联的会话 ID
     */
    private String conversationId;

    /**
     * 关联的消息 ID（AI 答复消息）
     */
    private String messageId;

    /**
     * 提问内容
     */
    private String question;

    /**
     * AI 答复内容
     */
    private String answer;

    /**
     * 知识点标签，多个用英文逗号分隔
     */
    private String knowledgeTags;

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
