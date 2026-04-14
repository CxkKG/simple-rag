package com.cxk.simple_rag.core.parser;

import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * 基于 Apache Tika 的文档解析器
 *
 * @author wangxin
 */
@Slf4j
@Component
public class TikaDocumentParser implements DocumentParser {

    private final Tika tika;

    public TikaDocumentParser() {
        this.tika = new Tika();
        // 自定义 Tika 配置
        // tika.getParser().setFontMapper(new FontMapper());
    }

    @Override
    public String extractText(InputStream inputStream, String fileName) {
        try {
            log.debug("Parsing file with Tika: fileName={}", fileName);
            String text = tika.parseToString(inputStream);
            log.debug("Raw text extracted: length={} chars", text.length());
            log.debug("Raw text preview: {}", text.substring(0, Math.min(200, text.length())));

            String cleaned = TextCleanupUtil.cleanup(text);
            log.debug("Cleaned text: length={} chars", cleaned.length());

            if (cleaned == null || cleaned.trim().isEmpty()) {
                log.warn("Tika returned empty text for file: fileName={}", fileName);
                // 尝试检测文件类型
                String mediaType = tika.detect(fileName);
                log.warn("File media type detected: {}", mediaType);
            }

            return cleaned;
        } catch (Exception e) {
            log.error("Failed to extract text from file: fileName={}", fileName, e);
            throw new RuntimeException("Failed to extract text from file: " + fileName, e);
        }
    }
}
