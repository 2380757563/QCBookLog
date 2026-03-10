<template>
  <div class="heatmap-card card">
    <div class="card-header">
      <span class="card-title">🔥 阅读热力图</span>
      <span class="heatmap-period">{{ scrollHeatmapYearMonth }}</span>
    </div>

    <!-- 卷轴导航 -->
    <div class="scroll-heatmap-nav">
      <!-- 左侧透明大箭头 -->
      <div class="scroll-arrow-large scroll-arrow-left" @click="scrollHeatmapLeftStep" title="回溯更早的时间">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </div>

      <div class="scroll-heatmap-content-wrapper">
        <div class="scroll-heatmap-container" ref="scrollHeatmapContainer">
          <!-- 卷轴格子主体（列优先排列：N列×7行） -->
          <div
            class="scroll-heatmap-wrapper"
            ref="scrollHeatmapWrapper"
            @scroll="handleScrollHeatmapScroll"
          >
            <!-- 列上方时间标注 -->
            <div class="scroll-heatmap-months">
              <div
                v-for="(monthInfo, colIndex) in scrollHeatmapMonths"
                :key="`month-${colIndex}`"
                class="scroll-month-label"
              >
                <div class="scroll-month-year">{{ monthInfo.year }}</div>
                <div class="scroll-month-name">{{ monthInfo.month }}</div>
              </div>
            </div>

            <div class="scroll-heatmap-grid" :style="{ '--total-columns': heatmapMaxColumns }">
              <!-- 热力图格子（列优先：每列从上到下填充7天） -->
              <div
                  v-for="(column, colIndex) in scrollHeatmapColumnsData"
                  :key="`col-${colIndex}`"
                  class="heatmap-column"
                >
                <div
                  v-for="(day, rowIndex) in column"
                  :key="`${day.date}-${colIndex}-${rowIndex}`"
                  class="scroll-heatmap-cell"
                  :class="[
                    getHeatmapClass(day.count),
                    { 'scroll-cell--today': day.isToday }
                  ]"
                  :title="`${day.date}: ${day.count}条记录`"
                  @click="handleScrollHeatmapCellClick(day)"
                >
                  <div class="scroll-cell-content"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧固定星期标识栏 -->
      <div class="scroll-heatmap-weekdays-sidebar">
        <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="scroll-weekday-sidebar">{{ day }}</span>
      </div>

      <!-- 右侧透明大箭头 -->
      <div class="scroll-arrow-large scroll-arrow-right" @click="scrollHeatmapRightStep" title="查看更近的日期">
        <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </div>
    </div>

    <!-- 热力图图例 -->
    <div class="heatmap-legend">
      <span>少</span>
      <div class="legend-cell level-0"></div>
      <div class="legend-cell level-1"></div>
      <div class="legend-cell level-2"></div>
      <div class="legend-cell level-3"></div>
      <div class="legend-cell level-4"></div>
      <span>多</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBookmarkStore } from '@/store/bookmark';
import activityService from '@/services/activity';
import { useEventBus } from '@/utils/eventBus';
import { useHeatmapSettingsStore } from '@/store/heatmapSettings';

const router = useRouter();
const bookmarkStore = useBookmarkStore();
const eventBus = useEventBus();
const heatmapSettingsStore = useHeatmapSettingsStore();

const scrollHeatmapColumns = ref(7);
const scrollHeatmapOffset = ref(0);
const scrollHeatmapScrollLeft = ref(0);
const scrollHeatmapContainer = ref<HTMLElement | null>(null);
const scrollHeatmapWrapper = ref<HTMLElement | null>(null);
const scrollHeatmapYearMonth = ref('');
const heatmapStartYear = ref(new Date().getFullYear() - 1);
const heatmapEndYear = ref(new Date().getFullYear());
const HEATMAP_MIN_YEAR = 2018;
const allActivities = ref<any[]>([]);
const loadingActivities = ref(false);
const scrollHeatmapColumnsData = ref<any[]>([]);

