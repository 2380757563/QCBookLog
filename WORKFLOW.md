# QCBookLog 开发与部署工作流程

本文档描述从本地开发测试到生产环境部署的完整工作流程。

## 环境说明

- **本地开发**：WSL (Windows Subsystem for Linux)
- **代码仓库**：本地 `/home/project/QCBookLog`
- **镜像仓库**：阿里云容器镜像服务
- **生产服务器**：远程 Linux 服务器

---

## 一、本地开发测试流程

### 1.1 启动开发服务器

```bash
cd /home/project/QCBookLog

# 安装依赖（首次运行或依赖变更后）
npm run install:all

# 同时启动前端和后端（推荐）
npm run dev          # 前端开发服务器
npm run server:dev    # 后端开发服务器（需要另开终端）

# 或者分别启动
npm run dev          # 终端1: 前端
cd server && npm run dev  # 终端2: 后端
```

### 1.2 访问应用

- 前端：http://localhost:5173
- 后端 API：http://localhost:7401

### 1.3 开发注意事项

- 修改前端代码会自动热重载
- 修改后端代码需要重启后端服务
- 本地开发使用 Vite 开发服务器，不经过 Docker

---

## 二、构建并推送镜像

### 2.1 升级版本号

在 `package.json` 中升级版本号：

```json
{
  "version": "1.0.0"  // 改为新版本号，如 1.0.1
}
```

更新 `docker-compose.yml` 中的镜像版本：

```yaml
services:
  frontend:
    image: crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v1.0.1
```

### 2.2 构建前端镜像

```bash
cd /home/project/QCBookLog

# 构建镜像（会自动安装依赖并打包）
docker build -t crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v1.0.1 .
```

### 2.3 推送镜像到阿里云

```bash
# 登录阿里云容器镜像服务（首次需要）
docker login --username=你的阿里云账号 crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com

# 推送镜像
docker push crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v1.0.1
```

### 2.4 快速推送脚本（可选）

在项目根目录创建 `push.sh`：

```bash
#!/bin/bash
VERSION=${1:-v1.0.1}
IMAGE="crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend"

echo "🔨 构建镜像 $IMAGE:$VERSION ..."
docker build -t $IMAGE:$VERSION .

echo "📤 推送镜像 ..."
docker push $IMAGE:$VERSION

echo "✅ 完成！镜像地址: $IMAGE:$VERSION"
```

使用方式：
```bash
chmod +x push.sh
./push.sh v1.0.2
```

---

## 三、生产服务器部署

### 3.1 登录服务器

```bash
ssh 用户@服务器IP地址
```

### 3.2 更新 docker-compose.yml

将 `docker-compose.yml` 中的镜像版本改为新版本：

```yaml
services:
  frontend:
    image: crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com/unripora/qc-booklog-frontend:v1.0.1
```

### 3.3 拉取并重启服务

```bash
cd /home/project/QCBookLog

# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 3.4 验证部署

访问生产环境地址，确认功能正常。

---

## 四、常用命令速查

### 本地开发

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run server:dev` | 启动后端开发服务器 |
| `npm run install:all` | 安装前后端依赖 |

### Docker 操作

| 命令 | 说明 |
|------|------|
| `docker build -t <image> .` | 构建镜像 |
| `docker push <image>` | 推送镜像 |
| `docker-compose pull` | 拉取镜像 |
| `docker-compose up -d` | 启动服务 |
| `docker-compose ps` | 查看服务状态 |
| `docker-compose logs -f` | 查看日志 |

### 服务器运维

| 命令 | 说明 |
|------|------|
| `docker-compose restart` | 重启服务 |
| `docker-compose down` | 停止服务 |
| `docker-compose logs -f frontend` | 查看前端日志 |
| `docker exec -it qc-booklog-backend sh` | 进入容器 |

---

## 五、故障排查

### 前端无法访问

```bash
# 检查容器状态
docker-compose ps

# 查看前端日志
docker-compose logs -f frontend
```

### 后端 API 异常

```bash
# 进入后端容器
docker exec -it qc-booklog-backend sh

# 检查日志
cat /app/data/logs/app.log
```

### 数据库连接问题

```bash
# 检查数据库文件是否存在
docker exec -it qc-booklog-backend ls -la /app/calibre/metadata.db

# 检查数据库目录
docker exec -it qc-booklog-backend ls -la /app/calibre/
```

---

## 六、目录结构说明

```
/home/project/QCBookLog/
├── src/                    # 前端源代码
├── server/                 # 后端代码
│   ├── services/           # 服务层
│   ├── routes/             # 路由
│   └── ...
├── public/                 # 静态资源
├── docker-compose.yml      # 容器编排配置
├── Dockerfile             # 前端构建配置
├── package.json           # 前端依赖
└── WORKFLOW.md            # 本文档
```

---

## 七、数据持久化目录

生产环境中以下目录数据会被持久化：

| 主机路径 | 容器路径 | 说明 |
|---------|---------|------|
| `/home/dockerdata/talebook/books/library` | `/app/calibre` | Calibre 书库 |
| `/home/dockerdata/talebook/books` | `/app/talebook` | Talebook 数据 |
| `/home/dockerdata/qcbookdata/data` | `/app/data` | 应用数据 |
| `/home/dockerdata/qcbookdata/data/logs` | `/app/data/logs` | 日志文件 |
| `/home/dockerdata/qcbookdata/data/backup` | `/app/data/backup` | 备份文件 |

> 注意：修改代码不需要动这些数据目录，镜像更新后数据会保留。
