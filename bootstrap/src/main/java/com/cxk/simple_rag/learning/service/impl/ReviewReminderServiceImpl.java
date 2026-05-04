package com.cxk.simple_rag.learning.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.ParsedReminderVO;
import com.cxk.simple_rag.learning.dto.ReviewReminderCreateRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderQueryRequest;
import com.cxk.simple_rag.learning.dto.ReviewReminderUpdateRequest;
import com.cxk.simple_rag.learning.entity.ReviewReminderDO;
import com.cxk.simple_rag.learning.mapper.ReviewReminderMapper;
import com.cxk.simple_rag.learning.service.ReviewReminderService;
import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 复习提醒服务实现类
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewReminderServiceImpl implements ReviewReminderService {

    private final ReviewReminderMapper reviewReminderMapper;
    private final LLMService llmService;

    private static final String DATE_FMT = "yyyy-MM-dd HH:mm:ss";

    @Override
    public ParsedReminderVO parseExpression(String rawText) {
        if (StrUtil.isBlank(rawText)) {
            throw new IllegalArgumentException("rawText 不能为空");
        }

        ParsedReminderVO viaLLM = parseByLLM(rawText);
        if (viaLLM != null && viaLLM.getRemindTime() != null) {
            return viaLLM;
        }
        ParsedReminderVO viaRegex = parseByRegex(rawText);
        if (viaRegex == null || viaRegex.getRemindTime() == null) {
            throw new IllegalArgumentException("无法解析时间表达式: " + rawText);
        }
        return viaRegex;
    }

    @Override
    public ReviewReminderDO createReminder(String userId, ReviewReminderCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }

        Date remindTime = parseDate(request.getRemindTime());
        String topic = StrUtil.trimToNull(request.getTopic());
        String remark = request.getRemark();
        String source = "explicit";

        if (remindTime == null && StrUtil.isNotBlank(request.getRawText())) {
            ParsedReminderVO parsed = parseExpression(request.getRawText());
            remindTime = parsed.getRemindTime();
            if (topic == null) {
                topic = parsed.getTopic();
            }
            if (StrUtil.isBlank(remark)) {
                remark = parsed.getRemark();
            }
            source = parsed.getSource();
        }

        if (remindTime == null) {
            throw new IllegalArgumentException("提醒时间不能为空，且无法从原始文本解析得到");
        }
        if (StrUtil.isBlank(topic)) {
            topic = StrUtil.isNotBlank(request.getRawText()) ? StrUtil.subPre(request.getRawText(), 30) : "复习提醒";
        }

        Date now = new Date();
        ReviewReminderDO reminder = ReviewReminderDO.builder()
                .id(generateId())
                .userId(userId)
                .kbId(request.getKbId())
                .topic(topic)
                .remark(remark)
                .rawText(request.getRawText())
                .remindTime(remindTime)
                .status(0)
                .sourceRecordId(request.getSourceRecordId())
                .createTime(now)
                .updateTime(now)
                .deleted(0)
                .build();
        reviewReminderMapper.insert(reminder);
        log.info("Review reminder created: id={}, userId={}, topic={}, remindTime={}, source={}",
                reminder.getId(), userId, topic, remindTime, source);
        return reminder;
    }

    @Override
    public ReviewReminderDO getReminder(String reminderId, String userId) {
        ReviewReminderDO reminder = reviewReminderMapper.selectById(reminderId);
        if (reminder == null || (reminder.getDeleted() != null && reminder.getDeleted() == 1)) {
            throw new IllegalArgumentException("复习提醒不存在: " + reminderId);
        }
        if (!reminder.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权访问该复习提醒");
        }
        return reminder;
    }

    @Override
    public Page<ReviewReminderDO> pageReminders(String userId, ReviewReminderQueryRequest request) {
        Page<ReviewReminderDO> page = new Page<>(request.getPageNum(), request.getPageSize());
        LambdaQueryWrapper<ReviewReminderDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewReminderDO::getUserId, userId);
        if (StrUtil.isNotBlank(request.getKbId())) {
            wrapper.eq(ReviewReminderDO::getKbId, request.getKbId());
        }
        if (request.getStatus() != null) {
            wrapper.eq(ReviewReminderDO::getStatus, request.getStatus());
        }
        Date start = parseDate(request.getStartTime());
        if (start != null) {
            wrapper.ge(ReviewReminderDO::getRemindTime, start);
        }
        Date end = parseDate(request.getEndTime());
        if (end != null) {
            wrapper.le(ReviewReminderDO::getRemindTime, end);
        }
        wrapper.orderByAsc(ReviewReminderDO::getRemindTime);
        return reviewReminderMapper.selectPage(page, wrapper);
    }

    @Override
    public ReviewReminderDO updateReminder(String reminderId, String userId, ReviewReminderUpdateRequest request) {
        ReviewReminderDO reminder = getReminder(reminderId, userId);
        if (StrUtil.isNotBlank(request.getTopic())) {
            reminder.setTopic(request.getTopic());
        }
        if (request.getRemark() != null) {
            reminder.setRemark(request.getRemark());
        }
        if (StrUtil.isNotBlank(request.getRemindTime())) {
            Date remindTime = parseDate(request.getRemindTime());
            if (remindTime == null) {
                throw new IllegalArgumentException("非法的提醒时间格式: " + request.getRemindTime());
            }
            reminder.setRemindTime(remindTime);
            // 重新激活状态
            if (reminder.getStatus() != null && reminder.getStatus() == 1) {
                reminder.setStatus(0);
                reminder.setNotifiedAt(null);
            }
        }
        if (request.getStatus() != null) {
            int s = request.getStatus();
            if (s < 0 || s > 3) {
                throw new IllegalArgumentException("非法的状态值: " + s);
            }
            reminder.setStatus(s);
        }
        reminder.setUpdateTime(new Date());
        reviewReminderMapper.updateById(reminder);
        return reminder;
    }

    @Override
    public void deleteReminder(String reminderId, String userId) {
        ReviewReminderDO reminder = getReminder(reminderId, userId);
        reviewReminderMapper.deleteById(reminder.getId());
        log.info("Review reminder deleted: id={}", reminderId);
    }

    @Override
    public List<ReviewReminderDO> listDueReminders(String userId) {
        LambdaQueryWrapper<ReviewReminderDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewReminderDO::getUserId, userId)
                .eq(ReviewReminderDO::getStatus, 0)
                .le(ReviewReminderDO::getRemindTime, new Date())
                .orderByAsc(ReviewReminderDO::getRemindTime);
        return reviewReminderMapper.selectList(wrapper);
    }

    @Override
    public List<ReviewReminderDO> scanDueReminders(Date now) {
        LambdaQueryWrapper<ReviewReminderDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewReminderDO::getStatus, 0)
                .le(ReviewReminderDO::getRemindTime, now == null ? new Date() : now)
                .orderByAsc(ReviewReminderDO::getRemindTime);
        return reviewReminderMapper.selectList(wrapper);
    }

    @Override
    public void markNotified(List<String> reminderIds) {
        if (reminderIds == null || reminderIds.isEmpty()) {
            return;
        }
        LambdaUpdateWrapper<ReviewReminderDO> wrapper = new LambdaUpdateWrapper<>();
        Date now = new Date();
        wrapper.in(ReviewReminderDO::getId, reminderIds)
                .set(ReviewReminderDO::getStatus, 1)
                .set(ReviewReminderDO::getNotifiedAt, now)
                .set(ReviewReminderDO::getUpdateTime, now);
        reviewReminderMapper.update(null, wrapper);
    }

    private ParsedReminderVO parseByLLM(String rawText) {
        try {
            String today = new SimpleDateFormat(DATE_FMT).format(new Date());
            String systemPrompt = "你是一个时间表达式解析助手。当前时间是 " + today + "。" +
                    "请从用户输入中提取以下三个字段，并严格以 JSON 输出，键为：remindTime（格式 yyyy-MM-dd HH:mm:ss），topic（复习主题/简短关键词），remark（其他备注，可为空字符串）。" +
                    "如果用户没有指定具体时分，时分默认填 09:00:00。仅输出 JSON，不要任何额外解释或代码块标记。";
            String userPrompt = "用户输入：" + rawText;
            String result = llmService.generate(systemPrompt, userPrompt);
            if (StrUtil.isBlank(result)) {
                return null;
            }
            String json = stripFences(result).trim();
            Date remindTime = extractJsonDate(json, "remindTime");
            String topic = extractJsonString(json, "topic");
            String remark = extractJsonString(json, "remark");
            if (remindTime == null) {
                return null;
            }
            return ParsedReminderVO.builder()
                    .remindTime(remindTime)
                    .topic(StrUtil.isBlank(topic) ? defaultTopic(rawText) : topic)
                    .remark(remark)
                    .source("llm")
                    .build();
        } catch (Exception e) {
            log.warn("LLM time-expression parse failed: {}", e.getMessage());
            return null;
        }
    }

    private ParsedReminderVO parseByRegex(String rawText) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 9);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        Date base = cal.getTime();
        Date result = null;

        // 绝对日期 yyyy-MM-dd 或 yyyy/MM/dd 可选时间
        Pattern abs = Pattern.compile("(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})(?:[ T](\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?)?");
        Matcher m = abs.matcher(rawText);
        if (m.find()) {
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(m.group(1)),
                    Integer.parseInt(m.group(2)) - 1,
                    Integer.parseInt(m.group(3)),
                    m.group(4) != null ? Integer.parseInt(m.group(4)) : 9,
                    m.group(5) != null ? Integer.parseInt(m.group(5)) : 0,
                    m.group(6) != null ? Integer.parseInt(m.group(6)) : 0);
            c.set(Calendar.MILLISECOND, 0);
            result = c.getTime();
        }

        // N 天/小时/分钟 后
        if (result == null) {
            Pattern rel = Pattern.compile("(\\d+|[一二两三四五六七八九十百零]+)\\s*(分钟|小时|天|日|周|星期|月)\\s*[后之]?后?");
            Matcher rm = rel.matcher(rawText);
            if (rm.find()) {
                int n = parseChineseNumber(rm.group(1));
                String unit = rm.group(2);
                Calendar c = Calendar.getInstance();
                c.setTime(base);
                switch (unit) {
                    case "分钟" -> {
                        c.setTime(new Date());
                        c.add(Calendar.MINUTE, n);
                    }
                    case "小时" -> {
                        c.setTime(new Date());
                        c.add(Calendar.HOUR_OF_DAY, n);
                    }
                    case "天", "日" -> c.add(Calendar.DAY_OF_MONTH, n);
                    case "周", "星期" -> c.add(Calendar.DAY_OF_MONTH, n * 7);
                    case "月" -> c.add(Calendar.MONTH, n);
                    default -> {
                    }
                }
                result = c.getTime();
            }
        }

        if (result == null) {
            if (rawText.contains("今天")) {
                result = base;
            } else if (rawText.contains("明天")) {
                Calendar c = Calendar.getInstance();
                c.setTime(base);
                c.add(Calendar.DAY_OF_MONTH, 1);
                result = c.getTime();
            } else if (rawText.contains("后天")) {
                Calendar c = Calendar.getInstance();
                c.setTime(base);
                c.add(Calendar.DAY_OF_MONTH, 2);
                result = c.getTime();
            } else if (rawText.contains("大后天")) {
                Calendar c = Calendar.getInstance();
                c.setTime(base);
                c.add(Calendar.DAY_OF_MONTH, 3);
                result = c.getTime();
            }
        }

        // 下周X / 周X
        if (result == null) {
            Pattern wk = Pattern.compile("(下周|下个星期|这周|本周|周|星期)\\s*([一二三四五六日天1-7])");
            Matcher wm = wk.matcher(rawText);
            if (wm.find()) {
                int target = parseWeekDay(wm.group(2));
                Calendar c = Calendar.getInstance();
                c.setTime(base);
                int current = c.get(Calendar.DAY_OF_WEEK); // Sunday=1..Saturday=7
                int currentIso = current == Calendar.SUNDAY ? 7 : current - 1;
                int delta = target - currentIso;
                if (wm.group(1).startsWith("下")) {
                    if (delta <= 0) {
                        delta += 7;
                    } else {
                        delta += 7;
                    }
                } else {
                    if (delta < 0) {
                        delta += 7;
                    }
                }
                c.add(Calendar.DAY_OF_MONTH, delta);
                result = c.getTime();
            }
        }

        // 时分 HH:mm 覆盖时间
        Pattern hm = Pattern.compile("(\\d{1,2}):(\\d{1,2})");
        Matcher hmm = hm.matcher(rawText);
        if (hmm.find() && result != null) {
            Calendar c = Calendar.getInstance();
            c.setTime(result);
            c.set(Calendar.HOUR_OF_DAY, Integer.parseInt(hmm.group(1)));
            c.set(Calendar.MINUTE, Integer.parseInt(hmm.group(2)));
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            result = c.getTime();
        }

        if (result == null) {
            return null;
        }

        return ParsedReminderVO.builder()
                .remindTime(result)
                .topic(defaultTopic(rawText))
                .remark(null)
                .source("regex")
                .build();
    }

    private String defaultTopic(String rawText) {
        if (StrUtil.isBlank(rawText)) {
            return "复习提醒";
        }
        // 提取"复习"/"复习一下"后的内容作为主题
        Pattern p = Pattern.compile("(?:复习|温习|学习)(?:一下|下)?\\s*(.+?)$");
        Matcher m = p.matcher(rawText);
        if (m.find()) {
            String t = m.group(1).trim();
            t = t.replaceAll("[，,。.！!？?]+$", "");
            if (!t.isEmpty()) {
                return StrUtil.subPre(t, 50);
            }
        }
        return StrUtil.subPre(rawText, 30);
    }

    private int parseWeekDay(String s) {
        return switch (s) {
            case "一", "1" -> 1;
            case "二", "2" -> 2;
            case "三", "3" -> 3;
            case "四", "4" -> 4;
            case "五", "5" -> 5;
            case "六", "6" -> 6;
            case "日", "天", "7" -> 7;
            default -> 1;
        };
    }

    private int parseChineseNumber(String s) {
        if (s == null || s.isEmpty()) {
            return 0;
        }
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException ignore) {
        }
        Map<Character, Integer> digit = new HashMap<>();
        digit.put('零', 0);
        digit.put('一', 1);
        digit.put('二', 2);
        digit.put('两', 2);
        digit.put('三', 3);
        digit.put('四', 4);
        digit.put('五', 5);
        digit.put('六', 6);
        digit.put('七', 7);
        digit.put('八', 8);
        digit.put('九', 9);
        if (s.length() == 1 && digit.containsKey(s.charAt(0))) {
            return digit.get(s.charAt(0));
        }
        if (s.contains("十")) {
            int idx = s.indexOf('十');
            int tens = idx == 0 ? 1 : digit.getOrDefault(s.charAt(0), 0);
            int ones = idx == s.length() - 1 ? 0 : digit.getOrDefault(s.charAt(idx + 1), 0);
            return tens * 10 + ones;
        }
        int total = 0;
        for (char c : s.toCharArray()) {
            total = total * 10 + digit.getOrDefault(c, 0);
        }
        return total;
    }

    private String stripFences(String s) {
        if (s == null) {
            return "";
        }
        String t = s.trim();
        if (t.startsWith("```")) {
            int firstNl = t.indexOf('\n');
            if (firstNl > 0) {
                t = t.substring(firstNl + 1);
            }
            if (t.endsWith("```")) {
                t = t.substring(0, t.length() - 3);
            }
        }
        return t.trim();
    }

    private String extractJsonString(String json, String key) {
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
        Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1).replace("\\\"", "\"").replace("\\\\", "\\");
        }
        return null;
    }

    private Date extractJsonDate(String json, String key) {
        String s = extractJsonString(json, key);
        return parseDate(s);
    }

    private Date parseDate(String s) {
        if (StrUtil.isBlank(s)) {
            return null;
        }
        String[] patterns = {DATE_FMT, "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd", "yyyy/MM/dd HH:mm:ss", "yyyy/MM/dd"};
        for (String p : patterns) {
            try {
                return new SimpleDateFormat(p).parse(s);
            } catch (Exception ignore) {
            }
        }
        return null;
    }

    private String generateId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }
}
