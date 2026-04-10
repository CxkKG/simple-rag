package com.cxk.simple_rag.knowledge.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库文档分块表实体类
 *
 * @author wangxin
 */
@Data
@TableName("t_knowledge_chunk")
public class KnowledgeChunkDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String kbId;

    private String docId;

    private Integer chunkIndex;

    private String content;

    private String contentHash;

    private Integer charCount;

    private Integer tokenCount;

    private Integer enabled;

    private String createdBy;

    private String updatedBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Integer deleted;
}
