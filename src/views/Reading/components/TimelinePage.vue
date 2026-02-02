<template>
  <div class="timeline-page">
    <!-- 顶部导航栏 -->
    <div class="timeline-header">
      <div class="timeline-nav">
        <div class="timeline-nav-btn" @click="changeTimelineMonth(-1)">
          <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </div>
        <div class="timeline-title">
          <div class="timeline-month-year">{{ timelineMonth + 1 }}月 {{ timelineYear }}</div>
          <div class="timeline-days-ago">{{ getDaysAgoText() }}</div>
        </div>
        <div class="timeline-nav-btn" @click="changeTimelineMonth(1)">
          <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </div>
      </div>
      <div class="timeline-filter">
        <button class="today-btn" @click="goToToday">
          今天
        </button>
        <select v-model="timelineRecordCount" class="record-count-select">
          <option :value="10">最近10条</option>
          <option :value="20">最近20条</option>
          <option :value="30">最近30条</option>
          <option :value="0">全部</option>
        </select>
        <button class="calendar-btn" @click="showCalendarPicker = true">
          <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
        </button>
      </div>
    </div>
    <!-- 小日历 -->
    <div class="mini-calendar">
      <div class="calendar-weekdays">
        <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="mini-weekday">{{ day }}</span>
      </div>
      <div class="calendar-days">
        <div
          v-for="date in timelineCalendarDays"
          :key="`${date.year}-${date.month}-${date.day}`"
          class="mini-calendar-day"
          :class="getTimelineDayClass(date)"
          @click="date.day > 0 ? selectTimelineDate(date) : null"
        >
          <span class="mini-day-number">{{ date.day > 0 ? date.day : '' }}</span>
          <div v-if="date.day > 0 && getDayIndicatorClass(date)" class="mini-day-indicator" :class="getDayIndicatorClass(date)"></div>
        </div>
      </div>
    </div>

    <!-- 选中日期的时间轴记录 -->
    <div v-if="selectedTimelineDate" class="timeline-details">
      <div class="details-header">
        <div class="details-date">{{ formatTimelineDate(selectedTimelineDate) }}</div>
        <div class="details-status">{{ getTimelineDateStatus() }}</div>
      </div>
      <div v-if="loadingTimelineDetails" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else-if="timelineDateDetails && timelineDateDetails.length > 0" class="timeline-list">
        <div v-if="isToday(selectedTimelineDate)" class="timeline-section">
          <div class="timeline-section-header">
            <span class="section-title">今日操作</span>
            <span class="section-count">{{ getTodayActivitiesCount() }} 条</span>
          </div>
          <div
            v-for="(record, index) in getTodayActivities()"
            :key="record.id"
            class="timeline-item"
          >
            <div class="timeline-marker">
              <div class="marker-dot" :class="getActivityMarkerClass(record.type)"></div>
              <div v-if="index < getTodayActivities().length - 1 || getHistoricalActivities().length > 0" class="marker-line"></div>
            </div>
            <div class="timeline-content">
              <div class="activity-type-badge" :class="getActivityTypeClass(record.type)">
                {{ getActivityTypeLabel(record.type) }}
              </div>
              <div v-if="record.bookTitle" class="record-cover">
                <img v-if="record.bookCover" :src="record.bookCover" :alt="record.bookTitle" />
                <div v-else class="cover-placeholder">{{ record.bookTitle ? record.bookTitle.charAt(0) : '' }}</div>
              </div>
              <div class="record-info">
                <div v-if="record.bookTitle" class="record-title">{{ record.bookTitle }}</div>
                <div v-if="record.bookAuthor" class="record-author">{{ record.bookAuthor }} · {{ record.bookPublisher }}</div>
                <div v-if="record.startTime && record.endTime" class="record-time-range">{{ formatTimeRange(record.startTime, record.endTime) }}</div>
                <div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
                <div v-if="record.content" class="record-content">{{ record.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="isToday(selectedTimelineDate) && getHistoricalActivities().length > 0" class="timeline-section">
          <div class="timeline-section-header">
            <span class="section-title">历史操作</span>
            <span class="section-count">{{ getHistoricalActivities().length }} 条</span>
          </div>
          <div
            v-for="(record, index) in getHistoricalActivities()"
            :key="record.id"
            class="timeline-item"
          >
            <div class="timeline-marker">
              <div class="marker-dot" :class="getActivityMarkerClass(record.type)"></div>
              <div v-if="index < getHistoricalActivities().length - 1" class="marker-line"></div>
            </div>
            <div class="timeline-content">
              <div class="activity-type-badge" :class="getActivityTypeClass(record.type)">
                {{ getActivityTypeLabel(record.type) }}
              </div>
              <div v-if="record.bookTitle" class="record-cover">
                <img v-if="record.bookCover" :src="record.bookCover" :alt="record.bookTitle" />
                <div v-else class="cover-placeholder">{{ record.bookTitle ? record.bookTitle.charAt(0) : '' }}</div>
              </div>
              <div class="record-info">
                <div v-if="record.bookTitle" class="record-title">{{ record.bookTitle }}</div>
                <div v-if="record.bookAuthor" class="record-author">{{ record.bookAuthor }} · {{ record.bookPublisher }}</div>
                <div v-if="record.startTime && record.endTime" class="record-time-range">{{ formatTimeRange(record.startTime, record.endTime) }}</div>
                <div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
                <div v-if="record.content" class="record-content">{{ record.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!isToday(selectedTimelineDate)" class="timeline-section">
          <div
            v-for="(record, index) in timelineDateDetails"
            :key="record.id"
            class="timeline-item"
          >
            <div class="timeline-marker">
              <div class="marker-dot" :class="getActivityMarkerClass(record.type)"></div>
              <div v-if="index < timelineDateDetails.length - 1" class="marker-line"></div>
            </div>
            <div class="timeline-content">
              <div class="activity-type-badge" :class="getActivityTypeClass(record.type)">
                {{ getActivityTypeLabel(record.type) }}
              </div>
              <div v-if="record.bookTitle" class="record-cover">
                <img v-if="record.bookCover" :src="record.bookCover" :alt="record.bookTitle" />
                <div v-else class="cover-placeholder">{{ record.bookTitle ? record.bookTitle.charAt(0) : '' }}</div>
              </div>
              <div class="record-info">
                <div v-if="record.bookTitle" class="record-title">{{ record.bookTitle }}</div>
                <div v-if="record.bookAuthor" class="record-author">{{ record.bookAuthor }} · {{ record.bookPublisher }}</div>
                <div v-if="record.startTime && record.endTime" class="record-time-range">{{ formatTimeRange(record.startTime, record.endTime) }}</div>
                <div v-if="record.duration" class="record-duration">累计时长：{{ formatDuration(record.duration) }}</div>
                <div v-if="record.content" class="record-content">{{ record.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon">📅</span>
        <p>该日期没有操作记录</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import activityService from '@/services/activity';
import { useEventBus } from '@/utils/eventBus';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const timelineYear = ref(currentYear);
const timelineMonth = ref(currentMonth);
const timelineRecordCount = ref(10);
const selectedTimelineDate = ref<any>(null);
const timelineDateDetails = ref<any[]>([]);
const loadingTimelineDetails = ref(false);
const showCalendarPicker = ref(false);
const timelineCalendarDays = ref<any[]>([]);
const loadingCalendarDays = ref(false);
const eventBus = useEventBus();

const changeTimelineMonth = (delta: number) => {
  let newMonth = timelineMonth.value + delta;
  let newYear = timelineYear.value;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  timelineMonth.value = newMonth;
  timelineYear.value = newYear;
  selectedTimelineDate.value = null;
  loadCalendarDays();
};

const goToToday = () => {
  const today = new Date();
  timelineYear.value = today.getFullYear();
  timelineMonth.value = today.getMonth();
  loadCalendarDays();
  
  setTimeout(() => {
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDay = timelineCalendarDays.value.find(d => d.fullDate === todayDate);
    if (todayDay) {
      selectTimelineDate(todayDay);
    }
  }, 100);
};

const getDaysAgoText = (): string => {
  const now = new Date();
  const selectedDate = new Date(timelineYear.value, timelineMonth.value, 1);
  const diffTime = now.getTime() - selectedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '1 天前';
  if (diffDays < 30) return `${diffDays} 天前`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} 个月前`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} 年前`;
};

const loadCalendarDays = async () => {
  loadingCalendarDays.value = true;
  const days = [];
  const year = timelineYear.value;
  const month = timelineMonth.value;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDaysNeeded = startWeekday;

  for (let i = 0; i < prevDaysNeeded; i++) {
    const day = prevMonthLastDay - prevDaysNeeded + 1 + i;
    days.push({
      day,
      year,
      month: month - 1 < 0 ? 11 : month - 1,
      isCurrentMonth: false
    });
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  try {
    const activities = await activityService.getActivities({
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    });

    const dateMap = new Map<string, number>();
    activities.forEach(activity => {
      const date = activity.createdAt.split(' ')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const recordCount = dateMap.get(fullDate) || 0;

      days.push({
        day,
        year,
        month,
        isCurrentMonth: true,
        fullDate,
        hasAnyRecord: recordCount > 0
      });
    }
  } catch (error) {
    console.error('获取操作记录失败:', error);
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        year,
        month,
        isCurrentMonth: true,
        fullDate,
        hasAnyRecord: false
      });
    }
  }

  const totalCells = days.length;
  const nextDaysNeeded = 42 - totalCells;

  for (let i = 1; i <= nextDaysNeeded; i++) {
    days.push({
      day: i,
      year: month + 1 > 11 ? year + 1 : year,
      month: month + 1 > 11 ? 0 : month + 1,
      isCurrentMonth: false
    });
  }

  timelineCalendarDays.value = days;
  loadingCalendarDays.value = false;
};

onMounted(() => {
  loadCalendarDays();
  
  setTimeout(() => {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDay = timelineCalendarDays.value.find(d => d.fullDate === todayDate);
    if (todayDay) {
      selectTimelineDate(todayDay);
    }
  }, 100);
  
  eventBus.on('heatmap-data-updated', (data: any) => {
    console.log('📥 收到热力图数据更新事件:', data);
    if (selectedTimelineDate.value) {
      selectTimelineDate(selectedTimelineDate.value);
    }
  });
});

const getTimelineDayClass = (date: any): string => {
  const classes = [];

  if (!date.isCurrentMonth) {
    classes.push('calendar-day--other-month');
  } else if (date.hasAnyRecord) {
    classes.push('calendar-day--with-record');
  } else {
    classes.push('calendar-day--normal');
  }

  if (selectedTimelineDate.value && selectedTimelineDate.value.fullDate === date.fullDate) {
    classes.push('calendar-day--selected');
  }

  return classes.join(' ');
};

const getDayIndicatorClass = (date: any): string => {
  if (!date.isCurrentMonth || !date.hasAnyRecord) return '';
  return 'indicator-dot';
};

const selectTimelineDate = async (date: any) => {
  if (!date.isCurrentMonth || !date.fullDate) return;

  selectedTimelineDate.value = date;
  loadingTimelineDetails.value = true;

  try {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isToday = date.fullDate === todayDate;

    let activities: any[] = [];

    if (isToday) {
      const todayActivities = await activityService.getActivitiesByDate(date.fullDate);
      
      if (timelineRecordCount.value === 0 || todayActivities.length < timelineRecordCount.value) {
        const remainingCount = timelineRecordCount.value === 0 ? 100 : timelineRecordCount.value - todayActivities.length;
        const historicalActivities = await activityService.getActivities({
          limit: remainingCount
        });
        
        const historicalFiltered = historicalActivities.filter(a => {
          const activityDate = a.createdAt.split(' ')[0];
          return activityDate !== todayDate;
        });
        
        activities = [...todayActivities, ...historicalFiltered];
      } else {
        activities = todayActivities.slice(0, timelineRecordCount.value);
      }
    } else {
      const dateActivities = await activityService.getActivitiesByDate(date.fullDate);
      activities = dateActivities;
    }

    if (timelineRecordCount.value > 0) {
      activities = activities.slice(0, timelineRecordCount.value);
    }

    timelineDateDetails.value = activities;
  } catch (error) {
    console.error('加载时间线详情失败:', error);
    timelineDateDetails.value = [];
  } finally {
    loadingTimelineDetails.value = false;
  }
};

watch(timelineRecordCount, async () => {
  if (selectedTimelineDate.value) {
    await selectTimelineDate(selectedTimelineDate.value);
  }
});

const formatTimelineDate = (date: any): string => {
  if (!date) return '';
  return `${date.year}年${date.month + 1}月${date.day}日`;
};

const getTimelineDateStatus = (): string => {
  if (!timelineDateDetails.value || timelineDateDetails.value.length === 0) return '';

  const firstRecord = timelineDateDetails.value[0];
  const startTime = new Date(firstRecord.createdAt);
  const timeStr = startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return `${timeStr} 开始`;
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

const getActivityTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'bookmark_added': '添加书摘',
    'reading_state_changed': '阅读状态变更',
    'reading_record': '阅读记录',
    'reading_goal_set': '设置阅读目标'
  };
  return labels[type] || '未知操作';
};

const getActivityTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    'bookmark_added': 'activity-type--add',
    'reading_state_changed': 'activity-type--status',
    'reading_record': 'activity-type--reading',
    'reading_goal_set': 'activity-type--goal'
  };
  return classes[type] || 'activity-type--default';
};

const getActivityMarkerClass = (type: string): string => {
  const classes: Record<string, string> = {
    'bookmark_added': 'marker-dot--add',
    'reading_state_changed': 'marker-dot--status',
    'reading_record': 'marker-dot--reading',
    'reading_goal_set': 'marker-dot--goal'
  };
  return classes[type] || '';
};

const isToday = (date: any): boolean => {
  if (!date || !date.fullDate) return false;
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return date.fullDate === todayDate;
};

const getTodayActivities = (): any[] => {
  if (!timelineDateDetails.value || timelineDateDetails.value.length === 0) return [];
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return timelineDateDetails.value.filter(a => {
    const activityDate = a.createdAt.split(' ')[0];
    return activityDate === todayDate;
  });
};

const getHistoricalActivities = (): any[] => {
  if (!timelineDateDetails.value || timelineDateDetails.value.length === 0) return [];
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return timelineDateDetails.value.filter(a => {
    const activityDate = a.createdAt.split(' ')[0];
    return activityDate !== todayDate;
  });
};

const getTodayActivitiesCount = (): number => {
  return getTodayActivities().length;
};
</script>

<style scoped lang="scss">
.timeline-page {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-primary);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  background-color: var(--bg-card);
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .timeline-nav {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .timeline-nav-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;

    svg {
      width: 20px;
      height: 20px;
      fill: var(--text-secondary);
    }

    &:hover {
      background-color: var(--bg-tertiary);
      svg {
        fill: var(--primary-color);
      }
    }
  }

  .timeline-title {
    flex: 1;
    text-align: center;
  }

  .timeline-month-year {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .timeline-days-ago {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .timeline-filter {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .today-btn {
    padding: 8px 16px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--primary-color-dark);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .record-count-select {
    padding: 8px 12px;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    font-size: 14px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    outline: none;
  }

  .calendar-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;

    svg {
      width: 20px;
      height: 20px;
      fill: var(--text-secondary);
    }

    &:hover {
      background-color: var(--bg-tertiary);
      svg {
        fill: var(--primary-color);
      }
    }
  }
}

.mini-calendar {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 8px;
  }

  .mini-weekday {
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: 8px 0;
  }

  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .mini-calendar-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;

    &.calendar-day--other-month {
      color: var(--text-hint);
      opacity: 0.5;
    }

    &.calendar-day--normal {
      background-color: var(--bg-secondary);
      color: var(--text-secondary);

      &:hover {
        background-color: var(--bg-tertiary);
      }
    }

    &.calendar-day--with-record {
      background-color: rgba(255, 152, 0, 0.15);
      color: #ff9800;
      font-weight: 500;

      &:hover {
        background-color: rgba(255, 152, 0, 0.25);
      }
    }

    &.calendar-day--selected {
      background-color: var(--primary-color);
      color: white !important;
      font-weight: 600;
    }

    .mini-day-number {
      font-size: 14px;
      z-index: 1;
    }

    .mini-day-indicator {
      position: absolute;
      bottom: 4px;
    }

    .indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }
  }
}

