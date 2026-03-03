# QCBookLog 数据库架构分离实施指南

## 📋 实施概览

本指南详细说明了如何将 QCBookLog 的自定义数据从 Talebook 数据库中分离，创建独立的 QCBookLog 数据库。

## 🎯 实施目标

1. **低侵入性**: 完全不修改 Calibre/Talebook 原有数据库
2. **高可维护性**: 清晰的表结构和关联关系
3. **强扩展性**: 支持未来功能扩展
4. **数据一致性**: 完善的外键约束和级联删除

## 📊 数据库架构

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Calibre 数据库 (metadata.db)                            │
│  - books, authors, publishers, tags                      │
│  - 基础元数据，不修改                                    │
└─────────────────────────────────────────────────────────┘
                          ↓ book_id (通过映射表)
┌─────────────────────────────────────────────────────────┐
│  Talebook 数据库 (calibre-webserver.db)                   │
│  - items, users, reading_state                           │
│  - Talebook 原有表，不修改                               │
└─────────────────────────────────────────────────────────┘
                          ↓ book_id (通过映射表)
┌─────────────────────────────────────────────────────────┐
│  QCBookLog 独立数据库 (qc_booklog.db)                     │
│  - qc_book_mapping (书籍映射表)                          │
│  - qc_users (用户表)                                    │
│  - qc_groups (分组表)                                   │
│  - qc_tags (标签表)                                     │
│  - qc_bookdata (书籍扩展数据)                           │
│  - qc_bookmarks (书摘表)                                │
│  - qc_bookmark_tags (书摘标签关联表)                    │
│  - qc_book_groups (书籍分组关联表)                      │
│  - qc_book_tags (书籍标签关联表)                        │
│  - qc_reading_records (阅读记录)                        │
│  - qc_daily_reading_stats (每日统计)                    │
│  - qc_reading_goals (阅读目标)                           │
│  - qc_comments (评论表)                                 │
└─────────────────────────────────────────────────────────┘
```

## 📁 已创建的文件

### 1. 数据库设计文档
- **文件**: `docs/QC_BOOKLOG_DATABASE_DESIGN.md`
- **内容**: 完整的数据库表结构设计、字段定义、索引、外键约束等

### 2. 数据库创建脚本
- **文件**: `server/migrations/createQcBooklogDb.js`
- **功能**: 创建 QCBookLog 独立数据库的所有表结构
- **用法**: 
  ```bash
  cd server
  node migrations/createQcBooklogDb.js up   # 创建数据库
  node migrations/createQcBooklogDb.js down # 删除数据库
  ```

### 3. 数据迁移脚本
- **文件**: `server/migrations/migrateToQcBooklog.js`
- **功能**: 将 Talebook 数据库中的 QC 自定义表数据迁移到独立数据库
- **用法**:
  ```bash
  cd server
  node migrations/migrateToQcBooklog.js migrate  # 执行迁移
  node migrations/migrateToQcBooklog.js verify  # 验证迁移
  ```

### 4. 数据库连接管理器更新
- **文件**: `server/services/database/connection-manager.js`
- **更新内容**:
  - 添加 `qcBooklogDb` 数据库连接
  - 添加 `initQcBooklog()` 方法
  - 添加 `getQcBooklogDb()` 方法
  - 添加 `isQcBooklogAvailable()` 方法

### 5. 数据库服务更新
- **文件**: `server/services/databaseService.js`
- **更新内容**:
  - 添加 QCBookLog 数据库路径配置
  - 添加 `initQcBooklogDatabase()` 方法
  - 添加 `isQcBooklogAvailable()` 方法

## 🚀 实施步骤

### 步骤 1: 备份现有数据

```bash
# 备份 Talebook 数据库
cp data/talebook/calibre-webserver.db data/talebook/calibre-webserver.db.backup

# 备份 Calibre 数据库
cp data/calibre/metadata.db data/calibre/metadata.db.backup
```

### 步骤 2: 创建 QCBookLog 独立数据库

```bash
cd server
node migrations/createQcBooklogDb.js up
```

**预期输出**:
```
🔄 开始创建 QCBookLog 独立数据库...
📝 创建书籍映射表 (qc_book_mapping)...
  ✅ qc_book_mapping 表创建成功
