#!/bin/sh

echo "🚀 启动 QC Booklog 开发环境..."

# 启动后端
echo "🔄 启动后端服务..."
cd /app/server
npm run dev 2>&1 &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 8

# 启动前端
echo "🔄 启动前端服务..."
cd /app
npm run dev 2>&1 &
FRONTEND_PID=$!

echo "✅ 开发环境已启动！"
echo "   前端: http://localhost:8080"
echo "   后端: http://localhost:7401"

# 等待任意进程结束
wait
