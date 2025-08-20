# 多阶段构建 - 前端构建
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 复制前端依赖文件
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# 安装前端依赖
RUN cd frontend && npm ci --only=production && npm cache clean --force

# 复制前端源码和共享类型
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# 构建前端
RUN cd frontend && npm run build

# 多阶段构建 - 后端构建
FROM node:20-alpine AS backend-builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 复制后端依赖文件
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# 安装后端依赖
RUN cd backend && npm ci --only=production && npm cache clean --force

# 复制后端源码、共享类型和Prisma配置
COPY backend/ ./backend/
COPY shared/ ./shared/

# 生成Prisma客户端
RUN cd backend && npx prisma generate

# 构建后端
RUN cd backend && npm run build

# 生产环境运行时镜像
FROM node:20-alpine AS runner

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# 复制构建产物
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/public ./frontend/public

COPY --from=backend-builder --chown=appuser:nodejs /app/backend/dist ./backend/
COPY --from=backend-builder --chown=appuser:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=appuser:nodejs /app/backend/prisma ./backend/prisma

# 复制启动脚本
COPY --chown=appuser:nodejs scripts/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# 创建日志目录
RUN mkdir -p logs && chown -R appuser:nodejs logs

# 安全配置
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# 暴露端口
EXPOSE 3000 4000

# 环境变量
ENV NODE_ENV=production
ENV PORT=4000
ENV FRONTEND_PORT=3000

# 启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]

# 镜像标签
LABEL maintainer="EngGameHub Team"
LABEL version="1.0.0"
LABEL description="AI-Powered English Learning Game Platform"