// 计算热力图数据
const computeHeatmapColumns = () => {
  const columns = [];
  const today = new Date();

  // 起始和结束年份（只显示最近一年的数据）
  const startYear = heatmapStartYear.value;
  const endYear = heatmapEndYear.value;

  // 计算总天数：从去年的1月1日到今年12月31日
  const startDate = new Date(startYear, 0, 1);
  const endDate = new Date(endYear + 1, 0, 1);

  // 按日期分组
  const dateMap = new Map<string, number>();
  allActivities.value.forEach(a => {
    const date = a.createdAt.split(' ')[0];
    const existingCount = dateMap.get(date) || 0;
    let countToAdd = 0;
    
    if (a.type === 'bookmark_added') {
      countToAdd = 1;
    } else if (a.type === 'reading_record') {
      countToAdd = 1;
    } else if (a.type === 'reading_state_changed') {
      countToAdd = 1;
    } else if (a.type === 'reading_goal_set') {
      countToAdd = 1;
    }
    
    dateMap.set(date, existingCount + countToAdd);
  });

  // 找到起始日期之前的第一个周日
  let currentDate = new Date(startDate);
  const startDayOfWeek = currentDate.getDay();
  const daysToSunday = (7 - startDayOfWeek) % 7;
  currentDate.setDate(currentDate.getDate() + daysToSunday);

  // 初始化当前列（7个格子，严格对应周日到周六）
  let currentColumn: any[] = [];

  // 将所有日期按列优先排列，每列从周日开始到周六结束
  while (currentDate < endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = dateMap.get(dateStr) || 0;
    const dayOfWeek = currentDate.getDay(); // 0-6, 0是周日

    // 添加到当前列
    currentColumn.push({
      date: dateStr,
      count,
      dayOfWeek,
      isToday: currentDate.toDateString() === today.toDateString()
    });

    // 如果当前列填满7天（周日到周六），添加到columns并开始新列
    if (currentColumn.length === 7) {
      columns.push(currentColumn);
      currentColumn = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 如果最后一列未满7天，也添加进去
  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  scrollHeatmapColumnsData.value = columns;
};

// 使用requestIdleCallback优化数据计算
const computeHeatmapColumnsOptimized = () => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      computeHeatmapColumns();
    }, { timeout: 100 });
  } else {
    computeHeatmapColumns();
  }
};

// 计算列上方的时间标注（月份和年份）
const scrollHeatmapMonths = computed(() => {
  const columns = scrollHeatmapColumnsData.value;
  if (columns.length === 0) return [];

  const monthLabels: Array<{ year: string; month: string }> = [];
  let lastMonth = '';

  columns.forEach((column, colIndex) => {
    if (column.length === 0) {
      monthLabels.push({ year: '', month: '' });
      return;
    }

    // 获取该列第一个日期
    const firstDate = new Date(column[0].date);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;

    // 判断是否需要显示年份（只在1月份显示年份）
    const showYear = month === 1;
    const yearLabel = showYear ? `${year}` : '';
    const monthLabel = `${month}月`;

    monthLabels.push({
      year: yearLabel,
      month: monthLabel
    });

    lastMonth = monthKey;
  });

  return monthLabels;
});

// 计算热力图的最大列数
const heatmapMaxColumns = computed(() => {
  return scrollHeatmapColumnsData.value.length;
});

// 格式化卷轴热力图的年月标识
const formatScrollHeatmapYearMonth = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
};

// 根据滚动位置计算可见的日期范围
let updateYearMonthThrottleId: number | null = null;

