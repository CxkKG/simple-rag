package com.cxk.simple_rag.learning.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.ParsedReminderVO;
import com.cxk.simple_rag.learning.dto.ReviewReminderCreateRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderQueryRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderUpdateRequest;
import com.cxk.simple_rag.learning.entity.ReviewReminderDO;

import java.util.Date;
import java.util.List;

/**
 * 复习提醒服务接口
 *
 * @author wangxin
 */
public interface ReviewReminderService {

    /**
     * 解析自然语言时间表达式
     *
     * @param rawText 用户原始输入，例如"三天后复习反向传播"
     * @return 解析结果（提醒时间、主题）
     */
    ParsedReminderVO parseExpression(String rawText);

    /**
     * 创建复习提醒
     *
     * @param userId  用户 ID
     * @param request 创建请求
     * @return 复习提醒实体
     */
    ReviewReminderDO createReminder(String userId, ReviewReminderCreateRequest request);

    /**
     * 获取复习提醒详情
     *
     * @param reminderId 提醒 ID
     * @param userId     用户 ID
     * @return 复习提醒
     */
    ReviewReminderDO getReminder(String reminderId, String userId);

    /**
     * 分页查询复习提醒
     *
     * @param userId  用户 ID
     * @param request 查询请求
     * @return 分页结果
     */
    Page<ReviewReminderDO> pageReminders(String userId, ReviewReminderQueryRequest request);

    /**
     * 更新复习提醒
     *
     * @param reminderId 提醒 ID
     * @param userId     用户 ID
     * @param request    更新请求
     * @return 更新后的提醒
     */
    ReviewReminderDO updateReminder(String reminderId, String userId, ReviewReminderUpdateRequest request);

    /**
     * 删除复习提醒
     *
     * @param reminderId 提醒 ID
     * @param userId     用户 ID
     */
    void deleteReminder(String reminderId, String userId);

    /**
     * 查询当前用户已到期且未通知的提醒（前端轮询用）
     *
     * @param userId 用户 ID
     * @return 到期提醒列表
     */
    List<ReviewReminderDO> listDueReminders(String userId);

    /**
     * 查询全局已到期且未通知的提醒（调度器扫描用）
     *
     * @param now 当前时间
     * @return 到期提醒列表
     */
    List<ReviewReminderDO> scanDueReminders(Date now);

    /**
     * 标记一组提醒为已通知
     *
     * @param reminderIds 提醒 ID 列表
     */
    void markNotified(List<String> reminderIds);
}
