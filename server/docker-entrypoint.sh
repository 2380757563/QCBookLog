#!/bin/bash

# 修复 Docker 卷权限
chown -R nodejs:nodejs /app/data 2>/dev/null || true

# 启动应用
exec "$@"
