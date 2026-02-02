# qc_daily_reading_stats 和 qc_reading_records 表重复问题分析

## 问题概述

经过对比分析，发现 `qc_daily_reading_stats` 和 `qc_reading_records` 两个表存储了相同类型的数据，存在严重的数据重复问题。

## 表结构对比

### qc_reading_records 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| book_id | INTEGER NOT NULL | 书籍ID |
| reader_id | INTEGER NOT NULL | 读者ID |
| start_time | DATETIME NOT NULL | 开始时间 |
| end_time | DATETIME NOT NULL | 结束时间 |
| duration | INTEGER NOT NULL | 阅读时长（分钟） |
| start_page | INTEGER NOT NULL DEFAULT 0 | 开始页码 |
| end_page | INTEGER NOT NULL DEFAULT 0 | 结束页码 |
| pages_read | INTEGER NOT NULL DEFAULT 0 | 本次阅读页数 |
| created_at | DATETIME | 创建时间 |

**数据量**：14 条记录

### qc_daily_reading_stats 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| reader_id | INTEGER NOT NULL | 读者ID |
| book_id | INTEGER NOT NULL | 书籍ID |
| session_start | DATETIME NOT NULL | 会话开始时间 |
| session_end | DATETIME NOT NULL | 会话结束时间 |
| duration_seconds | INTEGER NOT NULL | 阅读时长（秒） |
| start_page | INTEGER DEFAULT 0 | 开始页码 |
| end_page | INTEGER DEFAULT 0 | 结束页码 |
| pages_read | INTEGER DEFAULT 0 | 本次阅读页数 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**数据量**：0 条记录（空表）

### 字段映射关系

| qc_reading_records | qc_daily_reading_stats | 差异 |
|-------------------|----------------------|------|
| id | id | 相同 |
| reader_id | reader_id | 相同 |
| book_id | book_id | 相同 |
| start_time | session_start | 命名不同 |
| end_time | session_end | 命名不同 |
| duration (分钟) | duration_seconds (秒) | 单位不同 |
| start_page | start_page | 相同 |
| end_page | end_page | 相同 |
| pages_read | pages_read | 相同 |
| created_at | created_at | 相同 |
| - | updated_at | 新增字段 |

## 代码引用情况

### qc_reading_records 被引用的位置

1. **activityService.js** (第 366 行)
   ```javascript
   FROM qc_reading_records
   ```
   - 用途：查询活动记录（时间线）

2. **readingTrackingService.js** (多处)
   - 第 69 行：插入阅读记录
   - 第 142 行：查询阅读记录（获取阅读历史）
   - 第 191 行：查询阅读记录（获取阅读历史）
   - 第 639 行：统计阅读次数
   - 第 644 行：统计总阅读时长
   - 第 649 行：统计总阅读页数
   - 第 654 行：统计阅读书籍数
   - 第 659 行：获取最后阅读日期

### qc_daily_reading_stats 被引用的位置

目前 `qc_daily_reading_stats` 表为空，没有实际数据。

## 优化建议

### 方案一：统一使用 qc_reading_records 表

**操作步骤**：
1. 删除 `qc_daily_reading_stats` 表
2. 修改 `readingTrackingService.js` 中的 `insertReadingSession` 方法，改为插入到 `qc_reading_records`
3. 修改 `readingTrackingService.js` 中的 `getDailyReadingStats` 方法，改为从 `qc_reading_records` 查询
4. 修改 `activityService.js`，保持使用 `qc_reading_records`

**优点**：
- 不需要修改现有代码
- 风险较低

**缺点**：
- 字段名称不够语义化（`duration` 是分钟而不是秒）
- 表名 `qc_reading_records` 不够准确（不是"记录"，而是"会话"）

### 方案二：统一使用 qc_daily_reading_stats 表（推荐）

**操作步骤**：
1. 将 `qc_reading_records` 的数据迁移到 `qc_daily_reading_stats`
2. 删除 `qc_reading_records` 表
3. 修改所有引用 `qc_reading_records` 的代码，改为使用 `qc_daily_reading_stats`

**优点**：
- 字段名称更语义化（`session_start`/`session_end`，`duration_seconds`）
- 表名更准确（`daily_reading_stats` 表示每日阅读统计/会话）
- 时间精度更高（秒级）
- 符合最新的设计理念

**缺点**：
- 需要修改多处代码
- 风险较高

### 方案三：保留两个表，明确职责分工

**操作步骤**：
1. `qc_reading_records`：存储原始阅读记录（插入时）
2. `qc_daily_reading_stats`：存储每日汇总统计（通过触发器或定时任务聚合）
3. 修改 `readingTrackingService.js`，插入时同时写入两个表
4. 修改查询逻辑，根据需求选择合适的表

**优点**：
- 职责清晰
- 性能优化（汇总查询更快）

**缺点**：
- 数据冗余
- 维护成本高
- 可能出现数据不一致

## 推荐方案

**推荐使用方案二：统一使用 qc_daily_reading_stats 表**

理由：
1. **语义化更好**：`session_start`/`session_end` 比 `start_time`/`end_time` 更清晰
2. **时间精度更高**：`duration_seconds`（秒）比 `duration`（分钟）更精确
3. **表名更准确**：`daily_reading_stats` 表示每日阅读统计/会话，比 `reading_records` 更准确
4. **符合最新设计**：我们已经按照新的表结构设计了代码

## 实施计划

### 阶段一：数据迁移
1. 备份 `qc_reading_records` 表数据
2. 将数据迁移到 `qc_daily_reading_stats` 表
3. 验证数据一致性

### 阶段二：代码修改
1. 修改 `readingTrackingService.js`：
   - `createReadingRecord` 方法：改为插入到 `qc_daily_reading_stats`
   - `getReadingHistory` 方法：改为从 `qc_daily_reading_stats` 查询
   - `getReadingStats` 方法：改为从 `qc_daily_reading_stats` 查询
2. 修改 `activityService.js`：
   - `getActivities` 方法：改为从 `qc_daily_reading_stats` 查询

### 阶段三：清理
1. 删除 `qc_reading_records` 表
2. 测试所有功能
3. 验证数据完整性

## 总结

`qc_daily_reading_stats` 和 `qc_reading_records` 两个表存储了相同类型的数据，存在严重的数据重复问题。建议统一使用 `qc_daily_reading_stats` 表，删除 `qc_reading_records` 表，以提高数据一致性和代码可维护性。
