# QCBookLog 与 mybook（Talebook）对比分析报告

> 对比日期：2026-07-15  
> QCBookLog 版本：v0.9.13  
> mybook 版本：develop 分支最新提交 `55dd6f9`  
> 分析目的：借鉴 mybook 成熟经验，为 QCBookLog 提供可落地的改进方向

---

## 1. 两者总体定位对比

| 维度 | QCBookLog | mybook（Talebook） |
|------|-----------|---------------------|
| 定位 | 个人图书管理与阅读记录工具 | 个人/家庭在线图书馆 + 电子书阅读站 |
| 用户场景 | 管理实体书、记录阅读进度、查看统计 | 管理电子书/实体书、在线阅读、推送到设备、社交分享 |
| 部署方式 | 桌面/本地 Web（Vite + Express） | Docker 服务端 + Nuxt 前端 |
| 数据架构 | 三库：Calibre + Talebook + QC Booklog | 双库：Calibre + Talebook 应用库 |
| 编程语言 | 前端 TS/Vue3，后端 Node.js | 前端 Nuxt/Vue2，后端 Python/Tornado+SQLAlchemy |
| 成熟度 | 早期项目，功能快速迭代中 | 经过多年迭代，社区使用较广 |

---

## 2. mybook 的优秀实践

### 2.1 成熟的安全认证与授权体系

mybook 在认证授权方面比 QCBookLog 成熟很多：

| 实践 | 实现方式 | QCBookLog 现状 |
|------|----------|----------------|
| 登录态管理 | 基于 Tornado 的 `secure_cookie` + `user_id` cookie | 无登录机制 |
| 会话有效期 | 7 天有效期，过期自动失效 | 无会话概念 |
| 管理员鉴权 | `admin_id` cookie + `is_admin()` 方法 | 无管理员概念 |
| 权限模型 | 基于 `Reader.permission` 字符的细粒度权限（d/e/l/p/r/s/u/v） | 无权限模型 |
| 认证装饰器 | `@auth` / `@is_admin` 装饰器统一保护路由 | 无统一鉴权中间件 |
| 邀请码模式 | 支持 `INVITE_MODE` 邀请码访问 | 无 |
| 双因子 | 支持 Basic Auth + Token 认证 | 无 |

**可借鉴点**：
- 引入基于 JWT/Session 的登录机制
- 在 QCBookLog 后端增加统一 `@auth` / `@admin` 中间件
- 借鉴 `Reader.permission` 的字符权限模型，实现上传/推送/阅读等权限控制

### 2.2 清晰的分层与插件化架构

mybook 后端采用清晰的分层：

```
handlers/          # 路由处理器（Controller）
  ├── base.py      # 基类：认证、国际化、上传安全、缓存等
  ├── user.py      # 用户相关
  ├── book.py      # 图书相关
  └── ...

services/          # 业务服务
  ├── book_search.py
  ├── scan_service.py
  ├── async_service.py
  └── ...

plugins/           # 插件系统
  ├── meta/        # 元数据信息源插件
  │   ├── base.py  # 插件基类
  │   ├── douban/
  │   ├── baike/
  │   ├── xhsd/
  │   └── ...
  └── parser/      # 文件解析插件

models.py          # SQLAlchemy ORM 模型
```

**优秀实践**：
- `MetaSourcePlugin` 抽象基类定义统一接口：`search()`、`search_best()`、`get_metadata_by_provider()`
- 新增书源只需继承基类，注册到 `META_SELECTED_SOURCES` 即可
- 插件内部可独立配置 API Key、URL、请求头

**可借鉴点**：
- QCBookLog 的书源目前直接硬编码在 `app.js` 和 `connection-manager.js` 中，建议引入类似 `MetaSourcePlugin` 的插件基类
- 将书源配置完全交给插件自身管理，数据库只保存 `source_key` 和 `api_key`

### 2.3 数据库访问层使用 ORM + 迁移

mybook 使用 SQLAlchemy ORM：

| 优势 | 说明 |
|------|------|
| 模型定义集中 | 所有表结构在 `models.py` 中清晰定义 |
| 关系明确 | 使用 `relationship` 和 `ForeignKey` 定义关联 |
| 迁移机制 | 通过 `--syncdb` 参数同步表结构，有版本升级逻辑 |
| 会话管理 | 每个请求独立 `ScopedSession`，`on_finish` 关闭 |
| 事务支持 | SQLAlchemy 自动事务管理 |

