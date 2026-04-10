package com.cxk.simple_rag.core.parser;

import lombok.Getter;

/**
 * 解析器类型枚举
 *
 * @author wangxin
 */
@Getter
public enum ParserType {

    TIKA("tika", "Apache Tika 解析器");

    private final String type;
    private final String description;

    ParserType(String type, String description) {
        this.type = type;
        this.description = description;
    }

    public static ParserType from(String type) {
        for (ParserType parserType : values()) {
            if (parserType.getType().equalsIgnoreCase(type)) {
                return parserType;
            }
        }
        throw new IllegalArgumentException("Unknown parser type: " + type);
    }
}
