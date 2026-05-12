package com.cxk.simple_rag.knowledge.util;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.cxk.simple_rag.knowledge.entity.KnowledgeBaseDO;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeBaseMapper;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeDocumentMapper;
import com.cxk.simple_rag.user.constant.RoleConstants;
import com.cxk.simple_rag.user.entity.UserDO;
import com.cxk.simple_rag.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 知识库 / 文档写操作的所有者校验。
 *
 * <p>规则：</p>
 * <ul>
 *   <li>admin：直接放行</li>
 *   <li>teacher：必须是资源的 createdBy 本人，否则抛 {@link SecurityException}</li>
 *   <li>其它（student 等）：一律禁止</li>
 * </ul>
 *
 * <p>资源的 {@code createdBy} 在本项目里存的是用户名（见
 * {@code KnowledgeDocumentServiceImpl#getCurrentUsername}），所以校验时把当前登录
 * 用户的 id 解析成 username 再比对。</p>
 */
@Component
@RequiredArgsConstructor
public class KnowledgeOwnerChecker {

    private final UserMapper userMapper;
    private final KnowledgeBaseMapper knowledgeBaseMapper;
    private final KnowledgeDocumentMapper knowledgeDocumentMapper;

    public void checkKnowledgeBaseWritable(String kbId) {
        if (StrUtil.isBlank(kbId)) {
            throw new IllegalArgumentException("Knowledge base id cannot be empty");
        }
        KnowledgeBaseDO kb = knowledgeBaseMapper.selectById(kbId);
        if (kb == null) {
            throw new IllegalArgumentException("Knowledge base not found: " + kbId);
        }
        ensureOwnerOrAdmin(kb.getCreatedBy(), "knowledge base " + kbId);
    }

    public void checkDocumentWritable(String docId) {
        if (StrUtil.isBlank(docId)) {
            throw new IllegalArgumentException("Document id cannot be empty");
        }
        KnowledgeDocumentDO doc = knowledgeDocumentMapper.selectById(docId);
        if (doc == null) {
            throw new IllegalArgumentException("Document not found: " + docId);
        }
        checkKnowledgeBaseWritable(doc.getKbId());
    }

    /**
     * 返回当前登录用户的 username（用于资源 createdBy 字段写入）。
     */
    public String currentUsername() {
        String userId = StpUtil.getLoginIdAsString();
        if (StrUtil.isBlank(userId)) {
            return "system";
        }
        UserDO user = userMapper.selectById(userId);
        return user != null && StrUtil.isNotBlank(user.getUsername()) ? user.getUsername() : "system";
    }

    private void ensureOwnerOrAdmin(String createdBy, String resourceDesc) {
        String role = resolveCurrentRole();
        if (RoleConstants.ADMIN.equals(role)) {
            return;
        }
        if (!RoleConstants.TEACHER.equals(role)) {
            throw new SecurityException("权限不足：只有教师或管理员才能执行此操作");
        }
        String username = currentUsername();
        if (StrUtil.isBlank(createdBy) || !createdBy.equals(username)) {
            throw new SecurityException("权限不足：您只能修改自己创建的资源，无法操作他人创建的" + resourceDesc);
        }
    }

    private String resolveCurrentRole() {
        String userId = StpUtil.getLoginIdAsString();
        if (StrUtil.isBlank(userId)) {
            return "";
        }
        UserDO user = userMapper.selectById(userId);
        return user != null && user.getRole() != null ? user.getRole() : "";
    }
}
