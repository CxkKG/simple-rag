package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Reranker 重排序配置
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "reranker")
public class RerankerConfig {

    /** 是否启用重排序 */
    private boolean enabled = true;

    /** API 密钥（复用 SiliconFlow 密钥） */
    private String apiKey = "";

    /** 重排序模型名称 */
    private String model = "BAAI/bge-reranker-v2-m3";

    /** 重排序 API 地址 */
    private String baseUrl = "https://api.siliconflow.cn/v1/rerank";

    /** 重排序后保留的 top-N 结果数量（0 = 保留全部，仅排序） */
    private int topN = 4;

    /** 重排序相关性分数阈值，top1 分数低于此值视为未命中，触发联网搜索兜底 */
    private float scoreThreshold = 0.3f;
}
