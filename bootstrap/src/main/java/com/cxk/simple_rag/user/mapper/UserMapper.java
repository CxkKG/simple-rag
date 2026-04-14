package com.cxk.simple_rag.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.user.entity.UserDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户 Mapper 接口
 *
 * @author wangxin
 */
@Mapper
public interface UserMapper extends BaseMapper<UserDO> {

}
