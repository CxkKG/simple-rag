package com.cxk.simple_rag.knowledge.mq;

import com.cxk.simple_rag.config.RocketMqConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * 知识库文档分块消息生产者
 *
 * @author wangxin
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KnowledgeDocumentChunkProducer {

    private final RocketMQTemplate rocketMQTemplate;
    private final RocketMqConfig rocketMqConfig;

    /**
     * 发送文档分块消息
     *
     * @param docId 文档 ID
     */
    public void sendChunkMessage(String docId) {
        try {
            String destination = rocketMqConfig.getChunkTopic() + ":CHUNK";
            rocketMQTemplate.send(destination, MessageBuilder.withPayload(docId).build());
            log.info("Chunk message sent: docId={}", docId);
        } catch (Exception e) {
            log.error("Failed to send chunk message: docId={}", docId, e);
            throw new RuntimeException("Failed to send chunk message", e);
        }
    }
}
