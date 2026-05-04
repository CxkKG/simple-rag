package com.cxk.simple_rag;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Simple RAG 应用程序启动类
 *
 * @author wangxin
 */
@SpringBootApplication
@EnableScheduling
public class SimpleRagApplication {

    public static void main(String[] args) {
        SpringApplication.run(SimpleRagApplication.class, args);
    }
}
