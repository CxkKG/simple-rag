package com.cxk.simple_rag.knowledge.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cxk.simple_rag.knowledge.entity.KnowledgeBaseDO;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import com.cxk.simple_rag.knowledge.mapper.KnowledgeBaseMapper;
import com.cxk.simple_rag.knowledge.service.KnowledgeBaseService;
import com.cxk.simple_rag.knowledge.vo.KnowledgeBaseVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 知识库服务实现类
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeBaseMapper knowledgeBaseMapper;

    @Override
    public KnowledgeBaseVO createKnowledgeBase(String name, String embeddingModel, String createdBy) {
        if (StrUtil.isBlank(name)) {
            throw new IllegalArgumentException("Knowledge base name cannot be empty");
        }
        if (StrUtil.isBlank(embeddingModel)) {
            throw new IllegalArgumentException("Embedding model cannot be empty");
        }

        String collectionName = "kb_" + UUID.randomUUID().toString().replace("-", "");

        KnowledgeBaseDO knowledgeBaseDO = new KnowledgeBaseDO();
        knowledgeBaseDO.setId(generateId());
        knowledgeBaseDO.setName(name);
        knowledgeBaseDO.setEmbeddingModel(embeddingModel);
        knowledgeBaseDO.setCollectionName(collectionName);
        knowledgeBaseDO.setCreatedBy(createdBy);
        knowledgeBaseDO.setCreateTime(LocalDateTime.now());
        knowledgeBaseDO.setUpdateTime(LocalDateTime.now());
        knowledgeBaseDO.setDeleted(0);

        knowledgeBaseMapper.insert(knowledgeBaseDO);

        log.info("Knowledge base created: id={}, name={}, collectionName={}",
                knowledgeBaseDO.getId(), name, collectionName);

        return toVO(knowledgeBaseDO);
    }

    @Override
    public KnowledgeBaseVO getKnowledgeBase(String id) {
        KnowledgeBaseDO knowledgeBaseDO = knowledgeBaseMapper.selectById(id);
        if (knowledgeBaseDO == null) {
            throw new IllegalArgumentException("Knowledge base not found: " + id);
        }
        return toVO(knowledgeBaseDO);
    }

    @Override
    public List<KnowledgeBaseVO> listKnowledgeBases(int pageNum, int pageSize) {
        Page<KnowledgeBaseDO> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<KnowledgeBaseDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeBaseDO::getDeleted, 0)
                .orderByDesc(KnowledgeBaseDO::getCreateTime);

        Page<KnowledgeBaseDO> resultPage = knowledgeBaseMapper.selectPage(page, wrapper);

        return resultPage.getRecords().stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    public KnowledgeBaseVO updateKnowledgeBase(String id, String name) {
        KnowledgeBaseDO knowledgeBaseDO = knowledgeBaseMapper.selectById(id);
        if (knowledgeBaseDO == null) {
            throw new IllegalArgumentException("Knowledge base not found: " + id);
        }

        knowledgeBaseDO.setName(name);
        knowledgeBaseDO.setUpdateTime(LocalDateTime.now());
        knowledgeBaseMapper.updateById(knowledgeBaseDO);

        log.info("Knowledge base updated: id={}, name={}", id, name);

        return toVO(knowledgeBaseDO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteKnowledgeBase(String id) {
        KnowledgeBaseDO knowledgeBaseDO = knowledgeBaseMapper.selectById(id);
        if (knowledgeBaseDO == null) {
            throw new IllegalArgumentException("Knowledge base not found: " + id);
        }

        knowledgeBaseDO.setDeleted(1);
        knowledgeBaseDO.setUpdateTime(LocalDateTime.now());
        knowledgeBaseMapper.updateById(knowledgeBaseDO);
        knowledgeBaseMapper.deleteById(id);

        log.info("Knowledge base deleted: id={}", id);
    }

    @Override
    public int countKnowledgeBases() {
        LambdaQueryWrapper<KnowledgeBaseDO> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(KnowledgeBaseDO::getDeleted, 0);
        return Math.toIntExact(knowledgeBaseMapper.selectCount(wrapper));
    }

    private String generateId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 19);
    }

    private KnowledgeBaseVO toVO(KnowledgeBaseDO knowledgeBaseDO) {
        return KnowledgeBaseVO.builder()
                .id(knowledgeBaseDO.getId())
                .name(knowledgeBaseDO.getName())
                .embeddingModel(knowledgeBaseDO.getEmbeddingModel())
                .collectionName(knowledgeBaseDO.getCollectionName())
                .createdBy(knowledgeBaseDO.getCreatedBy())
                .createTime(knowledgeBaseDO.getCreateTime())
                .updateTime(knowledgeBaseDO.getUpdateTime())
                .build();
    }
}
