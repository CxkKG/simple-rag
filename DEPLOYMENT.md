# Simple RAG 部署指南

## 📋 前置要求

- 服务器已安装 Docker 和 Docker Compose
- 服务器内存建议 ≥ 4GB (推荐 8GB)
- 服务器磁盘空间 ≥ 20GB
- 开放以下端口: 80, 443 (可选)

## 🚀 快速部署步骤

### 方式一: 使用部署脚本 (推荐)

#### Linux/Mac:
```bash
# 1. 给脚本添加执行权限
chmod +x deploy.sh

# 2. 运行部署脚本
./deploy.sh
```

#### Windows:
```powershell
# 运行部署脚本
.\deploy.ps1
```

### 方式二: 手动部署

#### 1. 上传项目到服务器

```bash
# 方式 A: 使用 Git
git clone <你的仓库地址>
cd simple-rag

# 方式 B: 使用 SCP 上传本地项目
scp -r D:\Projects\IdeaProjects\simple-rag user@your-server:/path/to/deploy
ssh user@your-server
cd /path/to/deploy/simple-rag
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

**必须修改的配置**:
```bash
# 数据库配置
DB_PASSWORD=your_password_here

# AI 服务 API Key (必须替换为真实值)
BAILIAN_API_KEY=your_bailian_api_key_here
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# Embedding 服务 API Key
EMBEDDING_SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# Reranker 服务 API Key
RERANKER_API_KEY=your_siliconflow_api_key_here

# Tavily 搜索 API Key
TAVILY_API_KEY=your_tavily_api_key_here
```

#### 3. 构建并启动服务

```bash
# 构建 Docker 镜像 (首次需要 10-20 分钟)
docker compose -f docker-compose.prod.yaml build

# 启动所有服务
docker compose -f docker-compose.prod.yaml up -d

# 查看服务状态
docker compose -f docker-compose.prod.yaml ps
```

#### 4. 验证部署

```bash
# 查看应用日志
docker compose -f docker-compose.prod.yaml logs -f simple-rag-app

# 测试后端 API
curl http://localhost:9092/api/simple-rag/actuator/health

# 测试前端
curl http://localhost:80
```

## 🌐 访问服务

部署成功后，通过以下地址访问:

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端页面 | http://你的服务器IP:80 | 用户界面 |
| 后端 API | http://你的服务器IP:9092/api/simple-rag | REST API |
| RustFS 控制台 | http://你的服务器IP:9001 | 对象存储管理 |
| PostgreSQL | localhost:5432 | 数据库 (仅内网) |
| Redis | localhost:6379 | 缓存 (仅内网) |
| Milvus | localhost:19530 | 向量数据库 (仅内网) |

## 🔧 常用运维命令

### 查看日志

```bash
# 查看所有服务日志
docker compose -f docker-compose.prod.yaml logs

# 查看特定服务日志
docker compose -f docker-compose.prod.yaml logs -f simple-rag-app

# 查看最近 100 行日志
docker compose -f docker-compose.prod.yaml logs --tail=100 simple-rag-app
```

### 重启服务

```bash
# 重启所有服务
docker compose -f docker-compose.prod.yaml restart

# 重启单个服务
docker compose -f docker-compose.prod.yaml restart simple-rag-app
```

### 停止服务

```bash
# 停止所有服务 (保留数据)
docker compose -f docker-compose.prod.yaml down

# 停止并删除所有数据
docker compose -f docker-compose.prod.yaml down -v
```

### 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker compose -f docker-compose.prod.yaml build --no-cache
docker compose -f docker-compose.prod.yaml up -d
```

### 备份数据

```bash
# 备份 PostgreSQL 数据库
docker exec simple-rag-postgres pg_dump -U postgres simple_rag > backup_$(date +%Y%m%d).sql

# 备份 Docker 卷
docker run --rm -v simple-rag_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
```

### 恢复数据

```bash
# 恢复 PostgreSQL 数据库
cat backup_20250101.sql | docker exec -i simple-rag-postgres psql -U postgres simple_rag
```

## ⚙️ 高级配置

### 1. 配置域名和 HTTPS

编辑 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... 其他配置保持不变
}
```

### 2. 调整 JVM 内存

编辑 `docker-compose.prod.yaml` 中的 `simple-rag-app` 服务:

```yaml
environment:
  JAVA_OPTS: -Xms1g -Xmx2g -XX:+UseG1GC
```

### 3. 配置外部数据库

如果你有外部 PostgreSQL 服务，修改环境变量:

```yaml
environment:
  SPRING_DATASOURCE_URL: jdbc:postgresql://external-db:5432/simple_rag
  SPRING_DATASOURCE_USERNAME: your-username
  SPRING_DATASOURCE_PASSWORD: your-password
```

然后删除 `docker-compose.prod.yaml` 中的 `postgres` 服务。

### 4. 限制资源使用

```yaml
services:
  simple-rag-app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 🐛 常见问题

### 1. 服务启动失败

```bash
# 查看详细日志
docker compose -f docker-compose.prod.yaml logs simple-rag-app

# 检查依赖服务是否就绪
docker compose -f docker-compose.prod.yaml ps
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否启动
docker exec simple-rag-postgres pg_isready -U postgres

# 手动测试连接
docker exec -it simple-rag-app sh
curl telnet://postgres:5432
```

### 3. 内存不足

```bash
# 查看内存使用
docker stats

# 减少 JVM 内存
# 编辑 docker-compose.prod.yaml，调整 JAVA_OPTS
```

### 4. 端口冲突

```bash
# 查看端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :9092

# 修改 docker-compose.prod.yaml 中的端口映射
ports:
  - "8080:80"  # 将 80 改为 8080
```

### 5. 首次构建很慢

- 这是正常现象，需要下载大量依赖
- 建议在国内服务器配置 Docker 镜像加速
- 后续构建会使用缓存，速度会快很多

## 📊 监控建议

### 1. 使用 Docker 自带监控

```bash
# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect simple-rag-app
```

### 2. 设置健康检查告警

可以结合 Prometheus + Grafana 监控 Docker 容器状态。

## 🔒 安全建议

1. **修改默认密码**: 编辑 `.env` 文件，修改所有密码
2. **配置防火墙**: 只开放必要端口 (80, 443)
3. **使用 HTTPS**: 配置 SSL 证书
4. **定期更新**: 定期更新 Docker 镜像和应用代码
5. **备份数据**: 定期备份数据库和重要文件

## 📞 技术支持

如果遇到问题:
1. 查看应用日志: `docker compose -f docker-compose.prod.yaml logs -f simple-rag-app`
2. 检查服务状态: `docker compose -f docker-compose.prod.yaml ps`
3. 验证配置: 检查 `.env` 文件是否正确配置

## 📝 更新日志

- 2025-01-XX: 初始版本，支持一键部署
