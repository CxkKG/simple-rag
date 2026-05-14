# 多阶段构建 - 前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 安装兼容 Node.js 20 的 pnpm 版本 (pnpm 10+ 需要 Node.js 22+)
RUN npm install -g pnpm@9.15.0

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# 多阶段构建 - 后端
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-builder

WORKDIR /app

COPY pom.xml ./
COPY bootstrap/pom.xml bootstrap/

COPY --from=frontend-builder /app/frontend/dist bootstrap/src/main/resources/static/

RUN mvn dependency:go-offline -B

COPY bootstrap/src bootstrap/src
RUN mvn -f bootstrap/pom.xml clean package -DskipTests

# 运行阶段
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 安装必要工具 + Node.js
RUN apk add --no-cache curl nodejs npm

# 安装 Tavily MCP
RUN npm install -g tavily-mcp

# 验证环境
RUN node -v && npm -v && npx -v && which tavily-mcp

# 复制后端 jar
COPY --from=backend-builder /app/bootstrap/target/*.jar app.jar

# 创建配置目录
RUN mkdir -p /app/config

# 暴露端口
EXPOSE 9092

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:9092/api/simple-rag/actuator/health || exit 1

# JVM 参数
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# 启动命令
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --spring.config.additional-location=file:/app/config/"]
