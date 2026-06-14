# 青橙阅读记录

> 一日之计在于晨，一年之计在于春，一生之计无定序，朝暮皆可赴新程。

---

## 📖 系统简介

**青橙阅读记录（QC Booklog）** 是一款简洁优雅的个人书籍管理系统，帮助您记录阅读历程、管理书籍收藏、追踪阅读进度，让阅读更有仪式感。

无论您是阅读爱好者、学习者还是知识管理者，青橙阅读记录都能帮助您：
- 📚 建立个人书籍数据库
- 📝 记录阅读笔记和精彩摘录
- 📊 追踪阅读习惯和进度
- 🏷️ 分类管理书籍和标签

---

## ✨ 核心功能

### 📚 书籍管理

**功能描述**：全方位管理您的书籍收藏

**主要特性**：
- 添加书籍：手动录入或通过 ISBN 自动获取书籍信息
- 编辑书籍：修改书籍详情、封面、简介等
- 删除书籍：移除不需要的书籍记录
- 书籍搜索：快速查找您的书籍
- 批量操作：批量导入、批量编辑

**使用场景**：
- 新书入库时快速添加书籍信息
- 整理个人图书馆藏书
- 管理电子书和实体书

### 📝 书摘管理

**功能描述**：记录阅读过程中的精彩片段和个人感悟

**主要特性**：
- 添加书摘：记录精彩段落、个人感悟
- 书摘分类：按章节、主题分类
- 书摘搜索：快速查找特定内容
- 书摘导出：导出为 Markdown 或文本格式

**使用场景**：
- 记录阅读过程中的精彩句子
- 整理读书笔记和心得体会
- 准备读书分享材料

### 🏷️ 标签与分组

**功能描述**：灵活的分类系统，让书籍井井有条

**主要特性**：
- 自定义标签：创建个性化标签
- 分组管理：按主题、类型分组
- 多标签支持：一本书可以有多个标签
- 标签统计：查看各标签下的书籍数量

**使用场景**：
- 按阅读状态分类（在读、已读、想读）
- 按书籍类型分类（小说、技术、历史等）
- 按主题分类（个人成长、职业发展等）

### 📖 阅读追踪

**功能描述**：记录阅读进度，养成良好阅读习惯

**主要特性**：
- 阅读进度：记录当前阅读页码
- 阅读时间：统计每日阅读时长
- 阅读目标：设定并追踪阅读目标
- 阅读提醒：定时提醒阅读

**使用场景**：
- 追踪多本书的阅读进度
- 培养每日阅读习惯
- 完成年度阅读计划

### 📊 数据统计

**功能描述**：可视化展示您的阅读数据

**主要特性**：
- 阅读热力图：展示阅读活跃度
- 统计报表：阅读数量、时间统计
- 趋势分析：阅读习惯变化趋势
- 数据导出：导出统计数据

**使用场景**：
- 年度阅读总结
- 分析阅读习惯
- 分享阅读成果

### 🔗 第三方集成

**功能描述**：与 Calibre、Talebook 等工具无缝集成

**主要特性**：
- Calibre 集成：同步 Calibre 书库
- Talebook 集成：连接 Talebook 服务
- 数据导入：从其他平台导入数据
- 数据同步：多平台数据同步

**使用场景**：
- 同步现有电子书库
- 跨平台管理书籍
- 数据备份与迁移

---

## 🚀 快速开始

### 系统要求

#### Docker 部署（推荐）

- **操作系统**：Windows 10/11、macOS 10.15+、Linux
- **Docker**：版本 20.10.0 或更高
- **Docker Compose**：版本 2.0.0 或更高
- **内存**：至少 2GB 可用内存
- **磁盘空间**：至少 1GB 可用空间

#### 本地开发

- **Node.js**：版本 18.0.0 或更高
- **npm**：版本 9.0.0 或更高
- **内存**：至少 1GB 可用内存
- **磁盘空间**：至少 500MB 可用空间

### 方式一：Docker 部署（推荐）

**适合人群**：希望快速部署、无需配置开发环境的用户

#### 1. 安装 Docker

- **Windows / Mac**：下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
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

