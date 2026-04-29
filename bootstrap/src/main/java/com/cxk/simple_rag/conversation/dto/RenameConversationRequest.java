package com.cxk.simple_rag.conversation.dto;

import lombok.Data;

/**
 * 重命名会话请求 DTO
 *
 * @author wangxin
 */
@Data
public class RenameConversationRequest {

    /**
     * 新标题
     */
    private String title;
}
