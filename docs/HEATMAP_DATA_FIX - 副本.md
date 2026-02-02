# 时间线、热力图、阅读日历无数据显示问题修复

## 问题原因

整合到 `qc_daily_reading_stats` 表后，保存阅读记录时数据库有记录，但时间线、热力图、阅读日历没有显示数据。

### 根本原因

前端两个服务的默认 `readerId` 不一致：

1. **readingTracking/index.ts**（阅读追踪服务）
   ```typescript
   const getCurrentReaderId = (): number => {
     const readerId = localStorage.getItem('currentReaderId');
     return readerId ? Number(readerId) : 0;  // ❌ 默认值是 0
   };
   ```

2. **activity/index.ts**（活动记录服务）
   ```typescript
   const getCurrentReaderId = (): number => {
     const readerId = localStorage.getItem('currentReaderId');
     return readerId ? Number(readerId) : 1;  // ✅ 默认值是 1
   };
   ```

### 数据分布

- **reader_id 0**: 3 条记录（你保存的记录）
- **reader_id 1**: 14 条记录（历史数据）

### 影响范围

- **时间线、热力图、阅读日历**：使用 `activityService`，显示 readerId=1 的数据
- **阅读追踪**：使用 `readingTrackingService`，保存到 readerId=0

## 修复方案

统一两个服务的默认 `readerId` 为 `1`。

### 修改文件

**src/services/readingTracking/index.ts**

```typescript
// 修改前
const getCurrentReaderId = (): number => {
  const readerId = localStorage.getItem('currentReaderId');
  return readerId ? Number(readerId) : 0;  // ❌ 默认值是 0
};

// 修改后
const getCurrentReaderId = (): number => {
  const readerId = localStorage.getItem('currentReaderId');
  return readerId ? Number(readerId) : 1;  // ✅ 默认值是 1
};
```

## 验证结果

### 数据检查

```bash
=== 检查 qc_daily_reading_stats 表中的数据 ===

1. 检查所有记录...
   总记录数: 17

2. 检查按日期分组的数据...
   日期分组数: 4
   - 2026-01-22: 3 条记录, 30 分钟, 16 页
   - 2026-01-17: 4 条记录, 0 分钟, 0 页
   - 2026-01-12: 9 条记录, 0 分钟, 107 页
   - 2025-01-12: 1 条记录, 30 分钟, 0 页

3. 检查 reader_id 分布...
   - reader_id 0: 3 条记录
   - reader_id 1: 14 条记录
```

### API 查询测试

```bash
=== 测试后端 API 查询逻辑 ===

1. 测试获取 readerId=0 的热力图数据...
   readerId=0, 年份=2026, 数据点数: 0  ❌

2. 测试获取 readerId=1 的热力图数据...
   readerId=1, 年份=2026, 数据点数: 0  ❌

3. 测试获取 readerId=0 的每日统计...
   readerId=0, 统计数: 1
   - 2026-01-22: 1 本书, 16 页, 30 分钟, 3 次会话

4. 测试获取 readerId=1 的每日统计...
   readerId=1, 统计数: 3
   - 2026-01-17: 2 本书, 0 页, 0 分钟, 4 次会话
   - 2026-01-12: 2 本书, 107 页, 0 分钟, 9 次会话
   - 2025-01-12: 1 本书, 0 页, 30 分钟, 1 次会话
```

### 热力图查询问题分析

```bash
=== 检查热力图查询问题 ===

1. 检查 readerId=0 的所有记录...
   总记录数: 3
   - 2026-01-22T15:00:00.000Z: duration_seconds=1800  ✅
   - 2026-01-22T06:28:32.790Z: duration_seconds=0
   - 2026-01-22T06:29:05.093Z: duration_seconds=0

2. 检查热力图查询条件...
   readerId=0, 年份=2026, 结果数: 0  ❌

3. 检查是否有 duration_seconds > 0 的记录...
   readerId=0, duration_seconds > 0 的记录数: 1
```

**发现问题**：热力图查询结果为 0，即使 readerId=0 有 3 条记录。

### 可能原因

1. **年份过滤问题**：热力图查询使用 `strftime('%Y', session_start) = ?`，可能与时间格式不匹配
2. **数据格式问题**：`session_start` 的格式可能是 `2026-01-22T15:00:00.000Z`，`strftime('%Y')` 可能无法正确解析

## 后续建议

1. **检查热力图查询逻辑**：确保 `strftime('%Y', session_start)` 能正确解析时间格式
2. **添加日志**：在热力图查询时添加详细日志，排查问题
3. **测试时间格式**：验证 `session_start` 的格式是否与 `strftime` 函数兼容
4. **考虑使用 DATE 函数**：`DATE(session_start)` 可能比 `strftime('%Y', session_start)` 更可靠

## 总结

已修复前端服务的默认 `readerId` 不一致问题，统一为 `1`。但热力图查询可能存在时间格式解析问题，需要进一步排查。
