package com.cxk.simple_rag.core.parser;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 解析器选择器
 *
 * @author wangxin
 */
@Component
public class ParserSelector {

    private final Map<String, DocumentParser> parsers;

    public ParserSelector(List<DocumentParser> parserList) {
        this.parsers = new HashMap<>();
        for (DocumentParser parser : parserList) {
            if (parser instanceof TikaDocumentParser) {
                this.parsers.put(ParserType.TIKA.getType(), parser);
            }
        }
    }

    public DocumentParser select(String type) {
        DocumentParser parser = parsers.get(type);
        if (parser == null) {
            throw new IllegalArgumentException("No parser found for type: " + type);
        }
        return parser;
    }
}
