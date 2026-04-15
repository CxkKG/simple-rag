package com.cxk.simple_rag.conversation.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 会话消息表实体类
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@TableName("t_message")
public class MessageDO {

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
     * 消息角色：user / assistant
     */
    private String role;

    /**
     * 消息内容
     */
    private String content;

    /**
     * 上下文来源（JSON 格式）
     */
    private String contextSources;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;
}
