package com.cxk.simple_rag.learning.scheduler;

import com.cxk.simple_rag.learning.entity.ReviewReminderDO;
import com.cxk.simple_rag.learning.service.ReviewReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 复习提醒定时扫描器：每分钟扫描已到期且未通知的提醒并写入日志。
 * 用户端通过 GET /api/review-reminders/due?ack=true 拉取到期提醒并自动确认。
 *
 * @author wangxin
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewReminderScheduler {

    private final ReviewReminderService reviewReminderService;

    @Scheduled(fixedDelay = 60_000L, initialDelay = 30_000L)
    public void scanDueReminders() {
        try {
            List<ReviewReminderDO> due = reviewReminderService.scanDueReminders(new Date());
            if (due.isEmpty()) {
                return;
            }
            log.info("Review reminder scan: {} due reminder(s) waiting for client acknowledgement", due.size());
            for (ReviewReminderDO r : due) {
                log.info("Due reminder: id={}, userId={}, topic={}, remindTime={}",
                        r.getId(), r.getUserId(), r.getTopic(), r.getRemindTime());
            }
            List<String> dueIds = due.stream().map(ReviewReminderDO::getId).collect(Collectors.toList());
            reviewReminderService.markNotified(dueIds);
        } catch (Exception e) {
            log.error("Review reminder scan failed", e);
        }
    }
}
