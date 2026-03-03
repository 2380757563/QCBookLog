# QCBookLog 数据库字段分析报告 - 修正版

## 重要发现

经过全面检查，**用户提到的字段并不存在于 qc_bookdata 表中**。

### 用户提到的字段
- `rating`, `series`, `publisher`, `publish_year`, `binding`, `description`, `isbn`, `price`, `author`

### 检查结果

#### 1. qc_bookdata 表实际字段（13个）
```
• book_id              INTEGER         (主键)
• page_count           INTEGER         
• standard_price       REAL            
• purchase_price       REAL            
• purchase_date        TEXT            
• binding1             INTEGER         
• binding2             INTEGER         
• note                 TEXT            
• total_reading_time   INTEGER         
• read_pages           INTEGER         
• reading_count        INTEGER         
• last_read_date       DATE            
• last_read_duration   INTEGER         
```

#### 2. 用户提到的字段实际位置

| 字段名 | 实际位置 | 说明 |
|--------|----------|------|
| `rating` | Calibre `ratings` 表 + `books_ratings_link` 表 | 评分系统 |
| `series` | Calibre `series` 表 + `books_series_link` 表 | 丛书信息 |
| `publisher` | Calibre `publishers` 表 + `books_publishers_link` 表 | 出版社信息 |
| `publish_year` | Calibre `books` 表的 `pubdate` 字段 | 出版日期 |
| `binding` | **不存在** | 装帧方式（qc_bookdata 中有 binding1/binding2） |
| `description` | Calibre `comments` 表 | 书籍描述 |
| `isbn` | Calibre `identifiers` 表 | ISBN 编号 |
| `price` | **不存在** | 价格（qc_bookdata 中有 standard_price/purchase_price） |
| `author` | Calibre `authors` 表 + `books_authors_link` 表 | 作者信息 |

## 结论

### 1. qc_bookdata 表结构合理
- qc_bookdata 表**不包含**用户提到的这些字段
- 这些字段都存在于 Calibre 数据库的相应表中
- qc_bookdata 表专注于存储用户的个性化扩展数据

### 2. 数据架构设计良好
- **Calibre 数据库**: 存储图书的标准元数据（作者、出版社、ISBN、评分等）
- **Talebook 数据库**: 存储用户的个性化数据（价格、页数、阅读统计等）
- 两个数据库通过 `book_id` 关联，形成了清晰的数据分层

### 3. 无需删除任何字段
- qc_bookdata 表中没有用户提到的字段
- 现有的 13 个字段都有明确的用途
- 删除任何现有字段都会影响系统功能

## 数据流向说明

```
Calibre 数据库 (metadata.db)
├── books 表 (基础信息)
├── authors 表 (作者)
├── publishers 表 (出版社)
├── series 表 (丛书)
├── ratings 表 (评分)
├── identifiers 表 (ISBN)
├── comments 表 (描述)
└── 各种关联表

Talebook 数据库 (calibre-webserver.db)
├── items 表 (书籍项目)
├── qc_bookdata 表 (个性化扩展数据)
│   ├── page_count (页数)
│   ├── standard_price (标准价格)
│   ├── purchase_price (购买价格)
│   ├── binding1/binding2 (装帧方式)
│   ├── note (备注)
│   └── 阅读统计字段
├── reading_state 表 (阅读状态)
├── qc_bookmarks 表 (书摘)
└── 其他用户数据表
```

## 建议

### 1. 保持现有结构
- qc_bookdata 表的 13 个字段都是必要的
- 不要删除任何字段

### 2. 理解数据分层
- 基础元数据从 Calibre 数据库获取
- 个性化数据存储在 Talebook 数据库
- 两者通过 `book_id` 关联

### 3. 如果需要添加功能
- 如果确实需要存储用户自定义的作者、出版社等信息
- 建议在 qc_bookdata 表中添加相应字段
- 而不是从现有字段中删除

## 总结

用户提到的字段（rating, series, publisher, publish_year, binding, description, isbn, price, author）**并不存在于 qc_bookdata 表中**。这些字段都存在于 Calibre 数据库的相应表中，用于存储图书的标准元数据。

qc_bookdata 表专注于存储用户的个性化扩展数据，现有结构合理，无需删除任何字段。