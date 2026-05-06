package com.cxk.simple_rag.websearch;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * 联网搜索配置
 *
 * @author wangxin
 */
@Data
@ConfigurationProperties(prefix = "web-search")
public class WebSearchProperties {

    /**
     * 联网搜索全局开关；前端开关与该开关共同决定是否触发联网搜索
     */
    private boolean enabled = true;

    /**
     * 向量检索 top1 分数阈值，低于该阈值视为"未找到合适回答"，触发联网兜底
     */
    private float scoreThreshold = 0.02f;

    /**
     * 联网搜索返回最大条数
     */
    private int topK = 5;

    /**
     * MCP Server 暴露的搜索工具名匹配关键字（按顺序优先级匹配）
     */
    private List<String> toolNameKeywords = List.of(
            "brave_web_search",
            "tavily-search",
            "web_search",
            "search"
    );
}
