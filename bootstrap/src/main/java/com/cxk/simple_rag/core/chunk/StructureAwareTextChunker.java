package com.cxk.simple_rag.core.chunk;

import cn.hutool.core.util.StrUtil;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 结构感知文本分块器
 * 支持按标题、段落等结构进行智能分块
 *
 * @author wangxin
 */
public class StructureAwareTextChunker implements ChunkingStrategy {

    private static final Pattern HEADING_PATTERN = Pattern.compile("(?m)^(#{1,6}\\s+.+)$");

    @Override
    public List<VectorChunk> chunk(String text, ChunkConfig config) {
        if (StrUtil.isBlank(text)) {
            return List.of();
        }

        List<VectorChunk> chunks = new ArrayList<>();

        // 默认配置
        int maxChunkSize = config.getMaxChunkSize() != null ? config.getMaxChunkSize() : 500;
        int overlapSize = config.getOverlapSize() != null ? config.getOverlapSize() : 50;
        int minChunkSize = config.getMinChunkSize() != null ? config.getMinChunkSize() : 100;
        boolean structured = config.getStructured() != null && config.getStructured();

        if (structured) {
            chunks = chunkByStructure(text, maxChunkSize, minChunkSize, overlapSize);
        } else {
            chunks = chunkBySize(text, maxChunkSize, overlapSize, minChunkSize);
        }

        return chunks;
    }

    private List<VectorChunk> chunkByStructure(String text, int maxChunkSize, int minChunkSize, int overlapSize) {
        List<VectorChunk> chunks = new ArrayList<>();
        List<String> sections = splitByHeadings(text);

        for (String section : sections) {
            if (section.length() > maxChunkSize) {
                chunks.addAll(chunkBySize(section, maxChunkSize, overlapSize, minChunkSize));
            } else if (section.length() >= minChunkSize) {
                chunks.add(createChunk(section, chunks.size()));
            }
        }

        return chunks;
    }

    private List<VectorChunk> chunkBySize(String text, int chunkSize, int overlapSize, int minChunkSize) {
        List<VectorChunk> chunks = new ArrayList<>();
        String[] paragraphs = text.split("\\n\\s*\\n");
        StringBuilder currentChunk = new StringBuilder();

        for (String paragraph : paragraphs) {
            paragraph = paragraph.trim();
            if (paragraph.isEmpty()) {
                continue;
            }

            if (currentChunk.length() + paragraph.length() <= chunkSize) {
                currentChunk.append(paragraph).append("\n\n");
            } else {
                if (currentChunk.length() >= minChunkSize) {
                    chunks.add(createChunk(currentChunk.toString().trim(), chunks.size()));
                }
                currentChunk = new StringBuilder(paragraph).append("\n\n");
            }
        }

        if (currentChunk.length() >= minChunkSize) {
            chunks.add(createChunk(currentChunk.toString().trim(), chunks.size()));
        } else if (!chunks.isEmpty()) {
            VectorChunk lastChunk = chunks.get(chunks.size() - 1);
            lastChunk.setContent(lastChunk.getContent() + "\n\n" + currentChunk.toString().trim());
        }

        return chunks;
    }

    private List<String> splitByHeadings(String text) {
        List<String> sections = new ArrayList<>();
        Matcher matcher = HEADING_PATTERN.matcher(text);
        int lastEnd = 0;

        while (matcher.find()) {
            if (matcher.start() > lastEnd) {
                sections.add(text.substring(lastEnd, matcher.start()).trim());
            }
            lastEnd = matcher.end();
        }

        if (lastEnd < text.length()) {
            sections.add(text.substring(lastEnd).trim());
        }

        if (sections.isEmpty()) {
            sections.add(text);
        }

        return sections;
    }

    private VectorChunk createChunk(String content, int index) {
        return VectorChunk.builder()
                .index(index)
                .content(content)
                .contentHash(computeHash(content))
                .charCount(content.length())
                .tokenCount(estimateTokenCount(content))
                .build();
    }

    private String computeHash(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return String.valueOf(content.hashCode());
        }
    }

    private int estimateTokenCount(String content) {
        return Math.max(1, content.length() / 4);
    }
}
