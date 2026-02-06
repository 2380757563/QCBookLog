<template>
  <div v-if="modelValue" class="calendar-view-container">
    <div class="calendar-header">
      <button class="calendar-nav-btn" @click="changeMonth(-1)">◀</button>
      <span class="calendar-title">{{ year }}年 {{ month + 1 }}月</span>
      <button class="calendar-nav-btn" @click="changeMonth(1)">▶</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekdays">
        <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
      </div>
      <div
        v-for="date in calendarDays"
        :key="`${date.year}-${date.month}-${date.day}`"
        class="calendar-day"
        :class="getCalendarDayClass(date)"
        @click="date.day > 0 ? handleCalendarDayClick(date) : null"
      >
        <span class="calendar-day-number">{{ date.day > 0 ? date.day : '' }}</span>
        <div v-if="date.day > 0 && date.bookNames && date.bookNames.length > 0" class="calendar-book-names">
          {{ date.bookNames[0] }}
        </div>
        <div v-if="date.day > 0 && date.hasData && (!date.bookNames || date.bookNames.length === 0)" class="calendar-record-count">
          {{ date.recordCount || 1 }}条
        </div>
      </div>
    </div>
    
    <!-- 详细阅读记录弹窗 -->
    <div v-if="showDetails" class="details-dialog" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">阅读记录详情</span>
        <span class="dialog-close" @click="showDetails = false">×</span>
      </div>
      <div class="dialog-body">
        <div v-if="loadingDetails" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="!selectedDateDetails || selectedDateDetails.length === 0" class="empty-state">
          <span class="empty-icon">📝</span>
          <p>该日期没有阅读记录</p>
        </div>
        <div v-else class="details-list">
          <div v-for="record in selectedDateDetails" :key="record.id" class="detail-item">
            <div class="detail-type-badge" :class="getRecordTypeClass(record.type)">
              {{ getRecordTypeLabel(record.type) }}
            </div>
            <div class="detail-content">
              <div v-if="record.bookTitle" class="detail-book-title">
                <span class="detail-label">书籍</span>
                <span class="detail-value">{{ record.bookTitle }}</span>
              </div>
              <div v-if="record.bookAuthor" class="detail-meta">
                <span class="detail-label">作者</span>
                <span class="detail-value">{{ record.bookAuthor }}</span>
              </div>
              <div v-if="record.startTime && record.endTime" class="detail-meta">
                <span class="detail-label">时间</span>
                <span class="detail-value">{{ formatTimeRange(record.startTime, record.endTime) }}</span>
              </div>
              <div v-if="record.content" class="detail-meta">
                <span class="detail-label">内容</span>
                <span class="detail-value">{{ record.content }}</span>
              </div>
              <div class="detail-time">{{ formatDateTime(record.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useBookmarkStore } from '@/store/bookmark';
import activityService from '@/services/activity';

const bookmarkStore = useBookmarkStore();
const showDetails = ref(false);
const selectedDateDetails = ref<any[]>([]);
const loadingDetails = ref(false);
const monthActivities = ref<any[]>([]);

// Props
interface ReadingCalendarProps {
  modelValue: boolean;
  year: number;
  month: number;
  selectedDate: string | null;
  showDetails: boolean;
}

const props = withDefaults(defineProps<ReadingCalendarProps>(), {
  modelValue: false,
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: null,
  showDetails: false
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:year': [value: number];
  'update:month': [value: number];
  'update:selectedDate': [value: string | null];
  'date-click': [date: string];
  'show-details': [date: string];
}>();

// 监听 showDetails 变化
watch(() => props.showDetails, (newValue) => {
  if (newValue && props.selectedDate) {
    loadDateDetails(props.selectedDate);
  } else {
    showDetails.value = false;
    selectedDateDetails.value = [];
  }
});

// 加载该月的活动记录
const loadMonthActivities = async () => {
  try {
    const year = props.year;
    const month = props.month;
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const activities = await activityService.getActivities({
      startDate,
      endDate
    });
    
    monthActivities.value = activities;

  } catch (error) {
    console.error('❌ 加载该月活动记录失败:', error);
    monthActivities.value = [];
  }
};

// 监听年份和月份变化
watch([() => props.year, () => props.month], () => {
  loadMonthActivities();
}, { immediate: true });

// 日历数据（用于日历视图）
const calendarDays = computed(() => {
  const days = [];
  const year = props.year;
  const month = props.month;

  // 获取该月的第一天和总天数
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay(); // 0-6, 0是周日

  // 按日期分组活动记录
  const dateMap = new Map<string, any[]>();
  monthActivities.value.forEach(record => {
    const date = record.createdAt.split(' ')[0];
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(record);
  });

  // 填充空白天数
  for (let i = 0; i < startWeekday; i++) {
    days.push({
      day: 0,
      year,
      month,
      hasData: false,
      bookNames: [],
      fullDate: ''
    });
  }

  // 填充实白天数
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const records = dateMap.get(fullDate);

    // 检查是否有完整阅读记录（有书摘且有页数信息）
    const hasCompleteReading = records && records.some(r => r.endPage || r.startPage);
    const hasSimpleRecord = records && records.length > 0 && !hasCompleteReading;

    // 提取书籍名称
    const bookNames = records
      ? [...new Set(records.map(r => r.bookTitle).filter(Boolean))]
      : [];

    days.push({
      day,
      year,
      month,
      hasData: !!records && records.length > 0,
      hasCompleteReading,
      hasSimpleRecord,
      bookNames,
      fullDate,
      recordCount: records ? records.length : 0
    });
  }

  return days;
});

// 月份切换
const changeMonth = (delta: number) => {
  let newMonth = props.month + delta;
  let newYear = props.year;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  emit('update:month', newMonth);
  emit('update:year', newYear);
};

// 处理日历日期点击
const handleCalendarDayClick = (date: any) => {
  if (date.day === 0) return;
  
  emit('update:selectedDate', date.fullDate);
  emit('date-click', date.fullDate);
  emit('show-details', date.fullDate);

};

// 加载详细阅读记录
const loadDateDetails = async (date: string) => {
  loadingDetails.value = true;
  try {
    const dateStr = date.split(' ')[0];
    const activities = await activityService.getActivitiesByDate(dateStr);
    selectedDateDetails.value = activities;

  } catch (error) {
    console.error('❌ 加载详细记录失败:', error);
    selectedDateDetails.value = [];
  } finally {
    loadingDetails.value = false;
  }
};

// 获取记录类型标签
const getRecordTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'bookmark_added': '书摘',
    'reading_record': '阅读记录',
    'reading_state_changed': '阅读状态',
    'reading_goal_set': '阅读目标'
  };
  return labels[type] || type;
};

