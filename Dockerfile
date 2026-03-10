# 前端Dockerfile - 多阶段构建（极速优化版本）
# 阶段1: 构建阶段
FROM docker.1ms.run/node:18-alpine AS builder

WORKDIR /app

# 配置环境变量以加速构建
ENV npm_config_registry=https://registry.npmmirror.com \
    npm_config_fetch_retries=2 \
    npm_config_fetch_timeout=60000 \
    npm_config_strict_ssl=false \
    NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node

# 复制package文件（先复制package.json以利用缓存）
COPY package*.json ./

# 安装所有依赖（跳过后端编译脚本）
RUN npm install --prefer-offline --no-audit --no-fund --legacy-peer-deps --ignore-scripts

# 复制源代码（排除 server 目录）
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./

# 构建生产版本（使用基本构建选项）
RUN npx vite build --mode production

# 阶段2: 生产阶段
FROM docker.1ms.run/nginx:alpine

# 复制自定义Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]