package com.cxk.simple_rag.core.chunk;

import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;

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
@Slf4j
public class StructureAwareTextChunker implements ChunkingStrategy {

    private static final Pattern HEADING_PATTERN = Pattern.compile("(?m)^(#{1,6}\\s+.+)$");

    @Override
    public List<VectorChunk> chunk(String text, ChunkConfig config) {
        if (StrUtil.isBlank(text)) {
            log.warn("Input text is blank, returning empty chunks");
            return List.of();
        }

        List<VectorChunk> chunks = new ArrayList<>();

        // 默认配置
        int maxChunkSize = config.getMaxChunkSize() != null ? config.getMaxChunkSize() : 500;
        int overlapSize = config.getOverlapSize() != null ? config.getOverlapSize() : 50;
        int minChunkSize = config.getMinChunkSize() != null ? config.getMinChunkSize() : 50;
        boolean structured = config.getStructured() != null && config.getStructured();

        log.debug("Chunking text: length={}, maxChunkSize={}, minChunkSize={}, structured={}",
                text.length(), maxChunkSize, minChunkSize, structured);

        if (structured) {
            chunks = chunkByStructure(text, maxChunkSize, minChunkSize, overlapSize);
        } else {
            chunks = chunkBySize(text, maxChunkSize, overlapSize, minChunkSize);
        }

        log.debug("Chunking completed: chunkCount={}", chunks.size());
        return chunks;
    }

    private List<VectorChunk> chunkByStructure(String text, int maxChunkSize, int minChunkSize, int overlapSize) {
        List<VectorChunk> chunks = new ArrayList<>();
        List<String> sections = splitByHeadings(text);

        log.debug("Split by headings: sectionCount={}", sections.size());

        for (int i = 0; i < sections.size(); i++) {
            String section = sections.get(i).trim();
            if (section.isEmpty()) {
                continue;
            }

            log.debug("Section {}: length={}", i, section.length());

            if (section.length() > maxChunkSize) {
                // 大段落进一步按大小切分
                List<VectorChunk> subChunks = chunkBySize(section, maxChunkSize, overlapSize, minChunkSize);
                chunks.addAll(subChunks);
                log.debug("Section {} split into {} sub-chunks", i, subChunks.size());
            } else if (section.length() >= minChunkSize) {
                chunks.add(createChunk(section, chunks.size()));
                log.debug("Section {} added as chunk", i);
            } else {
                log.debug("Section {} too small ({} chars), skipping", i, section.length());
            }
        }

        return chunks;
    }

    private List<VectorChunk> chunkBySize(String text, int chunkSize, int overlapSize, int minChunkSize) {
        List<VectorChunk> chunks = new ArrayList<>();

        // 首先按段落分割
        String[] paragraphs = text.split("\\n\\s*\\n");
        StringBuilder currentChunk = new StringBuilder();
        List<String> currentParagraphs = new ArrayList<>();

        for (String paragraph : paragraphs) {
            paragraph = paragraph.trim();
            if (StrUtil.isBlank(paragraph)) {
                continue;
            }

            int paraLength = paragraph.length();
            int currentChunkLength = currentChunk.length();

            // 如果当前段落单独就超过 chunkSize，强制切分
            if (paraLength > chunkSize) {
                // 如果当前有累积的内容，先保存
                if (currentChunkLength >= minChunkSize) {
                    chunks.add(createChunk(currentChunk.toString().trim(), chunks.size()));
                    currentChunk = new StringBuilder();
                    currentParagraphs.clear();
                }

                // 按字符切分大段落
                List<VectorChunk> largeParagraphChunks = splitLargeParagraph(paragraph, chunkSize, minChunkSize);
                chunks.addAll(largeParagraphChunks);
            } else if (currentChunkLength + paraLength + 4 <= chunkSize) {
                // 加上 \n\n 后不超过 chunkSize
                currentChunk.append(paragraph).append("\n\n");
                currentParagraphs.add(paragraph);
            } else {
                // 保存当前块
                if (currentChunkLength >= minChunkSize) {
                    chunks.add(createChunk(currentChunk.toString().trim(), chunks.size()));
                }
                // 开始新块
                currentChunk = new StringBuilder(paragraph).append("\n\n");
                currentParagraphs.clear();
                currentParagraphs.add(paragraph);
            }
        }

        // 处理剩余内容
        if (currentChunk.length() >= minChunkSize) {
            chunks.add(createChunk(currentChunk.toString().trim(), chunks.size()));
        } else if (!chunks.isEmpty()) {
            // 如果剩余内容太小，合并到最后一块
            VectorChunk lastChunk = chunks.get(chunks.size() - 1);
            String newContent = lastChunk.getContent() + "\n\n" + currentChunk.toString().trim();
            lastChunk.setContent(newContent);
            lastChunk.setCharCount(newContent.length());
            lastChunk.setTokenCount(estimateTokenCount(newContent));
        }

        log.debug("chunkBySize completed: chunkCount={}", chunks.size());
        return chunks;
    }

    /**
     * 将大段落按字符切分
     */
    private List<VectorChunk> splitLargeParagraph(String paragraph, int chunkSize, int minChunkSize) {
        List<VectorChunk> chunks = new ArrayList<>();
        int start = 0;
        int length = paragraph.length();

        while (start < length) {
            int end = Math.min(start + chunkSize, length);
            String chunkText = paragraph.substring(start, end).trim();

            if (chunkText.length() >= minChunkSize) {
                chunks.add(createChunk(chunkText, chunks.size()));
            }

            start = end;
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
