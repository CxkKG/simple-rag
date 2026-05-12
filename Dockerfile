# 多阶段构建 - 前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# 多阶段构建 - 后端
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-builder

WORKDIR /app

COPY pom.xml ./
COPY bootstrap/pom.xml bootstrap/
RUN mvn dependency:go-offline -B

COPY bootstrap/src bootstrap/src
RUN mvn -f bootstrap/pom.xml clean package -DskipTests

# 运行阶段
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 安装必要工具
RUN apk add --no-cache curl

# 复制后端 jar
COPY --from=backend-builder /app/bootstrap/target/*.jar app.jar

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建配置目录
RUN mkdir -p /app/config

# 暴露端口
EXPOSE 9092

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:9092/api/simple-rag/actuator/health || exit 1

# JVM 参数
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC"

# 启动命令
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --spring.config.additional-location=file:/app/config/"]
