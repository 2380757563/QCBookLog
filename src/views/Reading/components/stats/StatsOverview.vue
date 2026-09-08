<!--
  StatsOverview.vue
  顶部 6 张概览卡片
  - 藏书总量、已读完、书摘数量、标准总价/购书花费、图表视图、页面设置
  - 通过 v-model:activeChart 与父组件通信（卡片点击切换 activeChart）
  - 接收 readingStats 渲染数字与扩展 chip

  职责:
  - 仅负责 6 张概览卡片的渲染与点击切换逻辑
  - 不包含图表渲染逻辑（图表在子 section 中实现）
-->
<template>
  <div class="stats-overview">
    <!-- 1. 藏书总量 -->
    <div
      class="stat-card stat-card--clickable"
      :class="{ 'is-active': activeChart === 'book' }"
      role="button" tabindex="0"
      :aria-pressed="activeChart === 'book'"
      @click="onToggle('book')"
      @keydown.enter.prevent="onToggle('book')"
      @keydown.space.prevent="onToggle('book')"
    >
      <div class="stat-icon">📚</div>
      <div class="stat-value">{{ readingStats.totalBooks }}</div>
      <div class="stat-label">藏书总量</div>
      <div v-if="readingStats.bindingStats.length > 0" class="stat-extra">
        <span
          v-for="b in readingStats.bindingStats"
          :key="b.label"
          class="stat-extra-chip"
          :title="`${b.label} ${b.count} 本`"
        >
          {{ b.label }} <em>{{ b.count }}</em>
        </span>
      </div>
    </div>

    <!-- 2. 已读完 -->
    <div
      class="stat-card stat-card--clickable"
      :class="{ 'is-active': activeChart === 'read' }"
      role="button" tabindex="0"
      :aria-pressed="activeChart === 'read'"
      @click="onToggle('read')"
      @keydown.enter.prevent="onToggle('read')"
      @keydown.space.prevent="onToggle('read')"
    >
      <div class="stat-icon">✅</div>
      <div class="stat-value">{{ readingStats.readBooks }}</div>
      <div class="stat-label">已读完</div>
      <div class="stat-extra stat-extra--status">
        <span
          v-for="s in readingStats.readStatusBreakdown"
          :key="s.label"
          class="stat-extra-chip"
          :style="{ color: s.color }"
          :title="`${s.label} ${s.count} 本`"
        >
          <span class="status-dot" :style="{ background: s.color }"></span>
          {{ s.label }} <em :style="{ color: s.color }">{{ s.count }}</em>
        </span>
      </div>
    </div>

    <!-- 3. 书摘数量 -->
    <div
      class="stat-card stat-card--clickable"
      :class="{ 'is-active': activeChart === 'bookmark' }"
      role="button" tabindex="0"
      :aria-pressed="activeChart === 'bookmark'"
      @click="onToggle('bookmark')"
      @keydown.enter.prevent="onToggle('bookmark')"
      @keydown.space.prevent="onToggle('bookmark')"
    >
      <div class="stat-icon">📝</div>
      <div class="stat-value">{{ readingStats.totalBookmarks }}</div>
      <div class="stat-label">书摘数量</div>
    </div>

    <!-- 4. 标准总价/购书花费（合并卡） -->
    <div
      class="stat-card stat-card--clickable stat-card--dual"
      :class="{ 'is-active': activeChart === 'price' }"
      role="button" tabindex="0"
      :aria-pressed="activeChart === 'price'"
      @click="onToggle('price')"
      @keydown.enter.prevent="onToggle('price')"
      @keydown.space.prevent="onToggle('price')"
    >
      <div class="stat-icon">🏷️</div>
      <div class="stat-value stat-value--dual">
        <span class="dual-part">
          <span class="dual-currency">¥</span>{{ formattedStandardPrice }}
        </span>
        <span class="dual-divider">/</span>
        <span class="dual-part dual-part--alt">
          <span class="dual-currency">¥</span>{{ formattedSpent }}
        </span>
      </div>
      <div class="stat-label">标准总价/购书花费</div>
      <div class="stat-extra stat-extra--price">
        <div class="price-row">
          <span class="stat-extra-chip">
            标准 <em>¥{{ formattedStandardPrice }}</em>
          </span>
          <span class="stat-extra-chip stat-extra-chip--paid">
            实付 <em>¥{{ formattedSpent }}</em>
          </span>
        </div>
        <div v-if="readingStats.totalStandardPrice > 0" class="saved-row">
          <span class="stat-extra-chip stat-extra-chip--saved">
            省 <em>{{ savedPercent }}%</em>
          </span>
        </div>
      </div>
    </div>

    <!-- 5. 图表视图（全部/收起） -->
    <div
      class="stat-card stat-card--clickable stat-card--toggle"
      :class="{ 'is-active': activeChart === 'all' }"
      role="button" tabindex="0"
      :aria-pressed="activeChart === 'all'"
      @click="onToggle('all')"
      @keydown.enter.prevent="onToggle('all')"
      @keydown.space.prevent="onToggle('all')"
    >
      <div class="stat-icon">{{ activeChart === 'all' ? '📉' : '📊' }}</div>
      <div class="stat-value">{{ activeChart === 'all' ? '收起' : '全部' }}</div>
      <div class="stat-label">图表视图</div>
      <div class="stat-extra stat-extra--hint">
        {{ activeChart === 'all' ? '点击收起' : '点击查看全部图表' }}
      </div>
    </div>

    <!-- 6. 页面设置（占位） -->
    <div
      class="stat-card stat-card--settings"
      role="button" tabindex="0"
      aria-label="页面设置"
      @click="onToggleSettings"
      @keydown.enter.prevent="onToggleSettings"
      @keydown.space.prevent="onToggleSettings"
    >
      <div class="stat-icon">⚙️</div>
      <div class="stat-value">设置</div>
      <div class="stat-label">页面设置</div>
      <div class="stat-extra stat-extra--hint stat-extra--hint-settings">
        {{ settingsHint }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ReadingStats } from '@/views/Reading/composables/useReadingStats';

