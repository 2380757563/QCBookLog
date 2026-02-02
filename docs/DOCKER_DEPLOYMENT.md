# QC Booklog Docker 部署指南

本文档提供了使用Docker和Docker Compose部署QC Booklog项目的完整指南。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [生产环境部署](#生产环境部署)
- [常见问题](#常见问题)
- [维护和监控](#维护和监控)

## 前置要求

### 必需软件

- Docker 20.10 或更高版本
- Docker Compose 2.0 或更高版本

### 可选软件

- Docker Desktop（Windows/Mac用户）
- Portainer（Docker管理界面）

### 系统要求

- CPU: 2核心或更高
- 内存: 4GB或更高
- 磁盘空间: 20GB或更高

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd QC-booklog
```

### 2. 配置环境变量

复制示例环境变量文件并根据需要修改：

```bash
cp .env.example .env
```

编辑`.env`文件，设置Calibre数据库路径：

```env
# Windows
CALIBRE_DB_PATH=D:/anz/calibre

# Linux
CALIBRE_DB_PATH=/home/user/calibre

# Mac
CALIBRE_DB_PATH=/Users/username/Calibre\ Library
```

### 3. 启动服务

使用Docker Compose启动所有服务：

```bash
docker-compose up -d
```

### 4. 访问应用

- 前端: http://localhost
- 后端API: http://localhost:7401
- API文档: http://localhost:7401/api/books

### 5. 停止服务

```bash
docker-compose down
```

## 详细配置

### 环境变量说明

| 变量名 | 默认值 | 说明 |
|---------|---------|------|
| NODE_ENV | production | 运行环境（development/production）|
| PORT | 7401 | 后端服务端口 |
| CALIBRE_DB_PATH | D:/anz/calibre | Calibre数据库宿主机路径 |
| TALEBOOK_DB_PATH | /app/data/calibre-webserver.db | Talebook数据库容器内路径 |
| FRONTEND_PORT | 80 | 前端服务端口 |
| LOG_LEVEL | info | 日志级别（error/warn/info/debug）|
| MAX_FILE_SIZE | 20 | 最大文件上传大小（MB）|
| CORS_ORIGIN | * | CORS允许的源 |

### 端口映射

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|-----------|------------|------|
| frontend | 80 | 80 | HTTP访问 |
| backend | 7401 | 7401 | API访问 |

### 数据卷挂载

| 卷名 | 宿主机路径 | 容器路径 | 说明 |
|-------|-----------|-----------|------|
| qc-booklog-data | - | /app/data | 应用数据持久化 |
| qc-booklog-logs | - | /app/data/logs | 日志持久化 |
| Calibre DB | ${CALIBRE_DB_PATH} | /app/calibre | Calibre数据库（只读）|

## 生产环境部署

### 1. 使用Nginx反向代理

创建生产环境Nginx配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:7401;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 使用SSL证书

使用Let's Encrypt获取免费SSL证书：

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 使用环境变量文件

创建生产环境配置文件：

```bash
# .env.production
NODE_ENV=production
PORT=7401
CALIBRE_DB_PATH=/path/to/calibre
LOG_LEVEL=warn
MAX_FILE_SIZE=50
```

使用生产配置启动：

```bash
docker-compose --env-file .env.production up -d
```

### 4. 资源限制

在`docker-compose.yml`中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 5. 健康检查

Docker Compose已配置健康检查，查看状态：

```bash
# 查看健康状态
docker-compose ps

# 查看健康检查日志
docker-compose logs backend
```

## 常见问题

### 1. Calibre数据库路径问题

**问题**: 容器无法访问Calibre数据库

**解决方案**:
- 确保路径格式正确（Windows使用`D:/`，Linux/Mac使用`/`）
- 检查文件权限：`chmod 644 metadata.db`
- Windows用户确保Docker Desktop有访问权限

### 2. 端口冲突

**问题**: 端口80或7401已被占用

**解决方案**:
```bash
# 修改.env文件中的端口
FRONTEND_PORT=8080
PORT=8401

# 修改docker-compose.yml中的端口映射
ports:
  - "8080:80"
  - "8401:7401"
```

### 3. 容器无法启动

**问题**: 容器启动失败

**解决方案**:
```bash
# 查看容器日志
docker-compose logs backend
docker-compose logs frontend

# 检查Docker磁盘空间
docker system df

# 清理未使用的资源
docker system prune -a
```

### 4. 数据持久化问题

**问题**: 重启容器后数据丢失

**解决方案**:
- 确保数据卷正确挂载
- 检查卷是否创建：`docker volume ls`
- 备份数据卷：`docker run --rm -v qc-booklog-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data`

### 5. 性能问题

**问题**: 应用响应慢

**解决方案**:
```bash
# 查看容器资源使用
docker stats

# 增加内存限制
# 在docker-compose.yml中增加memory限制

# 使用多阶段构建减小镜像大小
# 已在Dockerfile中实现

# 启用Nginx缓存
# 已在nginx.conf中配置
```

## 维护和监控

### 日志管理

查看应用日志：

```bash
# 前端日志
docker-compose logs frontend

# 后端日志
docker-compose logs backend

# 实时查看日志
docker-compose logs -f backend

# 查看最近100行
docker-compose logs --tail=100 backend
```

### 数据备份

定期备份数据：

```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm \
  -v qc-booklog-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/qc-booklog-$DATE.tar.gz /data

# 设置定时任务（每天凌晨2点）
0 2 * * * /path/to/backup-script.sh
```

### 更新应用

更新到新版本：

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d

# 清理旧镜像
docker image prune -f
```

### 监控指标

使用Docker监控：

```bash
# 容器资源使用
docker stats

# 磁盘使用
docker system df

# 网络使用
docker network inspect qc-booklog-network
```

## 安全建议

1. **不要在`.env`文件中存储敏感信息**
   - 使用Docker secrets或密钥管理服务
   - 不要提交`.env`文件到版本控制

2. **定期更新基础镜像**
   ```bash
   docker pull node:18-alpine
   docker pull nginx:alpine
   ```

3. **限制容器权限**
   - 不要使用`--privileged`标志
   - 使用最小权限运行容器

4. **启用日志轮转**
   - 已在应用中配置日志轮转
   - 定期清理旧日志

5. **网络隔离**
   - 使用自定义网络
   - 不要暴露不必要的端口

## 故障排除

### 查看容器状态

```bash
# 所有容器状态
docker-compose ps

# 详细信息
docker inspect qc-booklog-backend
docker inspect qc-booklog-frontend
```

### 进入容器调试

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 查看容器内文件
docker-compose exec backend ls -la /app
```

### 重置应用

完全重置应用（包括数据）：

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm qc-booklog-data qc-booklog-logs

# 重新启动
docker-compose up -d
```

## 性能优化

### 1. 镜像优化

- 使用多阶段构建减小镜像大小
- 使用Alpine基础镜像
- 清理不必要的依赖

### 2. 构建缓存

利用Docker构建缓存：

```bash
# 利用缓存层
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

### 3. 并行构建

使用BuildKit加速构建：

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker-compose build
```

### 4. 资源限制

合理设置CPU和内存限制，避免资源争用。

## 支持与帮助

如遇到问题，请：

1. 查看本文档的[常见问题](#常见问题)部分
2. 检查容器日志：`docker-compose logs`
3. 提交Issue到项目仓库

## 附录

### Docker命令速查

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose build

# 清理资源
docker system prune -a

# 查看状态
docker-compose ps
```

### 目录结构

```
QC-booklog/
├── Dockerfile              # 前端Dockerfile
├── nginx.conf            # Nginx配置
├── docker-compose.yml     # Docker Compose配置
├── .dockerignore         # Docker忽略文件
├── .env.example         # 环境变量示例
└── server/
    └── Dockerfile        # 后端Dockerfile
```

---

**最后更新**: 2026-01-23
**版本**: 1.0.0
