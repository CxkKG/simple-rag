package com.cxk.simple_rag.config;

import lombok.Data;

/**
 * Reranker 配置 DTO
 *
 * @author wangxin
 */
@Data
public class RerankerConfigDTO {
    private boolean enabled;
    private String apiKey;
    private String model;
    private String baseUrl;
    private int topN;
    private float scoreThreshold;
}
