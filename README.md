# QC Booklog

一个基于 Vue 3 + Express + SQLite 的书籍管理系统

## 功能特性

- 📚 书籍管理：添加、编辑、删除书籍
- 📝 书摘管理：记录阅读笔记和摘录
- 🏷️ 标签分类：自定义标签分组
- 📖 阅读追踪：记录阅读进度和时间
- 📊 数据统计：阅读热力图、统计报表
- 🐳 Docker 部署：支持一键部署

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Pinia
- **后端**：Express.js + SQLite + better-sqlite3
- **部署**：Docker + Docker Compose

## 快速开始

### Docker 部署
```bash
docker-compose up -d
```

### 本地开发

#### 方式一：使用 PowerShell 脚本（推荐，无乱码）
```powershell
# 启动所有服务
右键点击 start-all.ps1 → 使用 PowerShell 运行

# 停止所有服务
右键点击 stop-all.ps1 → 使用 PowerShell 运行
```

#### 方式二：使用 CMD 脚本
```bash
# 启动所有服务
双击 start-all.bat

# 停止所有服务
双击 stop-all.bat
```

#### 方式三：手动启动
```bash
# 安装所有依赖
npm run install:all

# 启动前端（端口 5173）
npm run dev

# 启动后端（端口 7401）
cd server && npm run dev
```

## 项目结构

```
QC-booklog/
├── src/              # 前端源代码
├── server/           # 后端源代码
├── docs/             # 项目文档
├── Dockerfile         # Docker 配置
├── docker-compose.yml  # Docker Compose 配置
├── start-all.ps1     # PowerShell 一键启动脚本
├── stop-all.ps1      # PowerShell 一键停止脚本
├── start-all.bat      # CMD 一键启动脚本
└── stop-all.bat       # CMD 一键停止脚本
```

## 一键脚本说明

### PowerShell 脚本（推荐）

#### start-all.ps1 功能：
- ✅ 检测 Node.js 进程是否运行
- ✅ 自动安装前端依赖（如果需要）
- ✅ 启动前端开发服务器（Vite）
- ✅ 自动安装后端依赖（如果需要）
- ✅ 启动后端开发服务器（Express）
- ✅ 后台运行，不阻塞终端
- ✅ 显示进程 PID 和访问地址
- ✅ 彩色输出，清晰易读

#### stop-all.ps1 功能：
- ✅ 查找并停止前端进程
- ✅ 查找并停止后端进程
- ✅ 检查并清理端口 5173 占用
- ✅ 检查并清理端口 7401 占用
- ✅ 彩色输出，清晰易读
- ✅ 优雅停止服务

### CMD 脚本

#### start-all.bat 功能：
- ✅ 检测 Node.js 进程
- ✅ 安装前端依赖
- ✅ 启动前端开发服务器
- ✅ 安装后端依赖
- ✅ 启动后端开发服务器
- ✅ 显示访问地址

#### stop-all.bat 功能：
- ✅ 停止前端服务
- ✅ 停止后端服务
- ✅ 清理端口占用
- ✅ 显示停止完成提示

## 数据库

项目使用 SQLite 数据库，首次运行时会自动创建：

- **Calibre 数据库**：`data/book/metadata.db`
- **Talebook 数据库**：`data/calibre-webserver.db`

数据库会自动初始化所有必要的表结构，无需手动创建。

## 端口说明

- **前端**：http://localhost:5173
- **后端**：http://localhost:7401
- **Docker 前端**：http://localhost:80
- **Docker 后端**：http://localhost:7401

## 开发环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker >= 20.10.0（可选）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：首次运行时，系统会自动创建数据库文件并初始化表结构。