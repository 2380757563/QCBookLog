#!/bin/bash

set -e

echo "=========================================="
echo "  QC Booklog 开发环境部署脚本"
echo "=========================================="

export TANSHU_API_KEY="bc621345d6f1908f5fff0c062708ed1d"
export DOUBAN_API_KEY="0ac44ae016490db2204ce0a042db2916"
export ISBN_WORK_API_KEY="ae1718d4587744b0b79f940fbef69e77"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "${YELLOW}1. 停止旧容器...${NC}"
CONTAINER_NAME="qc-booklog-dev-container"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo "${GREEN}   ✅ 旧容器已清理${NC}"

echo ""
echo "${YELLOW}2. 构建 Docker 镜像...${NC}"
echo "   (这可能需要几分钟，请耐心等待)"
docker build -f Dockerfile.dev -t qc-booklog-dev .
echo "${GREEN}   ✅ Docker 镜像构建成功${NC}"

echo ""
echo "${YELLOW}3. 创建必要的目录...${NC}"
mkdir -p /home/project/QCBookLog/data/calibre /home/project/QCBookLog/data/talebook /home/project/QCBookLog/data/logs /home/project/QCBookLog/data/metadata /home/project/QCBookLog/data/user-images
echo "${GREEN}   ✅ 目录已创建${NC}"

echo ""
echo "${YELLOW}4. 启动容器...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  -p 8080:8080 \
  -p 7401:7401 \
  -v /home/project/QCBookLog/src:/app/src \
  -v /home/project/QCBookLog/server/app.js:/app/server/app.js \
  -v /home/project/QCBookLog/server/loader.js:/app/server/loader.js \
  -v /home/project/QCBookLog/server/routes:/app/server/routes \
  -v /home/project/QCBookLog/server/services:/app/server/services \
  -v /home/project/QCBookLog/server/middlewares:/app/server/middlewares \
  -v /home/project/QCBookLog/server/utils:/app/server/utils \
  -v /home/project/QCBookLog/server/config:/app/server/config \
  -v /home/project/QCBookLog/data:/app/data \
  -v /home/project/QCBookLog/index.html:/app/index.html \
  -v /home/project/QCBookLog/package.json:/app/package.json \
  -v /home/project/QCBookLog/vite.config.ts:/app/vite.config.ts \
  -e TANSHU_API_KEY=$TANSHU_API_KEY \
  -e DOUBAN_API_KEY=$DOUBAN_API_KEY \
  -e ISBN_WORK_API_KEY=$ISBN_WORK_API_KEY \
  qc-booklog-dev
echo "${GREEN}   ✅ 容器启动成功${NC}"

echo ""
echo "${YELLOW}5. 等待服务启动...${NC}"
sleep 10
echo "${GREEN}   ✅ 服务启动完成${NC}"

echo ""
echo "=========================================="
echo "  ${GREEN}部署完成！${NC}"
echo "=========================================="
echo ""
echo "  ${YELLOW}前端地址:${NC} http://localhost:8080"
echo "  ${YELLOW}后端地址:${NC} http://localhost:7401"
echo ""
echo "  ${YELLOW}ISBN搜索页面:${NC} http://localhost:8080/book/isbn-search"
echo "  ${YELLOW}配置页面:${NC} http://localhost:8080/config"
echo ""
echo "  ${YELLOW}查看日志:${NC} docker logs $CONTAINER_NAME"
echo "  ${YELLOW}停止服务:${NC} docker stop $CONTAINER_NAME"
echo ""
