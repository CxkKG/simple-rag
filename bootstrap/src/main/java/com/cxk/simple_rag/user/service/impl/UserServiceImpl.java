package com.cxk.simple_rag.user.service.impl;

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

/**
 * 用户服务实现类
 *
 * @author wangxin
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO register(RegisterRequest request) {
        // 检查用户名是否已存在
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getUsername, request.getUsername());
        queryWrapper.eq(UserDO::getDeleted, 0);
        UserDO existingUser = userMapper.selectOne(queryWrapper);
        if (existingUser != null) {
            throw new IllegalArgumentException("用户名已存在");
        }

        // 创建用户
        UserDO user = new UserDO();
        user.setUsername(request.getUsername());
        user.setPassword(BCrypt.hashpw(request.getPassword()));
        user.setRole("user"); // 默认角色为用户
        user.setAvatar(request.getAvatar());
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);

        userMapper.insert(user);

        return convertToVO(user);
    }

    @Override
    public UserVO login(LoginRequest request) {
        // 查询用户
        LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserDO::getUsername, request.getUsername());
        queryWrapper.eq(UserDO::getDeleted, 0);
        UserDO user = userMapper.selectOne(queryWrapper);

        if (user == null) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        // 验证密码
        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        return convertToVO(user);
    }

    @Override
    public UserVO getUserById(String userId) {
        UserDO user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }
        return convertToVO(user);
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
        return convertToVO(user);
    }

    /**
     * 将 DO 转换为 VO
     */
    private UserVO convertToVO(UserDO user) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .createTime(user.getCreateTime())
                .build();
    }
}
