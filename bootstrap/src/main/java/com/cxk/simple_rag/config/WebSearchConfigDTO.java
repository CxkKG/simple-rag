package com.cxk.simple_rag.config;

import lombok.Data;

/**
 * 联网搜索配置 DTO
 *
 * @author wangxin
 */
@Data
public class WebSearchConfigDTO {
    private boolean enabled;
    private float scoreThreshold;
    private int topK;
}
