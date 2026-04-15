package com.cxk.simple_rag.conversation.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cxk.simple_rag.conversation.entity.ConversationDO;
import com.cxk.simple_rag.conversation.entity.MessageDO;
import com.cxk.simple_rag.conversation.mapper.ConversationMapper;
import com.cxk.simple_rag.conversation.mapper.MessageMapper;
import com.cxk.simple_rag.conversation.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * 会话服务实现类
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;

    @Override
    public String createConversation(String kbId, String userId) {
        String conversationId = "conv_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        Date now = new Date();

        ConversationDO conversation = ConversationDO.builder()
                .id(generateId())
                .conversationId(conversationId)
                .userId(userId)
                .kbId(kbId)
                .title("新会话")
                .lastTime(now)
                .createTime(now)
                .updateTime(now)
                .deleted(0)
                .build();

        conversationMapper.insert(conversation);
        log.info("Conversation created: conversationId={}, kbId={}, userId={}", conversationId, kbId, userId);

        return conversationId;
    }

    @Override
    public ConversationDO getConversation(String conversationId) {
        LambdaQueryWrapper<ConversationDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConversationDO::getConversationId, conversationId)
                .eq(ConversationDO::getDeleted, 0);
        return conversationMapper.selectOne(wrapper);
    }

    @Override
    public void renameConversation(String conversationId, String title) {
        ConversationDO conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        conversation.setTitle(StrUtil.isBlank(title) ? "新会话" : title);
        conversation.setUpdateTime(new Date());
        conversationMapper.updateById(conversation);
        log.info("Conversation renamed: conversationId={}, title={}", conversationId, title);
    }

    @Override
    public void deleteConversation(String conversationId) {
        ConversationDO conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        conversation.setDeleted(1);
        conversation.setUpdateTime(new Date());
        conversationMapper.updateById(conversation);
        log.info("Conversation deleted: conversationId={}", conversationId);
    }

    @Override
    public List<ConversationDO> listConversations(String userId) {
        LambdaQueryWrapper<ConversationDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConversationDO::getUserId, userId)
                .eq(ConversationDO::getDeleted, 0)
                .orderByDesc(ConversationDO::getLastTime);
        return conversationMapper.selectList(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String addMessage(String conversationId, String role, String content, String contextSources) {
        ConversationDO conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("Conversation not found: " + conversationId);
        }

        Date now = new Date();
        MessageDO message = MessageDO.builder()
                .id(generateId())
                .conversationId(conversationId)
                .role(role)
                .content(content)
                .contextSources(contextSources)
                .createTime(now)
                .build();
        messageMapper.insert(message);

        // 更新会话的最后消息时间
        conversation.setLastTime(now);
        conversation.setUpdateTime(now);
        conversationMapper.updateById(conversation);

        log.debug("Message added: conversationId={}, role={}", conversationId, role);
        return message.getId();
    }

    @Override
    public List<MessageDO> getMessages(String conversationId) {
        LambdaQueryWrapper<MessageDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MessageDO::getConversationId, conversationId)
                .orderByAsc(MessageDO::getCreateTime);
        return messageMapper.selectList(wrapper);
    }

    private String generateId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }
}
