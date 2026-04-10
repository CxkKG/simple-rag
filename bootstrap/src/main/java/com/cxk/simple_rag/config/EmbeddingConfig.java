package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Embedding 服务配置
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "embedding")
public class EmbeddingConfig {

    /**
     * Embedding API 提供商
     * 支持：siliconflow, bailian, ollama
     */
    private String provider = "siliconflow";

    /**
     * SiliconFlow 配置
     */
    private String siliconflowApiKey = "";
    private String siliconflowModel = "BAAI/bge-large-zh-v1.5";
    private String siliconflowBaseUrl = "https://api.siliconflow.cn/v1";

    /**
     * Bailian (阿里云百炼) 配置
     */
    private String bailianApiKey = "";
    private String bailianModel = "text-embedding-v2";

    /**
     * Ollama 本地模型配置
     */
    private String ollamaBaseUrl = "http://localhost:11434";
    private String ollamaModel = "bge-large-zh";
}
