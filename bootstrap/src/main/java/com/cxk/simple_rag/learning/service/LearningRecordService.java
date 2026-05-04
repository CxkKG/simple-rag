package com.cxk.simple_rag.learning.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.learning.dto.KnowledgePointStatVO;
import com.cxk.simple_rag.learning.dto.LearningRecordQueryRequest;
import com.cxk.simple_rag.learning.entity.LearningRecordDO;

import java.util.List;

/**
 * 学习记录服务接口
 *
 * @author wangxin
 */
public interface LearningRecordService {

    /**
     * 从聊天消息中捕获学习记录（在 AI 答复入库后调用）
     *
     * @param userId         用户 ID
     * @param kbId           知识库 ID
     * @param conversationId 会话 ID
     * @param messageId      AI 答复消息 ID
     * @param question       用户提问
     * @param answer         AI 答复
     * @return 学习记录 ID；若未捕获则返回 null
     */
    String captureFromChat(String userId, String kbId, String conversationId,
                           String messageId, String question, String answer);

    /**
     * 分页查询学习记录
     *
     * @param userId  用户 ID
     * @param request 查询请求
     * @return 分页结果
     */
    Page<LearningRecordDO> pageRecords(String userId, LearningRecordQueryRequest request);

    /**
     * 获取学习记录详情（带权限校验）
     *
     * @param recordId 学习记录 ID
     * @param userId   用户 ID
     * @return 学习记录
     */
    LearningRecordDO getRecord(String recordId, String userId);

    /**
     * 删除学习记录
     *
     * @param recordId 学习记录 ID
     * @param userId   用户 ID
     */
    void deleteRecord(String recordId, String userId);

    /**
     * 知识点频次统计
     *
     * @param userId  用户 ID
     * @param kbId    知识库 ID（可空表示全部）
     * @param sortBy  排序方式：count（按次数）/ lastTime（按最近时间）
     * @param limit   返回条数上限
     * @return 知识点统计列表
     */
    List<KnowledgePointStatVO> statKnowledgePoints(String userId, String kbId, String sortBy, Integer limit);
}
