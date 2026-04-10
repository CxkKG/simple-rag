package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Milvus 配置类
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "milvus")
public class MilvusConfig {

    /**
     * Milvus 服务地址
     */
    private String host = "127.0.0.1";

    /**
     * Milvus 服务端口
     */
    private Integer port = 19530;

    /**
     * 用户名（可选）
     */
    private String username = "";

    /**
     * 密码（可选）
     */
    private String password = "";

    /**
     * 数据库名称
     */
    private String databaseName = "default";

    /**
     * 向量维度
     */
    private Integer vectorDimension = 1536;
}
