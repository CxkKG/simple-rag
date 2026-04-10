package com.cxk.simple_rag.knowledge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxk.simple_rag.knowledge.entity.KnowledgeDocumentDO;
import org.apache.ibatis.annotations.Mapper;

/**
 * 知识库文档 Mapper 接口
 *
 * @author wangxin
 */
@Mapper
public interface KnowledgeDocumentMapper extends BaseMapper<KnowledgeDocumentDO> {

}
