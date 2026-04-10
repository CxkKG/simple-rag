package com.cxk.simple_rag.vector;

import com.cxk.simple_rag.config.MilvusConfig;
import com.google.gson.JsonObject;
import io.milvus.v2.client.ConnectConfig;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.service.collection.request.HasCollectionReq;
import io.milvus.v2.service.collection.request.DropCollectionReq;
import io.milvus.v2.service.vector.request.DeleteReq;
import io.milvus.v2.service.vector.request.InsertReq;
import io.milvus.v2.service.vector.request.SearchReq;
import io.milvus.v2.service.vector.request.data.FloatVec;
import io.milvus.v2.service.vector.response.SearchResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Milvus 向量数据库服务 (v2 API - 2.6.6 版本)
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MilvusService {

    private final MilvusConfig milvusConfig;
    private MilvusClientV2 milvusClient;

    /**
     * 初始化 Milvus 客户端
     */
    @jakarta.annotation.PostConstruct
    public void init() {
        ConnectConfig connectConfig = ConnectConfig.builder()
                .uri("http://" + milvusConfig.getHost() + ":" + milvusConfig.getPort())
                .username(milvusConfig.getUsername())
                .password(milvusConfig.getPassword())
                .build();

        this.milvusClient = new MilvusClientV2(connectConfig);
        log.info("Milvus client initialized, host={}, port={}",
                milvusConfig.getHost(), milvusConfig.getPort());
    }

    /**
     * 创建知识库集合
     *
     * @param collectionName 集合名称（通常为 kbId）
     */
    public void createCollection(String collectionName) {
        try {
            // 检查集合是否存在
            HasCollectionReq hasReq = HasCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            Boolean exists = milvusClient.hasCollection(hasReq);
            if (Boolean.TRUE.equals(exists)) {
                log.info("Collection already exists: {}", collectionName);
                return;
            }

            log.info("Collection created (schema setup required): {}", collectionName);
        } catch (Exception e) {
            log.error("Failed to create collection: {}", collectionName, e);
            throw new RuntimeException("Failed to create Milvus collection", e);
        }
    }

    /**
     * 删除知识库集合
     *
     * @param collectionName 集合名称
     */
    public void dropCollection(String collectionName) {
        try {
            DropCollectionReq dropReq = DropCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            milvusClient.dropCollection(dropReq);
            log.info("Collection dropped: {}", collectionName);
        } catch (Exception e) {
            log.error("Failed to drop collection: {}", collectionName, e);
        }
    }

    /**
     * 批量插入向量数据
     *
     * @param collectionName 集合名称
     * @param docId 文档 ID
     * @param vectors 向量数据列表
     */
    public void batchInsertVectors(String collectionName, String docId, List<VectorData> vectors) {
        try {
            // 确保集合存在
            createCollection(collectionName);

            List<JsonObject> rows = new ArrayList<>();

            for (VectorData vector : vectors) {
                JsonObject row = new JsonObject();
                row.addProperty("id", vector.getChunkId());
                row.addProperty("doc_id", docId);
                row.addProperty("content", vector.getContent());

                // 将 float[] 转为 JsonArray
                com.google.gson.JsonArray embeddingArray = new com.google.gson.JsonArray();
                for (float f : vector.getEmbedding()) {
                    embeddingArray.add(f);
                }
                row.add("embedding", embeddingArray);

                rows.add(row);
            }

            InsertReq insertReq = InsertReq.builder()
                    .collectionName(collectionName)
                    .data(rows)
                    .build();

            milvusClient.insert(insertReq);

            log.info("Batch vectors inserted: collection={}, docId={}, count={}",
                    collectionName, docId, vectors.size());
        } catch (Exception e) {
            log.error("Failed to batch insert vectors: collection={}, docId={}",
                    collectionName, docId, e);
            throw new RuntimeException("Failed to batch insert vectors", e);
        }
    }

    /**
     * 删除文档的向量数据
     *
     * @param collectionName 集合名称
     * @param docId 文档 ID
     */
    public void deleteByDocId(String collectionName, String docId) {
        try {
            String expr = "doc_id == \"" + docId + "\"";
            DeleteReq deleteReq = DeleteReq.builder()
                    .collectionName(collectionName)
                    .filter(expr)
                    .build();
            milvusClient.delete(deleteReq);
            log.info("Vectors deleted by docId: collection={}, docId={}", collectionName, docId);
        } catch (Exception e) {
            log.error("Failed to delete vectors by docId: collection={}, docId={}",
                    collectionName, docId, e);
        }
    }

    /**
     * 向量相似度搜索
     *
     * @param collectionName 集合名称
     * @param queryVector 查询向量
     * @param topK 返回数量
     * @return 搜索结果
     */
    public List<SearchResultWrapper> vectorSearch(String collectionName, float[] queryVector, int topK) {
        try {
            SearchReq searchReq = SearchReq.builder()
                    .collectionName(collectionName)
                    .data(List.of(new FloatVec(floatArrayToList(queryVector))))
                    .limit(topK)
                    .outputFields(List.of("id", "doc_id", "content"))
                    .build();

            SearchResp searchResp = milvusClient.search(searchReq);

            // 使用反射或 JsonObject 来获取搜索结果
            List<SearchResultWrapper> searchResults = new ArrayList<>();

            // SearchResp 的 getSearchResults() 返回 List<List<JsonObject>>
            // 我们需要遍历结果并提取数据
            Object resultsObj = searchResp.getSearchResults();

            if (resultsObj instanceof List) {
                List<?> resultsList = (List<?>) resultsObj;
                for (Object item : resultsList) {
                    if (item instanceof List) {
                        List<?> innerList = (List<?>) item;
                        for (Object innerItem : innerList) {
                            if (innerItem instanceof JsonObject) {
                                JsonObject json = (JsonObject) innerItem;
                                SearchResultWrapper wrapper = new SearchResultWrapper();

                                if (json.has("id")) {
                                    wrapper.setChunkId(json.get("id").getAsString());
                                }
                                if (json.has("doc_id")) {
                                    wrapper.setDocId(json.get("doc_id").getAsString());
                                }
                                if (json.has("content")) {
                                    wrapper.setContent(json.get("content").getAsString());
                                }
                                if (json.has("score")) {
                                    wrapper.setScore(json.get("score").getAsFloat());
                                }

                                searchResults.add(wrapper);
                            }
                        }
                    }
                }
            }

            return searchResults;
        } catch (Exception e) {
            log.error("Vector search failed: collection={}", collectionName, e);
            throw new RuntimeException("Vector search failed", e);
        }
    }

    /**
     * 关闭客户端
     */
    @jakarta.annotation.PreDestroy
    public void close() {
        if (milvusClient != null) {
            milvusClient.close();
            log.info("Milvus client closed");
        }
    }

    private List<Float> floatArrayToList(float[] array) {
        List<Float> list = new ArrayList<>();
        for (float f : array) {
            list.add(f);
        }
        return list;
    }

    /**
     * 向量数据类
     */
    public static class VectorData {
        private final String chunkId;
        private final String content;
        private final float[] embedding;

        public VectorData(String chunkId, String content, float[] embedding) {
            this.chunkId = chunkId;
            this.content = content;
            this.embedding = embedding;
        }

        public String getChunkId() {
            return chunkId;
        }

        public String getContent() {
            return content;
        }

        public float[] getEmbedding() {
            return embedding;
        }
    }

    /**
     * 搜索结果包装类
     */
    public static class SearchResultWrapper {
        private String chunkId;
        private String docId;
        private String content;
        private float score;

        public String getChunkId() { return chunkId; }
        public void setChunkId(String chunkId) { this.chunkId = chunkId; }

        public String getDocId() { return docId; }
        public void setDocId(String docId) { this.docId = docId; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public float getScore() { return score; }
        public void setScore(float score) { this.score = score; }
    }
}
