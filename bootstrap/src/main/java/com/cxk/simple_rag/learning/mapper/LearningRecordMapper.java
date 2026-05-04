package com.cxk.simple_rag.learning.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.learning.entity.LearningRecordDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 学习记录 Mapper
 *
 * @author wangxin
 */
@Mapper
public interface LearningRecordMapper extends BaseMapper<LearningRecordDO> {
}
