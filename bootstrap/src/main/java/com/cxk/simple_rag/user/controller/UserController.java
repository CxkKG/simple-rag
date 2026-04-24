package com.cxk.simple_rag.user.controller;

import com.cxk.simple_rag.user.dto.LoginRequest;
import com.cxk.simple_rag.user.dto.RegisterRequest;
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

        UserVO existingUser = userService.getUserById(id);

        String username = request.get("username");
        if (username != null) {
            // TODO: 更新用户名逻辑
        }

        UserVO updatedUser = userService.getUserById(id);

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
