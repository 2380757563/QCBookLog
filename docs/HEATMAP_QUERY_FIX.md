# 热力图查询问题修复总结

## 问题原因

热力图查询使用 `strftime('%Y', session_start) = ?` 进行年份过滤，但 `strftime('%Y', session_start)` 返回的是字符串类型，与数字参数比较时可能失败。

## 测试结果

### 原始查询方式（使用 strftime）
```sql
SELECT
  DATE(session_start) as date,
  SUM(duration_seconds) / 60 as totalDuration,
  COUNT(DISTINCT book_id) as totalBooks,
  SUM(pages_read) as totalPages
FROM qc_daily_reading_stats
WHERE reader_id = ? AND strftime('%Y', session_start) = ?
GROUP BY DATE(session_start)
```

**结果**：readerId=1, 年份=2026, 结果数: 0 ❌

### 修复后的查询方式（使用 CAST 函数）
```sql
SELECT
  DATE(session_start) as date,
  SUM(duration_seconds) / 60 as totalDuration,
  COUNT(DISTINCT book_id) as totalBooks,
  SUM(pages_read) as totalPages
FROM qc_daily_reading_stats
WHERE reader_id = ? AND CAST(strftime('%Y', session_start) AS INTEGER) = ?
GROUP BY DATE(session_start)
```

**结果**：readerId=1, 年份=2026, 结果数: 2 ✅

## 修复内容

### 修改文件

**server/services/readingTrackingService.js**

```javascript
// 修改前
WHERE reader_id = ? AND strftime('%Y', session_start) = ?

// 修改后
WHERE reader_id = ? AND CAST(strftime('%Y', session_start) AS INTEGER) = ?
```

## 验证结果

### 测试修复后的查询

```bash
=== 测试修复后的热力图查询 ===

1. 修复后的查询方式（使用 CAST 函数）...
   readerId=1, 年份=2026, 结果数: 2
   - 2026-01-12: 0 分钟, 2 本书, 107 页
   - 2026-01-17: 0 分钟, 2 本书, 0 页

2. 测试其他年份...
   年份 2025: 1 条记录
   年份 2026: 2 条记录
   年份 2027: 0 条记录

3. 测试所有 readerId...
   readerId 0: 1 条记录
   readerId 1: 2 条记录
```

## 总结

通过使用 `CAST(strftime('%Y', session_start) AS INTEGER)` 将年份转换为整数类型，解决了字符串与数字比较的问题，热力图查询现在可以正常返回数据了。

## 其他修复

同时还修复了前端服务的默认 `readerId` 不一致问题：

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

现在所有功能（时间线、热力图、阅读日历）都应该能正常显示数据了！
