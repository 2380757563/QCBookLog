# QCBookLog 独立数据库设计文档

## 1. 数据库架构概览

### 1.1 三层架构

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

## 2. 表结构设计

### 2.1 书籍映射表 (qc_book_mapping)

**用途**: 维护 Calibre book_id 与 Talebook book_id 的映射关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| calibre_book_id | INTEGER | NOT NULL, UNIQUE | Calibre books.id |
| talebook_book_id | INTEGER | NOT NULL, UNIQUE | Talebook items.book_id |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_mapping_calibre: calibre_book_id
- idx_mapping_talebook: talebook_book_id

**约束**:
- UNIQUE(calibre_book_id, talebook_book_id)

---

### 2.2 用户表 (qc_users)

**用途**: 存储用户信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| username | TEXT | NOT NULL, UNIQUE | 用户名 |
| name | TEXT | | 显示名称 |
| email | TEXT | | 邮箱 |
| avatar | TEXT | | 头像URL |
| admin | INTEGER | DEFAULT 0 | 是否管理员 (0/1) |
| active | INTEGER | DEFAULT 1 | 是否激活 (0/1) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_users_username: username
- idx_users_email: email

---

### 2.3 分组表 (qc_groups)

**用途**: 存储书籍分组信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 分组名称 |
| description | TEXT | | 分组描述 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_groups_name: name

---

### 2.4 标签表 (qc_tags)

**用途**: 存储标签信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL, UNIQUE | 标签名称 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_tags_name: name

---

### 2.5 书籍扩展数据表 (qc_bookdata)

**用途**: 存储书籍的扩展信息和阅读统计

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL, UNIQUE | 书籍ID (映射到Calibre/Talebook) |
| page_count | INTEGER | DEFAULT 0 | 页数 |
| standard_price | REAL | DEFAULT 0 | 标准价格 |
| purchase_price | REAL | DEFAULT 0 | 购买价格 |
| purchase_date | DATE | | 购买日期 |
| binding1 | INTEGER | DEFAULT 0 | 装帧方式1 |
| binding2 | INTEGER | DEFAULT 0 | 装帧方式2 |
| paper1 | INTEGER | DEFAULT 0 | 纸张类型1 |
| edge1 | INTEGER | DEFAULT 0 | 切边方式1 |
| edge2 | INTEGER | DEFAULT 0 | 切边方式2 |
| note | TEXT | | 备注 |
| total_reading_time | INTEGER | DEFAULT 0 | 总阅读时间(秒) |
| read_pages | INTEGER | DEFAULT 0 | 已读页数 |
| reading_count | INTEGER | DEFAULT 0 | 阅读次数 |
| last_read_date | DATE | | 最后阅读日期 |
| last_read_duration | INTEGER | DEFAULT 0 | 最后阅读时长(秒) |
| book_type | INTEGER | DEFAULT 1 | 书籍类型 (1=实体书, 2=电子书) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_bookdata_book_id: book_id

**说明**:
- `book_type` 字段用于区分书籍载体类型，默认值为 1（实体书）

---

### 2.6 书摘表 (qc_bookmarks)

**用途**: 存储书摘内容

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL | 书籍ID |
| book_title | TEXT | | 书名(冗余字段) |
| book_author | TEXT | | 作者(冗余字段) |
| content | TEXT | NOT NULL | 书摘内容 |
| note | TEXT | | 备注 |
| page | INTEGER | | 页码 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_bookmarks_book_id: book_id
- idx_bookmarks_created_at: created_at

---

### 2.7 书摘标签关联表 (qc_bookmark_tags)

**用途**: 书摘与标签的多对多关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| bookmark_id | INTEGER | NOT NULL | 书摘ID |
| tag_id | INTEGER | NOT NULL | 标签ID |
| tag_name | TEXT | | 标签名称(冗余字段) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- idx_bookmark_tags_bookmark_id: bookmark_id
- idx_bookmark_tags_tag_id: tag_id

**外键**:
- bookmark_id -> qc_bookmarks(id) ON DELETE CASCADE
- tag_id -> qc_tags(id) ON DELETE CASCADE

---

### 2.8 书籍分组关联表 (qc_book_groups)

**用途**: 书籍与分组的多对多关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL | 书籍ID |
| group_id | INTEGER | NOT NULL | 分组ID |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- idx_book_groups_book_id: book_id
- idx_book_groups_group_id: group_id

**外键**:
- book_id -> qc_bookdata(book_id) ON DELETE CASCADE
- group_id -> qc_groups(id) ON DELETE CASCADE

---

### 2.9 书籍标签关联表 (qc_book_tags)