const updateScrollHeatmapYearMonth = () => {
  // 使用节流避免频繁计算
  if (updateYearMonthThrottleId !== null) {
    return;
  }
  
  updateYearMonthThrottleId = requestAnimationFrame(() => {
    updateYearMonthThrottleId = null;
    
    const wrapper = scrollHeatmapWrapper.value;
    if (!wrapper) return;

    const columns = scrollHeatmapColumnsData.value;
    if (columns.length === 0) return;

    const maxColumns = heatmapMaxColumns.value;

    // 根据屏幕宽度计算格子宽度（与CSS保持一致）
    // 桌面端：40px（格子宽度）+ 8px（列之间的gap）= 48px
    // 移动端：28px（格子宽度）+ 8px（列之间的gap）= 36px
    const isMobile = window.innerWidth <= 768;
    const cellWidth = isMobile ? 36 : 48;

    // 计算可见的列范围
    const startColumnIndex = Math.floor(wrapper.scrollLeft / cellWidth);
    const endColumnIndex = Math.min(
      startColumnIndex + Math.ceil(wrapper.offsetWidth / cellWidth),
      maxColumns
    );

    // 获取可见范围内的第一个和最后一个日期
    let firstDate = null;
    let lastDate = null;

    // 获取第一个可见列的第一个日期
    if (startColumnIndex < columns.length && columns[startColumnIndex].length > 0) {
      firstDate = columns[startColumnIndex][0].date;
    }

    // 获取最后一个可见列的最后一个日期
    if (endColumnIndex > 0 && endColumnIndex <= columns.length) {
      const lastColumn = columns[endColumnIndex - 1];
      if (lastColumn && lastColumn.length > 0) {
        lastDate = lastColumn[lastColumn.length - 1].date;
      }
    }

    if (firstDate) {
      if (lastDate && firstDate !== lastDate) {
        scrollHeatmapYearMonth.value = `${formatScrollHeatmapYearMonth(firstDate)} - ${formatScrollHeatmapYearMonth(lastDate)}`;
      } else {
        scrollHeatmapYearMonth.value = formatScrollHeatmapYearMonth(firstDate);
      }
    }
  });
};

// 卷轴热力图滚动处理
const handleScrollHeatmapScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollHeatmapScrollLeft.value = target.scrollLeft;
  updateScrollHeatmapYearMonth();
};

// 处理热力图滚轮事件，将垂直滚轮转换为水平滚动
let wheelAnimationId: number | null = null;
let wheelVelocity = 0;
let lastWheelTime = 0;

const handleHeatmapWheel = (event: WheelEvent) => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  // 只处理垂直滚轮事件
  if (event.deltaY !== 0) {
    // 阻止默认的垂直滚动行为
    event.preventDefault();
    
    // 取消之前的动画
    if (wheelAnimationId !== null) {
      cancelAnimationFrame(wheelAnimationId);
    }
    
    // 计算滚轮速度,根据设备类型调整灵敏度
    const now = Date.now();
    const deltaTime = now - lastWheelTime;
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 移动设备使用较低灵敏度,PC端使用较高灵敏度
    // 从store读取灵敏度设置
    const sensitivity = isMobile 
      ? heatmapSettingsStore.wheelSensitivity * 0.66 
      : heatmapSettingsStore.wheelSensitivity;
    const scrollAmount = event.deltaY * sensitivity;
    
    // 计算速度用于平滑滚动
    if (deltaTime > 0) {
      wheelVelocity = scrollAmount;
    }
    
    lastWheelTime = now;
    
    // 使用requestAnimationFrame实现平滑滚动
    const smoothScroll = () => {
      if (Math.abs(wheelVelocity) < 0.1) {
        wheelAnimationId = null;
        updateScrollHeatmapYearMonth();
        return;
      }
      
      wrapper.scrollLeft += wheelVelocity;
      wheelVelocity *= 0.92; // 摩擦系数,使滚动逐渐停止
      
      // 检查边界
      const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
      if (wrapper.scrollLeft < 0 || wrapper.scrollLeft > maxScrollLeft) {
        wheelAnimationId = null;
        updateScrollHeatmapYearMonth();
        return;
      }
      
      wheelAnimationId = requestAnimationFrame(smoothScroll);
    };
    
    wheelAnimationId = requestAnimationFrame(smoothScroll);
  }
};

