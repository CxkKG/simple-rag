package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * RocketMQ 配置类
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "rocketmq")
public class RocketMqConfig {

    /**
     * NameServer 地址
     */
    private String nameServer = "127.0.0.1:9876";

    /**
     * 消费者组
     */
    private String consumerGroup = "simple-rag-consumer-group";

    /**
     * 文档分块 Topic
     */
    private String chunkTopic = "TOPIC_KNOWLEDGE_CHUNK";

    /**
     * 消费者标签
     */
    private String consumerTag = "*";
}
