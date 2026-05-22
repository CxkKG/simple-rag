package com.cxk.simple_rag.config;

import cn.dev33.satoken.stp.StpUtil;
import com.cxk.simple_rag.user.constant.RoleConstants;
import jakarta.servlet.DispatcherType;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class SaTokenInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        DispatcherType dispatcherType = request.getDispatcherType();

        // SSE / async dispatch / error dispatch 跳过
        if (dispatcherType == DispatcherType.ASYNC
                || dispatcherType == DispatcherType.ERROR) {
            return true;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();

        if (contextPath != null
                && !contextPath.isEmpty()
                && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        // 白名单
        if (path.startsWith("/user/login")
                || path.startsWith("/user/register")
                || path.startsWith("/user/email/register")
                || path.startsWith("/user/email/send-code")
                || path.startsWith("/user/email/reset-password")
                || path.startsWith("/user/email/lookup")) {
            return true;
        }

        // 登录校验
        StpUtil.checkLogin();

        // 角色校验：仅 admin 可访问的接口
        if (isAdminOnlyPath(path, request.getMethod())) {
            StpUtil.checkRole(RoleConstants.ADMIN);
            return true;
        }

        // 角色校验：admin 或 teacher 可访问的接口（写操作；teacher 是否本人创建的资源
        // 由 service 层的 KnowledgeOwnerChecker 进一步判定）
        if (isAdminOrTeacherPath(path, request.getMethod())) {
            StpUtil.checkRoleOr(RoleConstants.ADMIN, RoleConstants.TEACHER);
        }

        return true;
    }

    /** 仅 admin 可访问：用户管理 / 系统设置。 */
    private boolean isAdminOnlyPath(String path, String method) {
        if (path.startsWith("/system")) {
            return true;
        }
        // 用户管理：分页、创建、更新、删除
        if (path.equals("/user/page") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.equals("/user") && "POST".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.matches("^/user/[^/]+$")
                && ("PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method))) {
            return true;
        }
        return false;
    }

    /** admin 或 teacher 可访问：知识库写操作 / Dashboard / Ingestion。 */
    private boolean isAdminOrTeacherPath(String path, String method) {
        // 知识库：管理类操作（创建/修改/删除/上传/分块/重建...）需要 admin 或 teacher，
        // 查询接口对所有登录用户开放（包含 student）
        if (path.startsWith("/knowledge")) {
            if ("GET".equalsIgnoreCase(method)) {
                return false;
            }
            // 文档分页查询 POST /knowledge/document/query，对所有登录用户开放（只读）
            if ("POST".equalsIgnoreCase(method) && path.equals("/knowledge/document/query")) {
                return false;
            }
            return true;
        }
        if (path.startsWith("/dashboard") || path.startsWith("/ingestion")) {
            return true;
        }
        return false;
    }
}
