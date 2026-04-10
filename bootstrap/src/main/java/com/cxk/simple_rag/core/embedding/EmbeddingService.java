package com.cxk.simple_rag.core.embedding;

import java.util.List;

/**
 * 向量化服务接口
 *
 * @author wangxin
 */
public interface EmbeddingService {

    /**
     * 为文本生成向量
     *
     * @param text 文本
     * @return 向量数组
     */
    float[] embed(String text);

    /**
     * 批量为文本列表生成向量
     *
     * @param texts 文本列表
     * @return 向量列表
     */
    List<float[]> batchEmbed(List<String> texts);
}
