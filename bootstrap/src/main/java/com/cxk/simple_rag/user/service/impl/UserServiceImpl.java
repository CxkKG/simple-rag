package com.cxk.simple_rag.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.entity.UserDO;
import com.cxk.simple_rag.user.mapper.UserMapper;
import com.cxk.simple_rag.user.service.UserService;
import com.cxk.simple_rag.user.vo.UserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO register(RegisterRequest request) {
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getUsername, request.getUsername());
        queryWrapper.eq(UserDO::getDeleted, 0);
        UserDO existingUser = userMapper.selectOne(queryWrapper);
        if (existingUser != null) {
            throw new IllegalArgumentException("用户名已存在");
        }

        UserDO user = new UserDO();
        user.setUsername(request.getUsername());
        user.setPassword(BCrypt.hashpw(request.getPassword()));
        user.setRole("user");
        user.setAvatar(request.getAvatar());
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);

        userMapper.insert(user);

        // 注册后自动登录
        StpUtil.login(user.getId());
        return convertToVO(user, StpUtil.getTokenValue());
    }

    @Override
    public UserVO login(LoginRequest request) {
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getUsername, request.getUsername());
        queryWrapper.eq(UserDO::getDeleted, 0);
        UserDO user = userMapper.selectOne(queryWrapper);

        if (user == null) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        StpUtil.login(user.getId());
        return convertToVO(user, StpUtil.getTokenValue());
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public UserVO getCurrentUser() {
        String userId = StpUtil.getLoginIdAsString();
        UserDO user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }
        return convertToVO(user, null);
    }

    @Override
    public UserVO getUserById(String userId) {
        UserDO user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }
        return convertToVO(user, null);
    }

    @Override
    public UserVO getUserByUsername(String username) {
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getUsername, username);
        queryWrapper.eq(UserDO::getDeleted, 0);
        UserDO user = userMapper.selectOne(queryWrapper);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        return convertToVO(user, null);
    }

    @Override
    public List<UserVO> listUsers(int pageNum, int pageSize) {
        int startRow = (pageNum - 1) * pageSize;
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getDeleted, 0);
        queryWrapper.last("LIMIT " + pageSize + " OFFSET " + startRow);
        List<UserDO> users = userMapper.selectList(queryWrapper);
        return users.stream().map(u -> convertToVO(u, null)).toList();
    }

    @Override
    public long getTotalUsers() {
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getDeleted, 0);
        return userMapper.selectCount(queryWrapper);
    }

    @Override
    public void deleteUser(String userId) {
        UserDO user = new UserDO();
        user.setId(userId);
        user.setDeleted(1);
        userMapper.updateById(user);
    }

    private UserVO convertToVO(UserDO user, String token) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .token(token)
                .createTime(user.getCreateTime())
                .build();
    }
}
