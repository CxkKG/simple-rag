# Simple RAG 前端管理后台

基于 React 18 + Vite + TypeScript 的管理后台界面。

## 功能特性

- **知识库管理**: 创建、编辑、删除知识库，查看知识库详情
- **文档管理**: 上传文档、查看文档列表、触发分块、重建向量
- **用户管理**: 管理系统用户和权限
- **系统设置**: 配置系统参数和全局选项

## 技术栈

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Zustand (状态管理)
- Axios (HTTP 请求)
- Lucide React (图标)

## 快速开始

### 1. 安装依赖

```bash
cd frontend
pnpm install
# 或者使用 npm
npm install
```

### 2. 启动开发服务器

```bash
pnpm dev
# 或者
npm run dev
```

前端服务运行在: http://localhost:5173

### 3. 启动后端

确保后端服务运行在: http://localhost:9090

```bash
cd bootstrap
mvn spring-boot:run
```

## 项目结构

```
frontend/
├── src/
│   ├── components/          # UI 组件
│   │   ├── ui/             # 基础 UI 组件 (Button, Input, Table 等)
│   │   └── layout.tsx      # 布局组件 (Sidebar, Header)
│   ├── features/           # 功能模块
│   │   ├── knowledge-base/ # 知识库管理
│   │   ├── document/       # 文档管理
│   │   ├── user/           # 用户管理
│   │   └── settings/       # 系统设置
│   ├── pages/              # 页面组件
│   ├── services/           # API 服务
│   ├── stores/             # Zustand 状态管理
│   ├── lib/                # 工具函数
│   ├── types/              # TypeScript 类型定义
│   ├── hooks/              # 自定义 Hooks
│   ├── app.tsx             # 应用入口
│   └── main.tsx            # 主入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API 接口映射

| 功能 | API 端点 | 方法 |
|------|----------|------|
| 创建知识库 | /api/simple-rag/knowledge/base | POST |
| 获取知识库列表 | /api/simple-rag/knowledge/base/page | GET |
| 更新知识库 | /api/simple-rag/knowledge/base/{id} | PUT |
| 删除知识库 | /api/simple-rag/knowledge/base/{id} | DELETE |
| 上传文档 | /api/simple-rag/knowledge/document/upload | POST |
| 获取文档列表 | /api/simple-rag/knowledge/document/page | GET |
| 删除文档 | /api/simple-rag/knowledge/document/{id} | DELETE |
| 问答 | /api/simple-rag/rag/chat | POST |

## 环境变量

可选的环境变量配置：

```env
VITE_API_BASE_URL=/api
```

## 构建生产版本

```bash
pnpm build
# 或者
npm run build
```

构建产物输出到 `dist/` 目录。
