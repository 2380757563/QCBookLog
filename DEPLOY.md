# QC-Booklog 部署指南

## 阿里云容器镜像服务信息

- **镜像仓库地址**: `crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com`
- **命名空间**: `unripora`
- **用户名**: `爱读书的廉纤`
- **镜像名称**:
  - 后端: `qc-booklog-backend`
  - 前端: `qc-booklog-frontend`

## 版本更新记录

| 版本号 | 更新日期 | 更新内容 |
|--------|----------|----------|
| v0.9.86 | 2026-05-10 | 添加HTTP缓存验证机制（ETag + Last-Modified），实现304响应，提升图片二次加载速度 |
| v0.9.85 | 2026-03-29 | 之前的版本 |

## 一、登录阿里云容器镜像服务

```bash
docker login --username=爱读书的廉纤 crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com
```

输入密码后，会显示 `Login Succeeded` 表示登录成功。

### WSL2环境说明

如果你在Windows上使用WSL2：

```bash
# 进入WSL2
wsl

# 进入项目目录（Windows路径映射）
cd /mnt/d/下载/docs-xmnote-master/QC-booklog

# 执行构建脚本
./build-and-push.sh 0.9.86
```

**注意**：WSL2中首次构建可能较慢，建议：
1. 配置Docker镜像加速器
2. 或在服务器上构建（推荐）

## 二、构建和推送镜像

### 方式1：使用一键构建脚本（推荐）

创建 `build-and-push.sh` 文件：

```bash
#!/bin/bash

# 配置变量
VERSION="0.9.86"
REGISTRY="crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com"
NAMESPACE="unripora"
BACKEND_IMAGE="qc-booklog-backend"
FRONTEND_IMAGE="qc-booklog-frontend"

echo "=========================================="
echo "🚀 QC-Booklog 构建和推送脚本"
echo "📦 版本: ${VERSION}"
echo "=========================================="

# 登录阿里云
echo ""
echo "🔑 登录阿里云容器镜像服务..."
docker login --username=爱读书的廉纤 ${REGISTRY}

# 构建后端镜像
echo ""
echo "🔨 构建后端镜像..."
docker build -t ${BACKEND_IMAGE}:v${VERSION} ./server
docker tag ${BACKEND_IMAGE}:v${VERSION} ${REGISTRY}/${NAMESPACE}/${BACKEND_IMAGE}:v${VERSION}
docker push ${REGISTRY}/${NAMESPACE}/${BACKEND_IMAGE}:v${VERSION}

# 构建前端镜像
echo ""
echo "🔨 构建前端镜像..."
docker build -t ${FRONTEND_IMAGE}:v${VERSION} .
docker tag ${FRONTEND_IMAGE}:v${VERSION} ${REGISTRY}/${NAMESPACE}/${FRONTEND_IMAGE}:v${VERSION}
docker push ${REGISTRY}/${NAMESPACE}/${FRONTEND_IMAGE}:v${VERSION}

echo ""
echo "=========================================="
echo "✅ 构建和推送完成！"
echo "📦 版本: ${VERSION}"
echo "=========================================="
```

执行脚本：

```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

### 方式2：手动构建和推送

#### 1. 构建后端镜像

```bash
# 构建镜像
docker build -t qc-booklog-backend:v0.9.86 ./server

# 标记镜像
docker tag qc-booklog-backend:v0.9.86 \
  crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:v0.9.86

# 推送镜像
docker push \
  crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:v0.9.86
```

#### 2. 构建前端镜像

```bash
# 构建镜像
docker build -t qc-booklog-frontend:v0.9.86 .

# 标记镜像
docker tag qc-booklog-frontend:v0.9.86 \
  crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v0.9.86

# 推送镜像
docker push \
  crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v0.9.86
```

## 三、更新 docker-compose.yml

修改 `docker-compose.yml` 文件中的镜像版本：

```yaml
services:
  frontend:
    image: crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v0.9.86
    # ... 其他配置
  
  backend:
    image: crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:v0.9.86
    # ... 其他配置
```

## 四、部署到服务器

### 1. 拉取最新镜像

```bash
docker-compose pull
```

### 2. 重启服务

```bash
# 停止旧服务
docker-compose down

# 启动新服务
docker-compose up -d
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看后端日志
docker logs qc-booklog-backend -f

# 查看前端日志
docker logs qc-booklog-frontend -f
```

### 4. 检查服务状态

```bash
# 查看容器状态
docker ps | grep qc-booklog

