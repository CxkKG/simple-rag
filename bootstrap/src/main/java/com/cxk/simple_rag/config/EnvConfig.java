package com.cxk.simple_rag.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * 环境变量配置类
 * 在 Spring Boot 启动最早期加载 .env 文件中的环境变量
 * 确保 application.yaml 中的 ${VAR} 占位符可以读取到 .env 文件中的值
 */
public class EnvConfig implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        try {
            // 加载 .env 文件
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")
                    .ignoreIfMissing()
                    .load();
            
            // 将 .env 文件中的变量添加到 Spring Environment 中
            MutablePropertySources propertySources = environment.getPropertySources();
            Map<String, Object> envMap = new HashMap<>();
            
            dotenv.entries().forEach(entry -> {
                envMap.put(entry.getKey(), entry.getValue());
            });
            
            // 添加到 PropertySources 的最前面，优先级最高
            propertySources.addFirst(new MapPropertySource("dotenv", envMap));
            
            System.out.println("✅ .env 文件加载成功，共加载 " + envMap.size() + " 个环境变量");
        } catch (Exception e) {
            System.out.println("⚠️ 未找到 .env 文件或加载失败: " + e.getMessage());
            System.out.println("💡 请复制 .env.example 为 .env 并配置相关环境变量");
        }
    }
}
