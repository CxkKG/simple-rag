//package com.cxk.simple_rag.llm.impl;
//
//import cn.hutool.core.util.StrUtil;
//import cn.hutool.http.HttpResponse;
//import cn.hutool.http.HttpUtil;
//import cn.hutool.json.JSONUtil;
//import com.cxk.simple_rag.config.AIConfig;
//import com.cxk.simple_rag.llm.LLMService;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.stereotype.Service;
//import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
//
//import java.io.BufferedReader;
//import java.io.IOException;
//import java.io.InputStream;
//import java.io.InputStreamReader;
//import java.nio.charset.StandardCharsets;
//import java.util.ArrayList;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.function.Consumer;
//
///**
// * SiliconFlow LLM 客户端实现
// *
// * @author wangxin
// */
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class SiliconflowLLMService implements LLMService {
//
//    private final AIConfig aiConfig;
//
//    @Override
//    public String generate(String systemPrompt, String userPrompt) {
//        List<LLMService.Message> messages = new ArrayList<>();
//        messages.add(new LLMService.Message("system", systemPrompt));
//        messages.add(new LLMService.Message("user", userPrompt));
//        return generate(messages);
//    }
//
//    @Override
//    public String generate(List<LLMService.Message> messages) {
//        AIConfig.Siliconflow config = aiConfig.getProviders().getSiliconflow();
//
//        // 构建请求体
//        Map<String, Object> request = new HashMap<>();
//        request.put("model", config.getModel());
//        request.put("messages", messages);
//        request.put("temperature", 0.7);
//        request.put("stream", false);
//
//        String url = config.getBaseUrl() + "/chat/completions";
//        String body = JSONUtil.toJsonStr(request);
//
//        log.debug("Sending request to SiliconFlow: model={}, url={}", config.getModel(), url);
//
//        try {
//            String response = HttpUtil.createPost(url)
//                    .header("Authorization", "Bearer " + config.getApiKey())
//                    .header("Content-Type", "application/json")
//                    .body(body)
//                    .timeout(30000)
//                    .execute()
//                    .body();
//
//            log.debug("SiliconFlow response: {}", response);
//
//            var responseJson = JSONUtil.parseObj(response);
//            var choices = responseJson.getJSONArray("choices");
//            var choice = choices.getObj(0);
//            var message = choice.getJSONObject("message");
//            return message.getStr("content");
//        } catch (Exception e) {
//            log.error("SiliconFlow generate failed", e);
//            throw new RuntimeException("LLM generate failed", e);
//        }
//    }
//
//    @Override
//    public void streamGenerate(List<LLMService.Message> messages, SseEmitter emitter, Consumer<String> contentConsumer) {
//        AIConfig.Siliconflow config = aiConfig.getProviders().getSiliconflow();
//
//        // 构建请求体
//        Map<String, Object> request = new HashMap<>();
//        request.put("model", config.getModel());
//        request.put("messages", messages);
//        request.put("temperature", 0.7);
//        request.put("top_p", 0.9);
//        request.put("stream", true); // 启用流式模式
//
//        String url = config.getBaseUrl() + "/chat/completions";
//        String body = JSONUtil.toJsonStr(request);
//
//        log.debug("Sending stream request to SiliconFlow: model={}, url={}", config.getModel(), url);
//
//        HttpResponse httpResponse = null;
//        BufferedReader reader = null;
//
//        try {
//            // 建立 HTTP 连接，启用流式
//            httpResponse = HttpUtil.createPost(url)
//                    .header("Authorization", "Bearer " + config.getApiKey())
//                    .header("Content-Type", "application/json")
//                    .header("Accept", "text/event-stream")
//                    .body(body)
//                    .timeout(60000)
//                    .executeAsync();
//
//            int status = httpResponse.getStatus();
//            log.debug("SiliconFlow stream response status: {}", status);
//
//            if (status != 200) {
//                String errorBody = httpResponse.body();
//                log.error("SiliconFlow stream API error: status={}, body={}", status, errorBody);
//                emitter.send(SseEmitter.event()
//                        .name("error")
//                        .data("SiliconFlow API 调用失败 [" + status + "]: " + (errorBody != null ? errorBody.trim() : "empty response")));
//                return;
//            }
//
//            // 读取响应流
//            InputStream inputStream = httpResponse.bodyStream();
//            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
//
//            String line;
//            StringBuilder fullContent = new StringBuilder();
//            int checkCount = 0; // 检查连接状态的计数器
//
//            // 按 SSE 格式解析：data: {...}\n\n
//            while ((line = reader.readLine()) != null) {
//                // 每处理 10 个数据包检查一次连接状态
//                checkCount++;
//                if (checkCount % 10 == 0) {
//                    try {
//                        emitter.send(SseEmitter.event().data("")); // 探测连接状态
//                    } catch (IllegalStateException e) {
//                        log.warn("Client disconnected, stopping stream");
//                        break;
//                    } catch (IOException e) {
//                        log.warn("Failed to send probe event", e);
//                        break;
//                    }
//                }
//
//                line = line.trim();
//                if (StrUtil.isEmpty(line)) {
//                    continue;
//                }
//
//                // 解析 SSE data 行
//                if (line.startsWith("data:")) {
//                    String data = line.substring(5).trim();
//
//                    // 检查是否是结束标记
//                    if ("[DONE]".equals(data)) {
//                        log.debug("Received [DONE] marker");
//                        break;
//                    }
//
//                    try {
//                        // 解析 JSON 内容
//                        var json = JSONUtil.parseObj(data);
//
//                        // 检查是否有输出内容
//                        var choices = json.getJSONArray("choices");
//                        if (choices != null && choices.size() > 0) {
//                            var choice = choices.getObj(0);
//                            if (choice != null) {
//                                var delta = choice.getJSONObject("delta");
//                                if (delta != null && delta.containsKey("content")) {
//                                    String content = delta.getStr("content");
//                                    if (StrUtil.isNotEmpty(content)) {
//                                    fullContent.append(content);
//
//                                    // 发送内容片段到前端
//                                    emitter.send(SseEmitter.event()
//                                            .name("content")
//                                            .data(content));
//
//                                    // 回调消费内容
//                                    if (contentConsumer != null) {
//                                        contentConsumer.accept(content);
//                                    }
//
//                                    // 添加延迟，让输出速度慢一点（模拟打字机效果）
//                                    int delay = Math.min(200, Math.max(30, content.length() * 20));
//                                    Thread.sleep(delay);
//                                }
//                            }
//                        }
//
//                        // 检查是否有错误
//                        if (json.containsKey("error")) {
//                            var error = json.getJSONObject("error");
//                            String message = error.getStr("message", "unknown error");
//                            log.error("SiliconFlow stream error: {}", message);
//                            emitter.send(SseEmitter.event()
//                                    .name("error")
//                                    .data("SiliconFlow 错误：" + message));
//                            break;
//                        }
//
//                    } catch (InterruptedException e) {
//                        log.warn("Stream interrupted", e);
//                        Thread.currentThread().interrupt();
//                        break;
//                    } catch (Exception e) {
//                        log.warn("Failed to parse SSE data: {}", line, e);
//                    }
//                }
//            }
//
//            log.info("Stream completed, total content length: {}", fullContent.length());
//
//        } catch (IOException e) {
//            log.error("Stream IO error", e);
//            try {
//                emitter.send(SseEmitter.event()
//                        .name("error")
//                        .data("流式响应读取失败：" + e.getMessage()));
//            } catch (IOException ex) {
//                log.error("Failed to send error event", ex);
//            }
//        } catch (Exception e) {
//            log.error("SiliconFlow stream generate failed", e);
//            try {
//                emitter.send(SseEmitter.event()
//                        .name("error")
//                        .data("流式生成失败：" + e.getMessage()));
//            } catch (IOException ex) {
//                log.error("Failed to send error event", ex);
//            }
//        } finally {
//            // 确保资源正确关闭
//            if (reader != null) {
//                try {
//                    reader.close();
//                } catch (IOException e) {
//                    log.warn("Failed to close reader", e);
//                }
//            }
//            if (httpResponse != null) {
//                httpResponse.close();
//            }
//        }
//    }
//
//    @Override
//    public void streamGenerate(String systemPrompt, String userPrompt, SseEmitter emitter, Consumer<String> contentConsumer) {
//        List<LLMService.Message> messages = new ArrayList<>();
//        messages.add(new LLMService.Message("system", systemPrompt));
//        messages.add(new LLMService.Message("user", userPrompt));
//        streamGenerate(messages, emitter, contentConsumer);
//    }
//}
