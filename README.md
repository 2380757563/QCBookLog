# 青橙阅读记录 (QC Booklog)

> 一日之计在于晨，一年之计在于春，一生之计无定序，朝暮皆可赴新程。

个人书籍管理系统 —— 记录阅读历程、管理书籍收藏、追踪阅读进度。

---

## 功能概览

- **书籍管理** — 手动录入 / ISBN 自动搜索 / Calibre & Talebook 同步
- **书摘管理** — 记录精彩段落与个人感悟
- **标签与分组** — 灵活的多维度分类系统
- **阅读追踪** — 进度记录、时长统计、热力图
- **多读者支持** — 家庭成员独立阅读数据
- **Docker 一键部署** — 前后端容器化，开箱即用

---

## 快速开始

### 方式一：Docker 部署（推荐）

#### 1. 安装 Docker

- **Windows / Mac**：下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**：参考 [Docker 官方文档](https://docs.docker.com/engine/install/)

确保 Docker 和 Docker Compose 已安装：

```bash
docker --version
docker compose version
```

#### 2. 克隆项目

```bash
git clone https://github.com/2380757563/QCBookLog.git
cd QCBookLog
```

#### 3. 创建数据目录

Docker Compose 挂载了 `./moni/book` 和 `./moni` 作为 Calibre/Talebook 数据目录，需要手动创建：

```bash
mkdir -p moni/book
```

如果你有 Calibre 或 Talebook 的数据库，将其放入对应目录：

```bash
# Calibre 数据库（包含 metadata.db 和书籍封面）
cp /path/to/your/calibre/library/* moni/book/

# Talebook 数据库
cp /path/to/your/calibre-webserver.db moni/
```

> 没有这些数据库也不影响运行，QC Booklog 会使用自己的独立数据库。

#### 4. 启动服务

```bash
docker compose up -d
```

首次启动需要拉取镜像，可能需要几分钟。查看启动状态：

```bash
docker compose ps
```

等待两个服务状态变为 `healthy` 即可访问。

#### 5. 访问应用

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost:7401/api/health |

#### 6. 常用运维命令

```bash
# 查看日志
docker compose logs -f

# 查看后端日志
docker logs qc-booklog-backend -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新镜像并重启
docker compose pull
docker compose down
docker compose up -d
```

---

### 方式二：本地开发运行

#### 1. 环境要求

- **Node.js** >= 18
- **npm** >= 9

#### 2. 克隆并安装依赖

```bash
git clone https://github.com/2380757563/QCBookLog.git
cd QCBookLog

# 安装前后端依赖
npm install
cd server && npm install && cd ..
```

#### 3. 启动后端

```bash
cd server
npm run dev
```

后端默认运行在 http://localhost:7401

#### 4. 启动前端（新开一个终端）

```bash
npm run dev
```

前端默认运行在 http://localhost:5173，已配置代理自动转发 `/api` 请求到后端。

---

## 配置说明

### 环境变量

在项目根目录创建 `.env` 文件（可选）：

```env
# 端口配置
FRONTEND_PORT=80
BACKEND_PORT=7401

# 日志级别 (debug/info/warn/error)
LOG_LEVEL=info

# 文件上传大小限制 (MB)
MAX_FILE_SIZE=20

# 数据同步间隔 (毫秒)
SYNC_INTERVAL=300000

# CORS 允许的来源
CORS_ORIGIN=*
```

### 数据库路径

| 数据库 | Docker 路径 | 说明 |
|--------|------------|------|
| QC Booklog | `/app/data/qc-booklog.db` | 应用主数据库（Docker 卷持久化） |
| Calibre | `/app/calibre/metadata.db` | Calibre 书库（挂载 `./moni/book`） |
| Talebook | `/app/talebook/calibre-webserver.db` | Talebook 数据库（挂载 `./moni`） |

### 修改端口

编辑 `docker-compose.yml`：

```yaml
services:
  frontend:
    ports:
      - "8080:80"    # 前端端口
  backend:
    ports:
      - "7402:7401"  # 后端端口
```

---

## 项目结构

```
QCBookLog/
├── src/                    # 前端源码 (Vue 3 + TypeScript)
│   ├── views/              # 页面组件
│   ├── components/         # 通用组件
│   ├── services/           # API 服务层
│   ├── store/              # Pinia 状态管理
│   └── router/             # 路由配置
├── server/                 # 后端源码 (Node.js)
│   ├── routes/             # API 路由
│   ├── services/           # 业务逻辑
│   │   └── database/       # 数据库层 (better-sqlite3)
│   ├── migrations/         # 数据库迁移
│   └── app.js              # 入口文件
├── public/                 # 静态资源
├── nginx.conf              # Nginx 配置
├── Dockerfile              # 前端 Docker 构建
├── docker-compose.yml      # 容器编排
├── vite.config.ts          # Vite 构建配置
└── package.json            # 前端依赖
```

---

## 数据备份与恢复

### Docker 部署

```bash
# 备份 QC Booklog 数据卷
docker run --rm -v qc-booklog-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/qc-booklog-backup-$(date +%Y%m%d).tar.gz /data

# 恢复
docker run --rm -v qc-booklog-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/qc-booklog-backup-YYYYMMDD.tar.gz -C /
```

### 本地运行

直接备份 `server/data/` 目录即可。

---

## 常见问题

**Q: Docker 启动失败？**

检查端口是否被占用：
```bash
# Linux/Mac
lsof -i :80
lsof -i :7401

# Windows
netstat -ano | findstr :80
netstat -ano | findstr :7401
```

**Q: 后端健康检查一直不通过？**

查看后端日志定位原因：
```bash
docker logs qc-booklog-backend --tail 50
```

首次启动需要初始化数据库，可能需要 1-2 分钟。

**Q: 如何连接 Calibre / Talebook？**

1. 将 Calibre 的 `metadata.db` 和书籍封面放入 `moni/book/` 目录
2. 将 Talebook 的 `calibre-webserver.db` 放入 `moni/` 目录
3. 重启后端服务，系统会自动识别

**Q: 数据会丢失吗？**

Docker 使用数据卷持久化存储，`docker compose down` 不会删除数据。只有 `docker compose down -v` 才会删除数据卷。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia |
| 后端 | Node.js + Express + better-sqlite3 |
| 容器 | Docker + Docker Compose + Nginx |
| 部署 | 阿里云容器镜像服务 |

---

## 许可证

MIT License
