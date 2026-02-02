<template>
  <div class="calendar-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        返回
      </button>
      <h1 class="page-title">📅 阅读日历</h1>
    </div>

    <!-- 日历视图 -->
    <div class="calendar-card card">
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
    </div>

    <!-- 阅读详情 -->
    <div v-if="selectedDate" class="heatmap-detail-card card">
      <div class="card-header">
        <span class="card-title">📅 {{ formatDate(selectedDate) }} 阅读详情</span>
        <span class="card-action" @click="closeDetail">关闭</span>
      </div>
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else-if="records && records.length > 0" class="details-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="detail-item"
        >
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
            <div v-if="record.duration" class="detail-meta">
              <span class="detail-label">时长</span>
              <span class="detail-value">{{ formatDuration(record.duration) }}</span>
            </div>
            <div v-if="record.content" class="detail-meta">
              <span class="detail-label">内容</span>
              <span class="detail-value">{{ record.content }}</span>
            </div>
            <div class="detail-time">{{ formatDateTime(record.createdAt) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon">📅</span>
        <p>{{ formatDate(selectedDate) }} 没有阅读记录</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookmarkStore } from '@/store/bookmark';
import readingTrackingService from '@/services/readingTracking';
import activityService from '@/services/activity';

const route = useRoute();
const router = useRouter();
const bookmarkStore = useBookmarkStore();

const year = ref(new Date().getFullYear());
const month = ref(new Date().getMonth());
const selectedDate = ref<string | null>(null);
const records = ref<any[] | null>(null);
const loading = ref(false);
const monthReadingRecords = ref<any[]>([]);

const calendarDays = computed(() => {
  const days = [];
  const currentYear = year.value;
  const currentMonth = month.value;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const monthBookmarks = bookmarkStore.allBookmarks.filter(b => {
    const createDate = new Date(b.createTime);
    return createDate.getFullYear() === currentYear && createDate.getMonth() === currentMonth;
  });

  const dateMap = new Map<string, any[]>();
  
  monthBookmarks.forEach(record => {
    const date = record.createTime.split('T')[0];
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(record);
  });

  monthReadingRecords.value.forEach(record => {
    const date = record.createdAt.split(' ')[0];
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(record);
  });

  for (let i = 0; i < startWeekday; i++) {
    days.push({
      day: 0,
      year: currentYear,
      month: currentMonth,
      hasData: false,
      bookNames: [],
      fullDate: ''
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const fullDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = dateMap.get(fullDate);

    const hasCompleteReading = dayRecords && dayRecords.some(r => r.pageNum || r.page || r.type === 'reading_record');
    const hasSimpleRecord = dayRecords && dayRecords.length > 0 && !hasCompleteReading;

    const bookNames = dayRecords
      ? [...new Set(dayRecords.map(r => {
          if (r.type === 'reading_record' || r.type === 'reading_state_changed') {
            return r.bookTitle || '';
          } else {
            return r.bookTitle || '';
          }
        }).filter(Boolean))]
      : [];

    days.push({
      day,
      year: currentYear,
      month: currentMonth,
      hasData: !!dayRecords && dayRecords.length > 0,
      hasCompleteReading,
      hasSimpleRecord,
      bookNames,
      fullDate,
      recordCount: dayRecords ? dayRecords.length : 0
    });
  }

  return days;
});

const changeMonth = (delta: number) => {
  let newMonth = month.value + delta;
  let newYear = year.value;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  month.value = newMonth;
  year.value = newYear;
};

const loadMonthReadingRecords = async () => {
  try {
    const startDate = new Date(year.value, month.value, 1).toISOString().split('T')[0];
    const endDate = new Date(year.value, month.value + 1, 0).toISOString().split('T')[0];
    
    const activities = await activityService.getActivities({
      startDate,
      endDate
    });
    
    monthReadingRecords.value = activities;
    console.log('✅ 加载该月阅读记录成功:', year.value, month.value + 1, activities.length);
  } catch (error) {
    console.error('❌ 加载该月阅读记录失败:', error);
    monthReadingRecords.value = [];
  }
};

watch([year, month], () => {
  loadMonthReadingRecords();
}, { immediate: true });

const handleCalendarDayClick = (date: any) => {
  if (date.day === 0) return;

  selectedDate.value = date.fullDate;
  loadDailyDetails(date.fullDate);
};

const loadDailyDetails = async (date: string) => {
  loading.value = true;
  try {
    const activities = await activityService.getActivitiesByDate(date);
    records.value = activities;
    console.log('✅ 加载每日详情成功:', date, activities);
  } catch (error) {
    console.error('❌ 加载每日详情失败:', error);
    records.value = null;
  } finally {
    loading.value = false;
  }
};

const getCalendarDayClass = (date: any): string => {
  const classes = [];

  if (date.day === 0) {
    classes.push('calendar-day--empty');
  } else if (date.bookNames && date.bookNames.length > 0) {
    classes.push('calendar-day--with-book');
  } else if (date.hasCompleteReading) {
    classes.push('calendar-day--complete');
  } else if (date.hasData) {
    classes.push('calendar-day--simple');
  } else {
    classes.push('calendar-day--normal');
  }

  if (selectedDate.value === date.fullDate) {
    classes.push('calendar-day--selected');
  }

  return classes.join(' ');
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatTimeRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

const formatDateTime = (dateTime: string): string => {
  const date = new Date(dateTime);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
};

const getRecordTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'bookmark_added': '书摘',
    'reading_record': '阅读记录',
    'reading_state_changed': '阅读状态',
    'reading_goal_set': '阅读目标'
  };
  return labels[type] || type;
};

const getRecordTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    'bookmark_added': 'type-bookmark',
    'reading_record': 'type-reading',
    'reading_state_changed': 'type-status',
    'reading_goal_set': 'type-goal'
  };
  return classes[type] || '';
};