// 获取记录类型样式类
const getRecordTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    'bookmark_added': 'type-bookmark',
    'reading_record': 'type-reading',
    'reading_state_changed': 'type-status',
    'reading_goal_set': 'type-goal'
  };
  return classes[type] || '';
};

// 格式化时间范围
const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  return `${startStr} - ${endStr}`;
};

// 格式化日期时间
const formatDateTime = (dateTime: string): string => {
  const date = new Date(dateTime);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
};

// 获取日历单元格样式类名
const getCalendarDayClass = (date: any): string => {
  const classes = [];

  if (date.day === 0) {
    classes.push('calendar-day--empty');
  } else if (date.bookNames && date.bookNames.length > 0) {
    // 有书籍名称的单元格（有书摘记录）
    classes.push('calendar-day--with-book');
  } else if (date.hasCompleteReading) {
    classes.push('calendar-day--complete');
  } else if (date.hasData) {
    // 有任何记录的单元格
    classes.push('calendar-day--simple');
  } else {
    classes.push('calendar-day--normal');
  }

  if (props.selectedDate === date.fullDate) {
    classes.push('calendar-day--selected');
  }

  return classes.join(' ');
};
</script>

<style scoped>
/* 日历视图容器 */
.calendar-view-container {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .calendar-header {
    margin-bottom: 8px;
  }
}

.calendar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .calendar-title {
    font-size: 13px;
  }
}

.calendar-nav-btn {
  padding: 6px 12px;
  background-color: #f5f5f5;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.calendar-nav-btn:hover {
  background-color: #e0e0e0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

@media (max-width: 1200px) {
  .calendar-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
  }
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }
}