📝 创建用户表 (qc_users)...
  ✅ qc_users 表创建成功
...
🎉 QCBookLog 独立数据库创建完成!
📁 数据库路径: D:\下载\docs-xmnote-master\QC-booklog\data\qc_booklog.db
```

### 步骤 3: 迁移数据

```bash
cd server
node migrations/migrateToQcBooklog.js migrate
```

**预期输出**:
```
🔄 开始数据迁移...

📝 步骤 1: 迁移书籍映射关系...
  ✅ 迁移书籍映射: X 条

📝 步骤 2: 迁移用户数据...
  ✅ 迁移用户: X 条

...

🎉 数据迁移完成!
📊 迁移统计:
   总计: X 条记录

📋 详细统计:
   qc_book_mapping: X 条
   qc_users: X 条
   ...

🔍 开始验证...
📊 数据对比:
  ✅ qc_book_mapping: Talebook=X, QCBooklog=X
  ...
✅ 验证通过: 所有数据迁移正确!
```

### 步骤 4: 验证迁移结果

```bash
cd server
node migrations/migrateToQcBooklog.js verify
```

### 步骤 5: 更新应用配置

如果需要自定义 QCBookLog 数据库路径，可以在配置文件中添加：

```json
{
  "qcBooklogPath": "path/to/qc_booklog.db"
}
```

或设置环境变量：

```bash
export QC_BOOKLOG_DB_PATH="path/to/qc_booklog.db"
```

## 🔍 级联删除机制

### 删除 Calibre 书籍时的级联删除流程

当删除 Calibre `books` 表中的书籍时，会触发以下级联删除：

1. **删除书籍映射** (qc_book_mapping)
   - 通过 `calibre_book_id` 删除对应的映射记录

2. **删除书籍扩展数据** (qc_bookdata)
   - 通过 `book_id` 删除对应的书籍数据
   - 触发以下级联删除：
     - qc_book_groups (书籍分组关联)
     - qc_book_tags (书籍标签关联)
     - qc_bookmarks (书摘)
     - qc_reading_records (阅读记录)
     - qc_comments (评论)

3. **删除书摘标签关联** (qc_bookmark_tags)
   - 通过 `bookmark_id` 删除关联记录
   - 不删除 qc_tags 表中的标签（标签可能被其他书摘使用）

### 不级联删除的数据

以下数据不会被级联删除，以保留历史记录：

- **qc_daily_reading_stats**: 每日阅读统计数据
- **qc_reading_goals**: 阅读目标设置
- **qc_tags**: 标签数据（除非没有书摘使用）

## 📝 表间关联关系

### 核心关联关系

```
qc_book_mapping (书籍映射)
    ├── calibre_book_id -> Calibre.books.id
    └── talebook_book_id -> Talebook.items.book_id

qc_bookdata (书籍扩展数据)
    ├── book_id -> qc_book_mapping.calibre_book_id
    ├── qc_book_groups (书籍分组)
    │   └── group_id -> qc_groups.id
    ├── qc_book_tags (书籍标签)
    ├── qc_bookmarks (书摘)
    │   └── qc_bookmark_tags (书摘标签)
    │       └── tag_id -> qc_tags.id
    ├── qc_reading_records (阅读记录)
    │   └── reader_id -> qc_users.id
    ├── qc_daily_reading_stats (每日统计)
    │   └── reader_id -> qc_users.id
    ├── qc_reading_goals (阅读目标)
    │   └── reader_id -> qc_users.id
    └── qc_comments (评论)
        └── user_id -> qc_users.id
