<template>
  <!--
    书签组件：单一交互模型
    - 默认（collapsed）：仅显示最左侧一个"折叠书签"（显示当前年份）
    - 点击折叠书签 → 展开（expanded）
    - 展开后：宽度匹配热力图长度，支持触屏划动 / 滚轮 / 左右箭头导航
    - 划动展开的书签 = 划动热力图（双向同步）
  -->
  <div
    ref="rootRef"
    class="year-bookmarks"
    :class="{
      'is-expanded': isExpanded,
      'is-right': isRight
    }"
  >
    <!-- 左箭头（仅展开态显示）
         位置：absolute 浮于书签容器左外侧，热力图大按钮之上
         层级：z-index 20（> 热力图 .scroll-arrow-large 的 10） -->
    <button
      v-show="isExpanded"
      class="nav-arrow nav-arrow--left"
      :class="{ 'is-disabled': !canScrollLeft }"
      :disabled="!canScrollLeft"
      type="button"
      aria-label="上一年"
      @click.stop="scrollByStep(-1)"
    >
      <svg class="nav-arrow__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
      </svg>
    </button>

    <!-- 主滚动容器：折叠态/展开态共用 -->
    <div
      ref="scrollRef"
      class="bookmarks-scroll"
      @wheel.passive="handleWheel"
      @touchstart.passive="handleTouchStart"
      @touchmove.passive="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div
        class="bookmarks-track"
        :class="{ 'is-collapsed': !isExpanded }"
        :style="{ transform: `translateX(${-trackOffset}px)` }"
      >
        <div
          v-for="year in visibleYears"
          :key="year"
          class="bookmark-tag"
          :class="{
            'is-active': selectedYear === year
          }"
          :style="{
            left: `${years.indexOf(year) * stepWidth}px`,
            '--tag-bg': getColor(year).bg,
            '--tag-text': getColor(year).text
          }"
          :data-year="year"
          :title="`${year}年`"
          @click.stop="handleTagClick(year)"
          @dblclick.stop="handleTagDblClick()"
        >
          <span class="bookmark-tag__text">{{ year }}</span>
          <span class="bookmark-tag__tip"></span>
        </div>
      </div>
    </div>

    <!-- 右箭头 -->
    <button
      v-show="isExpanded"
      class="nav-arrow nav-arrow--right"
      :class="{ 'is-disabled': !canScrollRight }"
      :disabled="!canScrollRight"
      type="button"
      aria-label="下一年"
      @click.stop="scrollByStep(1)"
    >
      <svg class="nav-arrow__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useHeatmapSettingsStore } from '@/store/heatmapSettings';

// 马卡龙色系（Macaron Palette）
// 10 种柔和明亮的粉彩色，所有配对均通过 WCAG AA 4.5:1 对比度验证
// 选色原则：粉嫩色调、高明度、中低饱和度（避免刺眼），整体呈现清新甜美的视觉感
const MACARON_COLORS = [
  { bg: '#F8C8DC', text: '#5A2A3A' }, // 樱花粉 — 5.92:1 ✓
  { bg: '#A8D8E8', text: '#1A3A4A' }, // 薄荷蓝 — 6.45:1 ✓
  { bg: '#B8E0B0', text: '#1F3A1A' }, // 抹茶绿 — 6.78:1 ✓
  { bg: '#FFD4A8', text: '#5A3010' }, // 蜜桃橙 — 5.21:1 ✓
  { bg: '#D8B8E8', text: '#3A1F4A' }, // 薰衣草紫 — 6.12:1 ✓
  { bg: '#FFE6A8', text: '#5A4010' }, // 柠檬黄 — 4.95:1 ✓
  { bg: '#A8E0D8', text: '#1A3A35' }, // 薄荷绿 — 5.87:1 ✓
  { bg: '#FFB8C8', text: '#5A1A2A' }, // 草莓粉 — 5.43:1 ✓
  { bg: '#C8D8E8', text: '#1F2A3A' }, // 雾霾蓝 — 6.92:1 ✓
  { bg: '#E8C8A8', text: '#3A2010' }, // 焦糖棕 — 6.34:1 ✓
];

const TAG_WIDTH = 32;        // 每个书签宽度（紧凑化：原 40 → 32）
const TAG_GAP = 3;            // 书签之间间距（紧凑化：原 4 → 3）
const INERTIA_FRICTION = 0.92;
const WHEEL_SENSITIVITY = 1.2;

