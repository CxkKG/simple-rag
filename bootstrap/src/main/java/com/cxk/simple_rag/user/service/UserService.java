package com.cxk.simple_rag.user.service;

import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.vo.UserVO;

/**
 * 用户服务接口
 *
 * @author wangxin
 */
public interface UserService {

    /**
     * 用户注册
     *
     * @param request 注册请求
     * @return 用户信息
     */
    UserVO register(RegisterRequest request);

    /**
     * 用户登录
     *
     * @param request 登录请求
     * @return 用户信息
     */
    UserVO login(LoginRequest request);

    /**
     * 根据 ID 获取用户信息
     *
     * @param userId 用户 ID
     * @return 用户信息
     */
    UserVO getUserById(String userId);

    /**
     * 根据用户名获取用户信息
     *
     * @param username 用户名
     * @return 用户信息
     */
    UserVO getUserByUsername(String username);
}