const closeDetail = () => {
  selectedDate.value = null;
  records.value = null;
  selectedBook.value = null;
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  const dateParam = route.query.date as string;
  if (dateParam) {
    const date = new Date(dateParam);
    year.value = date.getFullYear();
    month.value = date.getMonth();
    selectedDate.value = dateParam;
    loadDailyDetails(dateParam);
  }
});
</script>

<style scoped>
.calendar-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 16px;
}

@media (max-width: 768px) {
  .calendar-page {
    padding: 8px;
  }
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .page-header {
    gap: 8px;
    margin-bottom: 12px;
  }
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--bg-card);
  border:1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .back-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}

.back-btn:hover {
  background-color: var(--bg-hover);
}

.back-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 16px;
  }
}

.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

@media (max-width: 768px) {
  .card {
    padding: 12px;
    margin-bottom: 12px;
  }
}

.calendar-card {
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.calendar-nav-btn {
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.calendar-nav-btn:hover {
  background-color: #e0e0e0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

@media (max-width: 1200px) {
  .calendar-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .calendar-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

@media (max-width: 1200px) {
  .calendar-weekdays {
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }
}

@media (max-width: 768px) {
  .calendar-weekdays {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin-bottom: 4px;
  }
}

@media (max-width: 480px) {
  .calendar-weekdays {
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }
}

.calendar-weekdays span {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 0;
}

@media (max-width: 768px) {
  .calendar-weekdays span {
    font-size: 10px;
    padding: 4px 0;
  }
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 60px;
  padding: 6px 4px;
  margin: 0;
}

@media (max-width: 1200px) {
  .calendar-day {
    min-height: 55px;
    padding: 5px 3px;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 50px;
    padding: 4px 2px;
    border-radius: 6px;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 45px;
    padding: 3px 1px;
    border-radius: 4px;
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
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.calendar-day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  line-height: 1.3;
}

@media (max-width: 1200px) {
  .calendar-day-number {
    font-size: 13px;
    margin-bottom: 3px;
  }
}

@media (max-width: 768px) {
  .calendar-day-number {
    font-size: 12px;
    margin-bottom: 2px;
  }
}

@media (max-width: 480px) {
  .calendar-day-number {
    font-size: 11px;
    margin-bottom: 2px;
  }
}

.calendar-day--normal .calendar-day-number {
  color: #999;
}

.calendar-day--selected {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.calendar-book-names {
  font-size: 10px;
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
    font-size: 9px;
    padding: 1px 1px;
  }
}

@media (max-width: 768px) {
  .calendar-book-names {
    font-size: 8px;
    padding: 1px 0;
    line-height: 1.2;
  }
}

@media (max-width: 480px) {
  .calendar-book-names {
    font-size: 7px;
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
    font-size: 7px;
    padding: 1px 0;
    line-height: 1.1;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-action {
  font-size: 14px;
  color: var(--text-hint);
  cursor: pointer;
}

.heatmap-detail-card {
  margin-top:1rem;
}

@media (max-width: 768px) {
  .heatmap-detail-card {
    margin-top: 0.5rem;
  }
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 768px) {
  .details-list {
    gap: 0.5rem;
  }
}

.detail-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  transition: all 0.2s ease;
}

@media (max-width: 768px) {
  .detail-item {
    gap: 8px;
    padding: 12px;
  }
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

@media (max-width: 768px) {
  .detail-type-badge {
    padding: 3px 8px;
    font-size: 10px;
  }
}

.type-bookmark {
  background-color: #e3f2fd;
  color: #2196f3;
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

@media (max-width: 768px) {
  .detail-content {
    gap: 6px;
  }
}

.detail-book-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
}

@media (max-width: 768px) {
  .detail-book-title {
    gap: 6px;
    padding: 6px 0;
  }
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 50px;
}

@media (max-width: 768px) {
  .detail-label {
    font-size: 10px;
    min-width: 40px;
  }
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .detail-value {
    font-size: 12px;
  }
}

.detail-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

@media (max-width: 768px) {
  .detail-time {
    font-size: 10px;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-hint);
}
</style>