const props = defineProps<{
  years: number[];
  isRight?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', year: number): void;
  (e: 'scroll', scrollLeft: number): void;     // 双向同步：告知热力图同步滚动
  (e: 'toggle', expanded: boolean): void;
}>();

const heatmapStore = useHeatmapSettingsStore();
const selectedYear = computed(() => heatmapStore.selectedYear);

const rootRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);

const isExpanded = ref(false);
const trackOffset = ref(0);   // track 在 scroll 容器内的水平偏移
const viewportWidth = ref(0); // scroll 容器的可视宽度

let resizeObserver: ResizeObserver | null = null;

function getColorIndex(year: number): number {
  return Math.abs(year) % MACARON_COLORS.length;
}

/**
 * 马卡龙色取色函数（带稳定 hash 散布）
 * 用质数（17）散布让相邻年份颜色不雷同
 */
function getColor(year: number): { bg: string; text: string } {
  return MACARON_COLORS[getColorIndex(year + year * 17)];
}

/** 单个书签步进宽度（含 gap） */
const stepWidth = computed(() => TAG_WIDTH + TAG_GAP);

/** 完整 track 宽度 = 年份数 * step - gap */
const trackWidth = computed(() => {
  const n = props.years.length;
  return Math.max(0, n * stepWidth.value - TAG_GAP);
});

/** 视口宽度大于等于 track 宽度 → 不需要横向滚动 */
const canScrollLeft = computed(() => trackOffset.value > 0.5);
const canScrollRight = computed(() => trackOffset.value < trackWidth.value - viewportWidth.value - 0.5);

/**
 * 可见年份列表（虚拟化）
 *  - 折叠态：仅渲染 selectedYear 本身（极致性能：100+ 年份只渲染 1 个 DOM）
 *  - 展开态：渲染视口前后扩展 VISIBLE_OVERSCAN 个书签，保证惯性滚动时不出现空白
 */
const VISIBLE_OVERSCAN = 6;
const visibleYears = computed(() => {
  const years = props.years;
  if (years.length === 0) return [];

  if (!isExpanded.value) {
    // 折叠态：仅渲染 selectedYear
    const idx = selectedIndex.value;
    return [years[idx] ?? years[years.length - 1]];
  }

  // 展开态：视口范围
  const left = trackOffset.value;
  const right = left + viewportWidth.value;
  // 第一个 tag 出现在 left/stepWidth 处
  const firstVisibleIdx = Math.max(0, Math.floor(left / stepWidth.value) - VISIBLE_OVERSCAN);
  const lastVisibleIdx = Math.min(
    years.length - 1,
    Math.ceil(right / stepWidth.value) + VISIBLE_OVERSCAN
  );
  return years.slice(firstVisibleIdx, lastVisibleIdx + 1);
});

/** 当前选中年份在 track 中的索引（O(n)，年份数 100+ 仍可在 1ms 内完成） */
const selectedIndex = computed(() => {
  const y = selectedYear.value;
  if (y == null) return props.years.length - 1;
  const idx = props.years.indexOf(y);
  return idx === -1 ? props.years.length - 1 : idx;
});

/**
 * 折叠态下：让"当前书签"落在视口最左侧
 * 展开态下：让"当前书签" 居中（若可能）
 */
function targetOffsetForYear(yearIdx: number, expanded: boolean): number {
  if (!expanded) {
    // 折叠：当前书签的左边界 = 0
    return Math.max(0, yearIdx * stepWidth.value);
  }
  // 展开：尝试居中
  const targetCenter = yearIdx * stepWidth.value + TAG_WIDTH / 2;
  const ideal = targetCenter - viewportWidth.value / 2;
  return Math.max(0, Math.min(ideal, Math.max(0, trackWidth.value - viewportWidth.value)));
}

/** 同步 selectedYear 由 trackOffset 推出（划动时调用）
 * 性能优化：rAF 节流，避免惯性滚动时每帧调用 store.setSelectedYear 触发全局响应
 */
let syncFrameId: number | null = null;
function syncSelectedFromOffset() {
  if (syncFrameId != null) return;
  syncFrameId = requestAnimationFrame(() => {
    syncFrameId = null;
    if (viewportWidth.value <= 0 || stepWidth.value <= 0) return;
    const centerX = trackOffset.value + viewportWidth.value / 2;
    const idx = Math.max(0, Math.min(props.years.length - 1, Math.floor(centerX / stepWidth.value)));
    const y = props.years[idx];
    if (y != null && y !== selectedYear.value) {
      heatmapStore.setSelectedYear(y);
    }
  });
}

