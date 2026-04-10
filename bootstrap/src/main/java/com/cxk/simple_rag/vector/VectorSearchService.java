package com.cxk.simple_rag.vector;

import com.cxk.simple_rag.core.chunk.VectorChunk;
import com.cxk.simple_rag.core.embedding.ChunkEmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 向量检索服务
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorSearchService {

    private final MilvusService milvusService;
    private final ChunkEmbeddingService chunkEmbeddingService;

    /**
     * 向量相似度搜索
     *
     * @param kbId 知识库 ID
     * @param query 查询文本
     * @param topK 返回数量
     * @return 搜索结果
     */
    public List<SearchResult> search(String kbId, String query, int topK) {
        try {
            // 生成查询向量
            List<VectorChunk> queryChunks = new ArrayList<>();
            VectorChunk queryChunk = new VectorChunk();
            queryChunk.setContent(query);
            queryChunks.add(queryChunk);

            chunkEmbeddingService.embed(queryChunks, "default");
            float[] queryVector = queryChunks.get(0).getEmbedding();

            // 在 Milvus 中搜索
            List<MilvusService.SearchResultWrapper> milvusResults = milvusService.vectorSearch(kbId, queryVector, topK);

            // 转换为统一格式
            List<SearchResult> results = new ArrayList<>();
            for (MilvusService.SearchResultWrapper milvusResult : milvusResults) {
                SearchResult result = new SearchResult();
                result.setChunkId(milvusResult.getChunkId());
                result.setDocId(milvusResult.getDocId());
                result.setContent(milvusResult.getContent());
                result.setScore(milvusResult.getScore());
                results.add(result);
            }

            log.info("Vector search completed: kbId={}, query={}, results={}", kbId, query, results.size());
            return results;
        } catch (Exception e) {
            log.error("Vector search failed: kbId={}, query={}", kbId, query, e);
            throw new RuntimeException("Vector search failed", e);
        }
    }

    /**
     * 向量相似度搜索（多知识库）
     *
     * @param kbIds 知识库 ID 列表
     * @param query 查询文本
     * @param topK 每个知识库返回数量
     * @return 搜索结果
     */
    public Map<String, List<SearchResult>> searchMultiple(List<String> kbIds, String query, int topK) {
        Map<String, List<SearchResult>> resultsMap = new HashMap<>();

        for (String kbId : kbIds) {
            try {
                List<SearchResult> results = search(kbId, query, topK);
                resultsMap.put(kbId, results);
            } catch (Exception e) {
                log.error("Vector search failed for kbId: {}", kbId, e);
                resultsMap.put(kbId, new ArrayList<>());
            }
        }

        return resultsMap;
    }

    /**
     * 删除知识库的所有向量
     *
     * @param kbId 知识库 ID
     */
    public void deleteKnowledgeBaseVectors(String kbId) {
        milvusService.dropCollection(kbId);
        log.info("Knowledge base vectors deleted: kbId={}", kbId);
    }

    /**
     * 搜索结果类
     */
    public static class SearchResult {
        private String chunkId;
        private String docId;
        private String content;
        private float score;

        public String getChunkId() {
            return chunkId;
        }

        public void setChunkId(String chunkId) {
            this.chunkId = chunkId;
        }

        public String getDocId() {
            return docId;
        }

        public void setDocId(String docId) {
            this.docId = docId;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public float getScore() {
            return score;
        }

        public void setScore(float score) {
            this.score = score;
        }
    }
}
