package com.cxk.simple_rag.conversation.dto;

import lombok.Data;

/**
 * 会话搜索请求 DTO
 *
 * @author wangxin
 */
@Data
public class SearchConversationRequest {

    /**
     * 搜索关键词（匹配会话标题或消息内容）
     */
    private String keyword;

    /**
     * 页码
     */
    private Integer pageNum = 1;

    /**
     * 每页大小
     */
    private Integer pageSize = 10;
}
