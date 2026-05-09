package com.cxk.simple_rag.config;

import lombok.Data;

/**
 * Embedding 配置 DTO
 *
 * @author wangxin
 */
@Data
public class EmbeddingConfigDTO {
    private String provider;
    private String siliconflowApiKey;
    private String siliconflowModel;
    private String siliconflowBaseUrl;
    private String bailianApiKey;
    private String bailianModel;
    private String bailianBaseUrl;
    private String ollamaBaseUrl;
    private String ollamaModel;
}
