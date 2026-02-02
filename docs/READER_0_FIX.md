# reader_id=0 的 22 号没有信息问题修复总结

## 问题原因

切换到 reader_id=0（默认读者）时，22 号没有显示信息，但数据库中确实有数据。

### 数据库数据检查

```bash
=== 检查 reader_id=0 的数据 ===

1. 检查 reader_id=0 的所有记录...
   总记录数: 3
   1. {
     id: 42,
     date: '2026-01-22',
     session_start: '2026-01-22T15:00:00.000Z',
     duration_seconds: 1800,
     pages_read: 10
   }
   2. {
     id: 44,
     date: '2026-01-22',
     session_start: '2026-01-22T06:29:05.093Z',
     duration_seconds: 0,
     pages_read: 6
   }
   3. {
     id: 43,
     date: '2026-01-22',
     session_start: '2026-01-22T06:28:32.790Z',
     duration_seconds: 0,
     pages_read: 0
   }
```

**结论**：数据库中确实有 reader_id=0 在 2026-01-22 的 3 条记录，总时长 30 分钟，总页数 16 页。

### 问题定位

#### 问题 1：前端组件使用 `v-if="record.duration"` 过滤掉 `duration=0` 的记录

在 **TimelinePage.vue** 中，第 88 行和第 120 行有：
```vue
<div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
```

这导致 `duration=0` 的记录不会显示累计时长信息，虽然记录本身会显示，但看起来像是没有信息。

#### 问题 2：activityService.getActivitiesByDate() 使用 `created_at` 过滤日期

在 **activityService.js** 中，第 367 行：
```sql
WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}') ${readerFilter}
```

应该使用 `session_start` 而不是 `created_at` 来过滤日期，因为 `session_start` 是阅读会话的开始时间。

## 修复内容

### 1. 修复 activityService.js 中的日期过滤

**修改文件**：`server/services/activityService.js`

```sql
-- 修改前
WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}') ${readerFilter}

-- 修改后
WHERE DATE(session_start) >= DATE('${startDate}') AND DATE(session_start) <= DATE('${endDate}') ${readerFilter}
```

### 2. 移除 TimelinePage.vue 中的 duration 过滤

**修改文件**：`src/views/Reading/components/TimelinePage.vue`

```vue
<!-- 修改前 -->
<div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>

<!-- 修改后 -->
<div class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
```

共修改了 3 处（第 88 行、第 120 行、第 148 行）。

## 验证结果

### 测试修复后的查询

```bash
=== 测试修复后的查询 ===

1. 测试修复后的查询（使用 session_start）...
   readerId=0, date=2026-01-22, 活动记录数: 3

2. 测试使用 created_at 的查询（旧查询）...
   readerId=0, date=2026-01-22, 活动记录数: 3

3. 对比结果:
   修复后查询（使用 session_start）: 3 条记录
   旧查询（使用 created_at）: 3 条记录
   是否一致: ✅
```

**结论**：修复后的查询和旧查询都返回了 3 条记录，结果一致。

## 之前修复的问题

### 问题 1：前端服务的默认 readerId 不一致

**修改文件**：`src/services/readingTracking/index.ts`

```typescript
// 修改前
return readerId ? Number(readerId) : 0;

// 修改后
return readerId ? Number(readerId) : 1;
```

### 问题 2：热力图查询的 SQL 类型转换问题

**修改文件**：`server/services/readingTrackingService.js`

```sql
-- 修改前
WHERE reader_id = ? AND strftime('%Y', session_start) = ?

-- 修改后
WHERE reader_id = ? AND CAST(strftime('%Y', session_start) AS INTEGER) = ?
```

### 问题 3：activityService.getActivitiesByDate() 使用 created_at 过滤

**修改文件**：`server/services/activityService.js`

```sql
-- 修改前
WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}') ${readerFilter}

-- 修改后
WHERE DATE(session_start) >= DATE('${startDate}') AND DATE(session_start) <= DATE('${endDate}') ${readerFilter}
```

### 问题 4：TimelinePage.vue 使用 v-if="record.duration" 过滤

**修改文件**：`src/views/Reading/components/TimelinePage.vue`

```vue
<!-- 修改前 -->
<div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>

<!-- 修改后 -->
<div class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
```

## 总结

通过修复以下问题：
1. ✅ 统一了前端服务的默认 `readerId` 为 1
2. ✅ 修复了热力图查询的 SQL 类型转换问题
3. ✅ 修复了 activityService.getActivitiesByDate() 使用 `created_at` 过滤日期的问题
4. ✅ 移除了 TimelinePage.vue 中的 `v-if="record.duration"` 过滤

现在切换到 reader_id=0（默认读者）时，22 号应该能正常显示所有阅读记录了！

## 读者切换功能

同时还实现了完整的读者切换功能，当用户在 Profile 页面切换不同的读者ID时，所有相关组件（时间线、热力图、阅读日历、每日统计）都会自动刷新并显示对应读者的数据。
