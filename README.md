# 智能课程学习助手

基于检索增强生成（RAG）技术的智能课程学习辅助系统，支持多知识库构建、多轮流式问答、联网搜索补全、学习记录自动归档与高频知识点统计分析，面向高校课程辅助学习场景设计。

## 功能概览

| 模块 | 功能描述                                            |
|------|-------------------------------------------------|
| 知识库管理 | 创建/删除知识库，上传 PDF/Word/TXT/Markdown 文档，异步切片 + 向量化 |
| 智能问答 | 基于课程知识库的 RAG 问答，SSE 流式输出，回答带引用来源标注（[1][2]...）   |
| 联网搜索 | 知识库未命中时自动调用 Tavily 联网搜索兜底，来源类型标注区分              |
| 多轮对话 | 会话历史滑窗记忆（最近 6 轮），AI 自动总结会话标题，支持重命名/删除/搜索        |
| 学习记录 | 每轮问答自动提取知识点标签（LLM 驱动，最多 5 个），支持多维度筛选            |
| 知识点统计 | 统计高频知识点与最近活跃时间，按频次或时间排序，辅助薄弱点识别                 |
| 复习提醒 | 设置知识点复习提醒，到期浏览器通知                               |
| 用户系统 | 注册/登录/邮箱验证码，角色区分（admin / teacher / student）     |

## 技术架构

```
前端 (React 18 + TypeScript + Zustand + TailwindCSS)
        │  HTTP / SSE
        ▼
后端 (Spring Boot 3 · Java 17)
        ├── PostgreSQL 15 + pgvector  ── 业务主库（用户/会话/消息/知识库/学习记录）
        ├── Milvus v2.6.6              ── 文档向量存储与 ANN 相似度检索
        ├── Redis 7                    ── 验证码缓存 / SA-Token 会话
        ├── RustFS（S3 兼容）          ── 知识库原始文件存储
        └── RocketMQ 5.2.0             ── 文档切片 + 向量化异步管道
```

**AI 服务**

| 能力 | 默认选型 | 可替换 |
|------|----------|--------|
| LLM 生成 | SiliconFlow · DeepSeek-V3 | 阿里云百炼 Qwen-Plus / Ollama 本地模型 |
| Embedding | BAAI/bge-large-zh-v1.5（1024 维） | 百炼 text-embedding-v4 / Ollama |
| Reranker | BAAI/bge-reranker-v2-m3 | — |
| 联网搜索 | Tavily Search API | — |

## 快速开始

### 环境要求

- Docker 24+ 及 Docker Compose v2+
- （本地开发）JDK 17+、Maven 3.9+、Node.js 18+、pnpm 8+

### 一键生产部署

**1. 克隆仓库**

```bash
git clone <仓库地址>
cd simple-rag
```

**2. 配置环境变量**

```bash
cp .env.example .env
# 编辑 .env，填写下方必填项
```

最少需要填写：

```dotenv
DB_PASSWORD=your_db_password

# 二选一即可
SILICONFLOW_API_KEY=sk-xxx
BAILIAN_API_KEY=sk-xxx

# Embedding（默认使用 SiliconFlow）
EMBEDDING_SILICONFLOW_API_KEY=sk-xxx

# Reranker
RERANKER_API_KEY=sk-xxx

# 联网搜索（不填则联网功能不可用）
TAVILY_API_KEY=tvly-xxx
```

**3. 执行部署脚本**

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本依次完成：安装前端依赖 → 构建前端静态文件 → 构建后端 Docker 镜像 → 启动全部容器 → 重载 Nginx。

**4. 访问地址**

| 服务 | 地址 |
|------|------|
| 前端页面 | http://服务器IP |
| 后端 API | http://服务器IP:9092/api/simple-rag |
| Milvus 管理（Attu） | http://服务器IP:8000 |
| RustFS 控制台 | http://服务器IP:9001 |

默认管理员：用户名 `admin`，密码 `123456`

---

### 本地开发

**启动基础设施**

```bash
docker compose -f docker-compose.prod.yaml up -d \
  postgres redis milvus rustfs etcd rocketmq-namesrv rocketmq-broker
```

**启动后端**

```bash
mvn spring-boot:run -pl bootstrap
```

后端默认运行在 http://localhost:9092/api/simple-rag

**启动前端**

```bash
cd frontend
pnpm install
pnpm dev
```

前端开发服务默认运行在 http://localhost:5173，已配置代理转发到后端。

---

## 使用说明

### 1. 注册与登录

打开系统首页，填写用户名和密码完成注册，或使用邮箱验证码登录（需配置邮件服务）。

### 2. 创建课程知识库

1. 进入「知识库」页面，点击「新建知识库」，填写课程名称并选择 Embedding 模型
2. 点击「上传文档」，支持 PDF、Word（.docx）、TXT、Markdown 格式
3. 上传后系统通过 RocketMQ 触发异步切片 + 向量化，文档状态变为「成功」后可用
4. 可在文档列表中启用/禁用单份文档，或删除文档同步清除对应向量

### 3. 发起智能问答

1. 在「学习问答」页面选择或新建会话，绑定对应知识库
2. 在输入框输入问题，系统以流式方式输出答案
3. 答案内 `[1][2]` 角标对应右侧「参考来源」面板中的文档片段或网页链接
4. 开启「联网搜索」后，知识库未覆盖的问题会自动联网补充，来源标注为「网络搜索」
5. 多轮追问时系统保留最近 6 轮历史（约 6000 字符），可直接用代词追问

### 4. 管理会话

