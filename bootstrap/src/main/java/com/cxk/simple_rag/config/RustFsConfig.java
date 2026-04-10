package com.cxk.simple_rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * RustFS 配置类
 *
 * @author wangxin
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "rustfs")
public class RustFsConfig {

    /**
     * RustFS 端点地址
     */
    private String endpoint = "http://127.0.0.1:9000";

    /**
     * 访问密钥
     */
    private String accessKey = "rustfsadmin";

    /**
     * 秘密密钥
     */
    private String secretKey = "rustfsadmin";

    /**
     * 存储桶名称
     */
    private String bucket = "simple-rag";
}