// 处理触摸滑动事件，适配卷轴屏设备的横向滚动
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let velocityX = 0;
let isDragging = false;
let animationFrameId: number | null = null;
let lastScrollUpdateTime = 0;

const handleTouchStart = (event: TouchEvent) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  lastTouchX = touchStartX;
  lastTouchY = touchStartY;
  touchStartTime = Date.now();
  velocityX = 0;
  isDragging = false;
  lastScrollUpdateTime = 0;
  
  // 取消任何正在进行的惯性滚动
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const handleTouchMove = (event: TouchEvent) => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const touchEndX = event.touches[0].clientX;
  const touchEndY = event.touches[0].clientY;
  
  const deltaX = touchStartX - touchEndX;
  const deltaY = touchStartY - touchEndY;
  
  // 如果水平滑动距离大于垂直滑动距离，则阻止默认行为并横向滚动
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
    event.preventDefault();
    isDragging = true;
    
    // 计算速度,使用更精确的时间差
    const now = Date.now();
    const deltaTime = now - lastScrollUpdateTime;
    
    if (deltaTime > 0) {
      // 计算瞬时速度用于惯性滚动
      velocityX = (lastTouchX - touchEndX) / deltaTime * 16;
    }
    
    // 应用灵敏度缩放到滑动距离
    // 灵敏度值越小，滑动距离的缩放越小
    // 将灵敏度值（1-15）映射到缩放因子（0.1-1.5）
    const sensitivityFactor = heatmapSettingsStore.touchSensitivity / 10;
    const scaledDeltaX = deltaX * sensitivityFactor;
    
    // 直接更新scrollLeft,避免延迟
    wrapper.scrollLeft += scaledDeltaX;
    
    // 节流更新年月显示,避免频繁计算
    if (now - lastScrollUpdateTime > 50) {
      updateScrollHeatmapYearMonth();
      lastScrollUpdateTime = now;
    }
    
    lastTouchX = touchEndX;
    lastTouchY = touchEndY;
  }
};

const handleTouchEnd = () => {
  if (!isDragging) return;
  
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;
  
  // 应用惯性滚动,降低最小速度阈值以获得更自然的惯性
  if (Math.abs(velocityX) > 0.3) {
    applyInertiaScroll(wrapper);
  }
  
  touchStartX = 0;
  touchStartY = 0;
  lastTouchX = 0;
  lastTouchY = 0;
  isDragging = false;
  velocityX = 0;
  
  // 最终更新年月显示
  updateScrollHeatmapYearMonth();
};

// 惯性滚动
const applyInertiaScroll = (wrapper: HTMLElement) => {
  let currentVelocity = velocityX;
  const friction = heatmapSettingsStore.touchFriction;
  const minVelocity = heatmapSettingsStore.touchMinVelocity;
  let lastUpdateTime = Date.now();
  
  const scroll = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTime;
    
    if (Math.abs(currentVelocity) < minVelocity) {
      animationFrameId = null;
      updateScrollHeatmapYearMonth();
      return;
    }
    
    wrapper.scrollLeft += currentVelocity;
    currentVelocity *= friction;
    
    // 检查边界
    const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
    if (wrapper.scrollLeft < 0 || wrapper.scrollLeft > maxScrollLeft) {
      animationFrameId = null;
      updateScrollHeatmapYearMonth();
      return;
    }
    
    // 节流更新年月显示
    if (deltaTime > 50) {
      updateScrollHeatmapYearMonth();
      lastUpdateTime = now;
    }
    
    animationFrameId = requestAnimationFrame(scroll);
  };
  
  animationFrameId = requestAnimationFrame(scroll);
};

