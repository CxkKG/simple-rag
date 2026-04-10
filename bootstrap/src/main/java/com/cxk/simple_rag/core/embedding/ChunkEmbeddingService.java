package com.cxk.simple_rag.core.embedding;

import com.cxk.simple_rag.config.EmbeddingConfig;
import com.cxk.simple_rag.core.chunk.VectorChunk;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 分块向量化服务 - 对接真实 Embedding API
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkEmbeddingService {

    private final EmbeddingConfig embeddingConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 批量生成向量
     *
     * @param chunks 待向量化文本
     * @param embeddingModel 模型名称
     */
    public void embed(List<VectorChunk> chunks, String embeddingModel) {
        List<String> texts = new ArrayList<>();
        for (VectorChunk chunk : chunks) {
            texts.add(chunk.getContent());
        }

        List<float[]> embeddings = generateEmbeddings(texts, embeddingModel);

        for (int i = 0; i < chunks.size(); i++) {
            if (i < embeddings.size()) {
                chunks.get(i).setEmbedding(embeddings.get(i));
            }
        }
    }

    /**
     * 批量生成向量
     *
     * @param texts 文本列表
     * @param modelName 模型名称
     * @return 向量列表
     */
    private List<float[]> generateEmbeddings(List<String> texts, String modelName) {
        String provider = embeddingConfig.getProvider();

        try {
            return switch (provider) {
                case "siliconflow" -> callSiliconFlow(texts, modelName);
                case "bailian" -> callBailian(texts, modelName);
                case "ollama" -> callOllama(texts, modelName);
                default -> {
                    log.warn("Unknown embedding provider: {}, using dummy embedding", provider);
                    yield generateDummyEmbeddings(texts);
                }
            };
        } catch (Exception e) {
            log.error("Failed to call embedding API, fallback to dummy embedding", e);
            return generateDummyEmbeddings(texts);
        }
    }

    /**
     * 调用 SiliconFlow Embedding API
     */
    private List<float[]> callSiliconFlow(List<String> texts, String modelName) {
        String url = embeddingConfig.getSiliconflowBaseUrl() + "/embeddings";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + embeddingConfig.getSiliconflowApiKey());

        Map<String, Object> body = Map.of(
                "model", embeddingConfig.getSiliconflowModel(),
                "input", texts,
                "encoding_format", "float"
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode dataNode = root.get("data");

            List<float[]> embeddings = new ArrayList<>();
            for (JsonNode item : dataNode) {
                JsonNode embeddingNode = item.get("embedding");
                float[] embedding = new float[embeddingNode.size()];
                for (int i = 0; i < embeddingNode.size(); i++) {
                    embedding[i] = (float) embeddingNode.get(i).asDouble();
                }
                embeddings.add(embedding);
            }

            log.info("SiliconFlow API called successfully, texts={}, embeddings={}", texts.size(), embeddings.size());
            return embeddings;
        } catch (Exception e) {
            log.error("Failed to parse SiliconFlow response", e);
            throw new RuntimeException("Failed to parse SiliconFlow response", e);
        }
    }

    /**
     * 调用阿里云百炼 Embedding API
     */
    private List<float[]> callBailian(List<String> texts, String modelName) {
        String url = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/generation";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + embeddingConfig.getBailianApiKey());
        headers.set("X-DashScope-SSE", "disable");

        // 百炼 API 一次只处理一个文本，批量处理需要循环调用
        List<float[]> embeddings = new ArrayList<>();
        for (String text : texts) {
            Map<String, Object> input = Map.of("text", text);
            Map<String, Object> parameters = Map.of("text_type", "document");
            Map<String, Object> body = Map.of(
                    "model", embeddingConfig.getBailianModel(),
                    "input", input,
                    "parameters", parameters
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode embeddingNode = root.get("output").get("embedding");
                float[] embedding = new float[embeddingNode.size()];
                for (int i = 0; i < embeddingNode.size(); i++) {
                    embedding[i] = (float) embeddingNode.get(i).asDouble();
                }
                embeddings.add(embedding);
            } catch (Exception e) {
                log.error("Failed to parse Bailian response", e);
                throw new RuntimeException("Failed to parse Bailian response", e);
            }
        }

        log.info("Bailian API called successfully, texts={}, embeddings={}", texts.size(), embeddings.size());
        return embeddings;
    }

    /**
     * 调用 Ollama 本地 Embedding API
     */
    private List<float[]> callOllama(List<String> texts, String modelName) {
        String url = embeddingConfig.getOllamaBaseUrl() + "/api/embeddings";

        List<float[]> embeddings = new ArrayList<>();
        for (String text : texts) {
            Map<String, String> body = Map.of(
                    "model", embeddingConfig.getOllamaModel(),
                    "prompt", text
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode embeddingNode = root.get("embedding");
                float[] embedding = new float[embeddingNode.size()];
                for (int i = 0; i < embeddingNode.size(); i++) {
                    embedding[i] = (float) embeddingNode.get(i).asDouble();
                }
                embeddings.add(embedding);
            } catch (Exception e) {
                log.error("Failed to parse Ollama response", e);
                throw new RuntimeException("Failed to parse Ollama response", e);
            }
        }

        log.info("Ollama API called successfully, texts={}, embeddings={}", texts.size(), embeddings.size());
        return embeddings;
    }

    /**
     * 生成伪向量（降级方案）
     */
    private List<float[]> generateDummyEmbeddings(List<String> texts) {
        List<float[]> embeddings = new ArrayList<>();
        for (String text : texts) {
            embeddings.add(generateDummyEmbedding(text));
        }
        log.warn("Generated {} dummy embeddings", embeddings.size());
        return embeddings;
    }

    private float[] generateDummyEmbedding(String content) {
        float[] embedding = new float[1536];
        int hash = content.hashCode();
        for (int i = 0; i < embedding.length; i++) {
            embedding[i] = (float) Math.sin(hash + i) * 0.1f;
        }
        float norm = 0;
        for (float v : embedding) {
            norm += v * v;
        }
        norm = (float) Math.sqrt(norm);
        if (norm > 0) {
            for (int i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }
        return embedding;
    }
}
