package com.cxk.simple_rag.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cxk.simple_rag.user.dto.ChangeEmailRequest;
import com.cxk.simple_rag.user.dto.ChangePasswordRequest;
import com.cxk.simple_rag.user.dto.EmailRegisterRequest;
import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.dto.ResetPasswordRequest;
import com.cxk.simple_rag.user.dto.SendCodeRequest;
import com.cxk.simple_rag.user.entity.UserDO;
import com.cxk.simple_rag.user.mapper.UserMapper;
import com.cxk.simple_rag.user.service.UserService;
import com.cxk.simple_rag.user.service.VerifyCodeService;
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
    private final VerifyCodeService verifyCodeService;

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
        // 使用请求中的角色，如果没有则默认为 student
        user.setRole(request.getRole() != null && !request.getRole().isBlank() ? request.getRole() : "student");
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
    @Transactional(rollbackFor = Exception.class)
    public UserVO registerByEmail(EmailRegisterRequest request) {
        if (!verifyCodeService.verifyCode(request.getEmail(), request.getCode(), "register")) {
            throw new IllegalArgumentException("验证码错误或已过期");
        }

        LambdaQueryWrapper<UserDO> emailQuery = new LambdaQueryWrapper<>();
        emailQuery.eq(UserDO::getEmail, request.getEmail());
        emailQuery.eq(UserDO::getDeleted, 0);
        if (userMapper.selectCount(emailQuery) > 0) {
            throw new IllegalArgumentException("该邮箱已注册");
        }

        String username = request.getUsername();
        if (username == null || username.isBlank()) {
            username = request.getEmail().split("@")[0];
        }

        LambdaQueryWrapper<UserDO> nameQuery = new LambdaQueryWrapper<>();
        nameQuery.eq(UserDO::getUsername, username);
        nameQuery.eq(UserDO::getDeleted, 0);
        if (userMapper.selectCount(nameQuery) > 0) {
            username = username + "_" + System.currentTimeMillis() % 10000;
        }

        UserDO user = new UserDO();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(BCrypt.hashpw(request.getPassword()));
        user.setRole("student");
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);

        userMapper.insert(user);

        StpUtil.login(user.getId());
        return convertToVO(user, StpUtil.getTokenValue());
    }

    @Override
    public void sendVerifyCode(SendCodeRequest request) {
        String email = request.getEmail();
        String type = request.getType();

        if ("register".equals(type)) {
            LambdaQueryWrapper<UserDO> query = new LambdaQueryWrapper<>();
            query.eq(UserDO::getEmail, email);
            query.eq(UserDO::getDeleted, 0);
            if (userMapper.selectCount(query) > 0) {
                throw new IllegalArgumentException("该邮箱已注册");
            }
        } else if ("reset_password".equals(type)) {
            LambdaQueryWrapper<UserDO> query = new LambdaQueryWrapper<>();
            query.eq(UserDO::getEmail, email);
            query.eq(UserDO::getDeleted, 0);
            if (userMapper.selectCount(query) == 0) {
                throw new IllegalArgumentException("该邮箱未注册");
            }
        } else if ("change_email".equals(type)) {
            LambdaQueryWrapper<UserDO> query = new LambdaQueryWrapper<>();
            query.eq(UserDO::getEmail, email);
            query.eq(UserDO::getDeleted, 0);
            if (userMapper.selectCount(query) > 0) {
                throw new IllegalArgumentException("该邮箱已被其他账号使用");
            }
        } else if (!"change_password".equals(type)) {
            throw new IllegalArgumentException("不支持的验证码类型");
        }

        verifyCodeService.sendCode(email, type);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resetPassword(ResetPasswordRequest request) {
        if (!verifyCodeService.verifyCode(request.getEmail(), request.getCode(), "reset_password")) {
            throw new IllegalArgumentException("验证码错误或已过期");
        }

        LambdaQueryWrapper<UserDO> query = new LambdaQueryWrapper<>();
        query.eq(UserDO::getEmail, request.getEmail());
        query.eq(UserDO::getDeleted, 0);
        UserDO user = userMapper.selectOne(query);

        if (user == null) {
            throw new IllegalArgumentException("该邮箱未注册");
        }

        user.setPassword(BCrypt.hashpw(request.getNewPassword()));
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePassword(ChangePasswordRequest request) {
        String userId = StpUtil.getLoginIdAsString();
        UserDO user = userMapper.selectById(userId);

        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }

        boolean verified = false;

        if (request.getOldPassword() != null && !request.getOldPassword().isBlank()) {
            if (!BCrypt.checkpw(request.getOldPassword(), user.getPassword())) {
                throw new IllegalArgumentException("旧密码错误");
            }
            verified = true;
        }

        if (request.getCode() != null && !request.getCode().isBlank() && user.getEmail() != null) {
            if (!verifyCodeService.verifyCode(user.getEmail(), request.getCode(), "change_password")) {
                throw new IllegalArgumentException("验证码错误或已过期");
            }
            verified = true;
        }

        if (!verified) {
            throw new IllegalArgumentException("请提供旧密码或邮箱验证码进行验证");
        }

        user.setPassword(BCrypt.hashpw(request.getNewPassword()));
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeEmail(ChangeEmailRequest request) {
        if (!verifyCodeService.verifyCode(request.getNewEmail(), request.getCode(), "change_email")) {
            throw new IllegalArgumentException("验证码错误或已过期");
        }

        LambdaQueryWrapper<UserDO> emailQuery = new LambdaQueryWrapper<>();
        emailQuery.eq(UserDO::getEmail, request.getNewEmail());
        emailQuery.eq(UserDO::getDeleted, 0);
        if (userMapper.selectCount(emailQuery) > 0) {
            throw new IllegalArgumentException("该邮箱已被其他账号使用");
        }

        String userId = StpUtil.getLoginIdAsString();
        UserDO user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }

        user.setEmail(request.getNewEmail());
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
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
    @Transactional(rollbackFor = Exception.class)
    public UserVO updateUser(String userId, String username, String password, String role) {
        UserDO user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new IllegalArgumentException("用户不存在");
        }

        if (username != null && !username.isBlank() && !username.equals(user.getUsername())) {
            LambdaQueryWrapper<UserDO> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(UserDO::getUsername, username);
            queryWrapper.eq(UserDO::getDeleted, 0);
            queryWrapper.ne(UserDO::getId, userId);
            if (userMapper.selectCount(queryWrapper) > 0) {
                throw new IllegalArgumentException("用户名已存在");
            }
            user.setUsername(username);
        }
        if (password != null && !password.isBlank()) {
            user.setPassword(BCrypt.hashpw(password));
        }
        if (role != null && !role.isBlank()) {
            user.setRole(role);
        }
        user.setUpdateTime(LocalDateTime.now());
        userMapper.updateById(user);
        return convertToVO(user, null);
    }

    @Override
    public void deleteUser(String userId) {
        UserDO user = new UserDO();
        user.setId(userId);
        user.setDeleted(1);
        userMapper.deleteById(userId);
    }

    private UserVO convertToVO(UserDO user, String token) {
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .token(token)
                .createTime(user.getCreateTime())
                .build();
    }
}