// 初始化热力图事件监听
const initHeatmapEventListeners = () => {
  nextTick(() => {
    if (scrollHeatmapWrapper.value) {
      scrollHeatmapWrapper.value.addEventListener('wheel', handleHeatmapWheel, { passive: false });
      scrollHeatmapWrapper.value.addEventListener('touchstart', handleTouchStart, { passive: true });
      scrollHeatmapWrapper.value.addEventListener('touchmove', handleTouchMove, { passive: false });
      scrollHeatmapWrapper.value.addEventListener('touchend', handleTouchEnd, { passive: true });
    } else {
    }
  });
};

// 卷轴热力图向左滚动（查看更早的数据）
const scrollHeatmapLeftStep = () => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const cellWidth = 48; // 格子宽度40px + gap 8px
  const visibleColumns = Math.ceil(wrapper.offsetWidth / cellWidth);
  
  // 平滑滚动，每次滚动可见列数的80%
  const scrollStep = Math.max(1, Math.floor(visibleColumns * 0.8));
  const newScrollLeft = Math.max(0, wrapper.scrollLeft - cellWidth * scrollStep);
  
  wrapper.scrollTo({
    left: newScrollLeft,
    behavior: 'smooth'
  });
  
  updateScrollHeatmapYearMonth();
};

// 卷轴热力图向右滚动（查看更近的数据）
const scrollHeatmapRightStep = () => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const maxColumns = heatmapMaxColumns.value;
  const cellWidth = 48; // 格子宽度40px + gap 8px
  const maxScrollLeft = maxColumns * cellWidth - wrapper.offsetWidth;

  const visibleColumns = Math.ceil(wrapper.offsetWidth / cellWidth);
  
  // 平滑滚动，每次滚动可见列数的80%
  const scrollStep = Math.max(1, Math.floor(visibleColumns * 0.8));
  const newScrollLeft = Math.min(maxScrollLeft, wrapper.scrollLeft + cellWidth * scrollStep);
  
  wrapper.scrollTo({
    left: newScrollLeft,
    behavior: 'smooth'
  });
  
  updateScrollHeatmapYearMonth();
};

// 处理热力图卷轴单元格点击
const handleScrollHeatmapCellClick = async (day: any) => {
  // 跳转到时间线页面并传递日期参数
  router.push({
    path: '/reading',
    query: { tab: 'timeline', date: day.date }
  });
};

// 初始化热力图滚动到今天的位置
const initHeatmapScrollToToday = () => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const columns = scrollHeatmapColumnsData.value;
  if (columns.length === 0) return;

  // 找到今天的日期所在的列
  let todayColumn = -1;
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const column = columns[colIndex];
    const todayCell = column.find((d: any) => d.isToday);
    if (todayCell) {
      todayColumn = colIndex;
      break;
    }
  }

  if (todayColumn >= 0) {
    // 根据屏幕宽度计算格子宽度（与CSS保持一致）
    // 桌面端：40px（格子宽度）+ 8px（列之间的gap）= 48px
    // 移动端：28px（格子宽度）+ 8px（列之间的gap）= 36px
    const isMobile = window.innerWidth <= 768;
    const cellWidth = isMobile ? 36 : 48;

    // 计算滚动位置，让今天在视图中居中
    const scrollToToday = Math.max(0, todayColumn * cellWidth - wrapper.offsetWidth / 2);
    wrapper.scrollLeft = scrollToToday;
    updateScrollHeatmapYearMonth();
  }
};

// 热力图颜色等级（根据阅读记录数量动态调整颜色深度）
const getHeatmapClass = (count: number): string => {
  if (count === 0) return 'level-0';
  if (count <= 3) return 'level-1';
  if (count <= 10) return 'level-2';
  if (count <= 20) return 'level-3';
  return 'level-4';
};

// 监听窗口大小变化，自适应热力图列数
const handleResize = () => {
  // 强制重新计算列数
  if (scrollHeatmapWrapper.value) {
    updateScrollHeatmapYearMonth();
  }
};

