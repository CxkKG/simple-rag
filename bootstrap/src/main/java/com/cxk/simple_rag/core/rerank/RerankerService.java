package com.cxk.simple_rag.core.rerank;

import com.cxk.simple_rag.config.RerankerConfig;
import com.cxk.simple_rag.vector.VectorSearchService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 重排序服务 - 对接 SiliconFlow Rerank API
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RerankerService {

    private final RerankerConfig rerankerConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }

    /**
     * 对检索结果进行重排序。未启用或调用失败时返回原始列表。
     *
     * @param query   用户查询
     * @param results 向量检索结果
     * @return 重排序后的结果（或原始列表）
     */
    public List<VectorSearchService.SearchResult> rerank(String query,
                                                         List<VectorSearchService.SearchResult> results) {
        if (!rerankerConfig.isEnabled()) {
            return results;
        }
        if (results == null || results.isEmpty()) {
            return results;
        }

        try {
            return doRerank(query, results);
        } catch (Exception e) {
            log.error("Reranking failed, falling back to original search order: query={}", query, e);
            return results;
        }
    }

    private List<VectorSearchService.SearchResult> doRerank(String query,
                                                            List<VectorSearchService.SearchResult> results) throws Exception {
        List<String> documents = new ArrayList<>();
        for (VectorSearchService.SearchResult r : results) {
            documents.add(r.getContent() != null ? r.getContent() : "");
        }

        int topN = rerankerConfig.getTopN() > 0
                ? Math.min(rerankerConfig.getTopN(), results.size())
                : results.size();

        Map<String, Object> body = Map.of(
                "model", rerankerConfig.getModel(),
                "query", query,
                "documents", documents,
                "return_documents", true,
                "top_n", topN
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + rerankerConfig.getApiKey());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                rerankerConfig.getBaseUrl(), request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());

        if (root.has("code")) {
            int code = root.get("code").asInt();
            String message = root.has("message") ? root.get("message").asText() : "Unknown error";
            if (code != 0) {
                log.error("Reranker API returned error: code={}, message={}", code, message);
                throw new RuntimeException("Reranker API error: " + message);
            }
        }

        JsonNode resultsNode = root.get("results");
        if (resultsNode == null || !resultsNode.isArray()) {
            log.warn("Reranker API returned unexpected response format, falling back");
            return results;
        }

        List<VectorSearchService.SearchResult> reranked = new ArrayList<>();
        for (JsonNode item : resultsNode) {
            int index = item.get("index").asInt();
            double relevanceScore = item.get("relevance_score").asDouble();

            if (index < 0 || index >= results.size()) {
                log.warn("Reranker returned out-of-bounds index: {}", index);
                continue;
            }

            VectorSearchService.SearchResult original = results.get(index);
            VectorSearchService.SearchResult reordered = new VectorSearchService.SearchResult();
            reordered.setChunkId(original.getChunkId());
            reordered.setDocId(original.getDocId());
            reordered.setContent(original.getContent());
            reordered.setScore((float) relevanceScore);
            reranked.add(reordered);
        }

        log.info("Reranking completed: query={}, inputCount={}, outputCount={}",
                query, results.size(), reranked.size());
        return reranked;
    }
}
