package com.cxk.simple_rag.vector;

import cn.hutool.db.meta.IndexInfo;
import com.cxk.simple_rag.config.MilvusConfig;
import com.google.gson.JsonObject;
import io.milvus.v2.client.ConnectConfig;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.common.ConsistencyLevel;
import io.milvus.v2.common.DataType;
import io.milvus.v2.common.IndexParam;
import io.milvus.v2.service.collection.request.CreateCollectionReq;
import io.milvus.v2.service.collection.request.DropCollectionReq;
import io.milvus.v2.service.collection.request.HasCollectionReq;
import io.milvus.v2.service.collection.request.LoadCollectionReq;
import io.milvus.v2.service.collection.request.ReleaseCollectionReq;
import io.milvus.v2.service.index.request.CreateIndexReq;
import io.milvus.v2.service.vector.request.DeleteReq;
import io.milvus.v2.service.vector.request.InsertReq;
import io.milvus.v2.service.vector.request.SearchReq;
import io.milvus.v2.service.vector.request.data.FloatVec;
import io.milvus.v2.service.vector.response.InsertResp;
import io.milvus.v2.service.vector.response.SearchResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
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
     * 创建知识库集合（自动创建索引并加载）
     *
     * @param collectionName 集合名称（通常为 kbId）
     * @param description  集合描述（知识库名称）
     */
    public void createCollection(String collectionName, String description) {
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

            log.info("Creating collection: {}, description: {}", collectionName, description);

            // 使用Milvus v2 API创建集合
            // 定义字段
            CreateCollectionReq.FieldSchema idField = CreateCollectionReq.FieldSchema.builder()
                    .name("id")
                    .dataType(DataType.VarChar)
                    .maxLength(36)
                    .isPrimaryKey(true)
                    .autoID(false)
                    .build();

            CreateCollectionReq.FieldSchema docIdField = CreateCollectionReq.FieldSchema.builder()
                    .name("doc_id")
                    .dataType(DataType.VarChar)
                    .maxLength(36)
                    .build();

            CreateCollectionReq.FieldSchema contentField = CreateCollectionReq.FieldSchema.builder()
                    .name("content")
                    .dataType(DataType.VarChar)
                    .maxLength(65535)
                    .build();

            CreateCollectionReq.FieldSchema embeddingField = CreateCollectionReq.FieldSchema.builder()
                    .name("embedding")
                    .dataType(DataType.FloatVector)
                    .dimension(1024)
                    .build();

            // 构建schema
            CreateCollectionReq.CollectionSchema collectionSchema = CreateCollectionReq.CollectionSchema.builder()
                    .fieldSchemaList(List.of(idField, docIdField, contentField, embeddingField))
                    .build();

            // 构建创建请求
            CreateCollectionReq createReq = CreateCollectionReq.builder()
                    .collectionName(collectionName)
                    .collectionSchema(collectionSchema)
                    .primaryFieldName("id")
                    .vectorFieldName("embedding")
                    .consistencyLevel(ConsistencyLevel.BOUNDED)
                    .description(description)
                    .build();

            milvusClient.createCollection(createReq);
            log.info("Collection created successfully: {}", collectionName);

            // 创建向量索引（如果不存在）
            createVectorIndex(collectionName);

            // 加载集合到内存
            loadCollection(collectionName);
        } catch (Exception e) {
            log.error("Failed to create collection: {}", collectionName, e);
            throw new RuntimeException("Failed to create Milvus collection", e);
        }
    }

    /**
     * 创建向量索引（如果不存在）
     *
     * @param collectionName 集合名称
     */
    private void createVectorIndex(String collectionName) {
        try {
            log.info("Creating vector index for collection: {}", collectionName);

            IndexParam indexParam = IndexParam.builder()
                    .fieldName("embedding")
                    .indexType(IndexParam.IndexType.AUTOINDEX)  // 枚举类型
                    .metricType(IndexParam.MetricType.COSINE)    // 枚举类型
                    .build();

            CreateIndexReq createIndexReq = CreateIndexReq.builder()
                    .collectionName(collectionName)
                    .indexParams(Collections.singletonList(indexParam))  // ✅ 关键
                    .build();

            milvusClient.createIndex(createIndexReq);
            log.info("Vector index created/confirmed for collection: {}", collectionName);
        } catch (Exception e) {
            // 过滤"索引已存在"的警告（幂等性保护）
            if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                log.info("Index already exists: {}", collectionName);
                return;
            }
            log.error("Failed to create vector index for collection: {}", collectionName, e);
        }
    }

    /**
     * 加载集合到内存
     *
     * @param collectionName 集合名称
     */
    private void loadCollection(String collectionName) {
        try {
            log.info("Loading collection to memory: {}", collectionName);

            LoadCollectionReq loadReq = LoadCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();

            milvusClient.loadCollection(loadReq);
            log.info("Collection loaded successfully: {}", collectionName);
        } catch (Exception e) {
            log.error("Failed to load collection: {}", collectionName, e);
            // 加载失败不抛出异常，允许集合以未加载状态存在
        }
    }

    public String resolveCollectionName(String kbId) {
        if (kbId == null || kbId.isBlank()) {
            throw new IllegalArgumentException("Knowledge base id cannot be empty");
        }
        char firstChar = kbId.charAt(0);
        if (!Character.isLetter(firstChar) && firstChar != '_') {
            return "kb_" + kbId;
        }
        return kbId;
    }

    /**
     * 删除知识库集合
     *
     * @param collectionName 集合名称
     */
    public void dropCollection(String collectionName) {
        try {
            HasCollectionReq hasReq = HasCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            if (!Boolean.TRUE.equals(milvusClient.hasCollection(hasReq))) {
                log.info("Collection does not exist, skip drop: {}", collectionName);
                return;
            }

            // 先释放集合
            releaseCollection(collectionName);

            DropCollectionReq dropReq = DropCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            milvusClient.dropCollection(dropReq);
            log.info("Collection dropped: {}", collectionName);
        } catch (Exception e) {
            log.error("Failed to drop collection: {}", collectionName, e);
            throw new RuntimeException("Failed to drop Milvus collection: " + collectionName, e);
        }
    }

    /**
     * 释放集合内存
     *
     * @param collectionName 集合名称
     */
    private void releaseCollection(String collectionName) {
        try {
            ReleaseCollectionReq releaseReq = ReleaseCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            milvusClient.releaseCollection(releaseReq);
            log.info("Collection released: {}", collectionName);
        } catch (Exception e) {
            log.error("Failed to release collection: {}", collectionName, e);
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
        batchInsertVectors(collectionName, docId, vectors, null);
    }

    /**
     * 批量插入向量数据
     *
     * @param collectionName 集合名称
     * @param docId 文档 ID
     * @param vectors 向量数据列表
     * @param description 集合描述（可选）
     */
    public void batchInsertVectors(String collectionName, String docId, List<VectorData> vectors, String description) {
        try {
            // 确保集合存在
            if (description != null) {
                createCollection(collectionName, description);
            } else {
                createCollection(collectionName, "");
            }

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

            InsertResp insertResp = milvusClient.insert(insertReq);

            log.info("Batch vectors inserted: collection={}, docId={}, count={}, insertCnt={}",
                    collectionName, docId, vectors.size(), insertResp.getInsertCnt());
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
            HasCollectionReq hasReq = HasCollectionReq.builder()
                    .collectionName(collectionName)
                    .build();
            if (!Boolean.TRUE.equals(milvusClient.hasCollection(hasReq))) {
                log.info("Collection does not exist, skip deleting vectors: collection={}, docId={}", collectionName, docId);
                return;
            }

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
            throw new RuntimeException("Failed to delete Milvus vectors by docId: " + docId, e);
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

            List<SearchResultWrapper> searchResults = new ArrayList<>();

            // ✅ 正确解析：getSearchResults() 返回 List<List<SearchResult>>
            Object resultsObj = searchResp.getSearchResults();

            if (resultsObj instanceof List) {
                List<?> resultsList = (List<?>) resultsObj;

                for (Object item : resultsList) {
                    if (item instanceof List) {
                        List<?> innerList = (List<?>) item;

                        for (Object innerItem : innerList) {
                            // ✅ 不要判断 JsonObject，直接解析 SearchResult 对象
                            SearchResultWrapper wrapper = parseSearchResult(innerItem);
                            if (wrapper != null) {
                                searchResults.add(wrapper);
                            }
                        }
                    }
                }
            }

            log.info("Vector search completed: collection={}, results={}", collectionName, searchResults.size());
            return searchResults;

        } catch (Exception e) {
            log.error("Vector search failed: collection={}", collectionName, e);
            throw new RuntimeException("Vector search failed", e);
        }
    }

    /**
     * 解析单个搜索结果（兼容不同 SDK 版本）
     */
    private SearchResultWrapper parseSearchResult(Object resultObj) {
        if (resultObj == null) {
            return null;
        }

        SearchResultWrapper wrapper = new SearchResultWrapper();

        try {
            // ✅ 方式 1: 如果是 SearchResult 对象（推荐）
            if (resultObj.getClass().getSimpleName().equals("SearchResult")) {
                // 获取 id
                if (hasMethod(resultObj, "getId")) {
                    wrapper.setChunkId((String) invokeMethod(resultObj, "getId"));
                }

                // 获取 score（注意大小写）
                if (hasMethod(resultObj, "getScore")) {
                    wrapper.setScore((Float) invokeMethod(resultObj, "getScore"));
                }

                // 获取 entity（包含 doc_id, content）
                if (hasMethod(resultObj, "getEntity")) {
                    Object entity = invokeMethod(resultObj, "getEntity");
                    if (entity != null) {
                        // entity 是 Map<String, Object>
                        if (entity instanceof Map) {
                            Map<?, ?> entityMap = (Map<?, ?>) entity;

                            // 获取 doc_id
                            if (entityMap.containsKey("doc_id")) {
                                wrapper.setDocId(String.valueOf(entityMap.get("doc_id")));
                            }

                            // 获取 content
                            if (entityMap.containsKey("content")) {
                                wrapper.setContent(String.valueOf(entityMap.get("content")));
                            }

                            // 如果 id 还没获取，尝试从 entity 中获取
                            if (wrapper.getChunkId() == null && entityMap.containsKey("id")) {
                                wrapper.setChunkId(String.valueOf(entityMap.get("id")));
                            }
                        }
                    }
                }

                return wrapper;
            }

            // ✅ 方式 2: 如果是 JsonObject（兼容旧版本）
            if (resultObj instanceof com.google.gson.JsonObject) {
                com.google.gson.JsonObject json = (com.google.gson.JsonObject) resultObj;

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
                } else if (json.has("Score")) {
                    wrapper.setScore(json.get("Score").getAsFloat());
                }

                // 尝试从 OutputFields 获取
                if (json.has("OutputFields")) {
                    com.google.gson.JsonObject outputFields = json.getAsJsonObject("OutputFields");
                    if (outputFields.has("doc_id") && wrapper.getDocId() == null) {
                        wrapper.setDocId(outputFields.get("doc_id").getAsString());
                    }
                    if (outputFields.has("content") && wrapper.getContent() == null) {
                        wrapper.setContent(outputFields.get("content").getAsString());
                    }
                }

                return wrapper;
            }

        } catch (Exception e) {
            log.warn("Failed to parse search result: {}", resultObj.getClass().getName(), e);
        }

        return null;
    }

    // 辅助方法：检查对象是否有某个方法
    private boolean hasMethod(Object obj, String methodName) {
        try {
            obj.getClass().getMethod(methodName);
            return true;
        } catch (NoSuchMethodException e) {
            return false;
        }
    }

    // 辅助方法：调用对象的方法
    private Object invokeMethod(Object obj, String methodName) throws Exception {
        return obj.getClass().getMethod(methodName).invoke(obj);
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
