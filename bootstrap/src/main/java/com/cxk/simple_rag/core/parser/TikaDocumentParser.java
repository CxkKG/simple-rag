package com.cxk.simple_rag.core.parser;

import org.apache.tika.Tika;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * 基于 Apache Tika 的文档解析器
 *
 * @author wangxin
 */
@Component
public class TikaDocumentParser implements DocumentParser {

    private final Tika tika;

    public TikaDocumentParser() {
        this.tika = new Tika();
    }

    @Override
    public String extractText(InputStream inputStream, String fileName) {
        try {
            String text = tika.parseToString(inputStream);
            return TextCleanupUtil.cleanup(text);
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract text from file: " + fileName, e);
        }
    }
}
