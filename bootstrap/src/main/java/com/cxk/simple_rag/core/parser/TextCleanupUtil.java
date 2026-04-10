package com.cxk.simple_rag.core.parser;

/**
 * 文本清理工具类
 *
 * @author wangxin
 */
public class TextCleanupUtil {

    private TextCleanupUtil() {}

    public static String cleanup(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        text = text.replaceAll("\\s+", " ");
        text = text.replaceAll("\\p{Cntrl}", "");
        text = text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
        text = text.replaceAll("[\\u200B-\\u200D\\uFEFF]", "");
        text = text.replaceAll("\uFFFD", "");
        return text.trim();
    }
}
