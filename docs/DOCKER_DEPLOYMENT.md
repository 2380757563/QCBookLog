# QC Booklog Docker 部署指南

本文档提供了使用Docker和Docker Compose部署QC Booklog项目的完整指南。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [API密钥安全管理](#api密钥安全管理)
- [数据持久化配置](#数据持久化配置)
- [健康检查与自动重启](#健康检查与自动重启)
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

编辑`.env`文件，设置必要的配置：

```env
# 基础配置
NODE_ENV=production
FRONTEND_PORT=80
BACKEND_PORT=7401

# Calibre数据库路径（必须配置）
# Windows示例
CALIBRE_DB_PATH=D:/anz/calibre
# Linux示例
# CALIBRE_DB_PATH=/home/user/calibre
# Mac示例
# CALIBRE_DB_PATH=/Users/username/Calibre Library

# API密钥（必须配置，否则相关功能不可用）
TANSHU_API_KEY=your_tanshu_api_key_here
DOUBAN_API_KEY=your_douban_api_key_here
ISBN_WORK_API_KEY=your_isbn_work_api_key_here
```

### 3. 启动服务

使用Docker Compose启动所有服务：

```bash
# 构建并启动（后台运行）
docker-compose up -d --build

# 查看启动日志
docker-compose logs -f
```

### 4. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 检查后端健康状态
curl http://localhost:7401/api/health

# 预期响应：{"status":"ok","timestamp":"..."}
```

### 5. 访问应用

- 前端: http://localhost
- 后端API: http://localhost:7401
- 健康检查: http://localhost:7401/api/health

### 6. 停止服务

```bash
# 停止服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

## 环境变量配置

### 完整环境变量说明

| 变量名 | 默认值 | 必需 | 说明 |
|--------|--------|------|------|
| NODE_ENV | production | 否 | 运行环境 |
| PORT / BACKEND_PORT | 7401 | 否 | 后端服务端口 |
| FRONTEND_PORT | 80 | 否 | 前端服务端口 |
| CALIBRE_DB_PATH | - | **是** | Calibre数据库宿主机路径 |
| TANSHU_API_KEY | - | **是** | 探数图书API密钥 |
| DOUBAN_API_KEY | - | **是** | 豆瓣API密钥 |
| ISBN_WORK_API_KEY | - | **是** | ISBN.work API密钥 |
| LOG_LEVEL | info | 否 | 日志级别（error/warn/info/debug）|
| MAX_FILE_SIZE | 20 | 否 | 最大文件上传大小（MB）|
| CORS_ORIGIN | * | 否 | CORS允许的源 |
| SYNC_INTERVAL | 300000 | 否 | 同步间隔（毫秒）|

### 环境变量优先级

1. docker-compose.yml 中的 environment 定义
2. .env 文件中的定义
3. Dockerfile 中的 ENV 默认值

## API密钥安全管理

### 安全原则

1. **永远不要**将API密钥提交到版本控制系统
2. **永远不要**在代码中硬编码API密钥
3. 使用环境变量或密钥管理服务存储敏感信息

### 获取API密钥

| API服务 | 用途 | 获取地址 |
|---------|------|----------|
| 探数图书 | ISBN查询 | https://www.tanshuapi.com/ |
| 豆瓣 | 图书信息查询 | https://developers.douban.com/ |
| ISBN.work | ISBN查询 | http://data.isbn.work/ |

### 配置方法

**方法1：使用.env文件（推荐用于开发/测试）**

```bash
# 复制示例文件
cp .env.example .env

# 编辑.env文件，填写实际的API密钥
nano .env
```

**方法2：使用Docker Secrets（推荐用于生产环境）**

```yaml
# docker-compose.secrets.yml
version: '3.8'
services:
  backend:
    secrets:
      - tanshu_api_key
      - douban_api_key
      - isbn_work_api_key
    environment:
      - TANSHU_API_KEY_FILE=/run/secrets/tanshu_api_key
      - DOUBAN_API_KEY_FILE=/run/secrets/douban_api_key
      - ISBN_WORK_API_KEY_FILE=/run/secrets/isbn_work_api_key

secrets:
  tanshu_api_key:
    file: ./secrets/tanshu_api_key.txt
  douban_api_key:
    file: ./secrets/douban_api_key.txt
  isbn_work_api_key:
    file: ./secrets/isbn_work_api_key.txt
```

**方法3：使用系统环境变量**

```bash
# Linux/Mac
export TANSHU_API_KEY=your_key_here
export DOUBAN_API_KEY=your_key_here
export ISBN_WORK_API_KEY=your_key_here

docker-compose up -d
```

```powershell
# Windows PowerShell
$env:TANSHU_API_KEY="your_key_here"
$env:DOUBAN_API_KEY="your_key_here"
$env:ISBN_WORK_API_KEY="your_key_here"

docker-compose up -d
```

### 验证API密钥配置

```bash
# 进入容器检查环境变量
docker-compose exec backend sh -c 'echo $TANSHU_API_KEY'

# 检查API是否正常工作
curl http://localhost:7401/api/tanshu/isbn/9787115428028
```

## 数据持久化配置

### 数据架构说明

本项目涉及三类数据库：

| 数据库 | 类型 | 说明 | 访问模式 |
|--------|------|------|----------|
| QCBooklog | 应用自有 | 应用核心数据（书籍、阅读记录等） | 读写 |
| Calibre | 外部数据源 | 书籍元数据同步来源 | 只读 |
| Talebook | 外部数据源 | 阅读状态、书签同步来源 | 只读 |

### 数据卷说明

**应用自有数据（读写）**

| 卷名 | 容器路径 | 说明 |
|------|----------|------|
| qc-booklog-data | /app/data | QCBooklog数据库和配置 |
| qc-booklog-logs | /app/data/logs | 应用日志 |
| qc-booklog-backup | /app/data/backup | 数据备份 |

**外部数据源（只读挂载）**

| 环境变量 | 容器路径 | 说明 |
|----------|----------|------|
| CALIBRE_DB_PATH | /app/calibre | Calibre数据库 |
| TALEBOOK_DB_PATH | /app/talebook | Talebook数据库 |

### 宿主机目录映射

如需将应用数据存储在宿主机指定目录，修改docker-compose.yml：

```yaml
services:
  backend:
    volumes:
      # 外部数据库（读写同步）
      - ${CALIBRE_DB_PATH}:/app/calibre
      - ${TALEBOOK_DB_PATH}:/app/talebook
      # 应用数据（读写）- 使用宿主机目录
      - ./data/app:/app/data
      - ./data/logs:/app/data/logs
      - ./data/backup:/app/data/backup
```

### 完整配置示例

**.env 文件配置**

```env
# Calibre数据库路径（读写同步）
CALIBRE_DB_PATH=D:/anz/calibre

# Talebook数据库路径（读写同步）
TALEBOOK_DB_PATH=D:/talebook/data
```

**docker-compose.yml 卷配置**

```yaml
volumes:
  # 应用自有数据
  - qc-booklog-data:/app/data
  - qc-booklog-logs:/app/data/logs
  - qc-booklog-backup:/app/data/backup
  # 外部数据库（读写同步）
  - ${CALIBRE_DB_PATH}:/app/calibre
  - ${TALEBOOK_DB_PATH}:/app/talebook
```

### 数据备份

```bash
# 备份所有数据卷
docker run --rm \
  -v qc-booklog-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-backup-$(date +%Y%m%d).tar.gz /data

# 备份特定目录
docker run --rm \
  -v qc-booklog-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/qc-booklog-$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### 数据恢复

```bash
# 恢复数据
docker run --rm \
  -v qc-booklog-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd / && tar xzf /backup/data-backup-20260115.tar.gz"
```

## 健康检查与自动重启

### 健康检查机制

项目已配置完善的健康检查：

**后端服务**
- 检查端点：`/api/health`
- 检查间隔：30秒
- 超时时间：10秒
- 启动等待：60秒
- 重试次数：3次

**前端服务**
- 检查端点：`/`
- 检查间隔：30秒
- 超时时间：10秒
- 启动等待：20秒
- 重试次数：3次

### 查看健康状态

```bash
# 查看容器健康状态
docker-compose ps

# 查看详细健康检查日志
docker inspect --format='{{json .State.Health}}' qc-booklog-backend | jq
```

### 自动重启策略

配置了`restart: unless-stopped`策略：
- 容器崩溃时自动重启
- Docker服务重启时自动启动
- 手动停止后不会自动启动

其他可用策略：
- `no`：不自动重启
- `always`：总是重启
- `on-failure`：仅失败时重启

## 生产环境部署

### 1. 资源限制

已在docker-compose.yml中配置资源限制：

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 2. 日志管理

配置了日志轮转：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "20m"
    max-file: "5"
```

### 3. 使用反向代理

生产环境建议使用Nginx反向代理：

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

### 4. SSL配置

使用Let's Encrypt获取免费SSL证书：

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

## 常见问题

### 1. Calibre数据库路径问题

**问题**: 容器无法访问Calibre数据库

**解决方案**:
- 确保路径格式正确（Windows使用`D:/`，Linux/Mac使用`/`）
- 检查文件权限：`chmod 644 metadata.db`
- Windows用户确保Docker Desktop有访问权限

### 2. API密钥未配置错误

**问题**: 请求API返回500错误，提示密钥未配置

**解决方案**:
```bash
# 检查环境变量是否正确设置
docker-compose exec backend env | grep API_KEY

# 重新配置.env文件并重启
docker-compose down
docker-compose up -d
```

### 3. 端口冲突

**问题**: 端口80或7401已被占用

**解决方案**:
```bash
# 修改.env文件中的端口
FRONTEND_PORT=8080
BACKEND_PORT=8401

# 重启服务
docker-compose down
docker-compose up -d
```

### 4. 容器无法启动

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

### 5. 健康检查失败

**问题**: 容器状态显示unhealthy

**解决方案**:
```bash
# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' qc-booklog-backend

# 手动测试健康检查端点
curl http://localhost:7401/api/health

# 检查容器内服务状态
docker-compose exec backend curl http://localhost:7401/api/health
```

## 维护和监控

### 日志管理

```bash
# 查看所有日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看最近100行
docker-compose logs --tail=100

# 仅查看后端日志
docker-compose logs -f backend
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 监控命令

```bash
# 容器资源使用
docker stats

# 磁盘使用
docker system df

# 网络使用
docker network inspect qc-booklog-network

# 数据卷使用
docker volume ls
```

## Docker命令速查

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
docker-compose build --no-cache

# 进入容器
docker-compose exec backend sh

# 清理资源
docker system prune -a

# 查看状态
docker-compose ps
```

## 目录结构

```
QC-booklog/
├── Dockerfile              # 前端Dockerfile
├── nginx.conf              # Nginx配置
├── docker-compose.yml      # Docker Compose配置
├── .dockerignore           # Docker忽略文件
├── .env.example            # 环境变量示例
├── .env                    # 环境变量（不提交）
└── server/
    ├── Dockerfile          # 后端Dockerfile
    └── app.js              # 后端入口
```

---

**最后更新**: 2026-02-15
**版本**: 2.0.0