.timeline-details {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-light);
  }

  .details-date {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .details-status {
    font-size: 14px;
    color: var(--text-secondary);
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
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-light);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .timeline-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .timeline-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-count {
    font-size: 12px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    padding: 2px 8px;
    border-radius: 12px;
  }

  .timeline-item {
    display: flex;
    gap: 16px;
  }

  .timeline-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .marker-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--primary-color);
    flex-shrink: 0;

    &.marker-dot--add {
      background-color: #4caf50;
    }

    &.marker-dot--delete {
      background-color: #f44336;
    }

    &.marker-dot--update {
      background-color: #2196f3;
    }

    &.marker-dot--status {
      background-color: #ff9800;
    }

    &.marker-dot--reading {
      background-color: #ff6b35;
    }

    &.marker-dot--goal {
      background-color: #9c27b0;
    }

    &.marker-dot--import {
      background-color: #00bcd4;
    }

    &.marker-dot--export {
      background-color: #8bc34a;
    }
  }

  .marker-line {
    flex: 1;
    width: 2px;
    background: linear-gradient(to bottom, var(--primary-color), transparent);
    margin: 4px 0;
  }

  .timeline-content {
    flex: 1;
    display: flex;
    gap: 12px;
    background-color: var(--bg-secondary);
    padding: 12px;
    border-radius: var(--radius-md);
  }

  .activity-type-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;

    &.activity-type--add {
      background-color: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }

    &.activity-type--delete {
      background-color: rgba(244, 67, 54, 0.15);
      color: #f44336;
    }

    &.activity-type--update {
      background-color: rgba(33, 150, 243, 0.15);
      color: #2196f3;
    }

    &.activity-type--status {
      background-color: rgba(255, 152, 0, 0.15);
      color: #ff9800;
    }

    &.activity-type--reading {
      background-color: rgba(255, 107, 53, 0.15);
      color: #ff6b35;
    }

    &.activity-type--goal {
      background-color: rgba(156, 39, 176, 0.15);
      color: #9c27b0;
    }

    &.activity-type--import {
      background-color: rgba(0, 188, 212, 0.15);
      color: #00bcd4;
    }

    &.activity-type--export {
      background-color: rgba(139, 195, 74, 0.15);
      color: #8bc34a;
    }

    &.activity-type--default {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
    }
  }

  .record-cover {
    flex-shrink: 0;
    width: 60px;
    height: 90px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background-color: var(--bg-tertiary);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-color);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  }

  .record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

  .record-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .record-author {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .record-time-range {
    font-size: 12px;
    color: var(--text-hint);
    margin-bottom: 4px;
  }

  .record-duration {
    font-size: 12px;
    color: var(--primary-color);
    font-weight: 500;
  }

  .record-content {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-hint);

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    p {
      font-size: 14px;
      margin: 0;
    }
  }
}
</style>