/** 图表分类 id（与 StatsPage 保持一致） */
export type StatsChartKey = 'all' | 'book' | 'read' | 'bookmark' | 'price' | null;

const props = withDefaults(defineProps<{
  /** 阅读核心统计 */
  readingStats: ReadingStats;
  /** 当前激活的图表分类 */
  activeChart: StatsChartKey;
  /** 设置卡片是否处于"已配置过"状态（决定展示文案） */
  hasSettings?: boolean;
}>(), {
  hasSettings: false,
});

const emit = defineEmits<{
  (e: 'update:activeChart', value: StatsChartKey): void;
  (e: 'open-settings'): void;
}>();

/** 节省百分比：1 - 实付/标准 */
const savedPercent = computed(() => {
  if (!props.readingStats.totalStandardPrice) return 0;
  return Math.round(
    (1 - props.readingStats.totalSpent / props.readingStats.totalStandardPrice) * 100
  );
});

/** 标准总价（保留两位小数，去除多余 0） */
const formattedStandardPrice = computed(() => formatPrice(props.readingStats.totalStandardPrice));

/** 购书花费（保留两位小数，去除多余 0） */
const formattedSpent = computed(() => formatPrice(props.readingStats.totalSpent));

/**
 * 价格格式化：保留两位小数，自动去除小数点后多余的 0
 * - 100        -> "100"
 * - 100.5      -> "100.5"
 * - 100.55     -> "100.55"
 * - 100.599... -> "100.6"（四舍五入）
 */
function formatPrice(value: number | undefined | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  const fixed = Number(value).toFixed(2);
  // 去除末尾的 0 和可能的多余小数点（例如 "100.00" -> "100"，"100.50" -> "100.5"）
  return fixed.replace(/\.?0+$/, '') || '0';
}

/** 设置卡片提示文案 */
const settingsHint = computed(() => {
  return props.hasSettings ? '已自定义 · 点击修改' : '自定义布局与显示';
});

