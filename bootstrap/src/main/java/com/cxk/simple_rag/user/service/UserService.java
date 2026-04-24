package com.cxk.simple_rag.user.service;

import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.vo.UserVO;

import java.util.List;

/**
 * 用户服务接口
 *
 * @author wangxin
 */
public interface UserService {

    UserVO register(RegisterRequest request);

    UserVO login(LoginRequest request);

    void logout();

    UserVO getCurrentUser();

    UserVO getUserById(String userId);

    UserVO getUserByUsername(String username);

    List<UserVO> listUsers(int pageNum, int pageSize);

    long getTotalUsers();

    void deleteUser(String userId);
}