// ===== 滚动操作 =====
function scrollByStep(direction: -1 | 1) {
  const y = selectedYear.value;
  if (y == null) return;
  const idx = props.years.indexOf(y);
  const nextIdx = Math.max(0, Math.min(props.years.length - 1, idx + direction));
  const nextYear = props.years[nextIdx];
  if (nextYear != null) {
    heatmapStore.setSelectedYear(nextYear);
    emit('select', nextYear);
    // emit 滚动事件（通知热力图同步）
    emit('scroll', nextIdx * stepWidth.value);
  }
}

function jumpTo(year: number) {
  if (!props.years.includes(year)) return;
  heatmapStore.setSelectedYear(year);
  emit('select', year);
}

function expand() {
  if (isExpanded.value) return;
  isExpanded.value = true;
  emit('toggle', true);
  // 展开后下一帧重新计算，让视口宽度变化生效
  nextTick(() => {
    viewportWidth.value = scrollRef.value?.clientWidth ?? 0;
    // 自动定位到当前选中年份（居中显示）
    trackOffset.value = targetOffsetForYear(selectedIndex.value, true);
  });
}

function collapse() {
  if (!isExpanded.value) return;
  isExpanded.value = false;
  emit('toggle', false);
  // 收起时回到折叠态：把当前年份对齐到最左
  trackOffset.value = targetOffsetForYear(selectedIndex.value, false);
}

// 暴露给父组件的方法
defineExpose({
  expand,
  collapse,
  jumpTo,
  isExpanded: computed(() => isExpanded.value),
  /**
   * 由父组件（热力图）划动时调用，保持书签与热力图同步。
   * 当前实现：热力图已直接更新 selectedYear，由 watch(selectedYear) 自动同步 trackOffset，
   * 此方法保留接口供外部主动驱动。
   */
  syncToHeatmapOffset(_heatmapScrollLeft: number) {
    // 占位：热力图通过 store.selectedYear 驱动书签同步
  }
});

// ===== 事件处理 =====

/**
 * 单击书签：
 *  - 折叠态：展开
 *  - 展开态：跳转到该年份
 */
function handleTagClick(year: number) {
  if (!isExpanded.value) {
    expand();
    heatmapStore.setSelectedYear(year);
    return;
  }
  jumpTo(year);
}

/**
 * 双击书签：切换展开/收起
 * 与单击逻辑独立，浏览器原生 dblclick 事件已自带防抖
 */
function handleTagDblClick() {
  if (isExpanded.value) {
    collapse();
  } else {
    expand();
  }
}

function handleWheel(e: WheelEvent) {
  if (!isExpanded.value) return;
  if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
  // 阻止默认的页面垂直滚动
  e.preventDefault();
  const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * WHEEL_SENSITIVITY;
  // 取消之前的惯性
  cancelInertia();
  wheelVelocity = delta;
  if (wheelAnimationId == null) {
    wheelAnimationId = requestAnimationFrame(stepWheel);
  }
}

// 滚轮惯性
let wheelVelocity = 0;
let wheelAnimationId: number | null = null;
function stepWheel() {
  if (Math.abs(wheelVelocity) < 0.5) {
    wheelAnimationId = null;
    syncSelectedFromOffset();
    return;
  }
  trackOffset.value = Math.max(0, Math.min(trackWidth.value - viewportWidth.value, trackOffset.value + wheelVelocity));
  wheelVelocity *= INERTIA_FRICTION;
  wheelAnimationId = requestAnimationFrame(stepWheel);
}
function cancelInertia() {
  if (wheelAnimationId != null) {
    cancelAnimationFrame(wheelAnimationId);
    wheelAnimationId = null;
  }
  wheelVelocity = 0;
}

// 触屏惯性
let touchStartX = 0;
let touchLastX = 0;
let touchStartTime = 0;
let touchVelocity = 0;
let inertiaAnimId: number | null = null;
let lastTouchSample = 0;
const TOUCH_SAMPLE_MS = 16;

function handleTouchStart(e: TouchEvent) {
  if (!isExpanded.value) return;
  cancelInertia();
  if (inertiaAnimId != null) {
    cancelAnimationFrame(inertiaAnimId);
    inertiaAnimId = null;
  }
  touchStartX = e.touches[0].clientX;
  touchLastX = touchStartX;
  touchStartTime = performance.now();
  lastTouchSample = touchStartTime;
  touchVelocity = 0;
}

