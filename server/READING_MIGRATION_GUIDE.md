# 阅读追踪功能数据库迁移指南

## 📋 已完成的工作

### ✅ 后端文件已创建

1. **数据库迁移脚本**
   - `server/migrations/addReadingTracking.js`
   - 包含up()和down()函数用于迁移和回滚

2. **后端服务**
   - `server/services/readingTrackingService.js`
   - 提供完整的阅读追踪业务逻辑

3. **后端路由**
   - `server/routes/readingTracking.js`
   - 提供RESTful API接口

4. **独立迁移脚本**
   - `server/runReadingMigration.js`
   - 可直接执行的独立迁移脚本

5. **路由注册**
   - 已在 `server/app.js` 中注册新路由 `/api/reading`

## 🚀 执行迁移的几种方式

### 方式1: 通过独立迁移脚本执行（推荐）

```bash
# 进入server目录
cd server

# 执行迁移
node runReadingMigration.js
```

### 方式2: 通过迁移模块执行

```bash
# 进入server目录
cd server

# 执行迁移
node migrations/addReadingTracking.js up

# 如果需要回滚
node migrations/addReadingTracking.js down
```

### 方式3: 在服务器启动时自动执行（已集成）

服务器启动时会自动检查并执行迁移，无需手动操作。

## 🗄️ 迁移内容

### 1. qc_bookdata 表新增字段

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| total_reading_time | INTEGER | 0 | 总阅读时长(分钟) |
| read_pages | INTEGER | 0 | 已读页数 |
| reading_count | INTEGER | 0 | 阅读次数 |
| last_read_date | DATE | NULL | 最近阅读日期 |
| last_read_duration | INTEGER | 0 | 最近一次阅读时长(分钟) |

### 2. 新建表：qc_reading_records (阅读记录表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER PRIMARY KEY | 记录ID |
| book_id | INTEGER | 书籍ID (外键) |
| reader_id | INTEGER | 读者ID (外键) |
| start_time | DATETIME | 开始阅读时间 |
| end_time | DATETIME | 结束阅读时间 |
| duration | INTEGER | 阅读时长(分钟) |
| start_page | INTEGER | 开始页码 |
| end_page | INTEGER | 结束页码 |
| pages_read | INTEGER | 本次阅读页数 |
| created_at | DATETIME | 创建时间 |

**索引**:
- idx_reading_book_reader (book_id, reader_id)
- idx_reading_date (start_time)
- idx_reading_reader_date (reader_id, start_time)

### 3. 新建表：qc_daily_reading_stats (每日统计表)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER PRIMARY KEY | 记录ID |
| reader_id | INTEGER | 读者ID (外键) |
| date | DATE | 统计日期 (唯一约束) |
| total_books | INTEGER | 当天阅读书籍数 |
| total_pages | INTEGER | 当天阅读总页数 |
| total_time | INTEGER | 当天阅读总时长(分钟) |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**索引**:
- idx_daily_stats_reader_date (reader_id, date)

## 🔌 API 接口

### 阅读记录管理

#### 创建阅读记录
```
POST /api/reading/record
Body: {
  bookId: number,
  readerId: number,
  startTime: string,
  endTime: string,
  duration: number,
  startPage?: number,
  endPage?: number,
  pagesRead?: number
}
```

#### 获取书籍的阅读记录
```
GET /api/reading/records/book/:bookId?readerId=1&limit=10
```

#### 获取读者的所有阅读记录
```
GET /api/reading/records?readerId=1&startDate=2025-01-01&endDate=2025-01-31
```

### 阅读统计

#### 获取书籍的阅读统计
```
GET /api/reading/stats/book/:bookId?readerId=1
返回: {
  totalReadingTime: number,
  readPages: number,
  readingCount: number,
  lastReadDate: string,
  lastReadDuration: number,
  totalPages: number,
  progressPercent: number
}
```

#### 获取读者的汇总统计
```
GET /api/reading/stats/summary?readerId=1
返回: {
  totalRecords: number,
  totalTime: number,
  totalPages: number,
  totalBooks: number,
  latestReadDate: string
}
```

#### 获取每日阅读统计
```
GET /api/reading/stats/daily?readerId=1&startDate=2025-01-01&endDate=2025-01-31
返回: Array<{
  readerId: number,
  date: string,
  totalBooks: number,
  totalPages: number,
  totalTime: number
}>
```

#### 获取某一天的详细阅读记录
```
GET /api/reading/details/:date?readerId=1
返回: Array<{
  id: number,
  bookId: number,
  title: string,
  author: string,
  startTime: string,
  endTime: string,
  duration: number,
  startPage: number,
  endPage: number,
  pagesRead: number
}>
```

### 热力图数据

#### 获取热力图数据
```
GET /api/reading/heatmap/:year?readerId=1
返回: {
  '2025-01-10': {
    duration: 180,
    books: 2,
    pages: 80
  },
  ...
}
```

## ✅ 验证迁移是否成功

### 1. 检查数据库表

```sql
SELECT name FROM sqlite_master 
WHERE type='table' 
AND name IN ('qc_reading_records', 'qc_daily_reading_stats');
```

应该返回两个表名。

### 2. 检查qc_bookdata表字段

```sql
PRAGMA table_info(qc_bookdata);
```

应该包含新增的5个字段。

### 3. 测试API接口

```bash
# 测试创建阅读记录
curl -X POST http://localhost:7401/api/reading/record \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": 1,
    "readerId": 1,
    "startTime": "2025-01-10 14:00:00",
    "endTime": "2025-01-10 15:00:00",
    "duration": 60,
    "startPage": 1,
    "endPage": 50,
    "pagesRead": 50
  }'

# 测试获取书籍统计
curl http://localhost:7401/api/reading/stats/book/1?readerId=1

# 测试获取热力图数据
curl http://localhost:7401/api/reading/heatmap/2025?readerId=1
```

## 🔧 故障排除

### 问题1: "数据库未连接"

**原因**: 数据库文件路径不正确或文件不存在

**解决**:
1. 检查 `server/services/databaseService.js` 中的数据库路径
2. 确保数据库文件存在于 `data/talebook-webserver.db`
3. 检查文件权限

### 问题2: "字段已存在"

**原因**: 字段已经存在，重复添加

**解决**: 这是正常的，迁移脚本会自动跳过已存在的字段

### 问题3: "外键约束失败"

**原因**: books 或 users 表不存在

**解决**: 确保先创建基础表，再执行此迁移

## 📝 注意事项

1. **数据备份**: 执行迁移前建议备份数据库文件
2. **测试环境**: 先在测试环境验证，再在生产环境执行
3. **回滚准备**: 保留原始数据库备份，以便需要时回滚
4. **索引优化**: 已创建必要的索引，提升查询性能

## 🎯 下一步

迁移完成后，即可开始前端开发：

1. ✅ 数据库和后端 (Phase 1) - 已完成
2. ⏳ 前端基础 (Phase 2) - 待实施
3. ⏳ 核心功能 (Phase 3) - 待实施
4. ⏳ 显示优化 (Phase 4) - 待实施
5. ⏳ 联动和优化 (Phase 5) - 待实施