@media (max-width: 480px) {
  .calendar-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
  }
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}

.calendar-weekdays span {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 6px 0;
}

@media (max-width: 1200px) {
  .calendar-weekdays {
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
  }
}

@media (max-width: 768px) {
  .calendar-weekdays {
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
    margin-bottom: 4px;
  }

  .calendar-weekdays span {
    font-size: 10px;
    padding: 4px 0;
  }
}

@media (max-width: 480px) {
  .calendar-weekdays {
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
  }
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 50px;
  padding: 5px 3px;
  margin: 0;
}

@media (max-width: 1200px) {
  .calendar-day {
    min-height: 48px;
    padding: 4px 2px;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 42px;
    padding: 3px 2px;
    border-radius: 4px;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 38px;
    padding: 2px 1px;
    border-radius: 3px;
  }
}

.calendar-day--empty {
  background-color: transparent;
  cursor: default;
}

.calendar-day--normal {
  background-color: #f5f5f5;
  color: #999;
}

.calendar-day--simple {
  background-color: #f5f5f5;
  color: var(--text-primary);
}

.calendar-day--complete {
  background-color: #e8f5e9;
  color: var(--text-primary);
  border: 2px solid #c8e6c9;
}

.calendar-day--with-book {
  background-color: #fff3e0;
  color: var(--text-primary);
  border: 2px solid #ffe0b2;
}

.calendar-day:hover:not(.calendar-day--empty) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.calendar-day-number {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 3px;
  line-height: 1.3;
}

@media (max-width: 1200px) {
  .calendar-day-number {
    font-size: 12px;
    margin-bottom: 2px;
  }
}

@media (max-width: 768px) {
  .calendar-day-number {
    font-size: 11px;
    margin-bottom: 2px;
  }
}

@media (max-width: 480px) {
  .calendar-day-number {
    font-size: 10px;
    margin-bottom: 1px;
  }
}

.calendar-day--normal .calendar-day-number {
  color: #999;
}

.calendar-day--selected {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 详细阅读记录弹窗 */
.details-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 20px;
  background-color: white;
  border-bottom: 1px solid var(--border-light);
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.dialog-body {
  background-color: white;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  padding: 20px;
}

@media (max-width: 768px) {
  .dialog-body {
    width: 95%;
    max-height: 85vh;
    padding: 14px;
    border-radius: 8px;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
  transition: all 0.2s ease;
}

.detail-item:hover {
  background-color: var(--bg-tertiary);
  transform: translateX(4px);
}

.detail-type-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.type-bookmark {
  background-color: #e3f2fd;
  color: white;
}

.type-reading {
  background-color: #10b981;
  color: white;
}

.type-status {
  background-color: #f59e0b;
  color: white;
}

.type-goal {
  background-color: #8b5cf6;
  color: white;
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-book-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 50px;
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.detail-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.calendar-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
}

.indicator-circle {
  width: 16px;
  height: 16px;
  background-color: #4caf50;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  background-color: #4caf50;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.calendar-book-names {
  font-size: 9px;
  color: var(--text-primary);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: auto;
  font-weight: 500;
  line-height: 1.3;
  padding: 2px 1px;
  word-break: break-all;
}

@media (max-width: 1200px) {
  .calendar-book-names {
    font-size: 8px;
    padding: 1px 1px;
  }
}

@media (max-width: 768px) {
  .calendar-book-names {
    font-size: 7px;
    padding: 1px 0;
    line-height: 1.2;
  }
}

@media (max-width: 480px) {
  .calendar-book-names {
    font-size: 6px;
    padding: 1px 0;
    line-height: 1.1;
  }
}

.calendar-record-count {
  font-size: 9px;
  color: var(--primary-color);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: auto;
  font-weight: 600;
  line-height: 1.3;
  padding: 2px 1px;
}

@media (max-width: 1200px) {
  .calendar-record-count {
    font-size: 8px;
    padding: 1px 1px;
  }
}

@media (max-width: 768px) {
  .calendar-record-count {
    font-size: 7px;
    padding: 1px 0;
    line-height: 1.2;
  }
}

@media (max-width: 480px) {
  .calendar-record-count {
    font-size: 6px;
    padding: 1px 0;
    line-height: 1.1;
  }
}
</style>
