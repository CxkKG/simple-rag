package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * AI 模型服务配置
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai")
public class AIConfig {

    /**
     * 当前使用的 AI 提供商
     */
    private String provider = "bailian";

    /**
     * LLM 提供商配置
     */
    private Providers providers = new Providers();

    @Data
    public static class Providers {
        /**
         * Bailian (阿里云百炼) 配置
         */
        private Bailian bailian = new Bailian();

        /**
         * SiliconFlow 配置
         */
        private Siliconflow siliconflow = new Siliconflow();

        /**
         * Ollama 本地模型配置
         */
        private Ollama ollama = new Ollama();
    }

    @Data
    public static class Bailian {
        private String apiKey = "";
        private String model = "qwen-plus";
        private String baseUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
    }

    @Data
    public static class Siliconflow {
        private String apiKey = "";
        private String model = "deepseek-ai/DeepSeek-V3.2";
        private String baseUrl = "https://api.siliconflow.cn/v1/chat/completions";
    }

    @Data
    public static class Ollama {
        private String baseUrl = "http://localhost:11434";
        private String model = "deepseek-r1:1.5b";
    }
}
