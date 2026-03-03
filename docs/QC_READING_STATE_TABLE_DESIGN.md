# QCBookLog qc_reading_state 表设计文档

## 表结构设计

```sql
CREATE TABLE qc_reading_state (
  -- 主键
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 书籍标识（与 Calibre 数据库的 books.id 关联）
  book_id INTEGER NOT NULL,

  -- 读者标识（支持多读者模式，默认为 0）
  reader_id INTEGER NOT NULL DEFAULT 0,

  -- 阅读状态（0=未读, 1=在读, 2=已读）
  read_state INTEGER NOT NULL DEFAULT 0,

  -- 阅读进度（页数）
  current_page INTEGER DEFAULT 0,

  -- 总页数（冗余存储，便于查询）
  total_pages INTEGER DEFAULT 0,

  -- 阅读进度百分比（0-100）
  progress_percent INTEGER DEFAULT 0,

  -- 是否收藏（0=否, 1=是）
  favorite INTEGER NOT NULL DEFAULT 0,

  -- 收藏时间
  favorite_date DATETIME,

  -- 是否想读（0=否, 1=是）
  wants INTEGER NOT NULL DEFAULT 0,

  -- 想读时间
  wants_date DATETIME,

  -- 阅读完成日期
  read_date DATETIME,

  -- 开始阅读日期
  start_date DATETIME,

  -- 最后阅读时间
  last_read_time DATETIME,

  -- 总阅读时长（秒）
  total_reading_time INTEGER DEFAULT 0,

  -- 阅读次数
  read_count INTEGER DEFAULT 0,

  -- 在线阅读次数
  online_read INTEGER DEFAULT 0,

  -- 下载次数
  download INTEGER DEFAULT 0,

  -- 当前阅读的章节
  current_chapter INTEGER DEFAULT 0,

  -- 阅读备注
  notes TEXT,

  -- 阅读评分（1-5星）
  rating INTEGER DEFAULT 0,

  -- 同步状态（0=未同步, 1=已同步, 2=同步中, 3=同步失败）
  sync_status INTEGER DEFAULT 0,

  -- 最后同步时间
  last_sync_time DATETIME,

  -- 同步错误信息
  sync_error TEXT,

  -- 创建时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 更新时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 唯一约束：每本书每个读者只能有一条记录
  UNIQUE (book_id, reader_id)
);

-- 索引
CREATE INDEX idx_qc_reading_state_book_id ON qc_reading_state(book_id);
CREATE INDEX idx_qc_reading_state_reader_id ON qc_reading_state(reader_id);
CREATE INDEX idx_qc_reading_state_read_state ON qc_reading_state(read_state);
CREATE INDEX idx_qc_reading_state_favorite ON qc_reading_state(favorite);
CREATE INDEX idx_qc_reading_state_wants ON qc_reading_state(wants);
CREATE INDEX idx_qc_reading_state_sync_status ON qc_reading_state(sync_status);
CREATE INDEX idx_qc_reading_state_last_read ON qc_reading_state(last_read_time DESC);
```

## 字段说明

### 基础字段
- `id`: 主键，自增
- `book_id`: 书籍ID，与 Calibre 数据库关联
- `reader_id`: 读者ID，支持多读者模式，默认为 0

### 阅读状态字段
- `read_state`: 阅读状态（0=未读, 1=在读, 2=已读）
- `current_page`: 当前阅读页数
- `total_pages`: 总页数
- `progress_percent`: 阅读进度百分比（0-100）

### 收藏和想读字段
- `favorite`: 是否收藏（0=否, 1=是）
- `favorite_date`: 收藏时间
- `wants`: 是否想读（0=否, 1=是）
- `wants_date`: 想读时间

### 时间相关字段
- `read_date`: 阅读完成日期
- `start_date`: 开始阅读日期
- `last_read_time`: 最后阅读时间

### 统计字段
- `total_reading_time`: 总阅读时长（秒）
- `read_count`: 阅读次数
- `online_read`: 在线阅读次数
- `download`: 下载次数

### 扩展字段
- `current_chapter`: 当前阅读的章节
- `notes`: 阅读备注
- `rating`: 阅读评分（1-5星）

### 同步相关字段
- `sync_status`: 同步状态
  - 0 = 未同步
  - 1 = 已同步
  - 2 = 同步中
  - 3 = 同步失败
- `last_sync_time`: 最后同步时间
- `sync_error`: 同步错误信息

### 元数据字段
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 与 Talebook reading_state 表的映射

| QCBookLog 字段 | Talebook 字段 | 说明 |
|----------------|----------------|------|
| book_id | book_id | 书籍ID |
| reader_id | reader_id | 读者ID |
| read_state | read_state | 阅读状态 |
| favorite | favorite | 是否收藏 |
| favorite_date | favorite_date | 收藏时间 |
| wants | wants | 是否想读 |
| wants_date | wants_date | 想读时间 |
| read_date | read_date | 阅读完成日期 |
| online_read | online_read | 在线阅读次数 |
| download | download | 下载次数 |

## 新增字段（QCBookLog 独有）

| 字段 | 说明 | 用途 |
|------|------|------|
| current_page | 当前阅读页数 | 追踪阅读进度 |
| total_pages | 总页数 | 计算进度百分比 |
| progress_percent | 阅读进度百分比 | 显示进度条 |
| start_date | 开始阅读日期 | 统计阅读时长 |
| last_read_time | 最后阅读时间 | 排序最近阅读 |
| total_reading_time | 总阅读时长 | 阅读统计 |
| read_count | 阅读次数 | 阅读统计 |
| current_chapter | 当前章节 | 章节阅读 |
| notes | 阅读备注 | 用户笔记 |
| rating | 阅读评分 | 书籍评分 |
| sync_status | 同步状态 | 同步管理 |
| last_sync_time | 最后同步时间 | 同步管理 |
| sync_error | 同步错误信息 | 错误追踪 |