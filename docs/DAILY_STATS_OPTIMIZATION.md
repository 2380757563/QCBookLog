# qc_daily_reading_stats 表优化总结

## 问题背景

原有的 `qc_daily_reading_stats` 表存在以下问题：

1. **时间精度不足**：只存储到日期级别（DATE），无法精确记录每次阅读的开始和结束时间
2. **数据聚合方式不当**：使用 `ON CONFLICT` 更新汇总数据，导致无法区分不同阅读会话
3. **统计准确性低**：无法准确统计每次独立阅读行为的时长和页数

## 优化方案

### 1. 重新设计表结构

将 `qc_daily_reading_stats` 表从"每日汇总表"重构为"阅读会话表"：

**旧表结构**：
```sql
CREATE TABLE qc_daily_reading_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id INTEGER NOT NULL,
  date DATE NOT NULL,                    -- 仅日期精度
  total_books INTEGER DEFAULT 0,           -- 汇总数据
  total_pages INTEGER DEFAULT 0,           -- 汇总数据
  total_time INTEGER DEFAULT 0,             -- 汇总数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reader_id, date)                 -- 每天只有一条记录
)
```

**新表结构**：
```sql
CREATE TABLE qc_daily_reading_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,               -- 新增：关联书籍
  session_start DATETIME NOT NULL,          -- 改进：会话开始时间（秒级精度）
  session_end DATETIME NOT NULL,            -- 改进：会话结束时间（秒级精度）
  duration_seconds INTEGER NOT NULL,          -- 改进：阅读时长（秒）
  start_page INTEGER DEFAULT 0,             -- 新增：开始页码
  end_page INTEGER DEFAULT 0,               -- 新增：结束页码
  pages_read INTEGER DEFAULT 0,              -- 改进：本次阅读页数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
)
```

### 2. 新增索引

```sql
CREATE INDEX idx_reader_date ON qc_daily_reading_stats(reader_id, DATE(session_start));
CREATE INDEX idx_book_reader ON qc_daily_reading_stats(book_id, reader_id);
CREATE INDEX idx_session_time ON qc_daily_reading_stats(session_start, session_end);
```

### 3. 汇总查询优化

使用 SQL 聚合查询动态生成每日汇总数据：

```sql
SELECT
  DATE(session_start) as date,
  COUNT(DISTINCT book_id) as total_books,
  SUM(pages_read) as total_pages,
  SUM(duration_seconds) / 60 as total_time,
  COUNT(*) as session_count
FROM qc_daily_reading_stats
WHERE reader_id = ? AND DATE(session_start) = ?
GROUP BY DATE(session_start)
ORDER BY date DESC
```

## 优化效果

### 1. 时间精度提升

- **旧方案**：仅日期级别（YYYY-MM-DD）
- **新方案**：秒级精度（YYYY-MM-DD HH:MM:SS.SSS）

### 2. 数据独立性

- **旧方案**：每天只有一条汇总记录，无法区分不同阅读会话
- **新方案**：每次阅读行为作为独立记录存储，支持详细查询

### 3. 统计准确性

- **旧方案**：使用 `ON CONFLICT` 更新汇总，可能丢失数据
- **新方案**：通过 SQL 聚合查询动态计算，数据准确可靠

### 4. 功能增强

新增字段：
- `book_id`：关联书籍，支持按书籍统计
- `session_start` / `session_end`：精确记录每次阅读的时间范围
- `duration_seconds`：精确到秒的阅读时长
- `start_page` / `end_page`：记录阅读的页码范围
- `session_count`：汇总查询中新增的会话计数

## 迁移过程

### 1. 数据备份

备份了原有的 4 条每日汇总记录。

### 2. 表结构重建

删除旧表，创建新表结构。

### 3. 数据迁移

从 `qc_reading_records` 表迁移了 26 条阅读记录到新表。

### 4. 代码更新

更新了以下文件：
- `server/services/readingTrackingService.js`：
  - 新增 `insertReadingSession` 方法
  - 修改 `getDailyReadingStats` 方法使用汇总查询
  - 修改 `getDailyReadingDetails` 方法从新表获取数据
- `server/services/databaseService.js`：
  - 更新表创建逻辑

### 5. 验证测试

- ✅ 表结构正确
- ✅ 外键约束正常
- ✅ 索引创建成功
- ✅ 数据一致性验证通过（26 条记录）
- ✅ 时间精度提升到秒级
- ✅ 汇总查询正常工作
- ✅ 完整流程测试通过

## 使用示例

### 插入阅读会话

```javascript
await readingTrackingService.insertReadingSession(
  readerId,           // 读者ID
  bookId,             // 书籍ID
  startTime,           // 开始时间（ISO 8601 格式）
  endTime,             // 结束时间（ISO 8601 格式）
  durationSeconds,      // 阅读时长（秒）
  startPage,           // 开始页码
  endPage,             // 结束页码
  pagesRead            // 本次阅读页数
);
```

### 获取每日汇总统计

```javascript
const stats = await readingTrackingService.getDailyReadingStats(
  readerId,    // 读者ID
  startDate,    // 开始日期（可选）
  endDate       // 结束日期（可选）
);

// 返回数据格式：
// {
//   date: '2026-01-22',
//   total_books: 1,
//   total_pages: 40,
//   total_time: 94,
//   session_count: 11
// }
```

### 获取详细阅读会话

```javascript
const sessions = await readingTrackingService.getDailyReadingDetails(
  readerId,    // 读者ID
  date          // 日期（YYYY-MM-DD）
);

// 返回数据格式：
// [{
//   id: 1,
//   reader_id: 0,
//   book_id: 126,
//   book_title: '书名',
//   book_author: '作者',
//   session_start: '2026-01-22T14:00:00.000Z',
//   session_end: '2026-01-22T14:30:00.000Z',
//   duration_minutes: 30,
//   start_page: 0,
//   end_page: 10,
//   pages_read: 10
// }]
```

## 总结

通过重新设计 `qc_daily_reading_stats` 表结构，实现了以下目标：

1. ✅ **独立阅读会话记录**：每次阅读行为作为独立记录存储
2. ✅ **时间精度提升至秒级**：使用 DATETIME 类型存储精确时间
3. ✅ **准确统计阅读时长**：通过 SQL 聚合查询动态计算
4. ✅ **增强数据可用性**：支持详细的阅读会话查询和统计

优化后的表结构能够准确读取和统计每次阅读的时长，为阅读追踪功能提供了更可靠的数据基础。
