package com.cxk.simple_rag.user.service;

import com.cxk.simple_rag.user.dto.ChangeEmailRequest;
import com.cxk.simple_rag.user.dto.ChangePasswordRequest;
import com.cxk.simple_rag.user.dto.EmailRegisterRequest;
import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.dto.ResetPasswordRequest;
import com.cxk.simple_rag.user.dto.SendCodeRequest;
import com.cxk.simple_rag.user.vo.UserVO;

import java.util.List;

/**
 * 用户服务接口
 *
 * @author wangxin
 */
public interface UserService {

    UserVO register(RegisterRequest request);

    UserVO registerByEmail(EmailRegisterRequest request);

    void sendVerifyCode(SendCodeRequest request);

    void resetPassword(ResetPasswordRequest request);

    void changePassword(ChangePasswordRequest request);

    void changeEmail(ChangeEmailRequest request);

    UserVO login(LoginRequest request);

    void logout();

    UserVO getCurrentUser();

    UserVO getUserById(String userId);

    UserVO getUserByUsername(String username);

    List<UserVO> listUsers(int pageNum, int pageSize);

    long getTotalUsers();

    UserVO updateUser(String userId, String username, String password, String role);

    void deleteUser(String userId);

    String lookupUsernameByEmail(String email);
}