**可借鉴点**：
- QCBookLog 目前使用裸 SQL + `better-sqlite3`，虽然性能更好，但表结构管理混乱
- 建议引入轻量 ORM（如 `drizzle-orm` / `sequelize`）或至少建立统一迁移脚本
- 将数据库连接与会话生命周期统一管理，避免连接泄露

### 2.4 统一配置管理

mybook 配置分层明确：

| 配置层级 | 来源 |
|----------|------|
| 默认配置 | `webserver/settings.py` |
| 自动配置 | `auto.py`（运行时持久化） |
| 手动配置 | `manual.py`（用户自定义） |
| 运行时配置 | 通过 Web 管理界面修改并保存到 `auto.py` |

**可借鉴点**：
- QCBookLog 配置分散在环境变量、QC DB、localStorage、代码常量中
- 建议建立统一配置中心：数据库配置表（非敏感）+ 环境变量（敏感）+ 前端配置接口

### 2.5 国际化（i18n）

mybook 使用 gettext 风格的国际化方案：
- `webserver/i18n.py` 统一语言管理
- 所有用户可见字符串使用 `_()` 包裹
- 支持 `locales/` 目录下的多语言文件

**可借鉴点**：
- QCBookLog 目前只有中文，但字符串散落在模板中
- 建议引入 `vue-i18n`，逐步将提示信息抽离到 `locales/zh-CN.json`

### 2.6 测试与文档

mybook 提供了：
- 15 个测试文件覆盖主要功能
- 多个测试数据库（`metadata.db`、`big-metadata.db`、`users.db`）
- 完整的文档：`Development.zh_CN.md`、`UserGuide.zh_CN.md`、`WebAPI.md`、`meta_plugins.md`

**可借鉴点**：
- QCBookLog 几乎没有测试，文档稀缺
- 建议从核心 API 测试开始，逐步建立 `tests/` 目录
- 补齐 API 文档，便于后续开发和第三方集成

### 2.7 文件上传安全

mybook 在 `BaseHandler` 中实现了 `_sanitize_uploaded_filename` 和 `_safe_upload_path`：
- 过滤特殊字符、路径穿越（`../`）
- 限制文件名长度
- 使用 `realpath` + `commonpath` 校验路径是否在允许目录内

**可借鉴点**：
- QCBookLog 的 `createBook` 中路径拼接仅替换 `\/`，未做严格路径校验
- 建议引入类似的安全路径校验函数

### 2.8 插件化的元数据聚合策略

mybook 的书源聚合策略：
- 在 `plugins/meta/` 下定义多个插件
- 每个插件实现 `search()` 和 `search_best()`
- 通过 `META_SELECTED_SOURCES` 配置选择启用哪些来源
- 支持多源并行搜索，取最佳结果

**可借鉴点**：
- QCBookLog 的 `isbnApi/index.ts` 已有多源 fallback 逻辑，但后端缺少统一管理
- 建议将前端的多源逻辑迁移到后端，统一由插件调度

---

## 3. mybook 的不足之处

### 3.1 密码安全同样较弱

mybook 的密码哈希方案：

```python
p1 = hashlib.sha256(raw_password.encode("UTF-8")).hexdigest()
p2 = hashlib.sha256((self.salt + p1).encode("UTF-8")).hexdigest()
```

这仍然是 SHA256 快哈希，**不适合密码存储**。虽然比 QCBookLog 多了 salt 和二次哈希，但抗 GPU 破解能力依然很弱。

### 3.2 历史包袱重

| 问题 | 说明 |
|------|------|
| Python 2 遗留 | 部分代码仍带有 `__future__`、旧式字符串格式化等痕迹 |
| 混合框架 | 同时使用 Tornado 和 Calibre 内部 API，调试困难 |
| 配置硬编码 | `settings.py` 中大量默认值，如豆瓣 API Key 默认写死 |
| 代码量巨大 | 单个 `main.py` 超过 600 行，`models.py` 超过 23000 行 |
| 前端技术栈旧 | 使用 Nuxt/Vue2，不如 Vue3 现代 |
| 依赖重量级 | 必须依赖 Calibre 完整安装，部署体积大 |
| 并发能力有限 | SQLite + Tornado 单进程，难以支撑高并发 |