**用途**: 书籍与标签的多对多关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL | 书籍ID |
| tag_name | TEXT | NOT NULL | 标签名称 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- idx_book_tags_book_id: book_id
- idx_book_tags_tag_name: tag_name

**外键**:
- book_id -> qc_bookdata(book_id) ON DELETE CASCADE

---

### 2.10 阅读记录表 (qc_reading_records)

**用途**: 存储详细的阅读记录

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL | 书籍ID |
| reader_id | INTEGER | NOT NULL DEFAULT 0 | 读者ID |
| start_time | DATETIME | NOT NULL | 开始时间 |
| end_time | DATETIME | NOT NULL | 结束时间 |
| duration | INTEGER | NOT NULL | 阅读时长(秒) |
| start_page | INTEGER | NOT NULL DEFAULT 0 | 起始页 |
| end_page | INTEGER | NOT NULL DEFAULT 0 | 结束页 |
| pages_read | INTEGER | NOT NULL DEFAULT 0 | 阅读页数 |
| notes | TEXT | | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- idx_reading_book_reader: book_id, reader_id
- idx_reading_date: start_time
- idx_reading_reader_date: reader_id, start_time

**外键**:
- book_id -> qc_bookdata(book_id) ON DELETE CASCADE
- reader_id -> qc_users(id) ON DELETE CASCADE

---

### 2.11 每日阅读统计表 (qc_daily_reading_stats)

**用途**: 每日阅读统计汇总

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| reader_id | INTEGER | NOT NULL DEFAULT 0 | 读者ID |
| date | DATE | NOT NULL | 日期 |
| total_books | INTEGER | DEFAULT 0 | 阅读书籍数 |
| total_pages | INTEGER | DEFAULT 0 | 阅读页数 |
| total_time | INTEGER | DEFAULT 0 | 阅读时长(秒) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_daily_stats_reader_date: reader_id, date

**约束**:
- UNIQUE(reader_id, date)

**外键**:
- reader_id -> qc_users(id) ON DELETE CASCADE

---

### 2.12 阅读目标表 (qc_reading_goals)

**用途**: 年度阅读目标

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| reader_id | INTEGER | NOT NULL DEFAULT 0 | 读者ID |
| year | INTEGER | NOT NULL | 年份 |
| target | INTEGER | NOT NULL | 目标书籍数 |
| completed | INTEGER | DEFAULT 0 | 已完成数 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- idx_reading_goals_reader_year: reader_id, year

**约束**:
- UNIQUE(reader_id, year)

**外键**:
- reader_id -> qc_users(id) ON DELETE CASCADE

---

### 2.13 评论表 (qc_comments)

**用途**: 书籍评论

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| book_id | INTEGER | NOT NULL | 书籍ID |
| user_id | INTEGER | NOT NULL | 用户ID |
| content | TEXT | NOT NULL | 评论内容 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**:
- idx_comments_book_id: book_id
- idx_comments_user_id: user_id

**外键**:
- book_id -> qc_bookdata(book_id) ON DELETE CASCADE
- user_id -> qc_users(id) ON DELETE CASCADE

---

## 3. 表间关联关系

### 3.1 核心关联关系

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

### 3.2 级联删除规则

当删除 Calibre books 表中的书籍时，级联删除 QCBookLog 数据库中的相关数据：

1. **删除书籍映射** (qc_book_mapping)
   - 通过 calibre_book_id 删除对应的映射记录

2. **删除书籍扩展数据** (qc_bookdata)
   - 通过 book_id 删除对应的书籍数据
   - 触发以下级联删除：
     - qc_book_groups (书籍分组关联)
     - qc_book_tags (书籍标签关联)
     - qc_bookmarks (书摘)
     - qc_reading_records (阅读记录)
     - qc_comments (评论)

3. **删除书摘标签关联** (qc_bookmark_tags)
   - 通过 bookmark_id 删除关联记录
   - 不删除 qc_tags 表中的标签（标签可能被其他书摘使用）

4. **删除阅读记录** (qc_reading_records)
   - 删除对应的阅读记录
   - 不删除 qc_daily_reading_stats（统计数据需要保留）
   - 不删除 qc_reading_goals（目标是年度设置，不应删除）

### 3.3 数据同步机制

#### 书籍删除同步流程

```javascript
// 1. 监听 Calibre books 表的删除事件
// 2. 获取被删除书籍的 calibre_book_id
// 3. 在 qc_book_mapping 表中查找对应的 talebook_book_id
// 4. 删除 qc_bookdata 表中的记录（触发级联删除）
// 5. 删除 qc_book_mapping 表中的映射记录
```

#### 书籍添加同步流程

