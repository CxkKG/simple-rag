package com.cxk.simple_rag.llm;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.function.Consumer;

/**
 * LLM 服务接口
 *
 * @author wangxin
 */
public interface LLMService {

    /**
     * 生成回答
     *
     * @param systemPrompt 系统提示词
     * @param userPrompt 用户提示词
     * @return 生成的回答
     */
    String generate(String systemPrompt, String userPrompt);

    /**
     * 对话生成
     *
     * @param messages 消息列表
     * @return 生成的回答
     */
    String generate(List<Message> messages);

    /**
     * 流式生成回答（SSE）
     *
     * @param messages 消息列表
     * @param emitter SSE 发射器
     * @param contentConsumer 内容消费回调，用于接收流式片段
     */
    void streamGenerate(List<Message> messages, SseEmitter emitter, Consumer<String> contentConsumer);

    /**
     * 流式生成回答（SSE）- 简化版
     *
     * @param systemPrompt 系统提示词
     * @param userPrompt 用户提示词
     * @param emitter SSE 发射器
     * @param contentConsumer 内容消费回调
     */
    void streamGenerate(String systemPrompt, String userPrompt, SseEmitter emitter, Consumer<String> contentConsumer);

    /**
     * 消息类
     */
    class Message {
        private String role; // system / user / assistant
        private String content;

        public Message() {}

        public Message(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
