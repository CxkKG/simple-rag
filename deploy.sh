#!/bin/bash

echo "======================================"
echo "  Simple RAG 部署脚本"
echo "======================================"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "错误: Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "警告: .env 文件不存在"
    echo "正在从 .env.example 创建 .env 文件..."
    cp .env.example .env
    echo ""
    echo "======================================"
    echo "请先编辑 .env 文件，配置以下信息："
    echo "1. 数据库配置 (DB_PASSWORD)"
    echo "2. AI 服务 API Key (BAILIAN_API_KEY, SILICONFLOW_API_KEY)"
    echo "3. Embedding 服务 API Key (EMBEDDING_SILICONFLOW_API_KEY)"
    echo "4. Reranker 服务 API Key (RERANKER_API_KEY)"
    echo "5. Tavily 搜索 API Key (TAVILY_API_KEY)"
    echo "======================================"
    echo ""
    read -p "按回车键继续..."
fi

# 停止并删除旧容器
echo ""
echo "步骤 1/4: 停止旧容器..."
docker compose -f docker-compose.prod.yaml down

# 构建镜像
echo ""
echo "步骤 2/4: 构建 Docker 镜像..."
docker compose -f docker-compose.prod.yaml build --no-cache

# 启动服务
echo ""
echo "步骤 3/4: 启动服务..."
docker compose -f docker-compose.prod.yaml up -d

# 等待服务启动
echo ""
echo "步骤 4/4: 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "======================================"
echo "  服务状态"
echo "======================================"
docker compose -f docker-compose.prod.yaml ps

echo ""
echo "======================================"
echo "  部署完成！"
echo "======================================"
echo ""
echo "访问地址："
echo "  - 前端页面: http://你的服务器IP:80"
echo "  - 后端 API: http://你的服务器IP:9092/api/simple-rag"
echo "  - RustFS 控制台: http://你的服务器IP:9001"
echo ""
echo "查看日志："
echo "  docker compose -f docker-compose.prod.yaml logs -f simple-rag-app"
echo ""
echo "停止服务："
echo "  docker compose -f docker-compose.prod.yaml down"
echo ""
echo "重启服务："
echo "  docker compose -f docker-compose.prod.yaml restart"
echo ""