/** 点击切换图表分类（再次点击当前分类则关闭） */
function onToggle(key: Exclude<StatsChartKey, null>) {
  emit('update:activeChart', props.activeChart === key ? null : key);
}

function onToggleSettings() {
  emit('open-settings');
}
</script>

<style scoped lang="scss">
.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1100px) {
  .stats-overview {
    grid-template-columns: repeat(6, 1fr);
  }
}

.stat-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 168px;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.stat-card--clickable {
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;

  &.is-active {
    border-color: #ff6b35;
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 107, 53, 0.02) 100%);
  }

  &:focus-visible {
    outline: 2px solid #ff6b35;
    outline-offset: 2px;
  }
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 第 4 张：合并卡（标准 / 实付） */
.stat-card--dual {
  /* 启用容器查询，让内部元素可以基于卡片宽度自适应 */
  container-type: inline-size;
  container-name: dual-card;

  .stat-value--dual {
    /* block 布局 + text-align: center，换行后文字始终居中 */
    display: block;
    text-align: center;
    line-height: 1.2;
    font-size: 20px;
    font-weight: 700;
    /* 长串数字允许在任何位置断行，避免溢出 */
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .dual-part {
    color: var(--text-primary);
    /* 数字整体不被打断；只有 / 处允许断行 */
    white-space: nowrap;
  }
  .dual-part--alt {
    color: #ff6b35;
  }
  .dual-divider {
    color: var(--text-secondary);
    font-size: 0.7em;
    margin: 0 2px;
    /* 关键：/ 前后保留空格作为可换行点；不隐藏 */
    display: inline;
  }
  .dual-currency {
    font-size: 0.55em;
    margin-right: 1px;
  }

  /* 卡片较窄（padding-box < 220px，约等于外层 252px）时，使用中等字号 */
  @container dual-card (max-width: 219px) {
    .stat-value--dual {
      font-size: 18px;
    }
  }

  /* 卡片更窄（padding-box < 180px，约等于外层 212px）时，再缩小 */
  @container dual-card (max-width: 179px) {
    .stat-value--dual {
      font-size: 15px;
    }
    .dual-divider {
      font-size: 0.9em;
    }
  }

  /* 卡片极窄（padding-box < 150px，约等于外层 182px）时，缩小并允许数字换行 */
  @container dual-card (max-width: 149px) {
    .stat-value--dual {
      font-size: 13px;
    }
    .dual-divider {
      font-size: 1em;
    }
  }

  /* 价格区两行布局：上行（标准+实付）+ 下行（省） */
  .stat-extra--price {
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .price-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px 6px;
    width: 100%;
  }
  .saved-row {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
}

/* 第 5 张：图表视图触发卡片 */
.stat-card--toggle {
  border: 1px dashed transparent;
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 107, 53, 0.05) 100%);

  &.is-active {
    border-color: #ff6b35;
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.04) 100%);
  }
}

/* 第 6 张：设置卡片 */
.stat-card--settings {
  cursor: pointer;
  user-select: none;
  border: 1px dashed rgba(156, 39, 176, 0.35);
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(156, 39, 176, 0.05) 100%);

  &:hover {
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border-color: rgba(156, 39, 176, 0.55);
  }

  &:focus-visible {
    outline: 2px solid rgba(156, 39, 176, 0.6);
    outline-offset: 2px;
  }

  .stat-value {
    font-size: 22px;
  }
}

/* 卡片底部扩展信息 */
.stat-extra {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-end;
  gap: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  min-height: 20px;
}

.stat-extra--hint {
  font-size: 11px;
  color: #ff6b35;
  font-weight: 500;
}

.stat-extra--hint-settings {
  color: #9c27b0;
}

.stat-extra-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.04));
  border-radius: 8px;
  font-size: 11px;

  em {
    font-style: normal;
    font-weight: 600;
    margin-left: 2px;
  }
}

.stat-extra-chip--paid em {
  color: #ff6b35;
}

.stat-extra-chip--saved em {
  color: #4caf50;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 3px;
}
</style>
