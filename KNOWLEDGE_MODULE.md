# 知识库管理模块实现说明

## 包结构

- **包名**: `com.cxk.simple_rag`
- **作者**: wangxin


## 已完成的功能

### 1. 实体类 (Entity/DO)

| 类名 | 说明 | 路径 |
|------|------|------|
| KnowledgeBaseDO | 知识库表实体 | `knowledge/entity/KnowledgeBaseDO.java` |
| KnowledgeDocumentDO | 知识库文档表实体 | `knowledge/entity/KnowledgeDocumentDO.java` |
| KnowledgeChunkDO | 知识库文档分块表实体 | `knowledge/entity/KnowledgeChunkDO.java` |
| KnowledgeDocumentChunkLogDO | 分块日志表实体 | `knowledge/entity/KnowledgeDocumentChunkLogDO.java` |

### 2. Mapper 接口

| 接口名 | 说明 | 路径 |
|--------|------|------|
| KnowledgeBaseMapper | 知识库 Mapper | `knowledge/mapper/KnowledgeBaseMapper.java` |
| KnowledgeDocumentMapper | 文档 Mapper | `knowledge/mapper/KnowledgeDocumentMapper.java` |
| KnowledgeChunkMapper | 分块 Mapper | `knowledge/mapper/KnowledgeChunkMapper.java` |
| KnowledgeDocumentChunkLogMapper | 分块日志 Mapper | `knowledge/mapper/KnowledgeDocumentChunkLogMapper.java` |

### 3. 核心服务

| 类名 | 说明 | 路径 |
|------|------|------|
| KnowledgeBaseService | 知识库管理服务 | `knowledge/service/KnowledgeBaseService.java` |
| KnowledgeDocumentService | 文档管理服务 | `knowledge/service/KnowledgeDocumentService.java` |
| KnowledgeDocumentServiceImpl | 文档服务实现（含 Chunk 流程） | `knowledge/service/impl/KnowledgeDocumentServiceImpl.java` |

### 4. 核心组件

| 类名 | 说明 | 路径 |
|------|------|------|
| DocumentParser | 文档解析器接口 | `core/parser/DocumentParser.java` |
| TikaDocumentParser | Tika 解析器实现 | `core/parser/TikaDocumentParser.java` |
| ParserSelector | 解析器选择器 | `core/parser/ParserSelector.java` |
| TextCleanupUtil | 文本清理工具 | `core/parser/TextCleanupUtil.java` |
| ChunkingStrategy | 分块策略接口 | `core/chunk/ChunkingStrategy.java` |
| StructureAwareTextChunker | 结构感知分块器 | `core/chunk/StructureAwareTextChunker.java` |
| ChunkConfig | 分块配置 | `core/chunk/ChunkConfig.java` |
| VectorChunk | 向量分块对象 | `core/chunk/VectorChunk.java` |
| ChunkEmbeddingService | 分块向量化服务 | `core/embedding/ChunkEmbeddingService.java` |

### 5. 消息消费者

| 类名 | 说明 | 路径 |
|------|------|------|
| KnowledgeDocumentChunkConsumer | 分块消息消费者 | `knowledge/mq/KnowledgeDocumentChunkConsumer.java` |

### 6. Controller

| 类名 | 说明 | 路径 |
|------|------|------|
| KnowledgeBaseController | 知识库管理 API | `knowledge/controller/KnowledgeBaseController.java` |
| KnowledgeDocumentController | 文档管理 API | `knowledge/controller/KnowledgeDocumentController.java` |

### 7. 配置类

| 类名 | 说明 | 路径 |
|------|------|------|
| MybatisPlusConfig | MyBatis Plus 配置（分页插件） | `config/MybatisPlusConfig.java` |
| WebMvcConfig | Web MVC 配置（CORS） | `config/WebMvcConfig.java` |

---

## Chunk 模式文档处理流程

### 流程步骤

```
1. 上传文档
   ↓
2. 触发分块（发送 MQ 消息）
   ↓
3. MQ 异步消费
   ↓
4. 文本提取（Extract）- Tika 解析
   ↓
5. 文本分块（Chunk）- 结构感知分块器
   ↓
6. 向量嵌入（Embed）- 调用 Embedding 模型
   ↓
7. 持久化（Persist）- 事务写入 DB 和向量库
   ↓
8. 记录日志
```

### API 端点

#### 知识库管理
- `POST /api/simple-rag/knowledge/base` - 创建知识库
- `GET /api/simple-rag/knowledge/base/{id}` - 获取知识库详情
- `GET /api/simple-rag/knowledge/base/page` - 分页查询知识库
- `PUT /api/simple-rag/knowledge/base/{id}` - 更新知识库
- `DELETE /api/simple-rag/knowledge/base/{id}` - 删除知识库

#### 文档管理
- `POST /api/simple-rag/knowledge/document/upload` - 上传文档
- `POST /api/simple-rag/knowledge/document/chunk` - 触发文档分块
- `GET /api/simple-rag/knowledge/document/page` - 分页查询文档
- `GET /api/simple-rag/knowledge/document/{id}` - 获取文档详情
- `DELETE /api/simple-rag/knowledge/document/{id}` - 删除文档
- `POST /api/simple-rag/knowledge/document/{id}/rebuild` - 重建文档向量

---

## TODO 事项

以下功能需要进一步完善：

1. **文件存储** ✅
   - 已集成 RustFS（S3 兼容）对象存储
   - 支持文件上传、下载、删除操作

2. **向量库集成** ✅
   - 已集成 Milvus 向量数据库
   - 实现向量的增删查和相似度搜索

3. **Embedding 服务** ✅
   - 已对接实际 Embedding API（支持 SiliconFlow、阿里云百炼、Ollama）
   - 可通过配置切换提供商

4. **MQ 消息队列** ✅
   - 已集成 RocketMQ
   - 文档分块流程已改为异步消息处理

5. **向量检索服务** ✅
   - 已实现基于知识库的向量检索
   - 支持相似度搜索、TopK 查询

6. **RAG 问答服务** ✅
   - 已实现基于知识库的智能问答
   - 支持会话管理、历史消息查询
   - 后续可对接真实 LLM 实现流式响应

---

## 运行说明

### 基础设施启动

1. **启动 Docker 服务**
   ```bash
   # 启动 Milvus + RustFS
   docker-compose -f resources/milvus-stack-2.6.6.compose.yaml up -d
   
   # 启动 RocketMQ
   docker-compose -f resources/rocketmq-stack-5.2.0.compose.yaml up -d
   ```

2. **启动 PostgreSQL**
   ```bash
   # 确保 PostgreSQL 已安装并启动
   # 创建数据库 simple_rag
   ```

3. **执行数据库脚本**
   ```bash
   resources/database/schema_pg.sql
   resources/database/init_data_pg.sql
   ```

### 应用启动

4. **配置环境变量**（可选）
   ```bash
   export SILICONFLOW_API_KEY=your_api_key
   export BAILIAN_API_KEY=your_api_key
   ```

5. **运行后端**
   ```bash
   cd bootstrap
   mvn spring-boot:run
   ```

6. **服务地址**
   - 后端 API: `http://localhost:9092/api/simple-rag`
   - RocketMQ Dashboard: `http://localhost:8082`
   - Milvus Attu: `http://localhost:8000`
   - RustFS Console: `http://localhost:9001`

### 核心依赖版本

| 组件 | 版本 |
|------|------|
| Milvus | 2.6.6 |
| RocketMQ | 5.2.0 |
| RustFS | 1.0.0-alpha.72 |
| 后端框架 | Spring Boot 3.5.7 |
| MyBatis Plus | 3.5.14 |
