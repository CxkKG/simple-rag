package com.cxk.simple_rag.learning.controller;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.ParsedReminderVO;
import com.cxk.simple_rag.learning.dto.ReviewReminderCreateRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderQueryRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderUpdateRequest;
import com.cxk.simple_rag.learning.entity.ReviewReminderDO;
import com.cxk.simple_rag.learning.service.ReviewReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 复习提醒控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/api/review-reminders")
@RequiredArgsConstructor
public class ReviewReminderController {

    private final ReviewReminderService reviewReminderService;

    /**
     * 创建复习提醒
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ReviewReminderCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }
        if (StrUtil.isBlank(request.getRemindTime()) && StrUtil.isBlank(request.getRawText())) {
            throw new IllegalArgumentException("remindTime 与 rawText 至少需要提供一个");
        }
        String userId = StpUtil.getLoginIdAsString();
        ReviewReminderDO reminder = reviewReminderService.createReminder(userId, request);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", reminder);
        return ResponseEntity.ok(response);
    }

    /**
     * 解析自然语言时间表达式（不入库）
     */
    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parse(@RequestBody Map<String, String> request) {
        StpUtil.checkLogin();
        String rawText = request == null ? null : request.get("rawText");
        if (StrUtil.isBlank(rawText)) {
            throw new IllegalArgumentException("rawText 不能为空");
        }
        ParsedReminderVO parsed = reviewReminderService.parseExpression(rawText);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", parsed);
        return ResponseEntity.ok(response);
    }

    /**
     * 分页查询复习提醒
     */
    @PostMapping("/page")
    public ResponseEntity<Map<String, Object>> page(@RequestBody ReviewReminderQueryRequest request) {
        if (request == null) {
            request = new ReviewReminderQueryRequest();
        }
        if (request.getPageNum() == null || request.getPageNum() <= 0) {
            request.setPageNum(1);
        }
        if (request.getPageSize() == null || request.getPageSize() <= 0) {
            request.setPageSize(10);
        }
        String userId = StpUtil.getLoginIdAsString();
        Page<ReviewReminderDO> page = reviewReminderService.pageReminders(userId, request);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", page.getRecords());
        response.put("total", page.getTotal());
        response.put("pageNum", page.getCurrent());
        response.put("pageSize", page.getSize());
        response.put("pages", page.getPages());
        return ResponseEntity.ok(response);
    }

    /**
     * 获取单条复习提醒
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable("id") String id) {
        String userId = StpUtil.getLoginIdAsString();
        ReviewReminderDO reminder = reviewReminderService.getReminder(id, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", reminder);
        return ResponseEntity.ok(response);
    }

    /**
     * 更新复习提醒
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable("id") String id,
                                                       @RequestBody ReviewReminderUpdateRequest request) {
        String userId = StpUtil.getLoginIdAsString();
        ReviewReminderDO reminder = reviewReminderService.updateReminder(id, userId, request);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", reminder);
        return ResponseEntity.ok(response);
    }

    /**
     * 删除复习提醒
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable("id") String id) {
        String userId = StpUtil.getLoginIdAsString();
        reviewReminderService.deleteReminder(id, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);
        return ResponseEntity.ok(response);
    }

    /**
     * 查询当前用户已到期且未通知的提醒（前端轮询用）
     */
    @GetMapping("/due")
    public ResponseEntity<Map<String, Object>> due(
            @RequestParam(value = "ack", required = false, defaultValue = "false") boolean ack) {
        String userId = StpUtil.getLoginIdAsString();
        List<ReviewReminderDO> due = reviewReminderService.listDueReminders(userId);
        if (ack && !due.isEmpty()) {
            reviewReminderService.markNotified(due.stream().map(ReviewReminderDO::getId).toList());
        }
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", due);
        response.put("total", due.size());
        return ResponseEntity.ok(response);
    }

    /**
     * 标记提醒已通知
     */
    @PostMapping("/{id}/ack")
    public ResponseEntity<Map<String, Object>> ack(@PathVariable("id") String id) {
        String userId = StpUtil.getLoginIdAsString();
        // 校验归属
        reviewReminderService.getReminder(id, userId);
        reviewReminderService.markNotified(List.of(id));
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);
        return ResponseEntity.ok(response);
    }
}
