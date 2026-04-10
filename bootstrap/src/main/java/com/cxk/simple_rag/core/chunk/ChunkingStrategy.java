package com.cxk.simple_rag.core.chunk;

import java.util.List;

/**
 * 分块策略接口
 *
 * @author wangxin
 */
public interface ChunkingStrategy {

    /**
     * 将文本切分成块
     *
     * @param text   待切分的文本
     * @param config 分块配置
     * @return 分块列表
     */
    List<VectorChunk> chunk(String text, ChunkConfig config);
}
