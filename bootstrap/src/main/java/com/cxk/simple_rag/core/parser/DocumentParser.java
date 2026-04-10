package com.cxk.simple_rag.core.parser;

import java.io.InputStream;

/**
 * 文档解析器接口
 *
 * @author wangxin
 */
public interface DocumentParser {

    /**
     * 从输入流中提取文本
     *
     * @param inputStream 输入流
     * @param fileName    文件名
     * @return 提取的文本
     */
    String extractText(InputStream inputStream, String fileName);
}
