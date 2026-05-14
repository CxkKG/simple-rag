package com.cxk.simple_rag.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 系统配置控制器
 *
 * @author wangxin
 */
@Slf4j
@RestController
@RequestMapping("/system/config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final AIConfig aiConfig;
    private final EmbeddingConfig embeddingConfig;
    private final RerankerConfig rerankerConfig;
    private final com.cxk.simple_rag.websearch.WebSearchProperties webSearchProperties;

    /**
     * 获取 AI 配置
     */
    @GetMapping("/ai")
    public ResponseEntity<Map<String, Object>> getAIConfig() {
        AIConfigDTO dto = new AIConfigDTO();
        dto.setProvider(aiConfig.getProvider());
        
        AIConfigDTO.Providers providers = new AIConfigDTO.Providers();
        
        AIConfigDTO.Bailian bailian = new AIConfigDTO.Bailian();
        bailian.setApiKey(aiConfig.getProviders().getBailian().getApiKey());
        bailian.setModel(aiConfig.getProviders().getBailian().getModel());
        bailian.setBaseUrl(aiConfig.getProviders().getBailian().getBaseUrl());
        providers.setBailian(bailian);
        
        AIConfigDTO.Siliconflow siliconflow = new AIConfigDTO.Siliconflow();
        siliconflow.setApiKey(aiConfig.getProviders().getSiliconflow().getApiKey());
        siliconflow.setModel(aiConfig.getProviders().getSiliconflow().getModel());
        siliconflow.setBaseUrl(aiConfig.getProviders().getSiliconflow().getBaseUrl());
        providers.setSiliconflow(siliconflow);
        
        AIConfigDTO.Ollama ollama = new AIConfigDTO.Ollama();
        ollama.setBaseUrl(aiConfig.getProviders().getOllama().getBaseUrl());
        ollama.setModel(aiConfig.getProviders().getOllama().getModel());
        providers.setOllama(ollama);
        
        dto.setProviders(providers);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 更新 AI 配置
     * 注意：这里只更新内存中的配置，不会持久化到 application.yaml
     */
    @PutMapping("/ai")
    public ResponseEntity<Map<String, Object>> updateAIConfig(
            @RequestBody AIConfigDTO dto) {
        
        // 更新 provider
        if (dto.getProvider() != null) {
            aiConfig.setProvider(dto.getProvider());
        }
        
        if (dto.getProviders() != null) {
            if (dto.getProviders().getBailian() != null) {
                aiConfig.getProviders().getBailian().setApiKey(dto.getProviders().getBailian().getApiKey());
                aiConfig.getProviders().getBailian().setModel(dto.getProviders().getBailian().getModel());
                aiConfig.getProviders().getBailian().setBaseUrl(dto.getProviders().getBailian().getBaseUrl());
            }
            if (dto.getProviders().getSiliconflow() != null) {
                aiConfig.getProviders().getSiliconflow().setApiKey(dto.getProviders().getSiliconflow().getApiKey());
                aiConfig.getProviders().getSiliconflow().setModel(dto.getProviders().getSiliconflow().getModel());
                aiConfig.getProviders().getSiliconflow().setBaseUrl(dto.getProviders().getSiliconflow().getBaseUrl());
            }
            if (dto.getProviders().getOllama() != null) {
                aiConfig.getProviders().getOllama().setBaseUrl(dto.getProviders().getOllama().getBaseUrl());
                aiConfig.getProviders().getOllama().setModel(dto.getProviders().getOllama().getModel());
            }
        }

        log.info("AI config updated: provider={}", dto.getProvider());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 获取 Embedding 配置
     */
    @GetMapping("/embedding")
    public ResponseEntity<Map<String, Object>> getEmbeddingConfig() {
        EmbeddingConfigDTO dto = new EmbeddingConfigDTO();
        dto.setProvider(embeddingConfig.getProvider());
        dto.setSiliconflowApiKey(embeddingConfig.getSiliconflowApiKey());
        dto.setSiliconflowModel(embeddingConfig.getSiliconflowModel());
        dto.setSiliconflowBaseUrl(embeddingConfig.getSiliconflowBaseUrl());
        dto.setBailianApiKey(embeddingConfig.getBailianApiKey());
        dto.setBailianModel(embeddingConfig.getBailianModel());
        dto.setBailianBaseUrl(embeddingConfig.getBailianBaseUrl());
        dto.setOllamaBaseUrl(embeddingConfig.getOllamaBaseUrl());
        dto.setOllamaModel(embeddingConfig.getOllamaModel());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 更新 Embedding 配置
     * 注意：这里只更新内存中的配置，不会持久化到 application.yaml
     * 如果需要持久化，需要实现文件写入逻辑
     */
    @PutMapping("/embedding")
    public ResponseEntity<Map<String, Object>> updateEmbeddingConfig(
            @RequestBody EmbeddingConfigDTO dto) {
        
        embeddingConfig.setProvider(dto.getProvider());
        embeddingConfig.setSiliconflowApiKey(dto.getSiliconflowApiKey());
        embeddingConfig.setSiliconflowModel(dto.getSiliconflowModel());
        embeddingConfig.setSiliconflowBaseUrl(dto.getSiliconflowBaseUrl());
        embeddingConfig.setBailianApiKey(dto.getBailianApiKey());
        embeddingConfig.setBailianModel(dto.getBailianModel());
        embeddingConfig.setBailianBaseUrl(dto.getBailianBaseUrl());
        embeddingConfig.setOllamaBaseUrl(dto.getOllamaBaseUrl());
        embeddingConfig.setOllamaModel(dto.getOllamaModel());

        log.info("Embedding config updated: provider={}", dto.getProvider());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 获取 Reranker 配置
     */
    @GetMapping("/reranker")
    public ResponseEntity<Map<String, Object>> getRerankerConfig() {
        RerankerConfigDTO dto = new RerankerConfigDTO();
        dto.setEnabled(rerankerConfig.isEnabled());
        dto.setApiKey(rerankerConfig.getApiKey());
        dto.setModel(rerankerConfig.getModel());
        dto.setBaseUrl(rerankerConfig.getBaseUrl());
        dto.setTopN(rerankerConfig.getTopN());
        dto.setScoreThreshold(rerankerConfig.getScoreThreshold());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 更新 Reranker 配置
     * 注意：这里只更新内存中的配置，不会持久化到 application.yaml
     */
    @PutMapping("/reranker")
    public ResponseEntity<Map<String, Object>> updateRerankerConfig(@RequestBody RerankerConfigDTO dto) {
        rerankerConfig.setEnabled(dto.isEnabled());
        if (dto.getApiKey() != null) {
            rerankerConfig.setApiKey(dto.getApiKey());
        }
        if (dto.getModel() != null) {
            rerankerConfig.setModel(dto.getModel());
        }
        if (dto.getBaseUrl() != null) {
            rerankerConfig.setBaseUrl(dto.getBaseUrl());
        }
        rerankerConfig.setTopN(dto.getTopN());
        rerankerConfig.setScoreThreshold(dto.getScoreThreshold());

        log.info("Reranker config updated: enabled={}, model={}, topN={}, scoreThreshold={}",
                dto.isEnabled(), dto.getModel(), dto.getTopN(), dto.getScoreThreshold());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 获取联网搜索配置
     */
    @GetMapping("/web-search")
    public ResponseEntity<Map<String, Object>> getWebSearchConfig() {
        WebSearchConfigDTO dto = new WebSearchConfigDTO();
        dto.setEnabled(webSearchProperties.isEnabled());
        dto.setScoreThreshold(webSearchProperties.getScoreThreshold());
        dto.setTopK(webSearchProperties.getTopK());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }

    /**
     * 更新联网搜索配置
     * 注意：这里只更新内存中的配置，不会持久化到 application.yaml
     */
    @PutMapping("/web-search")
    public ResponseEntity<Map<String, Object>> updateWebSearchConfig(@RequestBody WebSearchConfigDTO dto) {
        webSearchProperties.setEnabled(dto.isEnabled());
        webSearchProperties.setScoreThreshold(dto.getScoreThreshold());
        webSearchProperties.setTopK(dto.getTopK());

        log.info("WebSearch config updated: enabled={}, scoreThreshold={}, topK={}",
                dto.isEnabled(), dto.getScoreThreshold(), dto.getTopK());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("message", "success");
        response.put("data", dto);

        return ResponseEntity.ok(response);
    }
}
