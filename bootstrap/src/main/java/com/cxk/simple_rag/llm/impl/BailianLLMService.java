package com.cxk.simple_rag.llm.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpResponse;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONUtil;
import com.cxk.simple_rag.config.AIConfig;
import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Bailian (阿里云百炼) LLM 客户端实现
 *
 * @author wangxin
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
public class BailianLLMService implements LLMService {

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
            var httpResponse = HttpUtil.createPost(url)
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .body(body)
                    .timeout(30000)
                    .execute();

            int status = httpResponse.getStatus();
            String response = httpResponse.body();

            log.debug("Bailian response: status={}, body={}", status,
                    response != null && response.length() > 500 ? response.substring(0, 500) + "..." : response);

            if (status != 200) {
                log.error("Bailian API error: status={}, response={}", status, response);
                throw new RuntimeException("百炼 API 调用失败 [" + status + "]: " +
                        (response != null ? response.trim() : "empty response"));
            }

            if (response == null || response.trim().isEmpty()) {
                throw new RuntimeException("百炼 API 返回空响应");
            }

            String trimmed = response.trim();

            if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
                log.error("Bailian 返回非 JSON 响应：{}", trimmed);
                throw new RuntimeException("百炼 API 返回格式异常：" + trimmed);
            }

            var responseJson = JSONUtil.parseObj(trimmed);

            if (responseJson.containsKey("output")) {
                var output = responseJson.getJSONObject("output");
                if (output == null || !output.containsKey("text")) {
                    log.warn("Bailian output 结构异常：{}", output);
                    return "";
                }
                return output.getStr("text");
            } else if (responseJson.containsKey("message")) {
                throw new RuntimeException("百炼返回错误：" + responseJson.getStr("message"));
            } else if (responseJson.containsKey("code")) {
                throw new RuntimeException("百炼错误 [code=" + responseJson.getStr("code") + "]: " +
                        responseJson.getStr("message", "unknown error"));
            } else {
                log.warn("未知响应格式：{}", responseJson);
                throw new RuntimeException("未知响应格式：" + trimmed);
            }

        } catch (cn.hutool.json.JSONException e) {
            log.error("JSON 解析失败，请检查百炼返回内容", e);
            throw new RuntimeException("LLM 响应解析异常", e);
        } catch (Exception e) {
            log.error("Bailian generate failed", e);
            throw new RuntimeException("LLM generate failed", e);
        }
    }

    @Override
    public void streamGenerate(List<LLMService.Message> messages, SseEmitter emitter, Consumer<String> contentConsumer) {
        AIConfig.Bailian config = aiConfig.getProviders().getBailian();

        // 构建请求体
        Map<String, Object> input = new HashMap<>();
        input.put("messages", messages);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("temperature", 0.7);
        parameters.put("top_p", 0.9);
        parameters.put("result_format", "text");
        // 启用流式模式
        parameters.put("stream", true);

        Map<String, Object> request = new HashMap<>();
        request.put("model", config.getModel());
        request.put("input", input);
        request.put("parameters", parameters);

        String url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
        String body = JSONUtil.toJsonStr(request);

        log.debug("Sending stream request to Bailian: model={}, url={}", config.getModel(), url);

        HttpResponse httpResponse = null;
        BufferedReader reader = null;

        try {
            // 建立 HTTP 连接，启用流式
            httpResponse = HttpUtil.createPost(url)
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .header("X-DashScope-SSE", "enable")
                    .body(body)
                    .timeout(60000)
                    .executeAsync();

            int status = httpResponse.getStatus();
            log.debug("Bailian stream response status: {}", status);

            if (status != 200) {
                String errorBody = httpResponse.body();
                log.error("Bailian stream API error: status={}, body={}", status, errorBody);
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("百炼 API 调用失败 [" + status + "]: " + (errorBody != null ? errorBody.trim() : "empty response")));
                return;
            }

            // 读取响应流
            InputStream inputStream = httpResponse.bodyStream();
            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

            String line;
            StringBuilder fullContent = new StringBuilder();
            String lastText = ""; // 记录上一次接收到的文本，用于去重
            int checkCount = 0; // 检查连接状态的计数器

            // 按 SSE 格式解析：data: {...}\n\n
            while ((line = reader.readLine()) != null) {
                // 每处理 10 个数据包检查一次连接状态
                checkCount++;
                if (checkCount % 10 == 0) {
                    try {
                        emitter.send(SseEmitter.event().data("")); // 探测连接状态
                    } catch (IllegalStateException e) {
                        log.warn("Client disconnected, stopping stream");
                        break;
                    } catch (IOException e) {
                        log.warn("Failed to send probe event", e);
                        break;
                    }
                }

                line = line.trim();
                if (StrUtil.isEmpty(line)) {
                    continue;
                }

                // 解析 SSE data 行
                if (line.startsWith("data:")) {
                    String data = line.substring(5).trim();

                    // 检查是否是结束标记
                    if ("[DONE]".equals(data)) {
                        log.debug("Received [DONE] marker");
                        break;
                    }

                    try {
                        // 解析 JSON 内容
                        var json = JSONUtil.parseObj(data);

                        // 检查是否有输出内容
                        if (json.containsKey("output")) {
                            var output = json.getJSONObject("output");
                            if (output != null && output.containsKey("text")) {
                                String text = output.getStr("text");
                                if (StrUtil.isNotEmpty(text)) {
                                    // 百炼流式响应返回的是增量文本，但有时可能包含重复
                                    // 只追加与前一次不同的新内容
                                    String newText;
                                    if (text.startsWith(lastText)) {
                                        // 是当前文本的延续，只取新增部分
                                        newText = text.substring(lastText.length());
                                    } else {
                                        // 完全新的内容
                                        newText = text;
                                    }

                                    if (StrUtil.isNotEmpty(newText)) {
                                        fullContent.append(newText);
                                        lastText = text; // 更新 lastText 为当前完整文本

                                        // 发送内容片段到前端
                                        emitter.send(SseEmitter.event()
                                                .name("content")
                                                .data(newText));

                                        // 回调消费内容
                                        if (contentConsumer != null) {
                                            contentConsumer.accept(newText);
                                        }

                                        // 添加延迟，让输出速度慢一点（模拟打字机效果）
                                        int delay = Math.min(200, Math.max(30, newText.length() * 20));
                                        Thread.sleep(delay);
                                    }
                                }
                            }
                        }

                        // 检查是否有错误
                        if (json.containsKey("code")) {
                            String code = json.getStr("code");
                            String message = json.getStr("message", "unknown error");
                            log.error("Bailian stream error: code={}, message={}", code, message);
                            emitter.send(SseEmitter.event()
                                    .name("error")
                                    .data("百炼错误 [" + code + "]: " + message));
                            break;
                        }

                    } catch (InterruptedException e) {
                        log.warn("Stream interrupted", e);
                        Thread.currentThread().interrupt();
                        break;
                    } catch (Exception e) {
                        log.warn("Failed to parse SSE data: {}", data, e);
                    }
                }
            }

            log.info("Stream completed, total content length: {}", fullContent.length());

        } catch (IOException e) {
            log.error("Stream IO error", e);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("流式响应读取失败：" + e.getMessage()));
            } catch (IOException ex) {
                log.error("Failed to send error event", ex);
            }
        } catch (Exception e) {
            log.error("Bailian stream generate failed", e);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("流式生成失败：" + e.getMessage()));
            } catch (IOException ex) {
                log.error("Failed to send error event", ex);
            }
        } finally {
            // 确保资源正确关闭
            if (reader != null) {
                try {
                    reader.close();
                } catch (IOException e) {
                    log.warn("Failed to close reader", e);
                }
            }
            if (httpResponse != null) {
                httpResponse.close();
            }
        }
    }

    @Override
    public void streamGenerate(String systemPrompt, String userPrompt, SseEmitter emitter, Consumer<String> contentConsumer) {
        List<LLMService.Message> messages = new ArrayList<>();
        messages.add(new LLMService.Message("system", systemPrompt));
        messages.add(new LLMService.Message("user", userPrompt));
        streamGenerate(messages, emitter, contentConsumer);
    }
}
