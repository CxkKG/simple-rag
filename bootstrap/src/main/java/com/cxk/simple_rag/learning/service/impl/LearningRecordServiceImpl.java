package com.cxk.simple_rag.learning.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.KnowledgePointStatVO;
import com.cxk.simple_rag.learning.dto.LearningRecordQueryRequest;
import com.cxk.simple_rag.learning.entity.LearningRecordDO;
import com.cxk.simple_rag.learning.mapper.LearningRecordMapper;
import com.cxk.simple_rag.learning.service.LearningRecordService;
import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 学习记录服务实现类
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningRecordServiceImpl implements LearningRecordService {

    private final LearningRecordMapper learningRecordMapper;
    private final LLMService llmService;

    private static final int MAX_TAGS = 5;

    @Override
    public String captureFromChat(String userId, String kbId, String conversationId,
                                  String messageId, String question, String answer) {
        if (StrUtil.isBlank(userId) || StrUtil.isBlank(question)) {
            return null;
        }

        String tags = extractTags(question, answer);

        Date now = new Date();
        LearningRecordDO record = LearningRecordDO.builder()
                .id(generateId())
                .userId(userId)
                .kbId(kbId)
                .conversationId(conversationId)
                .messageId(messageId)
                .question(question)
                .answer(answer)
                .knowledgeTags(tags)
                .createTime(now)
                .updateTime(now)
                .deleted(0)
                .build();
        learningRecordMapper.insert(record);
        log.info("Learning record captured: id={}, userId={}, kbId={}, tags={}",
                record.getId(), userId, kbId, tags);
        return record.getId();
    }

    @Override
    public Page<LearningRecordDO> pageRecords(String userId, LearningRecordQueryRequest request) {
        Page<LearningRecordDO> page = new Page<>(request.getPageNum(), request.getPageSize());
        LambdaQueryWrapper<LearningRecordDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LearningRecordDO::getUserId, userId);
        if (StrUtil.isNotBlank(request.getKbId())) {
            wrapper.eq(LearningRecordDO::getKbId, request.getKbId());
        }
        if (StrUtil.isNotBlank(request.getKeyword())) {
            String keyword = request.getKeyword();
            wrapper.and(w -> w.like(LearningRecordDO::getQuestion, keyword)
                    .or().like(LearningRecordDO::getAnswer, keyword));
        }
        if (StrUtil.isNotBlank(request.getTag())) {
            wrapper.like(LearningRecordDO::getKnowledgeTags, request.getTag());
        }
        Date start = parseDate(request.getStartTime());
        if (start != null) {
            wrapper.ge(LearningRecordDO::getCreateTime, start);
        }
        Date end = parseDate(request.getEndTime());
        if (end != null) {
            wrapper.le(LearningRecordDO::getCreateTime, end);
        }
        wrapper.orderByDesc(LearningRecordDO::getCreateTime);
        return learningRecordMapper.selectPage(page, wrapper);
    }

    @Override
    public LearningRecordDO getRecord(String recordId, String userId) {
        LearningRecordDO record = learningRecordMapper.selectById(recordId);
        if (record == null || record.getDeleted() != null && record.getDeleted() == 1) {
            throw new IllegalArgumentException("学习记录不存在: " + recordId);
        }
        if (!record.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权访问该学习记录");
        }
        return record;
    }

    @Override
    public void deleteRecord(String recordId, String userId) {
        LearningRecordDO record = getRecord(recordId, userId);
        learningRecordMapper.deleteById(record.getId());
        log.info("Learning record deleted: id={}", recordId);
    }

    @Override
    public List<KnowledgePointStatVO> statKnowledgePoints(String userId, String kbId, String sortBy, Integer limit) {
        LambdaQueryWrapper<LearningRecordDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LearningRecordDO::getUserId, userId);
        if (StrUtil.isNotBlank(kbId)) {
            wrapper.eq(LearningRecordDO::getKbId, kbId);
        }
        wrapper.isNotNull(LearningRecordDO::getKnowledgeTags)
                .ne(LearningRecordDO::getKnowledgeTags, "");
        List<LearningRecordDO> records = learningRecordMapper.selectList(wrapper);

        Map<String, KnowledgePointStatVO> bucket = new HashMap<>();
        for (LearningRecordDO r : records) {
            if (StrUtil.isBlank(r.getKnowledgeTags())) {
                continue;
            }
            for (String raw : r.getKnowledgeTags().split(",")) {
                String tag = raw.trim();
                if (tag.isEmpty()) {
                    continue;
                }
                String key = tag + "::" + (r.getKbId() == null ? "" : r.getKbId());
                KnowledgePointStatVO stat = bucket.get(key);
                if (stat == null) {
                    stat = KnowledgePointStatVO.builder()
                            .tag(tag)
                            .kbId(r.getKbId())
                            .count(0L)
                            .lastTime(r.getCreateTime())
                            .build();
                    bucket.put(key, stat);
                }
                stat.setCount(stat.getCount() + 1);
                if (stat.getLastTime() == null || (r.getCreateTime() != null && r.getCreateTime().after(stat.getLastTime()))) {
                    stat.setLastTime(r.getCreateTime());
                }
            }
        }

        Comparator<KnowledgePointStatVO> comparator;
        if ("lastTime".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(KnowledgePointStatVO::getLastTime,
                    Comparator.nullsLast(Comparator.reverseOrder()));
        } else {
            comparator = Comparator.comparingLong(KnowledgePointStatVO::getCount).reversed()
                    .thenComparing(KnowledgePointStatVO::getLastTime,
                            Comparator.nullsLast(Comparator.reverseOrder()));
        }

        int max = (limit == null || limit <= 0) ? 50 : limit;
        return bucket.values().stream()
                .sorted(comparator)
                .limit(max)
                .collect(Collectors.toList());
    }

    private String extractTags(String question, String answer) {
        try {
            String systemPrompt = "你是一个学习助手。请从用户提问与对应回答中提取最重要的知识点标签，" +
                    "用英文逗号分隔，最多 " + MAX_TAGS + " 个，每个标签 2-12 个汉字或字母组合，不要解释，不要包含标点之外的内容。" +
                    "若无法提取，返回空字符串。";
            String userPrompt = "提问：" + safeTrim(question, 500) + "\n回答：" + safeTrim(answer, 800);
            String result = llmService.generate(systemPrompt, userPrompt);
            if (result == null) {
                return "";
            }
            String cleaned = result.replaceAll("[\\r\\n]+", ",")
                    .replaceAll("[、；;]", ",")
                    .replaceAll("[\"'《》（）()【】\\[\\]]", "")
                    .trim();
            String[] parts = cleaned.split(",");
            List<String> kept = new ArrayList<>();
            for (String p : parts) {
                String t = p.trim();
                if (t.isEmpty() || t.length() > 24) {
                    continue;
                }
                if (!kept.contains(t)) {
                    kept.add(t);
                }
                if (kept.size() >= MAX_TAGS) {
                    break;
                }
            }
            return String.join(",", kept);
        } catch (Exception e) {
            log.warn("Tag extraction failed: {}", e.getMessage());
            return "";
        }
    }

    private String safeTrim(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() > max ? s.substring(0, max) : s;
    }

    private Date parseDate(String s) {
        if (StrUtil.isBlank(s)) {
            return null;
        }
        String[] patterns = {"yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd"};
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
