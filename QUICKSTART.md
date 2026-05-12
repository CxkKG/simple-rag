# 🚀 快速开始 - 3 分钟部署指南

## 前提条件
- 服务器已安装 Docker 和 Docker Compose
- 服务器内存 ≥ 4GB

## 步骤 1: 上传项目

```bash
# 方法 1: 使用 Git
git clone <你的仓库地址>
cd simple-rag

# 方法 2: 使用 SCP (从 Windows)
scp -r D:\Projects\IdeaProjects\simple-rag user@服务器IP:/opt/
ssh user@服务器IP
cd /opt/simple-rag
```

## 步骤 2: 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置 (必须配置 AI API Key)
vim .env
```

**必须修改的内容**:
```bash
BAILIAN_API_KEY=你的阿里云百炼API-Key
SILICONFLOW_API_KEY=你的SiliconFlow API-Key
```

## 步骤 3: 一键部署

### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Windows (PowerShell):
```powershell
.\deploy.ps1
```

### 或手动部署:
```bash
docker compose -f docker-compose.prod.yaml up -d
```

## 步骤 4: 验证部署

等待 2-3 分钟后访问:
- **前端**: http://你的服务器IP:80
- **后端 API**: http://你的服务器IP:9092/api/simple-rag

## 查看日志

```bash
# 查看应用日志
docker compose -f docker-compose.prod.yaml logs -f simple-rag-app

# 按 Ctrl+C 退出日志查看
```

## 常用命令

```bash
# 停止服务
docker compose -f docker-compose.prod.yaml down

# 重启服务
docker compose -f docker-compose.prod.yaml restart

# 更新代码后重新部署
git pull
docker compose -f docker-compose.prod.yaml build --no-cache
docker compose -f docker-compose.prod.yaml up -d
```

## 遇到问题?

查看完整文档: [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速诊断:
```bash
# 检查所有服务状态
docker compose -f docker-compose.prod.yaml ps

# 查看错误日志
docker compose -f docker-compose.prod.yaml logs --tail=50 simple-rag-app
```
