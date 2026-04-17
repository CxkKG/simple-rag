package com.cxk.simple_rag.ai;

import com.cxk.simple_rag.llm.LLMService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AI 智能摘要和关键词提取服务
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AISummaryService {

    private final LLMService llmService;

    /**
     * 生成文档摘要
     *
     * @param content 文档内容（建议不超过 5000 字，超出可能被截断）
     * @return 摘要（不超过 150 字）
     */
    public String generateSummary(String content) {
        // 限制输入长度，避免 token 消耗过多
        String inputContent = content;
        if (content != null && content.length() > 5000) {
            inputContent = content.substring(0, 5000);
            log.debug("Content truncated to 5000 chars for summary");
        }

        String systemPrompt = "你是一个文档摘要生成助手。请仔细阅读以下文本，用简洁明了的语言概括其主要内容，要求不超过 150 字。";

        String userPrompt = "请为以下文本生成一个不超过 150 字的中文摘要，突出主要内容：\n\n" + inputContent;

        try {
            String summary = llmService.generate(systemPrompt, userPrompt);
            // 确保摘要不超过 150 字
            if (summary != null && summary.length() > 150) {
                summary = summary.substring(0, 150);
            }
            return summary != null ? summary.trim() : "";
        } catch (Exception e) {
            log.error("Generate summary failed", e);
            // 降级处理：取原文前 150 个字符
            String contentForFallback = inputContent != null ? inputContent : "";
            return contentForFallback.length() <= 150 ? contentForFallback : contentForFallback.substring(0, 150) + "...";
        }
    }

    /**
     * 提取关键词
     *
     * @param content 文档内容（建议不超过 5000 字，超出可能被截断）
     * @param topK 提取关键词数量（3-5 个）
     * @return 关键词列表
     */
    public List<String> extractKeywords(String content, int topK) {
        // 限制输入长度
        String inputContent = content;
        if (content != null && content.length() > 5000) {
            inputContent = content.substring(0, 5000);
            log.debug("Content truncated to 5000 chars for keyword extraction");
        }

        // 确保 topK 在合理范围内
        int keywordCount = Math.max(3, Math.min(5, topK));

        String systemPrompt = "你是一个关键词提取助手。请仔细阅读以下文本，提取 " + keywordCount + " 个最能代表文本核心内容的关键词，以中文逗号分隔。只返回关键词列表，不要其它内容。";

        String userPrompt = "请从以下文本中提取 " + keywordCount + " 个核心关键词，以逗号分隔：\n\n" + inputContent;

        try {
            String response = llmService.generate(systemPrompt, userPrompt);
            return parseKeywords(response, keywordCount);
        } catch (Exception e) {
            log.error("Extract keywords failed", e);
            return List.of("摘要", "生成", "失败");
        }
    }

    /**
     * 解析关键词响应
     */
    private List<String> parseKeywords(String response, int topK) {
        if (response == null || response.trim().isEmpty()) {
            return List.of();
        }

        // 移除可能的数字编号、引号、换行等
        String cleaned = response.replaceAll("[\\d.\\s\"'，,\\n\\r]+", " ");

        // 分割关键词
        return java.util.Arrays.stream(cleaned.split("\\s+"))
                .filter(s -> !s.trim().isEmpty() && s.length() > 1)
                .limit(topK)
                .toList();
    }
}
