package com.cxk.simple_rag.conversation.service;

import com.cxk.simple_rag.conversation.entity.ConversationDO;
import com.cxk.simple_rag.conversation.entity.MessageDO;

import java.util.List;

/**
 * 会话服务接口
 *
 * @author wangxin
 */
public interface ConversationService {

    /**
     * 创建会话
     *
     * @param kbId 知识库 ID
     * @param userId 用户 ID
     * @return 会话 ID
     */
    String createConversation(String kbId, String userId);

    /**
     * 获取会话详情
     *
     * @param conversationId 会话 ID
     * @return 会话对象
     */
    ConversationDO getConversation(String conversationId);

    /**
     * 重命名会话
     *
     * @param conversationId 会话 ID
     * @param title 新标题
     */
    void renameConversation(String conversationId, String title);

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     */
    void deleteConversation(String conversationId);

    /**
     * 获取用户会话列表
     *
     * @param userId 用户 ID
     * @return 会话列表
     */
    List<ConversationDO> listConversations(String userId);

    /**
     * 添加消息到会话
     *
     * @param conversationId 会话 ID
     * @param role 消息角色
     * @param content 消息内容
     * @param contextSources 上下文来源
     * @return 消息 ID
     */
    String addMessage(String conversationId, String role, String content, String contextSources);

    /**
     * 获取会话消息列表
     *
     * @param conversationId 会话 ID
     * @return 消息列表
     */
    List<MessageDO> getMessages(String conversationId);
}
