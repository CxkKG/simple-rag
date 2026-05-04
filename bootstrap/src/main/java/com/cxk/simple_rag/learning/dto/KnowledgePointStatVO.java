package com.cxk.simple_rag.learning.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 知识点频次统计 VO
 *
 * @author wangxin
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgePointStatVO {

    /**
     * 知识点标签
     */
    private String tag;

    /**
     * 知识库 ID
     */
    private String kbId;

    /**
     * 出现次数
     */
    private Long count;

    /**
     * 最近一次提问时间
     */
    private Date lastTime;
}
