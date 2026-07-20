#!/bin/bash

set -e

echo "=========================================="
echo "  QC Booklog 开发环境部署脚本（前后端分离）"
echo "=========================================="

# API 密钥
export TANSHU_API_KEY="bc621345d6f1908f5fff0c062708ed1d"
export DOUBAN_API_KEY="0ac44ae016490db2204ce0a042db2916"
export ISBN_WORK_API_KEY="ae1718d4587744b0b79f940fbef69e77"

# 镜像与容器配置（与生产阿里云推送使用相同的 Dockerfile）
REGISTRY="crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora"
FRONTEND_IMAGE="$REGISTRY/qc-booklog-frontend:dev"
BACKEND_IMAGE="$REGISTRY/qc-booklog-backend:dev"
FRONTEND_CONTAINER="qc-booklog-frontend-dev"
BACKEND_CONTAINER="qc-booklog-backend-dev"
NETWORK="qc-booklog-dev-network"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "${YELLOW}1. 停止旧容器...${NC}"
# 停止并清理新旧容器（兼容旧的单体容器名）
for c in $FRONTEND_CONTAINER $BACKEND_CONTAINER qc-booklog-dev-container; do
  docker stop $c 2>/dev/null || true
  docker rm $c 2>/dev/null || true
done
echo "${GREEN}   ✅ 旧容器已清理${NC}"

echo ""
echo "${YELLOW}2. 创建网络...${NC}"
docker network create $NETWORK 2>/dev/null || true
echo "${GREEN}   ✅ 网络已就绪: $NETWORK${NC}"

echo ""
echo "${YELLOW}3. 构建前端镜像 (node:20-alpine + node_modules，源码挂载)...${NC}"
echo "   使用 Dockerfile.frontend-dev（vite dev server + HMR）"
# 仅当源码或 Dockerfile 变更时才真正执行构建，否则复用已存在镜像
# 通过传 --build-arg 触发重新构建（用户可手动加 FORCE_REBUILD=1 强制重建）
FORCE_REBUILD=${FORCE_REBUILD:-0}
SKIP_FRONTEND_BUILD=${SKIP_FRONTEND_BUILD:-0}

if [ "$SKIP_FRONTEND_BUILD" = "1" ] && docker image inspect $FRONTEND_IMAGE >/dev/null 2>&1; then
  echo "   ⏭️  跳过前端构建（SKIP_FRONTEND_BUILD=1 且镜像已存在）"
elif [ "$FORCE_REBUILD" = "1" ] || ! docker image inspect $FRONTEND_IMAGE >/dev/null 2>&1; then
  docker build -t $FRONTEND_IMAGE -f Dockerfile.frontend-dev .
  echo "${GREEN}   ✅ 前端镜像构建完成: $FRONTEND_IMAGE${NC}"
else
  echo "   ♻️  复用已有镜像: $FRONTEND_IMAGE (使用 FORCE_REBUILD=1 强制重建)"
fi

echo ""
echo "${YELLOW}4. 构建后端镜像 (node:20)...${NC}"
echo "   使用 server/Dockerfile"
if [ "$FORCE_REBUILD" = "1" ] || ! docker image inspect $BACKEND_IMAGE >/dev/null 2>&1; then
  docker build -t $BACKEND_IMAGE -f server/Dockerfile ./server
  echo "${GREEN}   ✅ 后端镜像构建完成: $BACKEND_IMAGE${NC}"
else
  echo "   ♻️  复用已有镜像: $BACKEND_IMAGE (使用 FORCE_REBUILD=1 强制重建)"
fi

echo ""
echo "${YELLOW}5. 创建数据目录...${NC}"
mkdir -p /home/project/QCBookLog/data/calibre \
         /home/project/QCBookLog/data/talebook \
         /home/project/QCBookLog/data/logs \
         /home/project/QCBookLog/data/metadata \
         /home/project/QCBookLog/data/user-images
echo "${GREEN}   ✅ 目录已创建${NC}"

