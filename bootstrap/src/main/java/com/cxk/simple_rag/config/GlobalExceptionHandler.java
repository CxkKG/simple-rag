package com.cxk.simple_rag.config;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotRoleException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<Map<String, Object>> handleNotLoginException(NotLoginException e) {
        log.warn("未登录访问: {}", e.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("code", 401);
        response.put("message", "未登录或登录已过期");
        response.put("data", null);
        return ResponseEntity.status(401).body(response);
    }

    @ExceptionHandler(NotRoleException.class)
    public ResponseEntity<Map<String, Object>> handleNotRoleException(NotRoleException e) {
        log.warn("权限不足: {}", e.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("code", 403);
        response.put("message", "权限不足，需要 " + e.getRole() + " 角色");
        response.put("data", null);
        return ResponseEntity.status(403).body(response);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(SecurityException e) {
        log.warn("安全异常: {}", e.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("code", 403);
        response.put("message", e.getMessage());
        response.put("data", null);
        return ResponseEntity.status(403).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("参数校验失败");
        log.warn("Validation error: {}", message);
        return buildErrorResponse(400, message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Illegal argument: {}", e.getMessage());
        return buildErrorResponse(400, e.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException e) {
        log.error("Runtime exception", e);
        return buildErrorResponse(500, "Internal server error: " + e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        log.error("Exception", e);
        return buildErrorResponse(500, "Internal server error");
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(int code, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("code", code);
        response.put("message", message);
        response.put("data", null);
        return ResponseEntity.status(code).body(response);
    }
}