### 3.3 缺少现代 API 规范

mybook 的 API 响应格式：
- 错误时返回 `{"err": "xxx", "msg": "xxx"}`
- 成功时返回业务对象，无统一包装
- 无 RESTful 路径规范，部分路径依赖动词

### 3.4 配置文件安全隐患

mybook 的 `settings.py` 中：
- 默认豆瓣 API Key 写死在代码中：`douban_apikey: "0df993c66c0c636e29ecbb5344252a4a"`
- `cookie_secret` 默认是 `cookie_secret`
- SMTP 密码默认是 `password`

虽然这些默认值可在运行时覆盖，但容易误用默认配置上线。

---

## 4. QCBookLog 相比 mybook 的优势

| 优势 | 说明 |
|------|------|
| 现代前端技术栈 | Vue 3 + TypeScript + Vite + Pinia，开发体验更好 |
| 更轻量 | 不依赖完整的 Calibre 安装包，可独立运行 |
| 后端结构相对简单 | Express 路由清晰，容易快速开发新功能 |
| 三库设计灵活 | QCBookLog 作为扩展库，避免直接修改 Calibre 结构 |
| 部署现代化 | 已提供 Docker + docker-compose 配置 |
| 自定义字段更自由 | 不依赖 Calibre 自定义列，可在 QC 库中任意扩展 |
| 自定义统计功能丰富 | 阅读热力图、时间线、目标管理等功能较为现代 |

---

## 5. QCBookLog 可以借鉴的具体改进方向

### 5.1 安全认证体系（优先 P0）

**参考 mybook 的 `BaseHandler` 设计**：

```javascript
// server/middlewares/auth.js
function requireAuth(req, res, next) {
  const userId = req.cookies?.user_id || verifyJwt(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: '请先登录' });
  req.userId = userId;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: '请先登录' });
  if (!req.isAdmin) return res.status(403).json({ error: '无权限' });
  next();
}
```

**建议**：
1. 引入 `bcrypt` 或 `argon2` 存储密码
2. 使用 JWT 或 signed cookie 管理登录态
3. 所有路由默认需要登录，公开接口显式放行
4. 敏感操作（删除、配置、导入）需要管理员权限

### 5.2 统一权限模型（优先 P1）

**借鉴 mybook 的 `Reader.permission` 字符权限模型**：

```javascript
// server/utils/permissions.js
const ALL_PERMISSIONS = 'delprsuv'; // delete, edit, login, push, read, save, upload, view

function hasPermission(userPermission, op, defaultValue = true) {
  if (userPermission.includes(op.toLowerCase())) return true;
  if (userPermission.includes(op.toUpperCase())) return false;
  return defaultValue;
}
```

### 5.3 书源插件化（优先 P1）

**参考 mybook 的 `MetaSourcePlugin` 基类**：

```javascript
// server/plugins/book-source/base.js
class BookSourcePlugin {
  get sourceKey() { throw new Error('未实现'); }
  get sourceName() { throw new Error('未实现'); }
  isEnabled() { return true; }
  async search({ isbn, title, author }) { return []; }
  async getByIsbn(isbn) { return null; }
}
```

每个书源一个目录：
```
server/plugins/book-source/
├── tanshu/
├── douban/
└── isbn-work/
```

### 5.4 数据库迁移与 ORM（优先 P2）

**建议方案**：
- 使用 `drizzle-orm`（若要保持 TypeScript 一致性）或 `sequelize`
- 建立 `server/migrations/` 目录，每个版本一个迁移文件
- 将 QC Booklog 所有表用 ORM 模型定义

### 5.5 配置中心（优先 P2）

**参考 mybook 的 loader 模式**：

```javascript
// server/config/loader.js
const defaultConfig = require('./default');
const autoConfig = loadFromDb(); // 从 qc_user_settings 读取
const envConfig = loadFromEnv(); // 从环境变量读取

module.exports = merge(defaultConfig, autoConfig, envConfig);
// 优先级：env > auto > default
```

### 5.6 统一 API 响应格式（优先 P1）

**建议格式**：

