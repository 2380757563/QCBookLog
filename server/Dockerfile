# 后端Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache python3 make g++ sqlite

# 复制package文件
COPY server/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制后端源代码
COPY server/ ./

# 创建数据目录
RUN mkdir -p /app/data/logs /app/data/calibre-webserver

# 暴露端口
EXPOSE 7401

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7401/api/books', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "app.js"]
