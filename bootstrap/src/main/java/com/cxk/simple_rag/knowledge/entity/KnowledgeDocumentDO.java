package com.cxk.simple_rag.knowledge.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库文档表实体类
 *
 * @author wangxin
 */
@Data
@TableName("t_knowledge_document")
public class KnowledgeDocumentDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String kbId;

    private String docName;

    private Integer enabled;

    private Integer chunkCount;

    private String fileUrl;

    private String fileType;

    private Long fileSize;

    private String processMode;

    private String status;

    private String sourceType;

    private String sourceLocation;

    private Integer scheduleEnabled;

    private String scheduleCron;

    private String chunkStrategy;

    private String chunkConfig;

    private String pipelineId;

    private String summary;

    private String keywords;

    private String createdBy;

    private String updatedBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Integer deleted;
}
