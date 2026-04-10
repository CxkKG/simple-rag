package com.cxk.simple_rag.core.chunk;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 向量分块对象
 *
 * @author wangxin
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VectorChunk {

    /**
     * 分块索引
     */
    private Integer index;

    /**
     * 分块内容
     */
    private String content;

    /**
     * 内容哈希
     */
    private String contentHash;

    /**
     * 字符数
     */
    private Integer charCount;

    /**
     * Token 数
     */
    private Integer tokenCount;

    /**
     * 向量数组（由 Embedding 模型生成）
     */
    private float[] embedding;
}
