package com.cxk.simple_rag.user.controller;

import com.cxk.simple_rag.user.dto.ChangeEmailRequest;
import com.cxk.simple_rag.user.dto.ChangePasswordRequest;
import com.cxk.simple_rag.user.dto.EmailRegisterRequest;
import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
import com.cxk.simple_rag.user.dto.ResetPasswordRequest;
import com.cxk.simple_rag.user.dto.SendCodeRequest;
import com.cxk.simple_rag.user.service.UserService;
import com.cxk.simple_rag.user.vo.UserVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        UserVO userVO = userService.register(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "注册成功");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/register")
    public ResponseEntity<Map<String, Object>> registerByEmail(@Valid @RequestBody EmailRegisterRequest request) {
        UserVO userVO = userService.registerByEmail(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "注册成功");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/send-code")
    public ResponseEntity<Map<String, Object>> sendVerifyCode(@Valid @RequestBody SendCodeRequest request) {
        userService.sendVerifyCode(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "验证码已发送");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "密码重置成功");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "密码修改成功");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/send-change-code")
    public ResponseEntity<Map<String, Object>> sendChangePasswordCode() {
        var currentUser = userService.getCurrentUser();
        if (currentUser == null || currentUser.getEmail() == null || currentUser.getEmail().isBlank()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "当前账号未绑定邮箱，无法使用验证码修改密码");
            errorResponse.put("data", null);
            return ResponseEntity.badRequest().body(errorResponse);
        }

        SendCodeRequest sendCodeRequest = new SendCodeRequest();
        sendCodeRequest.setEmail(currentUser.getEmail());
        sendCodeRequest.setType("change_password");
        userService.sendVerifyCode(sendCodeRequest);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "验证码已发送至 " + maskEmail(currentUser.getEmail()));
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/change-email")
    public ResponseEntity<Map<String, Object>> changeEmail(@Valid @RequestBody ChangeEmailRequest request) {
        userService.changeEmail(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "邮箱更换成功");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/email/lookup")
    public ResponseEntity<Map<String, Object>> lookupUsername(@RequestParam("email") String email) {
        String username = userService.lookupUsernameByEmail(email);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", username);
        return ResponseEntity.ok(response);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String local = email.split("@")[0];
        String domain = email.split("@")[1];
        if (local.length() <= 2) return local + "***@" + domain;
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + "@" + domain;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        UserVO userVO = userService.login(request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "登录成功");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        userService.logout();

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "登出成功");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        UserVO userVO = userService.getCurrentUser();

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/info/{userId}")
    public ResponseEntity<Map<String, Object>> getUserInfo(@PathVariable("userId") String userId) {
        UserVO userVO = userService.getUserById(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/page")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {

        List<UserVO> users = userService.listUsers(pageNum, pageSize);
        long total = userService.getTotalUsers();

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", users);
        response.put("total", total);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String role = request.get("role");

        if (username == null || password == null) {
            throw new IllegalArgumentException("username and password are required");
        }

        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername(username);
        registerRequest.setPassword(password);
        registerRequest.setAvatar(null);
        // 设置角色参数
        registerRequest.setRole(role);

        UserVO userVO = userService.register(registerRequest);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "用户创建成功");
        response.put("data", userVO);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable("id") String id,
            @RequestBody Map<String, String> request) {

        String username = request.get("username");
        String password = request.get("password");
        String role = request.get("role");
        UserVO updatedUser = userService.updateUser(id, username, password, role);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "更新成功");
        response.put("data", updatedUser);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable("id") String id) {
        userService.deleteUser(id);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "删除成功");
        response.put("data", null);

        return ResponseEntity.ok(response);
    }
}
