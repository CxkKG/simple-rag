package com.cxk.simple_rag.knowledge.mq;

import com.cxk.simple_rag.knowledge.service.KnowledgeDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

/**
 * 知识库文档分块消息消费者
 *
 * @author wangxin
 */
@Slf4j
@Component
@RocketMQMessageListener(
        topic = "${rocketmq.chunk-topic}",
        consumerGroup = "${rocketmq.consumer-group}",
        selectorExpression = "${rocketmq.consumer-tag}"
)
@RequiredArgsConstructor
public class KnowledgeDocumentChunkConsumer implements RocketMQListener<String> {

    private final KnowledgeDocumentService documentService;

    @Override
    public void onMessage(String docId) {
        log.info("Received chunk message for document: docId={}", docId);
        try {
            documentService.executeChunking(docId);
            log.info("Chunk processing completed: docId={}", docId);
        } catch (Exception e) {
            log.error("Chunk processing failed: docId={}", docId, e);
            throw e;
        }
    }
}