```json
{
  "success": true,
  "data": {},
  "message": "",
  "code": ""
}
```

### 5.7 文件上传安全（优先 P2）

**借鉴 mybook 的 `_safe_upload_path`**：

```javascript
function safeUploadPath(baseDir, filename) {
  const base = path.resolve(baseDir);
  const candidate = path.resolve(base, filename);
  if (path.commonPath(base, candidate) !== base) {
    throw new Error('invalid upload path');
  }
  return candidate;
}
```

### 5.8 测试与文档（优先 P3）

- 参考 mybook 的 `tests/` 结构，为 QCBookLog 建立测试目录
- 使用 `vitest` 测试前端，`node:test` 或 `jest` 测试后端
- 补齐 `doc/` 下的 API 文档、部署文档、开发文档

---

## 6. 对比评分表

| 维度 | mybook | QCBookLog | 差距 |
|------|--------|-----------|------|
| 认证授权 | 7/10 | 1/10 | mybook 明显领先 |
| 密码安全 | 3/10 | 2/10 | 两者都弱，需共同改进 |
| 架构分层 | 7/10 | 5/10 | mybook 更清晰 |
| 插件系统 | 8/10 | 3/10 | mybook 有成熟插件基类 |
| 数据库访问 | 7/10 | 5/10 | mybook 有 ORM 和迁移 |
| 配置管理 | 7/10 | 4/10 | mybook 分层明确 |
| 国际化 | 6/10 | 2/10 | mybook 已支持 |
| 测试覆盖 | 5/10 | 1/10 | mybook 有测试 |
| 文档完整度 | 7/10 | 3/10 | mybook 文档更多 |
| 现代前端技术 | 4/10 | 8/10 | QCBookLog 领先 |
| 部署轻量化 | 4/10 | 7/10 | QCBookLog 更轻量 |
| 功能丰富度 | 9/10 | 5/10 | mybook 功能更多 |
| 代码可读性 | 5/10 | 5/10 | 两者都有大文件问题 |

---

## 7. 给 QCBookLog 的分阶段改进建议

### 第一阶段：安全最小集（2 周）

借鉴 mybook 的 `auth` 和 `is_admin` 装饰器思想：

1. 实现 JWT 登录 + 注册
2. 添加 `requireAuth` / `requireAdmin` 中间件
3. 保护所有现有路由
4. 引入 `helmet` + `express-rate-limit`
5. 升级密码哈希为 bcrypt

### 第二阶段：架构规范化（4 周）

1. 统一 API 响应格式
2. 全局异常处理中间件
3. 拆分 `databaseService.js` 和 `calibreService.js`
4. 引入数据库迁移机制
5. 建立配置中心

### 第三阶段：书源插件化（3 周）

1. 抽象 `BookSourcePlugin` 基类
2. 将 tanshu/douban/isbn-work 迁移为插件
3. 配置从数据库读取，每个插件独立配置 key
4. 多源搜索聚合

### 第四阶段：测试与文档（3 周）

1. 建立前后端测试框架
2. 编写核心 API 测试
3. 补充 API 文档、开发文档
4. 引入 `vue-i18n` 国际化基础

---

## 8. 结论

mybook（Talebook）在**安全认证、架构分层、插件化设计、数据库 ORM、配置管理、国际化、测试文档**等方面比 QCBookLog 成熟很多，这些是值得 QCBookLog 重点学习的方向。但 mybook 也存在**密码哈希弱、历史包袱重、技术栈老旧、部署重量大、默认配置不安全**等问题，QCBookLog 不应照搬，而应取其精华。

QCBookLog 的优势在于**现代前端技术栈、轻量部署、灵活的三库扩展架构**。建议：

- **短期（2–4 周）**：补齐安全认证和权限控制，这是与 mybook 差距最大的地方
- **中期（1–2 个月）**：引入插件化书源、统一配置中心、数据库迁移
- **长期（3–6 个月）**：完善测试、文档、国际化，逐步提升项目成熟度

最终目标是让 QCBookLog 既保留现代技术栈和轻量部署的优势，又在安全、架构、可维护性上达到 mybook 的成熟水平。

---

*本报告基于对两个项目源码的实际分析，结合技术评估报告中的问题，提出可落地的对比改进建议。*
