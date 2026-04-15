package com.cxk.simple_rag.conversation.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 会话表实体类
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_conversation")
public class ConversationDO {

    /**
     * 主键 ID
     */
    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    /**
     * 会话 ID
     */
    private String conversationId;

    /**
     * 用户 ID
     */
    private String userId;

    /**
     * 知识库 ID
     */
    private String kbId;

    /**
     * 会话标题
     */
    private String title;

    /**
     * 最后消息时间
     */
    private Date lastTime;

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
