# 📚 QC Booklog

<div align="center">

一个专注于实体书管理的个人阅读记录应用

[![Vue 3](https://img.shields.io/badge/Vue-3.5.13-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [技术栈](#️-应用架构及技术栈) • [开发计划](#-开发计划) • [贡献指南](#-贡献指南)

</div>

---

## ✨ 简介

QC Booklog 是一个专注于实体书管理的个人阅读记录应用，支持多设备流转，让你随时随地管理和审阅个人藏书。项目灵感来源于纸间书摘、talebook 和 calibre，融合了多款产品的优势，聚焦实体书全生命周期的管理体验。

> ⚠️ **合规声明**：中国境内法律法规明确规定，个人不允许开展在线出版相关业务，维护公开的书籍资源分享网站属于违法违规行为。本项目仅建议作为个人私有使用，严禁用于公开传播盗版资源、违规出版等行为。

### 🎯 核心特性

- 📖 **实体书管理** - 深度聚焦实体书的全流程管理与状态追踪
- 🔄 **多设备同步** - 支持多终端无缝流转，随时随地管理藏书
- 📊 **阅读统计** - 可视化阅读热力图、多维度阅读数据报表
- 🏷️ **智能分类** - 灵活的标签体系，支持自定义书籍分类与筛选
- 📝 **书摘笔记** - 便捷记录阅读心得、精彩摘录，支持OCR文字识别
- 🐳 **一键部署** - 完整Docker容器化方案，开箱即用，无需复杂配置
- 🔗 **多源数据兼容** - 原生支持 Calibre、Talebook 数据库双向同步

---

## 📌 项目契机与灵感来源

### 1.1 项目契机

家里的藏书日益庞杂，作为一个压弯了好几个书架的人，我一直在寻找更高效的藏书管理方案。此前我买断了指间书摘应用，但始终无法实现多设备间的自由流转、多视角审阅藏书的需求。在网上寻觅许久，找到的工具要么不支持国内书源，要么并非聚焦实体书管理；也深度体验了新版 talebook，提交了相关功能需求，但扫描录入等核心功能的操作仍不够轻量化。于是凭着不算成熟的开发基础，配合AI辅助编码，做了这款青橙阅读记录应用（QC Booklog）。

### 1.2 灵感来源与致谢

- **纸间书摘**：非常优秀的阅读记录应用，它的UI设计和诸多功能细节都让我十分认可，本项目也有不少UI设计上的参考借鉴。纸间书摘的多端笔记同步、第三方APP关联、OCR识别、阅读功能细节打磨都相当完善，唯一的缺憾是缺少iOS和PC端支持，否则堪称完美。需要特别说明的是，纸间书摘的大部分特色功能，本项目暂无开发计划，也真诚安利给大家——对于安卓用户而言，纸间书摘完全够用。

- **Talebook**：新版 talebook 的作者非常用心，持续通过公众号更新迭代，积极响应社区与GitHub上的用户反馈，功能更新速度极快。它有很多贴合用户需求的实用功能，比如支持推送到指定安卓应用（而非仅邮箱和Kindle）、AI阅读能力等，是一款紧跟用户需求的产品。我在开发实体书管理功能时，恰逢它也上线了相关实体书支持，深度体验后决定强（行）兼（容），目前本项目可完美同步 talebook 的阅读状态，用户等数据。

- **Calibre**：本项目基于 Calibre 数据库开发，尽管应用已有较长时间的沉淀，但它的功能完整性至今无出其右，且仍在持续更新迭代。但凡接触电子书收藏的用户几乎都了解 Calibre，它的开源社区极其活跃，衍生出了 calibre-web 等诸多优秀项目，这里不再赘述。

---

## 🚀 功能特性

### 书籍管理
- ✅ 书籍信息的添加、编辑、删除全流程管理
- ✅ ISBN实时批量扫码/输入自动获取书籍元数据
- ✅ 自定义书籍分类与多维度标签体系
- ✅ 书籍封面图片上传与管理
- ✅ 多条件书籍搜索与高级筛选

### 阅读追踪
- ✅ 阅读进度与阅读状态实时记录
- ✅ 阅读时长精准统计
- ✅ 年度阅读热力图可视化展示
- ✅ 个性化阅读目标设定与进度追踪

### 书摘笔记
- ✅ 阅读心得与精彩摘录便捷录入
- ✅ 图片OCR文字识别快速提取书摘（实现中）
- ✅ 书摘内容分类与标签管理
- ✅ 多格式书摘导出功能

### 数据统计
- ✅ 年度/月度阅读量统计
- ✅ 阅读时长多维度分析
- ✅ 书籍分类与标签分布统计
- ✅ 丰富的可视化图表展示

---

## 📦 快速开始

### 方式一：Docker 部署（推荐）
提供两种部署方案，可按需选择：

#### 方案1：直接使用项目内置 docker-compose 部署
可参考 docker-compose.yml 配置自定义端口、挂载目录后，执行启动命令。

#### 方案2：拉取镜像手动部署
```bash
# 克隆项目
git clone https://github.com/yourusername/QC-booklog.git
cd QC-booklog

# 一键启动服务
docker-compose up -d

# 部署完成后访问
# 前端地址: http://localhost
# 后端接口: http://localhost:7401
```



### 方式二：windows本地

#### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

#### 安装启动步骤
```bash
# 1. 克隆项目
git clone https://github.com/yourusername/QC-booklog.git
cd QC-booklog

# 2. 安装前后端全量依赖
npm run install:all

# 3. 启动开发服务
# 终端1 - 启动前端开发服务
npm run dev

# 终端2 - 启动后端开发服务
npm run server:dev
```
启动完成后，访问 http://localhost:5173 即可查看应用。

---

## 📖 使用指南

### 数据库配置
需在环境变量中配置对应数据库路径：
calibre（必须，没有可创建）
talebook（可选，没有也不影响，已部署 Talebook 的用户可直接关联）
已部署 Talebook 的用户可直接在环境中关联两个数据库（推荐）：
```bash
# Calibre 数据库路径（非必填）
CALIBRE_DB_PATH=/path/to/calibre/metadata.db

# Talebook 数据库路径（非必填）
TALEBOOK_DB_PATH=/path/to/talebook/calibre-webserver.db
```

### 元数据接口说明
- 豆瓣元数据：使用了社区大佬开源的小程序接口方案
- bdr元数据：改写自GitHub开源项目，后续补充原项目地址
- 探数API：可前往官方平台申请每月免费额度，专业版接口暂未完成测试
- 公共图书元数据：使用公开的第三方图书接口

应用内置的dbr数据源已经完全够用，且速度没有限制。

> 后续将如果免费可用的元数据接口，提供信息将第一优先开发，暂不考虑付费接口接入。

---

## 🛠️ 应用架构及技术栈

### 前端
- **核心框架**: Vue 3.5.13 + Vite 6.0.5
- **开发语言**: TypeScript 5.6.3
- **状态管理**: Pinia 2.3.0
- **路由管理**: Vue Router 4.5.0
- **图表库**: ECharts 6.0.0
- **工具库**: Axios, Day.js, ExcelJS

### 后端
- **服务框架**: Express.js
- **数据库**: SQLite + better-sqlite3 11.10.0
- **架构模式**: Repository 模式
- **分层架构**: Controller → Service → Repository 三层架构
- **日志管理**: Winston
- **文件处理**: Multer, Unzipper

### 部署与运维
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: PM2

---

## 🔧 配置说明

### 核心环境变量
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FRONTEND_PORT` | 前端服务端口 | 80 |
| `BACKEND_PORT` | 后端服务端口 | 7401 |
| `LOG_LEVEL` | 日志输出级别 | info |
| `MAX_FILE_SIZE` | 上传文件大小上限(MB) | 20 |
| `SYNC_INTERVAL` | 数据自动同步间隔(ms) | 300000 |

### API 密钥配置
在环境变量或配置文件中添加以下密钥，即可启用对应元数据接口：
```yaml
TANSHU_API_KEY: your_tanshu_api_key
DOUBAN_API_KEY: your_douban_api_key
ISBN_WORK_API_KEY: your_isbn_work_api_key
```

---

## 📋 开发计划

按优先级排序，持续迭代更新：
1.  书籍数据批量导入功能实现（高优）
2.  书籍详情页跳转至 Talebook 对应页面（高优）
3.  第三方书摘数据批量导入（高优）
4.  豆瓣豆列抓取与书单一键导入（高优）
5.  阅读统计模块优化（优先）
    - 书籍总价/折扣统计
    - 重复购入书籍识别
    - 总览面板自定义配置
6.  年度阅读报告功能（优先）
    - 年度最爱书籍/作者统计
    - 阅读时长/频次排行
    - 购书优惠数据统计
7.  WebDAV 数据备份与同步支持
8.  个人书库智能整理功能
9.  海外元数据书源接入

---

## 📚 API 文档

### 书籍管理接口
| 方法 | 路径 | 接口说明 |
|------|------|----------|
| GET | `/api/books` | 获取书籍列表 |
| GET | `/api/books/:id` | 获取单本书籍详情 |
| POST | `/api/books` | 新增书籍 |
| PUT | `/api/books/:id` | 更新书籍信息 |
| DELETE | `/api/books/:id` | 删除书籍 |

### 书摘管理接口
| 方法 | 路径 | 接口说明 |
|------|------|----------|
| GET | `/api/bookmarks` | 获取书摘列表 |
| POST | `/api/bookmarks` | 新增书摘 |
| PUT | `/api/bookmarks/:id` | 更新书摘内容 |
| DELETE | `/api/bookmarks/:id` | 删除书摘 |

### 阅读追踪接口
| 方法 | 路径 | 接口说明 |
|------|------|----------|
| GET | `/api/reading/records` | 获取阅读记录列表 |
| POST | `/api/reading/records` | 新增阅读记录 |
| GET | `/api/reading/heatmap` | 获取阅读热力图数据 |
| GET | `/api/reading/stats` | 获取阅读统计汇总数据 |

---

## 🤝 贡献指南

欢迎各位开发者提交代码、反馈问题、提出功能建议，一起完善项目！

### 开发提交流程
1.  Fork 本仓库
2.  创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交 Pull Request

### 代码规范
- 严格遵循项目内 ESLint 配置规范
- 完整的 TypeScript 类型注解
- 清晰、规范的 Git 提交信息
- 核心逻辑补充必要的注释说明

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

---

## 🙏 致谢

本项目的诞生离不开以下优秀的开源项目，在此向所有贡献者致以诚挚的感谢：
- **[纸间书摘](https://github.com/yourusername/paper-bookmark)** - 优秀的UI设计与产品交互参考
- **[Talebook](https://github.com/talebook/talebook)** - 活跃的社区生态与完整的图书管理方案参考
- **[Calibre](https://calibre-ebook.com/)** - 行业标杆级的电子书管理底层能力

---

## 📮 联系方式

- **作者**: QC
- **邮箱**: your.email@example.com
- **项目主页**: [https://github.com/yourusername/QC-booklog](https://github.com/yourusername/QC-booklog)
- **问题反馈**: [Issues](https://github.com/yourusername/QC-booklog/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by QC

</div>

---

