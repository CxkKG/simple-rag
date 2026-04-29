package com.cxk.simple_rag.conversation.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.conversation.dto.SearchConversationRequest;
import com.cxk.simple_rag.conversation.entity.ConversationDO;
import com.cxk.simple_rag.conversation.entity.MessageDO;
import com.cxk.simple_rag.conversation.mapper.ConversationMapper;
import com.cxk.simple_rag.conversation.mapper.MessageMapper;
import com.cxk.simple_rag.conversation.service.ConversationService;
import com.cxk.simple_rag.llm.LLMService;
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
    private final LLMService llmService;

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
    public ConversationDO getConversation(String conversationId, String userId) {
        ConversationDO conversation = getConversation(conversationId);
        if (conversation == null) {
            throw new IllegalArgumentException("会话不存在: " + conversationId);
        }
        if (!conversation.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权访问该会话");
        }
        return conversation;
    }

    @Override
    public void renameConversation(String conversationId, String userId, String title) {
        ConversationDO conversation = getConversation(conversationId, userId);

        conversation.setTitle(StrUtil.isBlank(title) ? "新会话" : title);
        conversation.setUpdateTime(new Date());
        conversationMapper.updateById(conversation);
        log.info("Conversation renamed: conversationId={}, title={}", conversationId, title);
    }

    @Override
    public void deleteConversation(String conversationId, String userId) {
        ConversationDO conversation = getConversation(conversationId, userId);

        LambdaUpdateWrapper<ConversationDO> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(ConversationDO::getConversationId, conversationId)
                .eq(ConversationDO::getUserId, userId)
                .set(ConversationDO::getDeleted, 1)
                .set(ConversationDO::getUpdateTime, new Date());
        conversationMapper.update(null, wrapper);
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

    @Override
    public Page<ConversationDO> searchConversations(String userId, SearchConversationRequest request) {
        Page<ConversationDO> page = new Page<>(request.getPageNum(), request.getPageSize());
        String keyword = request.getKeyword();

        LambdaQueryWrapper<ConversationDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ConversationDO::getUserId, userId)
                .eq(ConversationDO::getDeleted, 0);

        if (StrUtil.isNotBlank(keyword)) {
            // 查找消息内容匹配的 conversationId
            LambdaQueryWrapper<MessageDO> msgWrapper = new LambdaQueryWrapper<>();
            msgWrapper.select(MessageDO::getConversationId)
                    .like(MessageDO::getContent, keyword)
                    .groupBy(MessageDO::getConversationId);
            List<MessageDO> matchingMessages = messageMapper.selectList(msgWrapper);
            List<String> matchingConversationIds = matchingMessages.stream()
                    .map(MessageDO::getConversationId)
                    .distinct()
                    .toList();

            if (matchingConversationIds.isEmpty()) {
                wrapper.like(ConversationDO::getTitle, keyword);
            } else {
                wrapper.and(w -> w.like(ConversationDO::getTitle, keyword)
                        .or(ow -> ow.in(ConversationDO::getConversationId, matchingConversationIds)));
            }
        }

        wrapper.orderByDesc(ConversationDO::getLastTime);
        return conversationMapper.selectPage(page, wrapper);
    }

    @Override
    public String summarizeConversationTitle(String conversationId, String userId) {
        ConversationDO conversation = getConversation(conversationId, userId);

        List<MessageDO> messages = getMessages(conversationId);
        if (messages.isEmpty()) {
            renameConversation(conversationId, userId, "新会话");
            return "新会话";
        }

        // 构建对话历史摘要
        StringBuilder historyBuilder = new StringBuilder();
        for (MessageDO msg : messages) {
            String roleLabel = "user".equals(msg.getRole()) ? "用户" : "AI";
            historyBuilder.append(roleLabel).append("：").append(msg.getContent()).append("\n");
        }

        String systemPrompt = "你是一个会话标题生成助手。请根据以下对话内容，生成一个简短的会话标题（不超过20个字），" +
                "只返回标题本身，不要包含任何标点符号以外的内容，不要加引号。";
        String userPrompt = "对话内容：\n" + historyBuilder;

        String generatedTitle = llmService.generate(systemPrompt, userPrompt);
        // 清理 LLM 返回中可能的引号或换行
        String title = generatedTitle.trim()
//                .replaceAll("^[\"'""]+|[\"'""]+$", "")
                .replaceAll("[\\r\\n]+", "")
                .trim();

        if (StrUtil.isBlank(title)) {
            title = "新会话";
        }
        // 截断过长标题
        if (title.length() > 50) {
            title = title.substring(0, 50);
        }

        renameConversation(conversationId, userId, title);
        log.info("Conversation title summarized: conversationId={}, title={}", conversationId, title);
        return title;
    }
}
