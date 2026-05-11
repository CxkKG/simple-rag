package com.cxk.simple_rag.llm.impl;

import com.cxk.simple_rag.config.AIConfig;
import com.cxk.simple_rag.llm.LLMService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * LLMService 路由：按 AIConfig.provider 在每次调用时分发到具体实现，
 * 使系统设置中的 provider 切换可即时生效。
 */
@Slf4j
@Primary
@Component
public class LLMServiceRouter implements LLMService {

    private static final String DEFAULT_PROVIDER = "bailian";

    private final Map<String, LLMService> services;
    private final AIConfig aiConfig;

    public LLMServiceRouter(Map<String, LLMService> services, AIConfig aiConfig) {
        this.services = new HashMap<>(services);
        this.services.remove("LLMServiceRouter");
        this.services.remove("lLMServiceRouter");
        this.services.values().removeIf(v -> v instanceof LLMServiceRouter);
        this.aiConfig = aiConfig;
        log.info("LLMServiceRouter initialized with providers: {}", this.services.keySet());
    }

    private LLMService resolve() {
        String provider = aiConfig.getProvider();
        if (provider == null || provider.isBlank()) {
            provider = DEFAULT_PROVIDER;
        }
        LLMService target = services.get(provider);
        if (target == null) {
            log.warn("LLM provider '{}' not found, fallback to '{}'. Available: {}",
                    provider, DEFAULT_PROVIDER, services.keySet());
            target = services.get(DEFAULT_PROVIDER);
        }
        if (target == null) {
            throw new IllegalStateException("No LLMService bean available for provider: " + provider);
        }
        return target;
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        return resolve().generate(systemPrompt, userPrompt);
    }

    @Override
    public String generate(List<Message> messages) {
        return resolve().generate(messages);
    }

    @Override
    public void streamGenerate(List<Message> messages, SseEmitter emitter, Consumer<String> contentConsumer) {
        resolve().streamGenerate(messages, emitter, contentConsumer);
    }

    @Override
    public void streamGenerate(String systemPrompt, String userPrompt, SseEmitter emitter, Consumer<String> contentConsumer) {
        resolve().streamGenerate(systemPrompt, userPrompt, emitter, contentConsumer);
    }
}
