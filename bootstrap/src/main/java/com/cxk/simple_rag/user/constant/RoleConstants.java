package com.cxk.simple_rag.user.constant;

/**
 * 系统角色常量。
 *
 * <ul>
 *   <li>{@link #ADMIN} 管理员：全权限</li>
 *   <li>{@link #TEACHER} 老师：可创建/管理自己的知识库；他人的知识库只读；无用户/系统管理</li>
 *   <li>{@link #STUDENT} 学生：仅只读访问知识库及问答相关功能</li>
 * </ul>
 */
public final class RoleConstants {

    public static final String ADMIN = "admin";
    public static final String TEACHER = "teacher";
    public static final String STUDENT = "student";

    private RoleConstants() {
    }
}
