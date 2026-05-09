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

    /**
     * 获取 AI 配置
     */
    @GetMapping("/ai")
    public ResponseEntity<Map<String, Object>> getAIConfig() {
        AIConfigDTO dto = new AIConfigDTO();
        
        AIConfigDTO.Providers providers = new AIConfigDTO.Providers();
        
        AIConfigDTO.Bailian bailian = new AIConfigDTO.Bailian();
        bailian.setApiKey(aiConfig.getProviders().getBailian().getApiKey());
        bailian.setModel(aiConfig.getProviders().getBailian().getModel());
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
}