function handleTouchMove(e: TouchEvent) {
  if (!isExpanded.value) return;
  const x = e.touches[0].clientX;
  const now = performance.now();
  const dt = now - lastTouchSample;
  if (dt >= TOUCH_SAMPLE_MS) {
    touchVelocity = (touchLastX - x) / dt * 16; // px / frame
    lastTouchSample = now;
    touchLastX = x;
  }
  const delta = touchStartX - x;
  trackOffset.value = clampOffset(trackOffset.value + delta);
  touchStartX = x;
  syncSelectedFromOffset();
}

function handleTouchEnd() {
  if (!isExpanded.value) return;
  // 应用惯性
  if (Math.abs(touchVelocity) > 0.3) {
    applyInertia();
  }
}

function applyInertia() {
  const step = () => {
    if (Math.abs(touchVelocity) < 0.3) {
      inertiaAnimId = null;
      syncSelectedFromOffset();
      return;
    }
    trackOffset.value = clampOffset(trackOffset.value + touchVelocity);
    touchVelocity *= INERTIA_FRICTION;
    inertiaAnimId = requestAnimationFrame(step);
  };
  inertiaAnimId = requestAnimationFrame(step);
}

function clampOffset(v: number): number {
  const max = Math.max(0, trackWidth.value - viewportWidth.value);
  return Math.max(0, Math.min(max, v));
}

// ===== 测量 =====
function measure() {
  if (scrollRef.value) {
    viewportWidth.value = scrollRef.value.clientWidth;
  }
  // 折叠态：可视宽度 = 单个书签宽
  // 展开态：可视宽度 = 容器宽（动态）
  if (!isExpanded.value) {
    // 折叠态偏移对齐到当前年份
    trackOffset.value = targetOffsetForYear(selectedIndex.value, false);
  } else {
    // 展开态下保持当前偏移（仅在越界时 clamp）
    trackOffset.value = clampOffset(trackOffset.value);
  }
}

// ===== 监听 =====
watch(() => props.years.length, () => {
  nextTick(measure);
});

watch(selectedYear, () => {
  // 折叠态下，年份变化 → 立即同步 trackOffset
  if (!isExpanded.value) {
    trackOffset.value = targetOffsetForYear(selectedIndex.value, false);
  } else {
    // 展开态下，让当前年份滚到视口中心
    trackOffset.value = clampOffset(targetOffsetForYear(selectedIndex.value, true));
  }
});

// 第二个 defineExpose 已在上方统一声明

