package com.cxk.simple_rag.config;

import cn.dev33.satoken.stp.StpInterface;
import cn.dev33.satoken.stp.StpUtil;
import com.cxk.simple_rag.user.entity.UserDO;
import com.cxk.simple_rag.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SaTokenConfig implements StpInterface {

    private final UserMapper userMapper;

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        return Collections.emptyList();
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        UserDO user = userMapper.selectById(loginId.toString());
        if (user == null) {
            return Collections.emptyList();
        }
        List<String> roles = new ArrayList<>();
        roles.add(user.getRole());
        return roles;
    }
}
