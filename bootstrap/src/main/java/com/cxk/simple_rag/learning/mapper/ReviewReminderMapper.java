package com.cxk.simple_rag.learning.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.learning.entity.ReviewReminderDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 复习提醒 Mapper
 *
 * @author wangxin
 */
@Mapper
public interface ReviewReminderMapper extends BaseMapper<ReviewReminderDO> {
}
