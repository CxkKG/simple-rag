package com.cxk.simple_rag.core.chunk;

import lombok.Builder;
import lombok.Data;

/**
 * 分块配置
 *
 * @author wangxin
 */
@Data
@Builder
public class ChunkConfig {

    /**
     * 最大块大小（字符数）
     */
    private Integer maxChunkSize;

    /**
     * 块重叠大小（字符数）
     */
    private Integer overlapSize;

    /**
     * 最小块大小（字符数）
     */
    private Integer minChunkSize;

    /**
     * 是否按结构切分（标题、段落等）
     */
    private Boolean structured;

    /**
     * 分隔符
     */
    private String separator;
}
