# QC Booklog

一个基于 Vue 3 + Express + SQLite 的书籍管理系统，采用 Repository 模式重构后端架构。

## 功能特性

- 📚 书籍管理：添加、编辑、删除书籍
- 📝 书摘管理：记录阅读笔记和摘录
- 🏷️ 标签分类：自定义标签分组
- 📖 阅读追踪：记录阅读进度和时间
- 📊 数据统计：阅读热力图、统计报表
- 🐳 Docker 部署：支持一键部署

## 技术栈

### 前端
- **框架**：Vue 3 + Vite + TypeScript
- **状态管理**：Pinia
- **路由**：Vue Router
- **UI 组件**：自定义组件库

### 后端
- **框架**：Express.js
- **数据库**：SQLite + better-sqlite3
- **架构模式**：Repository 模式
- **服务层**：分层架构（Controller → Service → Repository）

### 部署
- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx

## 项目结构

```
QC-booklog/
├── src/                          # 前端源代码
│   ├── components/                # Vue 组件
│   │   ├── base/                 # 基础组件
│   │   ├── business/             # 业务组件
│   │   └── ErrorBoundary/        # 错误边界
│   ├── router/                   # 路由配置
│   ├── services/                 # API 服务
│   ├── store/                    # Pinia 状态管理
│   ├── utils/                    # 工具函数
│   └── views/                   # 页面组件
├── server/                       # 后端源代码
│   ├── migrations/               # 数据库迁移
│   ├── routes/                   # 路由定义
│   │   ├── books/               # 书籍相关路由
│   │   │   ├── controllers/     # 控制器层
│   │   │   ├── middleware/      # 中间件
│   │   │   ├── services/        # 服务层
│   │   │   └── validators/      # 验证器
│   │   └── config/              # 配置相关路由
│   ├── services/                 # 业务服务层
│   │   ├── database/            # 数据库服务
│   │   │   ├── repositories/    # 数据访问层
│   │   │   │   ├── calibre/    # Calibre 数据库
│   │   │   │   └── talebook/   # Talebook 数据库
│   │   │   └── validators/      # 数据验证
│   │   └── ...                  # 其他服务
│   ├── utils/                    # 工具函数
│   ├── app.js                   # Express 应用入口
│   └── package.json             # 后端依赖
├── docs/                        # 项目文档
├── Dockerfile                   # Docker 配置
├── docker-compose.yml           # Docker Compose 配置
├── nginx.conf                  # Nginx 配置
└── .gitignore                 # Git 忽略规则
```

## 后端架构说明

### Repository 模式

后端采用 Repository 模式，实现了数据访问层的抽象：

```
Controller → Service → Repository → Database
```

#### 目录结构

- **routes/**: 路由定义
  - **controllers/**: 控制器层，处理 HTTP 请求
  - **services/**: 服务层，业务逻辑
  - **validators/**: 验证器，数据验证
  - **middleware/**: 中间件

- **services/**: 业务服务
  - **database/**: 数据库服务
    - **repositories/**: 数据访问层
      - **calibre/**: Calibre 数据库仓库
        - `author-repository.js`
        - `book-repository.js`
        - `publisher-repository.js`
        - `tag-repository.js`
      - **talebook/**: Talebook 数据库仓库
        - `items-repository.js`
        - `qc-bookdata-repository.js`
        - `qc-bookmarks-repository.js`
        - `reading-state-repository.js`
      - `base-repository.js`: 基础仓库类
    - **validators/**: 数据验证
    - `connection-manager.js`: 数据库连接管理

#### 优势

1. **分层清晰**：Controller → Service → Repository，职责分明
2. **易于测试**：可以 mock Repository 层进行单元测试
3. **易于扩展**：新增数据源只需实现 Repository 接口
4. **代码复用**：Base Repository 提供通用 CRUD 操作

## 快速开始

### Docker 部署（推荐）

```bash
docker-compose up -d
```

### 本地开发

#### 方式一：使用 CMD 脚本（推荐）

```bash
# 启动所有服务
双击 start-all.bat

# 停止所有服务
双击 stop-all.bat
```

#### 方式二：使用 PowerShell 脚本

```powershell
# 启动所有服务
右键点击 start-all.ps1 → 使用 PowerShell 运行

# 停止所有服务
右键点击 stop-all.ps1 → 使用 PowerShell 运行
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

## API 文档

### 书籍管理

- `GET /api/books` - 获取书籍列表
- `GET /api/books/:id` - 获取书籍详情
- `POST /api/books` - 添加书籍
- `PUT /api/books/:id` - 更新书籍
- `DELETE /api/books/:id` - 删除书籍

### 书摘管理

- `GET /api/bookmarks` - 获取书摘列表
- `GET /api/bookmarks/:id` - 获取书摘详情
- `POST /api/bookmarks` - 添加书摘
- `PUT /api/bookmarks/:id` - 更新书摘
- `DELETE /api/bookmarks/:id` - 删除书摘

### 阅读追踪

- `GET /api/reading/records` - 获取阅读记录
- `POST /api/reading/records` - 添加阅读记录
- `GET /api/reading/heatmap` - 获取阅读热力图数据
- `GET /api/reading/stats` - 获取阅读统计数据

## 测试文件说明

项目包含大量测试和调试文件，用于开发和调试：

- `test-*.js` - 功能测试文件
- `check-*.js` - 数据检查文件
- `analyze*.js` - 数据分析文件
- `verify-*.js` - 数据验证文件
- `migrate-*.js` - 数据迁移文件

这些文件保留在项目中，方便后续开发和调试。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**：首次运行时，系统会自动创建数据库文件并初始化表结构。