```

## ⚙️ 数据库配置

### 数据库路径配置

优先级：1. 配置文件 2. 环境变量 3. 默认路径

**默认路径**:
- Calibre: `data/calibre/metadata.db`
- Talebook: `data/talebook/calibre-webserver.db`
- QCBookLog: `data/qc_booklog.db`

**配置文件** (`data/config.json`):
```json
{
  "calibrePath": "path/to/metadata.db",
  "talebookPath": "path/to/calibre-webserver.db",
  "qcBooklogPath": "path/to/qc_booklog.db"
}
```

**环境变量**:
```bash
export CALIBRE_DB_PATH="path/to/metadata.db"
export TALEBOOK_DB_PATH="path/to/calibre-webserver.db"
export QC_BOOKLOG_DB_PATH="path/to/qc_booklog.db"
```

## 🔧 故障排除

### 问题 1: 数据库连接失败

**错误信息**:
```
❌ QCBookLog 数据库连接失败: SQLITE_CANTOPEN: unable to open database file
```

**解决方案**:
1. 检查数据库文件是否存在
2. 检查文件路径是否正确
3. 检查文件权限
4. 确保数据库目录存在

### 问题 2: 迁移失败

**错误信息**:
```
❌ 数据迁移失败: SQLITE_CONSTRAINT: FOREIGN KEY constraint failed
```

**解决方案**:
1. 检查外键约束是否正确
2. 确保关联数据存在
3. 检查数据完整性

### 问题 3: 验证失败

**错误信息**:
```
❌ 验证失败: 发现数据不一致!
```

**解决方案**:
1. 检查迁移日志
2. 重新执行迁移
3. 检查原始数据完整性

## 📊 性能优化

### 数据库配置

```sql
PRAGMA journal_mode = WAL;      -- WAL 模式
PRAGMA foreign_keys = ON;       -- 启用外键
PRAGMA synchronous = NORMAL;     -- 同步模式
PRAGMA cache_size = -64000;     -- 64MB 缓存
```

### 索引优化

已为常用查询字段创建索引：
- qc_book_mapping: calibre_book_id, talebook_book_id
- qc_bookdata: book_id
- qc_bookmarks: book_id, created_at
- qc_reading_records: (book_id, reader_id), start_time, (reader_id, start_time)
- qc_daily_reading_stats: (reader_id, date)
- qc_reading_goals: (reader_id, year)

## 🔒 数据安全

### 备份策略

1. **定期全量备份**:
   ```bash
   # 备份所有数据库
   cp data/qc_booklog.db data/qc_booklog.db.backup.$(date +%Y%m%d)
   ```

2. **增量备份**:
   - 使用 WAL 模式的增量备份功能
   - 定期备份 WAL 文件

3. **备份验证**:
   ```bash
   # 验证备份文件
   sqlite3 data/qc_booklog.db.backup "PRAGMA integrity_check;"
   ```

### 恢复策略

1. **从备份恢复**:
   ```bash
   cp data/qc_booklog.db.backup data/qc_booklog.db
   ```

2. **数据一致性检查**:
   ```bash
   sqlite3 data/qc_booklog.db "PRAGMA foreign_key_check;"
   ```

## 📚 相关文档

- [数据库设计文档](./QC_BOOKLOG_DATABASE_DESIGN.md)
- [数据库结构分析](./DATABASE_STRUCTURE_ANALYSIS.md)
- [数据库最终报告](./DATABASE_FINAL_REPORT.md)

## ✅ 实施检查清单

- [ ] 备份现有数据库
- [ ] 创建 QCBookLog 独立数据库
- [ ] 执行数据迁移
- [ ] 验证迁移结果
- [ ] 测试应用功能
- [ ] 更新配置文件（如需要）
- [ ] 设置定期备份
- [ ] 监控数据库性能

## 🎉 完成后

实施完成后，你的系统将具备：

1. ✅ **低侵入性**: 完全不修改 Calibre/Talebook 原有数据库
2. ✅ **高可维护性**: 清晰的表结构和关联关系
3. ✅ **强扩展性**: 支持未来功能扩展
4. ✅ **数据一致性**: 完善的外键约束和级联删除
5. ✅ **高性能**: 合理的索引设计
6. ✅ **易迁移**: 完整的迁移脚本和验证机制

## 📞 技术支持

如遇到问题，请检查：
1. 数据库设计文档
2. 迁移日志
3. 数据库完整性检查结果

---

**实施日期**: 2026-02-08
**版本**: 1.0.0
**作者**: QCBookLog Team