# 查看容器详细信息
docker inspect qc-booklog-backend
docker inspect qc-booklog-frontend
```

## 五、验证部署

### 1. 健康检查

```bash
# 检查后端健康状态
curl http://localhost:7401/api/health

# 检查前端访问
curl http://localhost:7403/
```

### 2. 验证缓存效果

```bash
# 第一次请求（返回200）
curl -I http://localhost:7403/api/static/calibre/test/cover.jpg

# 记录ETag值，第二次请求（应该返回304）
curl -I -H "If-None-Match: <上一次的ETag值>" \
  http://localhost:7403/api/static/calibre/test/cover.jpg
```

### 3. 查看版本信息

```bash
curl http://localhost:7401/api/version
```

## 六、常见问题排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker logs qc-booklog-backend --tail 100
docker logs qc-booklog-frontend --tail 100

# 检查容器状态
docker ps -a | grep qc-booklog
```

### 2. 数据库权限问题

```bash
# 修改数据目录权限
chmod -R 777 /vol1/dockerdata/talebook/books/
chmod -R 777 /vol1/dockerdata/qcbookdata/

# 或者修改所有者为容器用户
chown -R 990:990 /vol1/dockerdata/talebook/books/
chown -R 990:990 /vol1/dockerdata/qcbookdata/
```

### 3. 网络连接问题

```bash
# 检查Docker网络
docker network inspect qc-booklog-network

# 测试容器间连接
docker exec qc-booklog-frontend wget -qO- http://backend:7401/api/health
```

### 4. 镜像拉取失败

```bash
# 重新登录阿里云
docker logout
docker login --username=爱读书的廉纤 crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com

# 手动拉取镜像
docker pull crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:v0.9.86
docker pull crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v0.9.86
```

## 七、回滚到旧版本

如果新版本出现问题，可以快速回滚：

```bash
# 修改 docker-compose.yml 中的版本号
# 例如回滚到 v0.9.85

# 拉取旧版本镜像
docker-compose pull

# 重启服务
docker-compose down
docker-compose up -d
```

## 八、清理旧镜像

```bash
# 查看所有镜像
docker images | grep qc-booklog

# 删除旧版本镜像
docker rmi <旧镜像ID>

# 清理悬空镜像
docker image prune
```

## 九、自动化部署（可选）

### 使用 GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Aliyun Container Registry
        uses: docker/login-action@v1
        with:
          registry: crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com
          username: 爱读书的廉纤
          password: ${{ secrets.ALIYUN_REGISTRY_PASSWORD }}
      
      - name: Build and push backend
        run: |
          docker build -t qc-booklog-backend:${{ github.ref_name }} ./server
          docker tag qc-booklog-backend:${{ github.ref_name }} \
            crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:${{ github.ref_name }}
          docker push crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-backend:${{ github.ref_name }}
      
      - name: Build and push frontend
        run: |
          docker build -t qc-booklog-frontend:${{ github.ref_name }} .
          docker tag qc-booklog-frontend:${{ github.ref_name }} \
            crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:${{ github.ref_name }}
          docker push crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:${{ github.ref_name }}
```

## 十、监控和日志

### 1. 实时监控

```bash
# 监控容器资源使用
docker stats qc-booklog-backend qc-booklog-frontend

# 实时查看日志
docker-compose logs -f --tail=100
```

### 2. 日志管理

```bash
# 查看后端日志文件
docker exec qc-booklog-backend ls -la /app/data/logs/

# 导出日志
docker cp qc-booklog-backend:/app/data/logs/app.log ./backend.log
```

## 十一、备份和恢复

### 1. 备份数据

```bash
# 备份整个数据目录
tar -czf qc-booklog-backup-$(date +%Y%m%d).tar.gz \
  /vol1/dockerdata/qcbookdata/ \
  /vol1/dockerdata/talebook/books/library/
```

### 2. 恢复数据

```bash
# 解压备份文件
tar -xzf qc-booklog-backup-20260510.tar.gz -C /

# 重启服务
docker-compose restart
```

## 十二、性能优化建议

1. **启用HTTP缓存**：已实现ETag和Last-Modified验证
2. **使用CDN**：将静态资源托管到CDN
3. **数据库优化**：定期清理和优化数据库
4. **日志轮转**：配置日志轮转避免磁盘占满
5. **资源限制**：在docker-compose.yml中设置合理的资源限制

## 联系方式

如有问题，请联系：
- 用户名：爱读书的廉纤
- 项目地址：QC-Booklog
