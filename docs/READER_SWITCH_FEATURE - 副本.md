# 读者切换功能完善总结

## 功能概述

实现了读者切换功能，当用户在 Profile 页面切换不同的读者ID时，时间线、热力图、阅读日历、每日统计等所有相关组件都会自动刷新并显示对应读者的数据。

## 修改的文件

### 1. src/views/Profile/index.vue

**添加导入**：
```typescript
import { useEventBus } from '@/utils/eventBus';
```

**初始化 eventBus**：
```typescript
const eventBus = useEventBus();
```

**修改 handleReaderChange 函数**：
```typescript
// 处理读者切换
const handleReaderChange = () => {
  // readerStore会自动保存到localStorage
  console.log('读者已切换:', readerStore.currentReaderId);

  // 刷新书籍列表以更新阅读状态
  loadBooks();

  // 触发事件通知其他组件刷新数据（时间线、热力图、阅读日历）
  eventBus.emit('reader-changed', { readerId: readerStore.currentReaderId });
};
```

### 2. src/views/Reading/components/TimelinePage.vue

**添加监听 reader-changed 事件**：
```typescript
eventBus.on('reader-changed', (data: any) => {
  console.log('📥 收到读者切换事件:', data);
  // 重新加载时间线数据
  loadTimelineCalendarDays();
  // 如果有选中的日期，重新加载该日期的详情
  if (selectedTimelineDate.value) {
    selectTimelineDate(selectedTimelineDate.value);
  }
});
```

### 3. src/views/Reading/components/ReadingHeatmap.vue

**添加监听 reader-changed 事件**：
```typescript
// 监听读者切换事件
eventBus.on('reader-changed', (data: any) => {
  console.log('📥 收到读者切换事件:', data);
  // 重新加载热力图数据
  loadActivities();
});
```

### 4. src/views/Reading/components/ReadingCalendar.vue

**添加导入**：
```typescript
import { useEventBus } from '@/utils/eventBus';
```

**初始化 eventBus**：
```typescript
const eventBus = useEventBus();
```

**添加监听 reader-changed 事件**：
```typescript
// 监听读者切换事件
eventBus.on('reader-changed', (data: any) => {
  console.log('📥 收到读者切换事件:', data);
  // 重新加载该月的活动记录
  loadMonthActivities();
  // 如果有选中的日期，重新加载该日期的详情
  if (props.selectedDate) {
    loadDateDetails(props.selectedDate);
  }
});
```

### 5. src/views/DailyStats/index.vue

**添加导入**：
```typescript
import { useEventBus } from '@/utils/eventBus';
```

**初始化 eventBus**：
```typescript
const eventBus = useEventBus();
```

**添加监听 reader-changed 事件**：
```typescript
// 监听读者切换事件
eventBus.on('reader-changed', (data: any) => {
  console.log('📥 收到读者切换事件:', data);
  // 重新加载每日统计
  loadDailyStats();
});
```

## 工作原理

1. **用户在 Profile 页面切换读者**：
   - 选择不同的读者ID
   - `readerStore.currentReaderId` 更新
   - 触发 `reader-changed` 事件

2. **其他组件监听事件**：
   - **TimelinePage**：重新加载时间线数据
   - **ReadingHeatmap**：重新加载热力图数据
   - **ReadingCalendar**：重新加载日历数据
   - **DailyStats**：重新加载每日统计

3. **所有组件使用新的 readerId**：
   - `activityService.getActivities()` 自动使用新的 `readerId`
   - `readingTrackingService.getDailyReadingDetails()` 自动使用新的 `readerId`
   - 所有查询都会返回对应读者的数据

## 事件流程

```
用户在 Profile 页面切换读者
    ↓
readerStore.currentReaderId 更新
    ↓
触发 eventBus.emit('reader-changed', { readerId })
    ↓
TimelinePage 监听到事件 → 重新加载时间线数据
    ↓
ReadingHeatmap 监听到事件 → 重新加载热力图数据
    ↓
ReadingCalendar 监听到事件 → 重新加载日历数据
    ↓
DailyStats 监听到事件 → 重新加载每日统计
```

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

## 总结

通过实现读者切换功能，用户可以在 Profile 页面切换不同的读者ID，所有相关组件（时间线、热力图、阅读日历、每日统计）都会自动刷新并显示对应读者的数据。

同时修复了两个关键问题：
1. 统一了前端服务的默认 `readerId` 为 1
2. 修复了热力图查询的 SQL 类型转换问题

现在用户可以正常使用读者切换功能，查看不同读者的阅读信息了！
