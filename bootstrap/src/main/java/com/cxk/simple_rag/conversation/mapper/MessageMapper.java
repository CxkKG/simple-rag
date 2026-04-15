package com.cxk.simple_rag.conversation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.conversation.entity.MessageDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 会话消息Mapper
 *
 * @author wangxin
 */
@Mapper
public interface MessageMapper extends BaseMapper<MessageDO> {
}
