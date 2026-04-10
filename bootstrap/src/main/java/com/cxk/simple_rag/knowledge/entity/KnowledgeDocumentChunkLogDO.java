package com.cxk.simple_rag.knowledge.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库文档分块日志表实体类
 *
 * @author wangxin
 */
@Data
@TableName("t_knowledge_document_chunk_log")
public class KnowledgeDocumentChunkLogDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String docId;

    private String status;

    private String processMode;

    private String chunkStrategy;

    private String pipelineId;

    private Long extractDuration;

    private Long chunkDuration;

    private Long embedDuration;

    private Long persistDuration;

    private Long totalDuration;

    private Integer chunkCount;

    private String errorMessage;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
