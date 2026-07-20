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
        <!-- 年份书签：贴在热力图框顶部左侧，底部与框线连接，类似文件夹标签 -->
        <div class="heatmap-bookmark-bar">
          <YearBookmark
            ref="yearBookmarkRef"
            :years="bookmarkYears"
            @select="handleBookmarkYearSelect"
            @scroll="handleBookmarkScroll"
            @toggle="handleBookmarkToggle"
          />
        </div>

        <div class="scroll-heatmap-container" ref="scrollHeatmapContainer">
          <!-- 月份标签条：放在卷轴格子之上，与格子共享同一水平滚动，
               通过独立的列宽映射与格子严格对齐，避免遮挡热力图内容 -->
          <div class="scroll-month-rail-wrapper">
            <div
              class="scroll-month-rail"
              :style="{ '--total-columns': heatmapMaxColumns }"
            >
              <div
                v-for="(monthGroup, groupIndex) in scrollHeatmapMonths"
                :key="`month-group-${groupIndex}`"
                class="scroll-month-group"
                :style="{
                  '--group-start': monthGroup.startCol + 1,
                  '--group-span': monthGroup.span
                }"
              >
                <div class="scroll-month-label">
                  <div class="scroll-month-year">{{ monthGroup.year }}</div>
                  <div class="scroll-month-name">{{ monthGroup.month }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 卷轴格子主体 + 右侧固定星期标识栏（行布局） -->
          <div class="scroll-heatmap-body">
            <div
              class="scroll-heatmap-wrapper"
              :class="{ 'is-scrolling': isScrolling }"
              ref="scrollHeatmapWrapper"
              @scroll="handleScrollHeatmapScroll"
            >
              <!-- 热力图格子（列优先：每列从上到下填充7天）；
                   列与列之间有 8px（桌面）/ 4px（移动）gap，避免方格黏连 -->
              <div
                class="scroll-heatmap-grid"
                :style="{
                  '--total-columns': heatmapMaxColumns,
                  '--cell-size': getScrollCellWidthPx,
                  '--column-gap': getScrollColumnGapPx
                }"
              >
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

            <!-- 右侧固定星期标识栏 -->
            <div class="scroll-heatmap-weekdays-sidebar">
              <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="scroll-weekday-sidebar">{{ day }}</span>
            </div>
          </div>
        </div>
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
import { useBookmarkStore } from '@/stores/bookmark';
import activityService from '@/api/activity';
import { useEventBus } from '@/utils/eventBus';
import { useHeatmapSettingsStore } from '@/stores/heatmapSettings';
import YearBookmark from '@/components/YearBookmark/YearBookmark.vue';

const router = useRouter();
const bookmarkStore = useBookmarkStore();
const eventBus = useEventBus();
const heatmapSettingsStore = useHeatmapSettingsStore();

const scrollHeatmapColumns = ref(7);
const scrollHeatmapOffset = ref(0);
const scrollHeatmapScrollLeft = ref(0);
const scrollHeatmapContainer = ref<HTMLElement | null>(null);
const scrollHeatmapWrapper = ref<HTMLElement | null>(null);
const yearBookmarkRef = ref<InstanceType<typeof import('@/components/YearBookmark/YearBookmark.vue').default> | null>(null);

/**
 * 滚动状态标记（性能优化）
 * - true：父级 wrapper 加 .is-scrolling 类，禁用 cell transition、降低合成压力
 * - false：恢复 hover transition
 * 触发：scroll 事件开始时设 true，100ms 内无 scroll 事件则 reset false
 */
const isScrolling = ref(false);
let scrollIdleTimer: number | null = null;
const SCROLL_IDLE_MS = 100;
const scrollHeatmapYearMonth = ref('');
const heatmapStartYear = ref(new Date().getFullYear() - 1);
const heatmapEndYear = ref(new Date().getFullYear());
// 起始年份默认下界（防止未设置时无限回溯），可在 store 中由用户自定义更低
const HEATMAP_DEFAULT_MIN_YEAR = 2000;
const allActivities = ref<any[]>([]);
const loadingActivities = ref(false);
const scrollHeatmapColumnsData = ref<any[]>([]);

// ==================== 年份书签 ====================