- 左侧会话列表按最近活跃时间倒序排列
- 长按或右键会话可重命名，也可点击「AI 总结标题」自动生成
- 顶部搜索框支持按标题或消息内容关键词检索历史会话
- 删除会话将同步清除所有消息记录

### 5. 查看学习记录

每完成一轮问答，系统自动调用 LLM 从问题与回答中提取最多 5 个知识点标签并存档。

在「学习记录」页面可：

- 按课程（知识库）筛选记录
- 按关键词搜索问题或回答内容
- 按知识点标签检索特定主题
- 按时间段筛选（支持 `yyyy-MM-dd`、`yyyy-MM-dd HH:mm:ss` 格式）
- 查看单条记录详情，删除不需要的记录

### 6. 高频知识点统计

在「学习统计」页面，系统对学习记录中所有标签进行频次聚合：

- **按频次排序**：展示最常涉及的知识点，适合针对性复习
- **按最近时间排序**：展示近期学习轨迹
- 可指定知识库范围或统计全部课程
- 每个知识点显示出现次数和最后一次提问时间

API：`GET /api/simple-rag/api/learning-records/knowledge-points?kbId=&sortBy=count&limit=50`

### 7. 设置复习提醒

在学习记录详情页设置提醒时间和知识点主题，到期后系统通过浏览器通知发送提醒。

---

## 项目结构

```
simple-rag/
├── bootstrap/                        # Spring Boot 主模块
│   └── src/main/java/com/cxk/simple_rag/
│       ├── rag/                      # RAG 问答核心（RagService, RagController）
│       ├── knowledge/                # 知识库、文档、分块管理
│       ├── vector/                   # Milvus 向量检索服务
│       ├── llm/                      # LLM 调用（百炼 / SiliconFlow / Ollama）
│       ├── conversation/             # 会话与消息管理
│       ├── learning/                 # 学习记录与知识点统计
│       ├── user/                     # 用户认证（SA-Token）
│       ├── storage/                  # RustFS 文件上传
│       └── websearch/                # Tavily 联网搜索
├── frontend/                         # React 前端
│   └── src/
│       ├── pages/                    # 页面组件
│       ├── stores/                   # Zustand 状态管理（chat / knowledge）
│       └── services/                 # Axios + SSE API 封装
├── resources/database/
│   ├── schema_pg.sql                 # PostgreSQL 建表脚本
│   └── init_data_pg.sql             # 初始数据（默认管理员账号）
├── docs/
│   └── 数据库设计.md                 # 数据库设计说明文档
├── docker-compose.prod.yaml          # 生产 Docker Compose（含全部 6 个服务）
├── Dockerfile                        # 后端镜像构建
├── nginx.conf                        # Nginx 反向代理与前端静态服务
├── deploy.sh                         # 一键部署脚本
└── .env.example                      # 环境变量模板（所有配置项含注释）
```

## 主要 API 端点

### 知识库
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/knowledge/base` | 创建知识库 |
| GET | `/knowledge/base/page` | 分页查询 |
| DELETE | `/knowledge/base/{id}` | 删除知识库 |
| POST | `/knowledge/document/upload` | 上传文档 |
| DELETE | `/knowledge/document/{id}` | 删除文档 |

### 问答与会话
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/rag/stream-chat` | SSE 流式问答 |
| POST | `/rag/chat` | 普通问答（非流式） |
| POST | `/rag/conversation` | 创建会话 |
| GET | `/rag/conversation/list` | 会话列表 |
| GET | `/rag/conversation/{id}` | 获取会话历史消息 |
| PUT | `/rag/conversation/{id}` | 重命名会话 |
| POST | `/rag/conversation/{id}/summarize` | AI 自动总结标题 |
| DELETE | `/rag/conversation/{id}` | 删除会话 |
| GET | `/rag/conversation/search` | 搜索会话 |

### 学习记录
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/learning-records/page` | 分页查询学习记录 |
| GET | `/api/learning-records/{id}` | 查询单条记录 |
| DELETE | `/api/learning-records/{id}` | 删除记录 |
| GET | `/api/learning-records/knowledge-points` | 高频知识点统计 |

## 常用运维命令

```bash
# 查看所有服务状态
docker compose -f docker-compose.prod.yaml ps

# 查看后端实时日志
docker compose -f docker-compose.prod.yaml logs -f simple-rag-app

# 仅重启后端（不重建镜像）
docker compose -f docker-compose.prod.yaml restart simple-rag-app

# 停止全部服务（保留数据卷）
docker compose -f docker-compose.prod.yaml down

# 完整重新部署（含前端重新构建）
./deploy.sh
```

## 环境变量说明

完整配置项见 `.env.example`，关键变量如下：

| 变量 | 说明 |
|------|------|
| `DB_PASSWORD` | PostgreSQL 密码 |
| `BAILIAN_API_KEY` | 阿里云百炼 API Key |
| `SILICONFLOW_API_KEY` | SiliconFlow API Key |
| `EMBEDDING_PROVIDER` | Embedding 服务商：`siliconflow` / `bailian` / `ollama` |
| `MILVUS_VECTOR_DIMENSION` | 向量维度，需与 Embedding 模型一致（默认 1024） |
| `WEB_SEARCH_ENABLED` | 是否启用联网搜索（`true` / `false`） |
| `TAVILY_API_KEY` | Tavily 搜索 API Key |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | 邮件服务配置（复习提醒使用） |
| `SERVER_PORT` | 后端端口（默认 9092） |

## License

本项目为毕业设计课题，仅供学习参考。
