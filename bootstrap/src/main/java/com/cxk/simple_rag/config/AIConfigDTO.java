package com.cxk.simple_rag.config;

import lombok.Data;

/**
 * AI 配置 DTO
 *
 * @author wangxin
 */
@Data
public class AIConfigDTO {
    private Providers providers;

    @Data
    public static class Providers {
        private Bailian bailian;
        private Siliconflow siliconflow;
        private Ollama ollama;
    }

    @Data
    public static class Bailian {
        private String apiKey;
        private String model;
        private String baseUrl;
    }

    @Data
    public static class Siliconflow {
        private String apiKey;
        private String model;
        private String baseUrl;
    }

    @Data
    public static class Ollama {
        private String baseUrl;
        private String model;
    }
}