/**
 * 根据 bookmarkRange 配置计算要显示的年份列表（从小到大排序）
 */
const bookmarkYears = computed((): number[] => {
  const currentYear = new Date().getFullYear();
  const range = heatmapSettingsStore.bookmarkRange;
  // 用户自定义起始年份（无 2018 硬编码限制）
  const userStart = heatmapSettingsStore.startYear || HEATMAP_DEFAULT_MIN_YEAR;
  let startYear: number;

  switch (range) {
    case '3y':
      startYear = currentYear - 2; // 近3年（含今年）
      break;
    case '5y':
      startYear = currentYear - 4; // 近5年
      break;
    case '10y':
      startYear = currentYear - 9; // 近10年
      break;
    case 'all':
    default:
      startYear = HEATMAP_DEFAULT_MIN_YEAR;
      break;
  }

  // 用户自定义起始年份取较新值（即用户设置 = 锚定下界）
  startYear = Math.max(startYear, userStart);
  const years: number[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
});

/**
 * 点击书签跳转到对应年份（1月1日所在列居中）
 */
const handleBookmarkYearSelect = (year: number) => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const columns = scrollHeatmapColumnsData.value;
  if (columns.length === 0) return;

  // 找到该年 1 月第一列的索引
  let targetIdx = -1;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (col.length === 0) continue;
    const firstDate = new Date(col[0].date);
    if (firstDate.getFullYear() === year) {
      targetIdx = i;
      break;
    }
  }

  if (targetIdx === -1) return;

  const isMobile = window.innerWidth <= 768;
  const cellWidth = isMobile ? 20 : 48;
  const scrollTo = Math.max(0, targetIdx * cellWidth - wrapper.offsetWidth / 2);
  wrapper.scrollTo({ left: scrollTo, behavior: 'smooth' });
};

/**
 * 书签划动时同步热力图 scrollLeft（仅在书签展开态有意义）
 * @param scrollLeftPx 书签 track 的偏移量（px）
 */
const handleBookmarkScroll = (scrollLeftPx: number) => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;
  // 书签步进宽 = 40 + 4 = 44；热力图 cell 宽 = 48(桌面) / 20(移动) + 8/4 gap
  // 比例换算：scrollLeftHeatmap ≈ scrollLeftBookmark * (heatmapStep / bookmarkStep)
  const isMobile = window.innerWidth <= 768;
  const heatmapCellW = isMobile ? 20 : 48;
  const heatmapGap = isMobile ? 4 : 8;
  const heatmapStep = heatmapCellW + heatmapGap;
  const ratio = heatmapStep / 44;
  wrapper.scrollTo({
    left: scrollLeftPx * ratio,
    behavior: 'auto'
  });
};

/**
 * 书签展开/收起状态变化（占位：可用于埋点 / 调整布局）
 */
const handleBookmarkToggle = (_expanded: boolean) => {
  // 暂不处理，后续可在此处调整 month-rail / wrapper 高度
  void _expanded;
};

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