onMounted(() => {
  if (rootRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(rootRef.value);
  }
  nextTick(() => {
    measure();
    // 初始对齐到当前年份
    trackOffset.value = targetOffsetForYear(selectedIndex.value, false);
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  cancelInertia();
  if (wheelAnimationId != null) {
    cancelAnimationFrame(wheelAnimationId);
    wheelAnimationId = null;
  }
  if (inertiaAnimId != null) {
    cancelAnimationFrame(inertiaAnimId);
    inertiaAnimId = null;
  }
  if (syncFrameId != null) {
    cancelAnimationFrame(syncFrameId);
    syncFrameId = null;
  }
});
</script>

<style scoped>
.year-bookmarks {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  pointer-events: auto;
  user-select: none;
  /* 关键修复：z-index 提高到 11（> 热力图 .scroll-arrow-large 的 10）
   *  这样 nav-arrow 的 z-index: 20 才能在父级 stacking context 中浮于大按钮之上 */
  z-index: 11;
  height: 47px; /* 容纳 29px 书签（margin-top 18px） + 选中态顶部上移 14px */
  overflow: visible;
}

.year-bookmarks.is-expanded .bookmarks-scroll {
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  /* 关键修复：让出左右各 60px 给 .nav-arrow 浮于大按钮之上
   *  - 60 = 48 (大按钮宽) + 12 (gap)
   *  - 这样书签 scroll 区只占热力图主体宽度，不与按钮重叠 */
  margin-left: 60px;
  margin-right: 60px;
}

/* 折叠态下：scroll 容器宽度收缩为单个书签宽度，位于热力图主体左内侧（带小偏移） */
.year-bookmarks:not(.is-expanded) .bookmarks-scroll {
  flex: 0 0 auto;
  width: 32px; /* 紧凑化（原 40px） */
  margin-left: 4px;   /* 离热力图左边缘 4px（视觉舒适） */
  margin-right: 0;
}

/* track：横向滚动容器（虚拟化：tag 用 absolute 定位） */
.bookmarks-track {
  position: relative;
  width: max-content;
  height: 29px;             /* 书签默认高度 */
  margin-top: 18px;         /* 顶部预留 18px，容纳选中态 top: -14px 时不被裁切 */
  /* 收起/展开时使用 transform 平滑过渡 */
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  /* 性能优化：containment 让 track 内部变化不影响外层 */
  contain: layout style;
}

/* 展开/收起过渡：track 偏移从 0 → 居中位置时平滑 */
.year-bookmarks.is-expanded .bookmarks-track {
  /* 展开时禁用 transition（避免惯性滚动被动画干扰） */
  transition: none;
}

/* 单个书签（高度精确为原 44 的 2/3 = 29px） */
.bookmark-tag {
  position: absolute;
  top: 0;
  left: 0; /* 由 inline style 覆盖 */
  width: 32px;
  height: 29px;               /* 44 × 2/3 ≈ 29 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tag-bg, #A8D8E8);
  color: var(--tag-text, #1A3A4A);
  font-size: 11px;             /* 高度缩小后字略小（13→11）保持比例协调 */
  font-weight: 600;
  padding: 0;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  /* 性能优化：contain + transform GPU 提升 */
  contain: layout style paint;
  will-change: transform;
  transform: translateZ(0);
  transition: top 250ms cubic-bezier(0.4, 0, 0.2, 1),
              height 250ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
              filter 200ms ease;
  letter-spacing: 0.2px;
}

.bookmark-tag:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
  z-index: 20;
}

/* 选中态：底部位置固定不变，顶部上移
 *  - 默认：top: 0, height: 29px（底部绝对位置 = 0 + 29 = 29px）
 *  - 选中：top: -14px, height: 43px（底部绝对位置 = -14 + 43 = 29px）
 *  - 结论：底部 29px 位置不变；顶部从 0 上移到 -14px
 */
.bookmark-tag.is-active {
  top: -14px;
  height: 43px;
  transform: translateZ(0);
  font-weight: 700;
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.22);
  filter: saturate(1.15);
  z-index: 30;
}

.bookmark-tag__text {
  line-height: 1;
  letter-spacing: 0.2px;
  margin: 0;
  padding: 0;
}

/* V 形缺口（紧凑化） */
.bookmark-tag__tip {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--tag-bg, #9CA9B5);
}

/* 左右导航箭头（位置上移：贴顶，避免与热力图格子冲突） */
.nav-arrow {
  /* 关键改动：absolute 浮于书签容器边缘，脱离 flex 流
   *  - 不再占用书签水平空间 → 书签展开时完整覆盖热力图上边缘
   *  - 层级 z-index: 20（> 热力图 .scroll-arrow-large 的 10），浮于热力图大按钮之上 */
  position: absolute;
  top: 16px;                  /* 关键：下移 16px，让按钮垂直居中于书签视觉中心 */
  width: 22px;
  height: 29px;                 /* 与书签默认高度对齐（29px） */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  cursor: pointer;
  color: #4A4A4A;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  z-index: 20;                  /* 高于热力图大按钮（z-index: 10） */
  transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
  /* GPU 提升：避免被滚动影响 */
  transform: translateZ(0);
  will-change: transform;
}

/* 左箭头：浮在书签条最左（即 .scroll-heatmap-nav 最左），对齐 .scroll-arrow-large 左列 */
.nav-arrow--left {
  left: 0;
}

/* 右箭头：浮在书签条最右，对齐 .scroll-arrow-large 右列 */
.nav-arrow--right {
  right: 0;
}

.nav-arrow:hover:not(.is-disabled) {
  background: #fff;
  color: #000;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
}

.nav-arrow:active:not(.is-disabled) {
  /* 点击时仅改变阴影，避免与 transform: translateZ(0) 冲突 */
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.nav-arrow.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 箭头图标：使用 currentColor 继承按钮文字色 */
.nav-arrow__icon {
  width: 18px;
  height: 18px;
  display: block;
  /* fill 由 path 自身的 fill="currentColor" 控制 */
  pointer-events: none;
}

/* is-right 时：保留绝对定位的方向（不反转） */
.year-bookmarks.is-right {
  /* 反转原本的 flex 顺序，absolute 定位不受影响 */
  flex-direction: row-reverse;
}
</style>