// 组件挂载
onMounted(async () => {
  // 添加窗口大小监听
  window.addEventListener('resize', handleResize);

  // 初始化热力图事件监听器（在DOM渲染完成后）
  initHeatmapEventListeners();

  // 加载操作记录数据
  loadActivities();

  // 验证热力图数据与日期对应是否准确
  validateHeatmapData();

  // 等待数据加载完成后滚动到今天
  setTimeout(() => {
    initHeatmapScrollToToday();
  }, 300);
});

// 加载操作记录数据
const loadActivities = async () => {
  loadingActivities.value = true;
  try {
    const startYear = heatmapStartYear.value;
    const endYear = heatmapEndYear.value;
    const startDate = new Date(startYear, 0, 1);
    const endDate = new Date(endYear + 1, 0, 1);

    const startDateStr = `${startYear}-01-01`;
    const endDateStr = `${endYear + 1}-01-01`;

    const activities = await activityService.getActivities({
      startDate: startDateStr,
      endDate: endDateStr
    });

    allActivities.value = activities;

    // 使用优化的计算方法
    computeHeatmapColumnsOptimized();
    
    eventBus.emit('heatmap-data-updated', { activities });
  } catch (error) {
    // 静默处理加载失败
  } finally {
    loadingActivities.value = false;
  }
};

// 监听年份变化
watch([heatmapStartYear, heatmapEndYear], () => {
  loadActivities();
});

// 验证热力图数据与日期对应是否准确
const validateHeatmapData = () => {
  const columns = scrollHeatmapColumnsData.value;
  if (columns.length === 0) return;

  let hasError = false;

  columns.forEach((column, colIndex) => {
    if (column.length === 0) return;

    // 验证每列的第一个元素是否为周日（dayOfWeek === 0）
    const firstDay = column[0];
    if (firstDay.dayOfWeek !== 0) {
      hasError = true;
    }

    // 验证每列的最后一个元素是否为周六（dayOfWeek === 6）
    const lastDay = column[column.length - 1];
    if (lastDay.dayOfWeek !== 6 && column.length === 7) {
      hasError = true;
    }

    // 验证每列的连续性
    for (let i = 0; i < column.length - 1; i++) {
      const current = new Date(column[i].date);
      const next = new Date(column[i + 1].date);
      const diffDays = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays !== 1) {
        hasError = true;
      }
    }
  });

  if (!hasError) {
    // 热力图数据验证通过：每列严格对应周日至周六
  }
};

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  // 取消所有正在进行的动画帧
  if (wheelAnimationId !== null) {
    cancelAnimationFrame(wheelAnimationId);
    wheelAnimationId = null;
  }
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  if (updateYearMonthThrottleId !== null) {
    cancelAnimationFrame(updateYearMonthThrottleId);
    updateYearMonthThrottleId = null;
  }
  
  // 移除热力图滚轮和触摸事件监听
  if (scrollHeatmapWrapper.value) {
    scrollHeatmapWrapper.value.removeEventListener('wheel', handleHeatmapWheel);
    scrollHeatmapWrapper.value.removeEventListener('touchstart', handleTouchStart);
    scrollHeatmapWrapper.value.removeEventListener('touchmove', handleTouchMove);
    scrollHeatmapWrapper.value.removeEventListener('touchend', handleTouchEnd);
  }
});

// // 监听热力图数据变化，初始化滚动位置
watch(scrollHeatmapColumnsData, () => {
  if (scrollHeatmapWrapper.value) {
    setTimeout(() => {
      initHeatmapScrollToToday();
    }, 100);
  }
});

// 监听热力图设置变化,确保参数实时生效
watch(() => heatmapSettingsStore.wheelSensitivity, () => {
  // 热力图滚轮灵敏度已更新
});