// 计算列上方的时间标注（按月分组合并，避免标签重叠遮挡）
interface MonthGroup {
  year: string;
  month: string;
  /** 起始列索引 */
  startCol: number;
  /** 跨越列数 */
  span: number;
}
const scrollHeatmapMonths = computed<MonthGroup[]>(() => {
  const columns = scrollHeatmapColumnsData.value;
  if (columns.length === 0) return [];

  // 先识别出每个月的列范围（按该列的"主月"作为月分界）
  // 主月：取该列中日期最多的月份；若并列则取第一行所属月份
  const groups: MonthGroup[] = [];
  let currentGroupKey = '';
  let currentGroupStart = 0;
  let currentGroupMonthLabel = '';
  let currentGroupYearLabel = '';
  let currentGroupMonthCount = 0;

  const flushGroup = (endCol: number) => {
    if (currentGroupMonthCount === 0) return;
    groups.push({
      year: currentGroupYearLabel,
      month: currentGroupMonthLabel,
      startCol: currentGroupStart,
      span: Math.max(1, endCol - currentGroupStart)
    });
  };

  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    const column = columns[colIndex];
    if (column.length === 0) {
      // 空列，结束当前组
      flushGroup(colIndex);
      currentGroupKey = '';
      currentGroupMonthCount = 0;
      continue;
    }

    // 统计该列中每个月出现的次数
    const monthCounter = new Map<string, number>();
    let firstDate: Date | null = null;
    for (const day of column) {
      const d = new Date(day.date);
      if (!firstDate) firstDate = d;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounter.set(key, (monthCounter.get(key) || 0) + 1);
    }
    if (!firstDate) continue;

    // 找到出现次数最多的月份
    let mainKey = '';
    let maxCount = 0;
    for (const [key, count] of monthCounter) {
      if (count > maxCount) {
        maxCount = count;
        mainKey = key;
      }
    }
    if (!mainKey) mainKey = `${firstDate.getFullYear()}-${firstDate.getMonth()}`;

    if (mainKey !== currentGroupKey) {
      // 月份变化，结束上一个组
      flushGroup(colIndex);
      const [y, m] = mainKey.split('-').map(Number);
      currentGroupKey = mainKey;
      currentGroupStart = colIndex;
      currentGroupMonthLabel = `${m + 1}月`;
      // 仅在 1 月或第一个组显示年份，避免信息冗余
      currentGroupYearLabel = m === 0 ? `${y}` : '';
      currentGroupMonthCount = maxCount;
    } else {
      currentGroupMonthCount += maxCount;
    }
  }

  // 处理最后一组
  flushGroup(columns.length);

  // 过滤掉过窄的组（span < 1 几乎不可见），保留占位为空
  return groups.filter(g => g.span >= 1);
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
    // 移动端：16px（格子宽度）+ 4px（列之间的gap）= 20px
    const isMobile = window.innerWidth <= 768;
    const cellWidth = isMobile ? 20 : 48;

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

    // 根据可见区中心位置的列，计算当前展示的年份，同步到书签高亮
    const centerColumnIndex = Math.floor(
      (startColumnIndex + endColumnIndex) / 2
    );
    if (centerColumnIndex >= 0 && centerColumnIndex < columns.length) {
      const centerCol = columns[centerColumnIndex];
      if (centerCol && centerCol.length > 0 && centerCol[0].date) {
        const centerYear = new Date(centerCol[0].date).getFullYear();
        if (centerYear !== heatmapSettingsStore.selectedYear) {
          heatmapSettingsStore.setSelectedYear(centerYear);
        }
      }
    }
  });
};

// 卷轴热力图滚动处理
/**
 * 性能优化：滚动处理使用 rAF 节流
 * - 同步月份标签条（高频）：用 rAF 合并多次滚动事件，每帧最多执行一次
 * - 更新年月显示（低频）：已有 throttle，无需重复
 * - 滚动状态标记：scroll 开始时设 true，停止 100ms 后设 false
 */
let scrollSyncFrameId: number | null = null;
const handleScrollHeatmapScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollHeatmapScrollLeft.value = target.scrollLeft;

  // 标记为滚动中（用于禁用 cell transition）
  if (!isScrolling.value) {
    isScrolling.value = true;
  }
  if (scrollIdleTimer != null) {
    clearTimeout(scrollIdleTimer);
  }
  scrollIdleTimer = window.setTimeout(() => {
    isScrolling.value = false;
    scrollIdleTimer = null;
  }, SCROLL_IDLE_MS);

  // 同步月份标签条（rAF 节流：每帧最多一次）
  if (scrollSyncFrameId === null) {
    scrollSyncFrameId = requestAnimationFrame(() => {
      scrollSyncFrameId = null;
      syncMonthRailScroll();
    });
  }

  // 更新年月显示（内部已节流）
  updateScrollHeatmapYearMonth();
};

/**
 * 同步月份标签条的横向滚动位置
 * 性能优化：使用 CSS 变量传递 scrollLeft，浏览器可在 compositor 线程处理，
 * 避免 layout thrashing。
 */
