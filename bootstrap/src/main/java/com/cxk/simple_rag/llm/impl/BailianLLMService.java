package com.cxk.simple_rag.llm.impl;

import cn.hutool.http.HttpUtil;
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
 * Bailian (阿里云百炼) LLM 客户端实现
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BailianLLMService implements LLMService {

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
        AIConfig.Bailian config = aiConfig.getProviders().getBailian();

        // 构建请求体
        Map<String, Object> input = new HashMap<>();
        input.put("messages", messages);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("temperature", 0.7);
        parameters.put("top_p", 0.9);
        parameters.put("result_format", "text");

        Map<String, Object> request = new HashMap<>();
        request.put("model", config.getModel());
        request.put("input", input);
        request.put("parameters", parameters);

        String url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
        String body = JSONUtil.toJsonStr(request);

        log.debug("Sending request to Bailian: model={}, url={}", config.getModel(), url);

        try {
            // 🔥 关键修改：获取 HttpResponse 对象，先检查状态码
            var httpResponse = HttpUtil.createPost(url)
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .body(body)
                    .timeout(30000)
                    .execute();

            int status = httpResponse.getStatus();
            String response = httpResponse.body(); // 获取响应体

            // 🔥 关键修改1：记录状态码和原始响应（脱敏日志）
            log.debug("Bailian response: status={}, body={}", status,
                    response != null && response.length() > 500 ? response.substring(0, 500) + "..." : response);

            // 🔥 关键修改2：先检查状态码
            if (status != 200) {
                log.error("Bailian API error: status={}, response={}", status, response);
                throw new RuntimeException("百炼API调用失败 [" + status + "]: " +
                        (response != null ? response.trim() : "empty response"));
            }

            // 🔥 关键修改3：预检查响应内容
            if (response == null || response.trim().isEmpty()) {
                throw new RuntimeException("百炼API返回空响应");
            }

            String trimmed = response.trim();

            // 检查是否为合法JSON开头
            if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
                log.error("Bailian 返回非JSON响应: {}", trimmed);
                throw new RuntimeException("百炼API返回格式异常: " + trimmed);
            }

            // 🔥 关键修改4：安全解析
            var responseJson = JSONUtil.parseObj(trimmed);

            if (responseJson.containsKey("output")) {
                var output = responseJson.getJSONObject("output");
                // 防御性编程：检查嵌套字段是否存在
                if (output == null || !output.containsKey("text")) {
                    log.warn("Bailian output 结构异常: {}", output);
                    return ""; // 或根据业务需求处理
                }
                return output.getStr("text");
            } else if (responseJson.containsKey("message")) {
                throw new RuntimeException("百炼返回错误: " + responseJson.getStr("message"));
            } else if (responseJson.containsKey("code")) {
                // 处理阿里云标准错误格式
                throw new RuntimeException("百炼错误 [code=" + responseJson.getStr("code") + "]: " +
                        responseJson.getStr("message", "unknown error"));
            } else {
                log.warn("未知响应格式: {}", responseJson);
                throw new RuntimeException("未知响应格式: " + trimmed);
            }

        } catch (cn.hutool.json.JSONException e) {
            log.error("JSON解析失败，请检查百炼返回内容", e);
            throw new RuntimeException("LLM响应解析异常", e);
        } catch (Exception e) {
            log.error("Bailian generate failed", e);
            throw new RuntimeException("LLM generate failed", e);
        }
    }
}
