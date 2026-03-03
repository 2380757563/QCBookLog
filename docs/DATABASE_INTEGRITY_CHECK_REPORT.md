# 数据库完整性检测报告

检测时间: 2026/2/8 21:10:46

## 表完整性检测

### 表对比

| 状态 | 表名 |
|------|------|
| ❌ 缺失 | _items_old_20260203 |
| ❌ 缺失 | comments |
| ❌ 缺失 | qc_book_groups |
| ❌ 缺失 | qc_book_tags |
| ❌ 缺失 | qc_bookdata |
| ❌ 缺失 | qc_bookmark_tags |
| ❌ 缺失 | qc_bookmarks |
| ❌ 缺失 | qc_daily_reading_stats |
| ❌ 缺失 | qc_groups |
| ❌ 缺失 | qc_reading_records |
| ❌ 缺失 | qc_tags |
| ❌ 缺失 | reading_goals |
| ❌ 缺失 | users |

## 字段完整性检测

✅ 所有表字段完整，无缺失或多余字段

## 约束条件检测

### 表: biz_key

**多余外键约束 (1个):**
- reader_id->readers.id

### 表: items

**多余外键约束 (1个):**
- collector_id->readers.id

### 表: messages

**多余外键约束 (1个):**
- reader_id->readers.id

### 表: reader_paid_books

**多余外键约束 (1个):**
- reader_id->readers.id

### 表: readerlogs

**多余外键约束 (2个):**
- operator_id->readers.id
- reader_id->readers.id

### 表: reading_state

**多余外键约束 (1个):**
- reader_id->readers.id

### 表: social_auth_usersocialauth

**多余外键约束 (1个):**
- user_id->readers.id

✅ 所有约束条件完整，无缺失

## 数据库修补方案

### 1. 创建缺失的表

**表名:** _items_old_20260203

**SQL:**
```sql
CREATE TABLE "_items_old_20260203" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_type INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            cover TEXT,
            description TEXT,
            pubdate TEXT,
            publisher TEXT,
            isbn TEXT,
            language TEXT,
            series TEXT,
            series_index REAL,
            path TEXT NOT NULL,
            uuid TEXT NOT NULL,
            added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
```

**表名:** comments

**SQL:**
```sql
CREATE TABLE comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER,
          content TEXT,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
```

**表名:** qc_book_groups

**SQL:**
```sql
CREATE TABLE qc_book_groups (
      id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE ON UPDATE NO ACTION
    )
```

**表名:** qc_book_tags

**SQL:**
```sql
CREATE TABLE qc_book_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      tag_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE,
      UNIQUE(book_id, tag_name)
    )
```

**表名:** qc_bookdata

**SQL:**
```sql
CREATE TABLE "qc_bookdata" (
      "book_id" INTEGER,
      "page_count" INTEGER DEFAULT 0,
      "standard_price" REAL DEFAULT 0,
      "purchase_price" REAL DEFAULT 0,
      "purchase_date" TEXT,
      "binding1" INTEGER DEFAULT 0,
      "binding2" INTEGER DEFAULT 0,
      "note" TEXT,
      "total_reading_time" INTEGER DEFAULT 0,
      "read_pages" INTEGER DEFAULT 0,
      "reading_count" INTEGER DEFAULT 0,
      "last_read_date" DATE DEFAULT NULL,
      "last_read_duration" INTEGER DEFAULT 0, paper1 INTEGER DEFAULT 0, edge1 INTEGER DEFAULT 0, edge2 INTEGER DEFAULT 0,
      PRIMARY KEY ("book_id"),
      FOREIGN KEY ("book_id") REFERENCES "items" ("book_id") ON DELETE CASCADE ON UPDATE CASCADE
    )
```

**表名:** qc_bookmark_tags

**SQL:**
```sql
CREATE TABLE qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER,
          tag_id INTEGER,
          tag_name TEXT
        )
```

**表名:** qc_bookmarks

**SQL:**
```sql
CREATE TABLE qc_bookmarks (
      id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL,
        book_title TEXT,
        book_author TEXT,
        content TEXT NOT NULL,
        note TEXT,
        page INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE ON UPDATE NO ACTION
    )
```

**表名:** qc_daily_reading_stats

**SQL:**
```sql
CREATE TABLE qc_daily_reading_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL,
          date DATE NOT NULL,
          total_books INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, date)
        )
```

**表名:** qc_groups

**SQL:**
```sql
CREATE TABLE qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
```

**表名:** qc_reading_records

**SQL:**
```sql
CREATE TABLE qc_reading_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          duration INTEGER NOT NULL,
          start_page INTEGER NOT NULL DEFAULT 0,
          end_page INTEGER NOT NULL DEFAULT 0,
          pages_read INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

**表名:** qc_tags

**SQL:**
```sql
CREATE TABLE qc_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
```

**表名:** reading_goals

**SQL:**
```sql
CREATE TABLE reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          target INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, year)
        )
```

**表名:** users

**SQL:**
```sql
CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT UNIQUE,
          avatar TEXT,
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

