# Simple RAG - 简易知识库问答系统

基于 Ragent 精简的知识库管理与智能问答系统，保留核心功能：

- **知识库管理**：文档上传、解析、分块、向量存储
- **智能问答**：基于知识库的流式问答、会话管理
- **向量检索**：支持 PostgreSQL pgvector

## 技术栈

### 后端
- Java 17 + Spring Boot 3.5.7
- MyBatis Plus
- PostgreSQL + pgvector
- Redis

### 前端
- React 18 + TypeScript + Vite
- Radix UI + TailwindCSS
- Zustand 状态管理

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

启动服务：
- PostgreSQL (带 pgvector) - localhost:5432
- Redis - localhost:6379

### 2. 初始化数据库

数据库会自动执行 `resources/database/schema_pg.sql` 和 `init_data_pg.sql`

默认管理员账号：
- 用户名：admin
- 密码：admin

### 3. 启动后端

```bash
cd bootstrap
mvn spring-boot:run
```

后端服务运行在：http://localhost:9090/api/simple-rag

### 4. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端访问：http://localhost:5173

## 配置

编辑 `bootstrap/src/main/resources/application.yaml`：

### 数据库配置
```yaml
spring:
  datasource:
    url: jdbc:postgresql://127.0.0.1:5432/simple_rag
    username: postgres
    password: postgres
```

### AI 模型配置
支持以下 AI 提供商：
- **通义千问** (bailian) - 推荐用于生产
- **SiliconFlow** - 性价比高的国产模型
- **Ollama** - 本地部署

```yaml
ai:
  providers:
    bailian:
      api-key: ${BAILIAN_API_KEY:}
    siliconflow:
      api-key: ${SILICONFLOW_API_KEY:}
```

## 项目结构

```
simple-rag/
├── bootstrap/          # 主应用模块
│   └── src/main/java/com/nageoffer/ai/simple_rag/
│       ├── knowledge/  # 知识库管理
│       ├── rag/        # 问答服务
│       └── core/       # 分块和解析核心
├── framework/          # 基础设施层
├── infra-ai/          # AI 模型调用层
├── frontend/          # React 前端
│   └── src/
│       ├── pages/     # 页面
│       ├── components/# 组件
│       ├── services/  # API 服务
│       └── stores/    # 状态管理
└── resources/         # 公共资源
    └── database/      # 数据库脚本
```

## 核心功能

### 知识库管理
- 创建/编辑/删除知识库
- 文档上传（PDF、Word、Markdown、TXT 等）
- 智能分块（固定大小、结构感知）
- 文档向量化存储
- 分块启用/禁用管理
- 向量重建

### 智能问答
- 流式问答响应
- 会话管理
- 会话记忆（自动摘要）
- 查询重写（多轮对话理解）
- 多路检索（向量全局检索）
- 结果去重和重排序
- 回答反馈（点赞/点踩）

## 与 Ragent 的区别

| 功能 | Ragent | Simple RAG |
|------|--------|------------|
| 知识库管理 | ✓ | ✓ |
| 智能问答 | ✓ | ✓ |
| 会话记忆 | ✓ | ✓ |
| 向量检索 | ✓ | ✓ |
| 文档分块 | ✓ | ✓ |
| 意图树 | ✓ | ✗ |
| MCP 工具调用 | ✓ | ✗ |
| Pipeline 数据清洗 | ✓ | ✗ |
| 链路追踪 | ✓ | ✗ |
| 定时任务刷新 | ✓ | ✓ |

## 环境变量

可以通过环境变量配置 API 密钥：

```bash
export BAILIAN_API_KEY=your_api_key
export SILICONFLOW_API_KEY=your_api_key
```

## API 端点

### 知识库
- `POST /api/simple-rag/knowledge/base` - 创建知识库
- `GET /api/simple-rag/knowledge/base/page` - 分页查询知识库
- `PUT /api/simple-rag/knowledge/base/{id}` - 更新知识库
- `DELETE /api/simple-rag/knowledge/base/{id}` - 删除知识库

### 文档
- `POST /api/simple-rag/knowledge/document/upload` - 上传文档
- `GET /api/simple-rag/knowledge/document/page` - 分页查询文档
- `POST /api/simple-rag/knowledge/document/chunk` - 执行分块
- `DELETE /api/simple-rag/knowledge/document/{id}` - 删除文档

### 问答
- `POST /api/simple-rag/rag/chat/stream` - 流式问答
- `GET /api/simple-rag/rag/conversation/page` - 分页查询会话
- `POST /api/simple-rag/rag/conversation` - 创建会话

## License

Apache License 2.0
