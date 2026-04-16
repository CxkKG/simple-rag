package com.cxk.simple_rag.llm.impl;

import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.cxk.simple_rag.config.AIConfig;
import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SiliconFlow LLM 客户端实现
 *
 * @author wangxin
 */
@Slf4j
//@Service
@RequiredArgsConstructor
public class SiliconflowLLMService implements LLMService {

    private final AIConfig aiConfig;

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        List<LLMService.Message> messages = List.of(
                new LLMService.Message("system", systemPrompt),
                new LLMService.Message("user", userPrompt)
        );
        return generate(messages);
    }

    @Override
    public String generate(List<LLMService.Message> messages) {
        AIConfig.Siliconflow config = aiConfig.getProviders().getSiliconflow();

        // 构建请求体
        var request = Map.of(
                "model", config.getModel(),
                "messages", messages,
                "temperature", 0.7,
                "stream", false
        );

        String url = config.getBaseUrl() + "/chat/completions";
        String body = JSONUtil.toJsonStr(request);

        log.debug("Sending request to SiliconFlow: model={}, url={}", config.getModel(), url);

        try {
            // 发送请求
            String response = HttpUtil.createPost(url)
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .body(body)
                    .timeout(30000)
                    .execute()
                    .body();

            log.debug("SiliconFlow response: {}", response);

            // 解析响应
            var responseJson = JSONUtil.parseObj(response);
            var choices = responseJson.getJSONArray("choices");
            var choice = choices.getObj(0);
            var message = ((JSONObject)choice).getJSONObject("message");
            return message.getStr("content");
        } catch (Exception e) {
            log.error("SiliconFlow generate failed", e);
            throw new RuntimeException("LLM generate failed", e);
        }
    }
}
