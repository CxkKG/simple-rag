package com.cxk.simple_rag.config;

import cn.dev33.satoken.stp.StpUtil;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class SaTokenInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        if (path.startsWith("/user/login") || path.startsWith("/user/register")) {
            return true;
        }

        StpUtil.checkLogin();

        if (isAdminPath(path, request.getMethod())) {
            StpUtil.checkRole("admin");
        }

        return true;
    }

    private boolean isAdminPath(String path, String method) {
        if (path.startsWith("/knowledge")
                || path.startsWith("/dashboard")
                || path.startsWith("/system")
                || path.startsWith("/ingestion")) {
            return true;
        }
        // 用户管理接口需要 admin：分页查询、创建、删除
        if (path.equals("/user/page") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.equals("/user") && "POST".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.matches("^/user/[^/]+$") && "DELETE".equalsIgnoreCase(method)) {
            return true;
        }
        return false;
    }
}
