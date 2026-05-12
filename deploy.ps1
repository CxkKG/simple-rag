# Simple RAG 部署脚本 (PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Simple RAG 部署脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 检查 Docker 是否安装
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "错误: Docker 未安装，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查 .env 文件
if (-not (Test-Path .env)) {
    Write-Host "警告: .env 文件不存在" -ForegroundColor Yellow
    Write-Host "正在从 .env.example 创建 .env 文件..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Yellow
    Write-Host "请先编辑 .env 文件，配置以下信息：" -ForegroundColor Yellow
    Write-Host "1. 数据库密码" -ForegroundColor Yellow
    Write-Host "2. Redis 密码" -ForegroundColor Yellow
    Write-Host "3. AI 服务 API Key (BAILIAN_API_KEY, SILICONFLOW_API_KEY)" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键继续"
}

# 停止并删除旧容器
Write-Host ""
Write-Host "步骤 1/4: 停止旧容器..." -ForegroundColor Green
docker compose -f docker-compose.prod.yaml down

# 构建镜像
Write-Host ""
Write-Host "步骤 2/4: 构建 Docker 镜像..." -ForegroundColor Green
docker compose -f docker-compose.prod.yaml build --no-cache

# 启动服务
Write-Host ""
Write-Host "步骤 3/4: 启动服务..." -ForegroundColor Green
docker compose -f docker-compose.prod.yaml up -d

# 等待服务启动
Write-Host ""
Write-Host "步骤 4/4: 等待服务启动..." -ForegroundColor Green
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  服务状态" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
docker compose -f docker-compose.prod.yaml ps

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址：" -ForegroundColor White
Write-Host "  - 前端页面: http://你的服务器IP:80" -ForegroundColor White
Write-Host "  - 后端 API: http://你的服务器IP:9092/api/simple-rag" -ForegroundColor White
Write-Host "  - RustFS 控制台: http://你的服务器IP:9001" -ForegroundColor White
Write-Host ""
Write-Host "查看日志：" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.prod.yaml logs -f simple-rag-app" -ForegroundColor White
Write-Host ""
Write-Host "停止服务：" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.prod.yaml down" -ForegroundColor White
Write-Host ""
Write-Host "重启服务：" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.prod.yaml restart" -ForegroundColor White
Write-Host ""
