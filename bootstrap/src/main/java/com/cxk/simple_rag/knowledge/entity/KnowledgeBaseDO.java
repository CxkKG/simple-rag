package com.cxk.simple_rag.knowledge.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 知识库表实体类
 *
 * @author wangxin
 */
@Data
@TableName("t_knowledge_base")
public class KnowledgeBaseDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String name;

    private String embeddingModel;

    private String collectionName;

    private String createdBy;

    private String updatedBy;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Integer deleted;
}