echo ""
echo "${YELLOW}6. 启动后端容器（挂载源码 + watch 模式热重载）...${NC}"
# 注意：生产 Dockerfile 中 WORKDIR=/app 且构建上下文为 ./server/，
# 因此容器内代码路径为 /app/*（非 /app/server/*）。
# 使用 --user root 以便对挂载的宿主机源码具备写权限（watch 重启需要）。
docker run -d \
  --name $BACKEND_CONTAINER \
  --network $NETWORK \
  --network-alias qc-booklog-backend \
  --user root \
  -p 7401:7401 \
  -v /home/project/QCBookLog/server/app.js:/app/app.js \
  -v /home/project/QCBookLog/server/loader.js:/app/loader.js \
  -v /home/project/QCBookLog/server/routes:/app/routes \
  -v /home/project/QCBookLog/server/services:/app/services \
  -v /home/project/QCBookLog/server/middlewares:/app/middlewares \
  -v /home/project/QCBookLog/server/utils:/app/utils \
  -v /home/project/QCBookLog/server/config:/app/config \
  -v /home/project/QCBookLog/server/infrastructure:/app/infrastructure \
  -v /home/project/QCBookLog/server/repositories:/app/repositories \
  -v /home/project/QCBookLog/server/handlers:/app/handlers \
  -v /home/project/QCBookLog/server/plugins:/app/plugins \
  -v /home/project/QCBookLog/data:/app/data \
  -e TANSHU_API_KEY=$TANSHU_API_KEY \
  -e DOUBAN_API_KEY=$DOUBAN_API_KEY \
  -e ISBN_WORK_API_KEY=$ISBN_WORK_API_KEY \
  -e NODE_ENV=development \
  -e PORT=7401 \
  $BACKEND_IMAGE node --watch app.js
echo "${GREEN}   ✅ 后端容器已启动: $BACKEND_CONTAINER${NC}"

echo ""
echo "${YELLOW}7. 启动前端容器 (vite dev server 8080 + HMR 热重载)...${NC}"
# 挂载源码到容器内，vite HMR 自动监听变化，无需重新构建
# 隐藏 node_modules 避免覆盖容器内预装的依赖
# 通过 VITE_BACKEND_TARGET 环境变量让 vite 代理到 docker 网络内的后端别名
docker run -d \
  --name $FRONTEND_CONTAINER \
  --network $NETWORK \
  -p 8080:8080 \
  -e VITE_BACKEND_TARGET=http://qc-booklog-backend:7401 \
  -v /home/project/QCBookLog/src:/app/src:ro \
  -v /home/project/QCBookLog/index.html:/app/index.html:ro \
  -v /home/project/QCBookLog/vite.config.ts:/app/vite.config.ts:ro \
  -v /home/project/QCBookLog/tsconfig.json:/app/tsconfig.json:ro \
  -v /home/project/QCBookLog/tsconfig.app.json:/app/tsconfig.app.json:ro \
  -v /home/project/QCBookLog/tsconfig.node.json:/app/tsconfig.node.json:ro \
  -v /home/project/QCBookLog/public:/app/public:ro \
  -v /home/project/QCBookLog/server/package.json:/app/server/package.json:ro \
  -v /home/project/QCBookLog/.gitignore:/app/.gitignore:ro \
  -v /home/project/QCBookLog/styles:/app/styles:ro \
  -v /home/project/QCBookLog/auto-imports.d.ts:/app/auto-imports.d.ts:ro \
  -v /home/project/QCBookLog/components.d.ts:/app/components.d.ts:ro \
  $FRONTEND_IMAGE npx vite --host 0.0.0.0 --port 8080
echo "${GREEN}   ✅ 前端容器已启动: $FRONTEND_CONTAINER${NC}"

echo ""
echo "${YELLOW}8. 等待服务启动...${NC}"
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
echo "  ${YELLOW}镜像信息:${NC}"
echo "    前端: $FRONTEND_IMAGE"
echo "    后端: $BACKEND_IMAGE"
echo ""
echo "  ${YELLOW}查看日志:${NC}"
echo "    docker logs -f $FRONTEND_CONTAINER"
echo "    docker logs -f $BACKEND_CONTAINER"
echo ""
echo "  ${YELLOW}停止服务:${NC} docker stop $FRONTEND_CONTAINER $BACKEND_CONTAINER"
echo ""
echo "  ${YELLOW}说明:${NC}"
echo "    • 后端源码已挂载到容器，修改后 node --watch 自动热重载"
echo "    • 前端源码已挂载到容器，vite HMR 自动热重载，无需重建镜像"
echo "    • 首次执行或 package.json 变更后才需要重建镜像（自动检测）"
echo "    • 强制重建: FORCE_REBUILD=1 ./deploy.sh"
echo "    • 跳过前端构建: SKIP_FRONTEND_BUILD=1 ./deploy.sh"
echo ""
