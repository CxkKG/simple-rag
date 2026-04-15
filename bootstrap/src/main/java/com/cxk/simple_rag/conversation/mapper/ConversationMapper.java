package com.cxk.simple_rag.conversation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.conversation.entity.ConversationDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 会话Mapper
 *
 * @author wangxin
 */
@Mapper
public interface ConversationMapper extends BaseMapper<ConversationDO> {
}