const syncMonthRailScroll = () => {
  const wrapper = scrollHeatmapWrapper.value;
  const rail = document.querySelector('.scroll-month-rail-wrapper > .scroll-month-rail') as HTMLElement | null;
  if (!wrapper || !rail) return;
  // 用 CSS 变量触发 transform 更新（GPU 合成，不触发重排）
  rail.style.setProperty('--rail-translate-x', `-${wrapper.scrollLeft}px`);
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

// 计算当前设备下的格子宽度（桌面48 / 移动20）
const getScrollCellWidth = () => (window.innerWidth <= 768 ? 20 : 48);

/**
 * 返回格子本身宽度（不含列间隙），用于 CSS 变量配置 grid 列宽；
 * 注意：返回带 px 单位的字符串，否则 calc(var(--cell-size) + var(--column-gap))
 * 会因无单位数字与带单位 px 相加类型不匹配而被浏览器解析为 0，导致所有列宽为 0、格子不可见。
 * 桌面：40px；移动：16px
 *
 * 性能优化：改为 computed，依赖窗口宽度（响应式 + 缓存），避免每次重渲染调用函数
 */
const isMobileView = ref(typeof window !== 'undefined' && window.innerWidth <= 768);
const handleViewportResize = () => {
  isMobileView.value = window.innerWidth <= 768;
};
const getScrollCellWidthPx = computed(() => (isMobileView.value ? '16px' : '40px'));

/**
 * 返回列间距（带 px 单位的字符串），用于 CSS 变量 --column-gap；
 * 桌面 8px；移动 4px
 */
const getScrollColumnGapPx = computed(() => (isMobileView.value ? '4px' : '8px'));

// 卷轴热力图向左滚动（查看更早的数据）
const scrollHeatmapLeftStep = () => {
  const wrapper = scrollHeatmapWrapper.value;
  if (!wrapper) return;

  const cellWidth = getScrollCellWidth();
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
  const cellWidth = getScrollCellWidth();
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
    // 移动端：16px（格子宽度）+ 4px（列之间的gap）= 20px
    const isMobile = window.innerWidth <= 768;
    const cellWidth = isMobile ? 20 : 48;

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
  // 更新移动端标记
  isMobileView.value = window.innerWidth <= 768;
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

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  // 清理所有未完成的 rAF
  if (updateYearMonthThrottleId !== null) {
    cancelAnimationFrame(updateYearMonthThrottleId);
    updateYearMonthThrottleId = null;
  }
  if (wheelAnimationId !== null) {
    cancelAnimationFrame(wheelAnimationId);
    wheelAnimationId = null;
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (scrollSyncFrameId !== null) {
    cancelAnimationFrame(scrollSyncFrameId);
    scrollSyncFrameId = null;
  }
  if (scrollIdleTimer !== null) {
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = null;
  }
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

// 监听书签范围变化，同步更新热力图数据范围
watch(
  () => heatmapSettingsStore.bookmarkRange,
  () => {
    const years = bookmarkYears.value;
    if (years.length > 0) {
      heatmapStartYear.value = years[0];
      heatmapEndYear.value = years[years.length - 1];
    }
  },
  { immediate: true }
);

// 监听用户自定义起始年份变化
watch(
  () => heatmapSettingsStore.startYear,
  (newStart) => {
    if (typeof newStart === 'number' && newStart > 0) {
      heatmapStartYear.value = newStart;
    }
  }
);

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

.card-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 热力图框顶部的书签条：贴在框上方，底部与框线连接 */
.heatmap-bookmark-bar {
  display: flex;
  align-items: flex-end;
  margin-bottom: -10px;        /* 让书签底部与热力图框线贴齐 */
  position: relative;
  /* 关键修复：z-index 提到 11（> 热力图大按钮的 10），让书签条+书签按钮浮在大按钮之上 */
  z-index: 11;
  height: 57px;                /* 容纳书签组件 47px + 上下溢出空间 */
  overflow: visible;
  width: 100%;
}

.heatmap-bookmark-bar > .year-bookmarks {
  width: 100%;
  align-items: flex-end;
  padding-left: 4px;
  padding-right: 4px;
}

/* 展开态：让书签条横跨整个 nav 容器（含左右大按钮列）
 *  - 60 = 48 (大按钮宽) + 12 (gap)
 *  - 这样 .nav-arrow 锚定到书签条左右两端 = 对齐大按钮列
 *  - 默认（折叠态）不延伸，保持书签在热力图主体左侧 */
.year-bookmarks.is-expanded {
  margin-left: -60px;
  margin-right: -60px;
  width: calc(100% + 120px);
}

.heatmap-bookmark-bar .bookmark-tag {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding-bottom: 6px;
}

/* 在 card-header 中的年份书签：覆盖 absolute 定位，改为正常流显示 */
.card-header-right .year-bookmarks {
  position: static;
  padding: 0;
}

/* 卷轴热力图导航 */
.scroll-heatmap-nav {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  position: relative;
  max-height: 480px;
  /* 关键修复：让书签按钮（absolute 浮于大按钮之上）不被裁切 */
  overflow: visible;
}

@media (max-width: 768px) {
  .scroll-heatmap-nav {
    /* 移动端：让热力图呈现"宽长高短"的横向长方形
       高度 = 月份标签(24) + 间距(8) + 7行格子(7*16+6*4=136) + 容器内边距(8*2=16) = 184px
       预留一点空间设为 200px，确保 7 行全部显示 */
    max-height: 200px;
    gap: 4px;
    margin: 10px 0;
  }
}

.scroll-arrow-large {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  /* 桌面端：高度 = 容器 max-height (440px)，与热力图主体视觉一致 */
  height: 440px;
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
    /* 移动端：高度 = 容器 max-height (200px) ，保持与热力图主体视觉一致 */
    width: 24px;
    height: 200px;
  }

  .scroll-arrow-large svg {
    width: 16px;
    height: 16px;
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
  overflow: visible; /* 允许书签横向超出框线显示 */
  background-color: #fafafa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  flex-direction: column; /* 修复：rail 在上、wrapper 在下，月份标签外置于卷轴之上 */
  gap: 8px;
  max-height: 480px;
}

@media (max-width: 768px) {
  .scroll-heatmap-container {
    padding: 8px;
    gap: 4px;
    max-height: 200px;
    border-radius: 8px;
  }
}

.scroll-heatmap-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column; /* 修复：content-wrapper 内为纵向，月份 rail 在上、滚动 wrapper 在下 */
  gap: 8px;
  /* 关键修复：允许书签按钮（absolute 跨越边界）不被裁切 */
  overflow: visible;
  min-width: 0;
}

@media (max-width: 768px) {
  .scroll-heatmap-content-wrapper {
    gap: 4px;
  }
}

.scroll-heatmap-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 0;
}

.scroll-heatmap-wrapper {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  /* 不再使用 flex column，因为 flex 父级会让 grid 的 width: max-content 计算为 0；
     改用 block 布局，让 grid 作为块级元素自然撑开 */
  display: block;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
  position: relative;
  scroll-behavior: auto;
  overscroll-behavior-x: contain;
  /* 关键优化：让 wrapper 走 compositor 线程
   *  - will-change: scroll-position 在主流浏览器已废弃，改用 transform 触发
   *  - 父级层面仅 1 个合成层（vs 1000+ cell 各自一个） */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
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

.scroll-heatmap-grid {
  display: grid;
  /* 列宽 = 格子宽 (--cell-size) + 列间距 (--column-gap)；
     使用 calc 让列宽包含 gap，避免方格"黏连" */
  grid-template-columns: repeat(var(--total-columns, 1), calc(var(--cell-size, 40px) + var(--column-gap, 8px)));
  grid-auto-rows: auto;
  /* 父级为 block 布局，grid 自身用 width: max-content 撑开自然宽度 */
  width: max-content;
  min-width: max-content;
  position: relative;
  column-gap: 0;
  row-gap: 0;
  align-content: start;
  /* 性能优化：CSS containment 让 grid 内部变化不触发外层重排 */
  contain: layout style;
  /* 关键优化：去掉 will-change: transform
   *  原：grid 强制合成层，移动端显存压力大
   *  新：依赖父级 scroll-heatmap-wrapper 的 scroll-position promotion */
}

.heatmap-column {
  /* 列从第 1 行开始（月份标签已移到独立 rail 中） */
  grid-row: 1;
  display: flex;
  flex-direction: column;
  /* 性能优化：每列成为独立渲染单元（paint/layout 不影响相邻列） */
  contain: layout style;
  /* 关键优化：content-visibility: auto 让视口外的列跳过渲染
   *  - 浏览器自动 lazy render：滚动到视口附近才渲染
   *  - contain-intrinsic-size 给浏览器一个"占位尺寸"防止布局抖动 */
  content-visibility: auto;
  contain-intrinsic-size: 0 var(--cell-size, 40px);
  gap: 6px;
  flex-shrink: 0;
}

/* 月份标签条：放在卷轴格子之上，与下方的卷轴 wrapper 等宽 */
.scroll-month-rail-wrapper {
  flex: 0 0 auto;
  /* 修复：必须显式 width: 100%（或与 body 同宽），否则 grid 列会被挤压
     显示在一年的区域内无法水平滚动 */
  width: 100%;
  overflow: hidden;
  position: relative;
  height: 38px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #e6e6e6;
  padding-bottom: 4px;
}

@media (max-width: 768px) {
  .scroll-month-rail-wrapper {
    height: 26px;
    margin-bottom: 4px;
    padding-bottom: 2px;
  }
}

.scroll-month-rail {
  display: grid;
  /* 与 scroll-heatmap-grid 完全相同的列宽定义，确保标签和格子对齐 */
  grid-template-columns: repeat(var(--total-columns, 1), calc(var(--cell-size, 40px) + var(--column-gap, 8px)));
  width: max-content;
  flex-shrink: 0;
  position: relative;
  height: 100%;
  will-change: transform;
  transition: transform 0.05s linear;
  /* 性能优化：transform 用 CSS 变量驱动，由 GPU 合成线程处理 */
  transform: translateX(var(--rail-translate-x, 0));
}

.scroll-month-group {
  /* 通过 CSS Grid 列定位月份组，避免重叠 */
  grid-column: var(--group-start, 1) / span var(--group-span, 1);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  overflow: visible;
  padding-right: 0;
}

.heatmap-column {
  /* 列从第 1 行开始（月份标签已移到独立 rail 中） */
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .heatmap-column {
    gap: 4px;
  }
}

.scroll-month-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 40px;
  height: 32px;
  gap: 1px;
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .scroll-month-label {
    /* 移动端：月份标签压缩到一列宽 */
    min-width: 16px;
    height: 22px;
    gap: 0;
    overflow: visible;
  }

  .scroll-month-year {
    font-size: 7px;
    line-height: 1;
  }

  .scroll-month-name {
    font-size: 8px;
    line-height: 1;
  }
}

.scroll-heatmap-weekdays-sidebar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 8px;
  /* 修复：月份标签已移到独立 rail 中，sidebar 不再需要为月份让位高度；
     与 scroll-heatmap-body 同高，自动 stretch */
  padding-top: 0;
  border-left: 1px solid #e0e0e0;
  flex-shrink: 0;
  justify-content: flex-start; /* 第一个"日"与首行格子顶部对齐 */
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
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .scroll-heatmap-weekdays-sidebar {
    gap: 4px;
    padding-left: 4px;
    padding-top: 0;
    min-height: calc(16px * 7 + 4px * 6);
  }

  .scroll-weekday-sidebar {
    font-size: 9px;
    padding: 2px;
    min-width: 16px;
    min-height: 16px;
  }
}

.scroll-heatmap-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  width: var(--cell-size, 40px);
  height: var(--cell-size, 40px);
  min-width: var(--cell-size, 40px);
  min-height: var(--cell-size, 40px);
  /* 关键优化：去掉 will-change + translateZ 反模式
   *  原版：每个 cell 强制提升为独立合成层，1000+ cell → 显存爆炸 + 滚动掉帧
   *  新版：只依靠 contain + scroll-position promotion，compositor 自动处理 */
  contain: layout style paint;
  position: relative;
  cursor: pointer;
  /* 关键优化：滚动期间父级添加 .is-scrolling 时禁用 transition
   *  滚动是连续手势，transition 会让 transform 跟不上 → 视觉延迟 → 掉帧 */
  transition: none;
}

/* 仅在非滚动状态下显示 transition（hover 时） */
.scroll-heatmap-wrapper:not(.is-scrolling) .scroll-heatmap-cell.is-hovered {
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  will-change: transform;
  z-index: 1;
}

@media (max-width: 768px) {
  .scroll-heatmap-cell {
    /* 移动端：压缩为16x16正方形，配合4px gap形成横向长方形 */
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
    border-radius: 2px;
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
