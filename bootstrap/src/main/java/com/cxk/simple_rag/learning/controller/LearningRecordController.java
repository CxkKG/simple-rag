package com.cxk.simple_rag.learning.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.KnowledgePointStatVO;
import com.cxk.simple_rag.learning.dto.LearningRecordQueryRequest;
import com.cxk.simple_rag.learning.entity.LearningRecordDO;
import com.cxk.simple_rag.learning.service.LearningRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 学习记录控制器
 *
 * @author wangxin
 */
@RestController
@RequestMapping("/api/learning-records")
@RequiredArgsConstructor
public class LearningRecordController {

    private final LearningRecordService learningRecordService;

    /**
     * 分页查询学习记录
     */
    @PostMapping("/page")
    public ResponseEntity<Map<String, Object>> page(@RequestBody LearningRecordQueryRequest request) {
        if (request == null) {
            request = new LearningRecordQueryRequest();
        }
        if (request.getPageNum() == null || request.getPageNum() <= 0) {
            request.setPageNum(1);
        }
        if (request.getPageSize() == null || request.getPageSize() <= 0) {
            request.setPageSize(10);
        }
        String userId = StpUtil.getLoginIdAsString();
        Page<LearningRecordDO> page = learningRecordService.pageRecords(userId, request);

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
     * 获取单条学习记录
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable("id") String id) {
        String userId = StpUtil.getLoginIdAsString();
        LearningRecordDO record = learningRecordService.getRecord(id, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", record);
        return ResponseEntity.ok(response);
    }

    /**
     * 删除学习记录
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable("id") String id) {
        String userId = StpUtil.getLoginIdAsString();
        learningRecordService.deleteRecord(id, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", null);
        return ResponseEntity.ok(response);
    }

    /**
     * 知识点频次统计
     */
    @GetMapping("/knowledge-points")
    public ResponseEntity<Map<String, Object>> stats(
            @RequestParam(value = "kbId", required = false) String kbId,
            @RequestParam(value = "sortBy", required = false, defaultValue = "count") String sortBy,
            @RequestParam(value = "limit", required = false, defaultValue = "50") Integer limit) {
        String userId = StpUtil.getLoginIdAsString();
        List<KnowledgePointStatVO> stats = learningRecordService.statKnowledgePoints(userId, kbId, sortBy, limit);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", stats);
        response.put("total", stats.size());
        return ResponseEntity.ok(response);
    }
}
