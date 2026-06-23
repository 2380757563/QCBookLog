# 后端Dockerfile - 生产环境优化版本
FROM docker.m.daocloud.io/library/node:20

LABEL maintainer="QC-Booklog"
LABEL version="2.0.0"
LABEL description="QC Booklog 后端服务 - 数据本地化存储"

WORKDIR /app

# 安装必要的系统依赖（包含编译工具用于 better-sqlite3）
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 创建非root用户运行应用（安全最佳实践）
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m nodejs

# 复制package文件
COPY package*.json ./

# 配置 better-sqlite3 预编译包镜像（使用淘宝源加速国内下载）
ENV npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3 \
    npm_config_registry=https://registry.npmmirror.com \
    NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node

# 安装依赖（所有依赖）
RUN npm install && \
    npm cache clean --force

# 复制后端源代码
COPY . .

# 创建必要的目录并设置权限
RUN mkdir -p /app/data/logs /app/data/calibre-webserver /app/data/backup /data && \
    chown -R nodejs:nodejs /app /data

# 复制 entrypoint 脚本并设置权限
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 7401

# 环境变量默认值
ENV NODE_ENV=production \
    PORT=7401 \
    LOG_LEVEL=info \
    LOG_PATH=/app/data/logs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7401/api/health || exit 1

# 启动应用（使用 entrypoint 脚本修复卷权限）
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "app.js"]