### 方式二：本地开发运行

**适合人群**：开发者或希望自定义配置的用户

#### 1. 安装 Node.js

下载并安装 [Node.js](https://nodejs.org/)（推荐 LTS 版本，>= 18）

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

## ⚙️ 配置说明

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

## 📱 用户操作流程

### 基本使用流程

```
注册/登录 → 添加书籍 → 记录阅读 → 添加书摘 → 查看统计
```

### 详细操作指南

#### 1. 添加书籍

**方式 A：手动添加**
1. 点击"添加书籍"按钮
2. 填写书籍信息（书名、作者、ISBN 等）
3. 上传封面图片（可选）
4. 点击"保存"

**方式 B：ISBN 自动获取**
1. 点击"ISBN 搜索"
2. 输入 ISBN 号码
3. 系统自动获取书籍信息
4. 确认并保存

#### 2. 记录阅读

1. 进入书籍详情页
2. 点击"开始阅读"
3. 系统自动记录阅读时间
4. 阅读结束后点击"结束阅读"
5. 系统自动统计阅读时长

#### 3. 添加书摘

1. 在书籍详情页点击"添加书摘"
2. 输入摘录内容或个人感悟
3. 选择章节位置（可选）
4. 添加标签（可选）
5. 保存书摘

#### 4. 管理标签

1. 进入"标签管理"
2. 创建新标签
3. 为书籍分配标签
4. 按标签筛选书籍

#### 5. 查看统计

1. 进入"数据中心"
2. 查看阅读热力图
3. 查看统计数据
4. 导出报告（可选）

---

## 📂 项目结构

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

## 💾 数据备份与恢复

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

## ❓ 常见问题（FAQ）

### 安装与部署

**Q1：Docker 启动失败怎么办？**

检查端口是否被占用：
```bash
# Linux/Mac
lsof -i :80
lsof -i :7401

# Windows
netstat -ano | findstr :80
netstat -ano | findstr :7401
```

**Q2：后端健康检查一直不通过？**

查看后端日志定位原因：
```bash
docker logs qc-booklog-backend --tail 50
```

首次启动需要初始化数据库，可能需要 1-2 分钟。

**Q3：如何更新到最新版本？**

```bash
docker compose pull
docker compose down
docker compose up -d
```

**Q4：数据会丢失吗？**

Docker 使用数据卷持久化存储，`docker compose down` 不会删除数据。只有 `docker compose down -v` 才会删除数据卷。

### 使用问题

**Q5：如何备份我的数据？**

- **Docker 部署**：参见上方"数据备份与恢复"章节
- **本地运行**：备份 `server/data/` 目录

**Q6：如何连接 Calibre / Talebook？**

1. 将 Calibre 的 `metadata.db` 和书籍封面放入 `moni/book/` 目录
2. 将 Talebook 的 `calibre-webserver.db` 放入 `moni/` 目录
3. 重启后端服务，系统会自动识别

**Q7：可以在手机上使用吗？**

可以！青橙阅读记录采用响应式设计，支持手机、平板、桌面浏览器访问。

### 功能问题

**Q8：阅读热力图如何工作？**

系统会自动记录您每天的阅读活动，并以热力图形式展示。颜色越深表示阅读时间越长，支持按月、按年查看。

**Q9：如何设置阅读目标？**

进入"个人中心" → "阅读目标"，设置年度阅读数量目标，系统会自动追踪进度。

**Q10：书摘可以导出吗？**

支持导出格式：Markdown、纯文本、JSON。

---

## 🎯 使用技巧

1. **使用 ISBN 快速添加**：扫描书籍封底的 ISBN 条码，快速获取书籍信息
2. **定期整理标签**：保持标签体系清晰，方便查找
3. **善用搜索功能**：支持书名、作者、标签多维度搜索
4. **设置阅读提醒**：养成每日阅读习惯
5. **定期备份数据**：避免数据丢失

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia |
| 后端 | Node.js + Express + better-sqlite3 |
| 容器 | Docker + Docker Compose + Nginx |
| 部署 | 阿里云容器镜像服务 |

---

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

---

**开始您的阅读之旅吧！** 📚✨