watch(() => heatmapSettingsStore.touchSensitivity, () => {
  // 热力图触摸灵敏度已更新
});

watch(() => heatmapSettingsStore.touchFriction, () => {
  // 热力图摩擦系数已更新
});

watch(() => heatmapSettingsStore.touchMinVelocity, () => {
  // 热力图最小速度阈值已更新
});

// 监听读者切换事件
eventBus.on('reader-changed', (data: any) => {
  // 重新加载热力图数据
  loadActivities();
});

// 暴露给父组件的方法
defineExpose({
  initHeatmapScrollToToday,
  initHeatmapEventListeners
});
</script>

<style scoped>
.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
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

/* 热力图 */
.heatmap-card {
  overflow: hidden;
}

.heatmap-period {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 卷轴热力图导航 */
.scroll-heatmap-nav {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  position: relative;
  max-height: 480px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .scroll-heatmap-nav {
    max-height: 320px;
    gap: 8px;
    margin: 12px 0;
  }
}

.scroll-arrow-large {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: calc(40px * 7 + 6px * 6 + 40px + 8px + 16px * 2);
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .scroll-arrow-large {
    width: 32px;
    height: calc(32px * 7 + 4px * 6 + 32px + 4px + 12px * 2);
  }

  .scroll-arrow-large svg {
    width: 20px;
    height: 20px;
  }
}

.scroll-arrow-large:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.02);
}

.scroll-arrow-large svg {
  width: 32px;
  height: 32px;
  fill: var(--text-primary);
  opacity: 0.7;
}

.scroll-arrow-large:hover svg {
  opacity: 1;
}

.scroll-heatmap-container {
  flex: 1;
  overflow: hidden;
  background-color: #fafafa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  gap: 12px;
  max-height: 440px;
}

@media (max-width: 768px) {
  .scroll-heatmap-container {
    padding: 8px;
    gap: 8px;
    max-height: 280px;
  }
}

.scroll-heatmap-content-wrapper {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-width: 0;
}

.scroll-heatmap-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
  position: relative;
  scroll-behavior: auto;
  overscroll-behavior-x: contain;
  will-change: scroll-position;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.scroll-heatmap-wrapper::-webkit-scrollbar {
  height: 8px;
}

.scroll-heatmap-wrapper::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.scroll-heatmap-wrapper::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.scroll-heatmap-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: #999;
}

.scroll-heatmap-months {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  min-width: max-content;
}

.scroll-month-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  gap: 2px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .scroll-month-label {
    min-width: 28px;
    height: 28px;
  }
}

.scroll-month-year {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

.scroll-month-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.scroll-heatmap-grid {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

@media (max-width: 768px) {
  .scroll-heatmap-grid {
    gap: 8px;
  }
}

.heatmap-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 40px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .heatmap-column {
    min-width: 28px;
    gap: 6px;
  }
}

.scroll-heatmap-weekdays-sidebar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 8px;
  padding-top: 48px;
  border-left: 1px solid #e0e0e0;
  flex-shrink: 0;
  min-height: calc(40px * 7 + 6px * 6);
  overflow: hidden;
}

.scroll-weekday-sidebar {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 4px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-heatmap-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  min-width: 40px;
  min-height: 40px;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  cursor: pointer;
  position: relative;
  will-change: transform;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

@media (max-width: 768px) {
  .scroll-heatmap-cell {
    min-width: 28px;
    min-height: 28px;
  }
}

.scroll-heatmap-cell:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1;
}

.scroll-cell--today {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--primary-color);
}

.scroll-heatmap-cell.level-0 { background-color: #ebedf0; }
.scroll-heatmap-cell.level-1 { background-color: #ffe0cc; }
.scroll-heatmap-cell.level-2 { background-color: #ffb380; }
.scroll-heatmap-cell.level-3 { background-color: #ff8533; }
.scroll-heatmap-cell.level-4 { background-color: #ff6b35; }

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-hint);
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
