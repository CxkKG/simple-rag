package com.cxk.simple_rag.llm.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONUtil;
import com.cxk.simple_rag.config.AIConfig;
import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Ollama 本地模型 LLM 客户端实现
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaLLMService implements LLMService {

    private final AIConfig aiConfig;

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        List<LLMService.Message> messages = new ArrayList<>();
        messages.add(new LLMService.Message("system", systemPrompt));
        messages.add(new LLMService.Message("user", userPrompt));
        return generate(messages);
    }

    @Override
    public String generate(List<LLMService.Message> messages) {
        AIConfig.Ollama config = aiConfig.getProviders().getOllama();

        // 构建请求体（Ollama API 格式）
        Map<String, Object> request = new HashMap<>();
        request.put("model", config.getModel());
        request.put("messages", messages);
        request.put("temperature", 0.7);
        request.put("stream", false);

        String url = config.getBaseUrl() + "/api/chat";
        String body = JSONUtil.toJsonStr(request);

        log.debug("Sending request to Ollama: model={}, url={}", config.getModel(), url);

        try {
            // 发送请求
            String response = HttpUtil.createPost(url)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .timeout(60000)
                    .execute()
                    .body();

            log.debug("Ollama response: {}", response);

            // 解析响应
            var responseJson = JSONUtil.parseObj(response);
            var message = responseJson.getJSONObject("message");
            return message.getStr("content");
        } catch (Exception e) {
            log.error("Ollama generate failed", e);
            throw new RuntimeException("LLM generate failed", e);
        }
    }
}
