# 前端Dockerfile - 多阶段构建
# 阶段1: 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装编译依赖
RUN apk add --no-cache python3 make g++

# 复制package文件
COPY package*.json ./

# 配置npm镜像并安装依赖
ENV NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
RUN npm config set registry https://registry.npmmirror.com && \
    npm install

# 复制源代码
COPY . .

# 构建生产版本（跳过类型检查）
RUN npx vite build

# 阶段2: 生产阶段
FROM nginx:alpine

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