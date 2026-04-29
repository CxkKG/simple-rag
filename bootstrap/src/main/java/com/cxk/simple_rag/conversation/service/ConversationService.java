package com.cxk.simple_rag.conversation.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.conversation.dto.SearchConversationRequest;
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
     * 获取会话详情（带用户权限校验）
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     * @return 会话对象
     * @throws IllegalArgumentException 会话不存在或不属于该用户
     */
    ConversationDO getConversation(String conversationId, String userId);

    /**
     * 重命名会话
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     * @param title 新标题
     */
    void renameConversation(String conversationId, String userId, String title);

    /**
     * 删除会话
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     */
    void deleteConversation(String conversationId, String userId);

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

    /**
     * 搜索会话（按标题或消息内容）
     *
     * @param userId 用户 ID
     * @param request 搜索请求
     * @return 分页会话结果
     */
    Page<ConversationDO> searchConversations(String userId, SearchConversationRequest request);

    /**
     * AI 自动总结会话标题
     *
     * @param conversationId 会话 ID
     * @param userId 用户 ID
     * @return 生成的标题
     */
    String summarizeConversationTitle(String conversationId, String userId);
}