```javascript
// 1. 监听 Calibre books 表的添加事件
// 2. 获取新书籍的 calibre_book_id
// 3. 在 Talebook items 表中查找对应的 talebook_book_id
// 4. 在 qc_book_mapping 表中插入映射关系
// 5. 在 qc_bookdata 表中插入默认记录（可选）
```

---

## 4. 数据完整性保障

### 4.1 外键约束

所有外键关系都定义了 ON DELETE CASCADE，确保数据一致性：

- qc_book_groups.book_id -> qc_bookdata.book_id (CASCADE)
- qc_book_tags.book_id -> qc_bookdata.book_id (CASCADE)
- qc_bookmarks.book_id -> qc_bookdata.book_id (CASCADE)
- qc_bookmark_tags.bookmark_id -> qc_bookmarks.id (CASCADE)
- qc_bookmark_tags.tag_id -> qc_tags.id (CASCADE)
- qc_reading_records.book_id -> qc_bookdata.book_id (CASCADE)
- qc_reading_records.reader_id -> qc_users.id (CASCADE)
- qc_daily_reading_stats.reader_id -> qc_users.id (CASCADE)
- qc_reading_goals.reader_id -> qc_users.id (CASCADE)
- qc_comments.book_id -> qc_bookdata.book_id (CASCADE)
- qc_comments.user_id -> qc_users.id (CASCADE)

### 4.2 唯一性约束

- qc_book_mapping: UNIQUE(calibre_book_id, talebook_book_id)
- qc_book_mapping: UNIQUE(calibre_book_id)
- qc_book_mapping: UNIQUE(talebook_book_id)
- qc_users: UNIQUE(username)
- qc_tags: UNIQUE(name)
- qc_bookdata: UNIQUE(book_id)
- qc_daily_reading_stats: UNIQUE(reader_id, date)
- qc_reading_goals: UNIQUE(reader_id, year)

### 4.3 非空约束

关键字段都设置了 NOT NULL 约束，确保数据完整性。

---

## 5. 索引优化

### 5.1 查询优化索引

- qc_book_mapping: calibre_book_id, talebook_book_id
- qc_bookdata: book_id
- qc_bookmarks: book_id, created_at
- qc_reading_records: (book_id, reader_id), start_time, (reader_id, start_time)
- qc_daily_reading_stats: (reader_id, date)
- qc_reading_goals: (reader_id, year)

### 5.2 查询场景优化

1. **按书籍查询所有相关数据**
   - 使用 book_id 作为主键，快速定位

2. **按用户查询阅读记录**
   - 使用 reader_id 和 start_time 复合索引

3. **按日期查询统计**
   - 使用 reader_id 和 date 复合索引

4. **标签查询**
   - 使用 tag_name 索引

---

## 6. 数据迁移策略

### 6.1 迁移步骤

1. **创建 qc_booklog 数据库**
2. **创建所有表结构**
3. **迁移书籍映射关系**
4. **迁移用户数据**
5. **迁移分组数据**
6. **迁移标签数据**
7. **迁移书籍扩展数据**
8. **迁移书摘数据**
9. **迁移阅读记录**
10. **迁移统计数据**
11. **迁移阅读目标**
12. **迁移评论数据**

### 6.2 数据验证

迁移完成后，验证以下内容：

1. 记录数量一致性
2. 外键关系完整性
3. 索引正确性
4. 约束正确性

---

## 7. 性能考虑

### 7.1 数据库配置

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
```

### 7.2 批量操作优化

- 使用事务处理批量插入
- 使用预处理语句
- 合理设置批量大小

### 7.3 查询优化

- 避免全表扫描
- 使用索引覆盖查询
- 合理使用 JOIN

---

## 8. 备份与恢复

### 8.1 备份策略

1. 定期全量备份
2. 增量备份
3. 备份验证

### 8.2 恢复策略

1. 从备份恢复
2. 数据一致性检查
3. 索引重建

---

## 9. 版本控制

### 9.1 数据库版本管理

使用迁移脚本管理数据库版本：

- migrations/001_create_qc_booklog_db.js
- migrations/002_add_book_mapping.js
- migrations/003_add_users.js
- ...

### 9.2 回滚策略

每个迁移脚本都包含 up() 和 down() 方法，支持回滚。

---

## 10. 总结

本设计方案实现了：

1. **低侵入性**: 完全不修改 Calibre/Talebook 原有数据库
2. **高可维护性**: 清晰的表结构和关联关系
3. **强扩展性**: 支持未来功能扩展
4. **数据一致性**: 完善的外键约束和级联删除
5. **高性能**: 合理的索引设计
6. **易迁移**: 完整的迁移脚本和验证机制