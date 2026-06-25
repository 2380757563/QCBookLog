<template>
  <div class="stats-page">
    <!-- 阅读概览（5 张数据卡片 + 1 张"全部图表"快捷卡片） -->
    <div class="stats-overview">
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'book' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'book'"
        @click="activeChart = activeChart === 'book' ? null : 'book'"
        @keydown.enter.prevent="activeChart = activeChart === 'book' ? null : 'book'"
        @keydown.space.prevent="activeChart = activeChart === 'book' ? null : 'book'"
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
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'read' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'read'"
        @click="activeChart = activeChart === 'read' ? null : 'read'"
        @keydown.enter.prevent="activeChart = activeChart === 'read' ? null : 'read'"
        @keydown.space.prevent="activeChart = activeChart === 'read' ? null : 'read'"
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
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'bookmark' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'bookmark'"
        @click="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
        @keydown.enter.prevent="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
        @keydown.space.prevent="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
      >
        <div class="stat-icon">📝</div>
        <div class="stat-value">{{ readingStats.totalBookmarks }}</div>
        <div class="stat-label">书摘数量</div>
      </div>
      <!-- 合并卡：标准总价 / 购书花费 -->
      <div
        class="stat-card stat-card--clickable stat-card--dual"
        :class="{ 'is-active': activeChart === 'price' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'price'"
        @click="activeChart = activeChart === 'price' ? null : 'price'"
        @keydown.enter.prevent="activeChart = activeChart === 'price' ? null : 'price'"
        @keydown.space.prevent="activeChart = activeChart === 'price' ? null : 'price'"
      >
        <div class="stat-icon">🏷️</div>
        <div class="stat-value stat-value--dual">
          <span class="dual-part">
            <span class="dual-currency">¥</span>{{ readingStats.totalStandardPrice }}
          </span>
          <span class="dual-divider">/</span>
          <span class="dual-part dual-part--alt">
            <span class="dual-currency">¥</span>{{ readingStats.totalSpent }}
          </span>
        </div>
        <div class="stat-label">标准总价/购书花费</div>
        <div class="stat-extra stat-extra--price">
          <span class="stat-extra-chip">
            标准 <em>¥{{ readingStats.totalStandardPrice }}</em>
          </span>
          <span class="stat-extra-chip stat-extra-chip--paid">
            实付 <em>¥{{ readingStats.totalSpent }}</em>
          </span>
          <span v-if="readingStats.totalStandardPrice > 0" class="stat-extra-chip stat-extra-chip--saved">
            省 <em>{{ Math.round((1 - readingStats.totalSpent / readingStats.totalStandardPrice) * 100) }}%</em>
          </span>
        </div>
      </div>
      <!-- "全部"卡片：合订视图入口 -->
      <div
        class="stat-card stat-card--clickable stat-card--toggle"
        :class="{ 'is-active': activeChart === 'all' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'all'"
        @click="activeChart = activeChart === 'all' ? null : 'all'"
        @keydown.enter.prevent="activeChart = activeChart === 'all' ? null : 'all'"
        @keydown.space.prevent="activeChart = activeChart === 'all' ? null : 'all'"
      >
        <div class="stat-icon">{{ activeChart === 'all' ? '📉' : '📊' }}</div>
        <div class="stat-value">{{ activeChart === 'all' ? '收起' : '全部' }}</div>
        <div class="stat-label">图表视图</div>
        <div class="stat-extra stat-extra--hint">
          {{ activeChart === 'all' ? '点击收起' : '点击查看全部图表' }}
        </div>
      </div>
    </div>

    <!-- 图表区域：受 activeChart 控制（null=不显示，'all'=全部，'book'/'read'/'bookmark'/'price'=对应类别） -->
    <div v-if="activeChart" class="all-charts-wrapper">

    <!-- 📚 藏书 - 装帧分布（玫瑰图） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>装帧分布</span>
          </span>
          <span class="card-subtitle">按 binding1 字段聚合：电子书 / 平装 / 精装 / 特殊装帧</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'binding' }"
            @click.stop="toggleSettingsMenu('binding')"
            :aria-expanded="openSettingsMenu === 'binding'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'binding'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-container" ref="bindingChartRef"></div>
    </div>

    <!-- ✅ 已读完 - 阅读状态分布（饼图） -->
    <div v-if="activeChart === 'read' || activeChart === 'all'" class="card card--status">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--read">✅ 已读完</span>
            <span class="card-title-sep">·</span>
            <span>阅读状态分布</span>
          </span>
          <span class="card-subtitle">已读 / 在读 / 未读 占比</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'status' }"
            @click.stop="toggleSettingsMenu('status')"
            :aria-expanded="openSettingsMenu === 'status'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'status'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-container" ref="statusChartRef"></div>
    </div>

    <!-- ✅ 已读完 - 月度阅读趋势（折线图） -->
    <div v-if="activeChart === 'read' || activeChart === 'all'" class="card card--status">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--read">✅ 已读完</span>
            <span class="card-title-sep">·</span>
            <span>月度阅读趋势</span>
          </span>
          <span class="card-subtitle">按月统计读完的书籍数量</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'trend' }"
            @click.stop="toggleSettingsMenu('trend')"
            :aria-expanded="openSettingsMenu === 'trend'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'trend'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>

    <!-- 📝 书摘 - 月度书摘趋势（柱状图） -->
    <div v-if="activeChart === 'bookmark' || activeChart === 'all'" class="card card--bookmark">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--bookmark">📝 书摘</span>
            <span class="card-title-sep">·</span>
            <span>月度书摘趋势</span>
          </span>
          <span class="card-subtitle">按月统计新增书摘数量</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'bookmarkTrend' }"
            @click.stop="toggleSettingsMenu('bookmarkTrend')"
            :aria-expanded="openSettingsMenu === 'bookmarkTrend'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'bookmarkTrend'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-container" ref="bookmarkTrendChartRef"></div>
    </div>

    <!-- 🏷️ 价格 - 购书花费分类（嵌套饼图） -->
    <div v-if="activeChart === 'price' || activeChart === 'all'" class="card card--price">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--price">🏷️ 价格</span>
            <span class="card-title-sep">·</span>
            <span>购书花费分类</span>
          </span>
          <span class="card-subtitle">点击下钻查看具体书籍</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'priceCategory' }"
            @click.stop="toggleSettingsMenu('priceCategory')"
            :aria-expanded="openSettingsMenu === 'priceCategory'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'priceCategory'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">分类模式</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceCategoryMode === 'group' }]"
                  @click="priceCategoryMode = 'group'"
                >分组</button>
                <button
                  :class="['settings-opt', { active: priceCategoryMode === 'tag' }]"
                  @click="priceCategoryMode = 'tag'"
                >标签</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">价格口径</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceType === 'paid' }]"
                  @click="priceType = 'paid'"
                >实际价格</button>
                <button
                  :class="['settings-opt', { active: priceType === 'standard' }]"
                  @click="priceType = 'standard'"
                >标准价格</button>
              </div>
            </div>
            <div v-if="priceType === 'paid'" class="settings-section">
              <div class="settings-section-title">排除 0 元</div>
              <label class="settings-toggle">
                <input type="checkbox" v-model="excludeZeroPaid" />
                <span>{{ excludeZeroPaid ? '已排除购买价为 0 的书' : '排除购买价为 0 的书' }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div v-if="priceCategoryMode === 'tag'" class="mode-hint">
        <span class="mode-hint-icon">💡</span>
        一本书有多个标签时，花费按标签数平均分摊，所有分类金额合计等于总花费。
      </div>
      <div class="price-charts-row">
        <div class="price-chart-col">
          <div class="chart-container" ref="priceCategoryChartRef"></div>
          <!-- 空状态：按口径判断哪个金额为0 -->
          <div v-if="(priceType === 'paid' && priceStats.totalPaid === 0) || (priceType === 'standard' && priceStats.totalStandard === 0)" class="chart-empty-state">
            <div class="empty-icon">💰</div>
            <div class="empty-text">{{ priceType === 'paid' ? '还没有实际购书花费数据' : '还没有标准定价数据' }}</div>
            <div class="empty-hint">去书籍详情填写{{ priceType === 'paid' ? '"购入价格"' : '"标准定价"' }}后，这里会按分组/标签显示花费占比</div>
            <div v-if="priceType === 'paid' && excludeZeroPaid" class="empty-hint" style="margin-top:6px">💡 已排除购买价为 0 的书，试试取消"排除 0 元"</div>
          </div>
        </div>
        <div class="price-chart-col">
          <div class="discount-summary" v-if="priceStats.savings > 0">
            <div class="summary-item">
              <div class="summary-label">标准总价</div>
              <div class="summary-value">¥{{ priceStats.totalStandard.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--paid">
              <div class="summary-label">实付总价</div>
              <div class="summary-value">¥{{ priceStats.totalPaid.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--saved">
              <div class="summary-label">共省下</div>
              <div class="summary-value">¥{{ priceStats.savings.toFixed(2) }}</div>
              <div class="summary-percent">{{ priceStats.savingsPercent }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🏷️ 价格 - 折扣对比（双环玫瑰图） -->
    <div v-if="activeChart === 'price' || activeChart === 'all'" class="card card--price">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--price">🏷️ 价格</span>
            <span class="card-title-sep">·</span>
            <span>购书折扣对比</span>
          </span>
          <span class="card-subtitle">外环标准价 / 内环实付价</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'discount' }"
            @click.stop="toggleSettingsMenu('discount')"
            :aria-expanded="openSettingsMenu === 'discount'"
            title="图表设置"
          >⚙️</button>
          <div v-if="openSettingsMenu === 'discount'" class="chart-settings-menu" @click.stop>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-container chart-container--tall" ref="discountChartRef"></div>
    </div>
    </div><!-- /all-charts-wrapper -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, watchEffect, markRaw } from 'vue';
import * as echarts from 'echarts';
import { useBookStore } from '@/store/book';
import { useBookmarkStore } from '@/store/bookmark';
import { bookService } from '@/services/book';
import type { BookGroup } from '@/services/book/types';

const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();

// 分组列表（id -> name 映射），用于把 book.groups 里的 ID 转成显示名称
const groups = ref<BookGroup[]>([]);
const groupIdToName = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const g of groups.value) {
    map[String(g.id)] = g.name || String(g.id);
  }
  return map;
});

// 图表引用
const statusChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);
const priceCategoryChartRef = ref<HTMLElement | null>(null);
const discountChartRef = ref<HTMLElement | null>(null);
// 新增：装帧分布（藏书）、月度书摘（书摘）图表容器
const bindingChartRef = ref<HTMLElement | null>(null);
const bookmarkTrendChartRef = ref<HTMLElement | null>(null);

// 缓存各图表实例，方便模式切换时精准更新单个图表
const priceCategoryChart = ref<any>(null);

// 购书花费分类模式：'group' 按分组，'tag' 按标签
const priceCategoryMode = ref<'group' | 'tag'>('group');

// 价格口径：'paid' 实际购买价，'standard' 标准价
const priceType = ref<'paid' | 'standard'>('paid');

// 排除 0 元书籍（仅在 priceType === 'paid' 模式下生效；勾选后从聚合中过滤掉 purchasePrice 为 0 的书）
const excludeZeroPaid = ref(false);

// 装帧类型映射：binding1 -> 中文标签（参考 Book/Edit.vue 中的 binding1Options）
const BINDING_LABELS: Record<number, string> = {
  0: '电子书',
  1: '平装',
  2: '精装',
  3: '特殊装帧',
  4: '套装',
};

// 当前激活的图表分类：null=不显示任何图表，'all'=全部图表，其他=对应分类
// - 'book'     藏书 → 装帧分布
// - 'read'     已读完 → 阅读状态分布 + 月度阅读趋势
// - 'bookmark' 书摘 → 月度书摘趋势
// - 'price'    标准/购书花费 → 购书花费分类 + 折扣对比
// - 'all'      全部图表
const activeChart = ref<'all' | 'book' | 'read' | 'bookmark' | 'price' | null>(null);

// 当前打开的图表设置菜单 id（同一时刻只显示一个下拉）
// 取值：'binding' | 'status' | 'trend' | 'bookmarkTrend' | 'priceCategory' | 'discount' | null
const openSettingsMenu = ref<string | null>(null);

function toggleSettingsMenu(id: string) {
  openSettingsMenu.value = openSettingsMenu.value === id ? null : id;
}

// 点击空白关闭下拉
function handleOutsideClick() {
  openSettingsMenu.value = null;
}

// 全局时间范围（影响所有图表）
const globalTimeRange = ref<'all' | '3m' | '6m' | '12m' | '24m' | 'thisYear' | 'custom'>('all');

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: 'all',      label: '全部时间' },
  { value: '3m',       label: '近 3 个月' },
  { value: '6m',       label: '近 6 个月' },
  { value: '12m',      label: '近 12 个月' },
  { value: '24m',      label: '近 24 个月' },
  { value: 'thisYear', label: '本年' },
  { value: 'custom',   label: '自定义' },
] as const;

// 自定义时间范围：起始 / 结束日期（YYYY-MM-DD）
const customStartDate = ref(formatDateInput(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)));
const customEndDate = ref(formatDateInput(new Date()));
// 用于限制结束日期不能超过今天
const todayStr = formatDateInput(new Date());

// 把 Date 转成 <input type="date"> 需要的 YYYY-MM-DD
function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 选择时间范围：自定义时不下拉，其他则关闭下拉
function selectTimeRange(value: typeof TIME_RANGE_OPTIONS[number]['value']) {
  globalTimeRange.value = value;
  if (value !== 'custom') {
    openSettingsMenu.value = null;
  }
}

// 时间范围工具：根据范围过滤书籍（用 createTime 字段）
// 签名宽松：传入任意带 createTime 属性的对象（Book 等）
// 根据当前 globalTimeRange 计算 [from, to] 时间区间；'all' 返回 null
function resolveTimeRange(): { from: Date; to: Date } | null {
  const range = globalTimeRange.value;
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'custom') {
    const from = customStartDate.value
      ? new Date(customStartDate.value)
      : new Date(0);
    // 结束日期包含当天，扩展到 23:59:59
    const to = customEndDate.value
      ? new Date(customEndDate.value + 'T23:59:59')
      : now;
    return { from, to };
  }
  let from: Date;
  if (range === 'thisYear') {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 24;
    from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  }
  return { from, to: now };
}

// 时间范围过滤（书籍）：兼容 createTime / purchaseDate / timestamp / last_modified
// 优先用 createTime，否则按 purchaseDate，再否则用 timestamp，再否则用 last_modified
// 全部取不到则视为不在范围内（与之前行为一致）
function filterBooksByTimeRange<T extends {
  createTime?: string | null;
  purchaseDate?: string | null;
  timestamp?: string | null;
  last_modified?: string | null;
}>(books: T[]): T[] {
  const span = resolveTimeRange();
  if (!span) return books;
  return books.filter(b => {
    const raw = b.createTime || b.purchaseDate || b.timestamp || b.last_modified;
    if (!raw) return false;
    const t = new Date(raw);
    return !isNaN(t.getTime()) && t >= span.from && t <= span.to;
  });
}

// 时间范围工具：根据范围过滤书摘（用 createTime/created_at 字段）
function filterBookmarksByTimeRange<T extends { createTime?: string; created_at?: string }>(items: T[]): T[] {
  const span = resolveTimeRange();
  if (!span) return items;
  return items.filter(b => {
    const t = b.createTime || b.created_at;
    if (!t) return false;
    const d = new Date(t);
    return !isNaN(d.getTime()) && d >= span.from && d <= span.to;
  });
}

// 阅读统计
const readingStats = computed(() => {
  // 应用全局时间范围过滤（基于 addTime 字段）
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);

  // 阅读状态分布
  const unreadCount = books.filter(b => b.readStatus === '未读').length;
  const readingCount = books.filter(b => b.readStatus === '在读').length;
  const readCount = books.filter(b => b.readStatus === '已读').length;

  // 装帧分布：按 binding1 聚合（缺失/null 归入"未设置"）
  // 电子书判定与书库高级筛选保持一致：以 book_type === 0 为准
  // 注：不再用 binding1 === 0 兜底，避免载体为实体书但装帧历史错填为 0 时误计为电子书
  const bindingMap: Record<string, number> = {};
  for (const b of books) {
    let key: string;
    if (b.book_type === 0) {
      key = '电子书';
    } else if (b.binding1 === null || b.binding1 === undefined) {
      key = '未设置';
    } else {
      key = BINDING_LABELS[b.binding1] ?? `装帧#${b.binding1}`;
    }
    bindingMap[key] = (bindingMap[key] || 0) + 1;
  }
  // 排序：按数量降序；过滤 0
  const bindingStats = Object.entries(bindingMap)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalBooks: books.length,
    readBooks: readCount,
    readingBooks: readingCount,
    unreadBooks: unreadCount,
    readStatusBreakdown: [
      { label: '未读', count: unreadCount, color: '#9e9e9e' },
      { label: '在读', count: readingCount, color: '#ff9800' },
      { label: '已读', count: readCount, color: '#4caf50' },
    ],
    bindingStats,
    totalBookmarks: bookmarks.length,
    totalSpent: books.reduce((sum, b) => sum + (b.purchasePrice || 0), 0),
    totalStandardPrice: books.reduce((sum, b) => sum + (b.standardPrice || 0), 0),
    // 月度阅读趋势：基于 resolveTimeRange 生成完整月份列表，按 readCompleteDate 聚合
    trendMonths: (() => {
      const span = resolveTimeRange();
      const counts = new Map<string, number>();
      for (const b of books) {
        if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
        const d = new Date(b.readCompleteDate);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return resolveMonthRangeFromCounts(span, counts);
    })(),
    trendCounts: (() => {
      const span = resolveTimeRange();
      // 用过滤后的 books，按 readCompleteDate 统计当月读完数量
      const counts = new Map<string, number>();
      for (const b of books) {
        if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
        const d = new Date(b.readCompleteDate);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const monthList = resolveMonthRangeFromCounts(span, counts);
      return monthList.map(m => counts.get(m) || 0);
    })(),
  };
});

// 月度书摘趋势：按 createTime 聚合近 12 个月
// - 横轴：月份（YYYY-MM）
// - 纵轴：当月书摘数量
// - 用最新有数据月份作为结束月，回溯 12 个月
// 生成 [from, to] 之间的完整月份列表，格式 YYYY-MM
function generateMonthRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const y = from.getFullYear();
  const m = from.getMonth() + 1;
  const toY = to.getFullYear();
  const toM = to.getMonth() + 1;
  let cy = y, cm = m;
  while (cy < toY || (cy === toY && cm <= toM)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`);
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }
  return months;
}

// 在没有显式时间范围时，根据 counts 自动推导月份列表
// 优先覆盖"最早有数据的月 → 当前月"，确保 X 轴不会出现"暂无时间范围"占位
function resolveMonthRangeFromCounts(
  span: { from: Date; to: Date } | null,
  counts: Map<string, number>
): string[] {
  if (span) return generateMonthRange(span.from, span.to);
  if (counts.size > 0) {
    const sortedKeys = Array.from(counts.keys()).sort();
    const firstKey = sortedKeys[0];
    const lastKey = sortedKeys[sortedKeys.length - 1];
    const [fy, fm] = firstKey.split('-').map(Number);
    const [ly, lm] = lastKey.split('-').map(Number);
    const now = new Date();
    return generateMonthRange(new Date(fy, fm - 1, 1), now);
  }
  // 无数据时也至少显示当前月
  const now = new Date();
  return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
}

const bookmarkTrendStats = computed(() => {
  const span = resolveTimeRange();
  const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);
  const counts = new Map<string, number>();
  for (const bm of bookmarks) {
    const t = bm.createTime || bm.created_at;
    if (!t) continue;
    const d = new Date(t);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const months = resolveMonthRangeFromCounts(span, counts);
  const hasData = Array.from(counts.values()).some(v => v > 0);
  return {
    months,
    counts: months.map(m => counts.get(m) || 0),
    hasData,
  };
});

// 价格统计（按书籍载体 + 分组分类）
const priceStats = computed(() => {
  // 过滤：
  // 1) 购买价格模式下开启"排除 0 元"时，从聚合中剔除 purchasePrice === 0 的书
  // 2) 应用全局时间范围过滤
  const baseBooks = filterBooksByTimeRange(bookStore.allBooks);
  const books = (priceType.value === 'paid' && excludeZeroPaid.value)
    ? baseBooks.filter(b => (b.purchasePrice || 0) > 0)
    : baseBooks;

  // 按 book_type 聚合（电子/纸质）
  const typeAgg: Record<string, { count: number; spent: number; standard: number }> = {
    电子书: { count: 0, spent: 0, standard: 0 },
    纸质书: { count: 0, spent: 0, standard: 0 },
  };
  // 按 分组 聚合（按首分组分组）
  const groupAgg: Record<string, { count: number; spent: number; standard: number }> = {
    未分组: { count: 0, spent: 0, standard: 0 },
  };

  // 按 标签 聚合（多标签按比例分摊，保证合计 = 总花费）
  // - spent: 一本书有 N 个标签时，每个标签记入 spent/N（金额按比例分摊）
  // - count: 一本书的所有标签都计数（有 N 个标签则在 N 个标签里都 +1）
  // - 这样所有标签的 spent 之和 = 总花费，count 是"包含此标签的书籍数"
  const tagAgg: Record<string, { count: number; spent: number; standard: number; bookIds: Set<number> }> = {};

  for (const b of books) {
    const typeKey = b.book_type === 0 ? '电子书' : '纸质书';
    typeAgg[typeKey].count += 1;
    typeAgg[typeKey].spent += b.purchasePrice || 0;
    typeAgg[typeKey].standard += b.standardPrice || 0;

    // b.groups 里存的是分组 ID（可能是数字或字符串），需要通过 groupIdToName 映射成显示名
    const rawGroupKey = (b.groups && b.groups.length > 0) ? b.groups[0] : null;
    const groupKey = rawGroupKey === null || rawGroupKey === undefined
      ? '未分组'
      : (groupIdToName.value[String(rawGroupKey)] || `分组#${rawGroupKey}`);
    if (!groupAgg[groupKey]) {
      groupAgg[groupKey] = { count: 0, spent: 0, standard: 0 };
    }
    groupAgg[groupKey].count += 1;
    groupAgg[groupKey].spent += b.purchasePrice || 0;
    groupAgg[groupKey].standard += b.standardPrice || 0;

    // 标签聚合：合并多种标签源，并去重
    // 注意：book 类型可能不包含 customTags，用 (b as any) 兜底
    const bAny = b as any;
    const allTags = new Set<string>();
    if (Array.isArray(b.tags)) b.tags.forEach((t: string) => t && allTags.add(t));
    if (Array.isArray(b.calibreTags)) b.calibreTags.forEach((t: string) => t && allTags.add(t));
    if (Array.isArray(bAny.customTags)) bAny.customTags.forEach((t: string) => t && allTags.add(t));

    if (allTags.size === 0) {
      // 没有标签的书籍归入"未标签"
      if (!tagAgg['未标签']) {
        tagAgg['未标签'] = { count: 0, spent: 0, standard: 0, bookIds: new Set() };
      }
      tagAgg['未标签'].count += 1;
      tagAgg['未标签'].spent += b.purchasePrice || 0;
      tagAgg['未标签'].standard += b.standardPrice || 0;
      tagAgg['未标签'].bookIds.add(b.id);
    } else {
      const n = allTags.size;
      const splitSpent = (b.purchasePrice || 0) / n;
      const splitStandard = (b.standardPrice || 0) / n;
      allTags.forEach(tag => {
        if (!tagAgg[tag]) {
          tagAgg[tag] = { count: 0, spent: 0, standard: 0, bookIds: new Set() };
        }
        tagAgg[tag].count += 1;
        tagAgg[tag].spent += splitSpent;
        tagAgg[tag].standard += splitStandard;
        tagAgg[tag].bookIds.add(b.id);
      });
    }
  }

  // 在聚合完成后，根据 priceType 给 groupAgg/tagAgg 每个分组加一个 value 字段（对外消费）
  // - value = 当前选中口径的金额（实付价 或 标准价）
  // - 这样上层 renderPriceCategoryChart 不需要关心是哪种口径
  const pickAmount = (v: { spent: number; standard: number }) => priceType.value === 'standard' ? v.standard : v.spent;
  for (const k in groupAgg) {
    (groupAgg[k] as any).value = pickAmount(groupAgg[k]);
  }
  for (const k in tagAgg) {
    (tagAgg[k] as any).value = pickAmount(tagAgg[k] as any);
  }

  const totalPaid = books.reduce((s, b) => s + (b.purchasePrice || 0), 0);
  const totalStandard = books.reduce((s, b) => s + (b.standardPrice || 0), 0);
  const savings = Math.max(0, totalStandard - totalPaid);
  const savingsPercent = totalStandard > 0 ? Math.round((savings / totalStandard) * 100) : 0;

  return { typeAgg, groupAgg, tagAgg, totalPaid, totalStandard, savings, savingsPercent };
});

// 初始化图表
const initCharts = () => {
  // 防止重复 init：先 dispose 已存在的实例（折叠后再展开场景）
  if (statusChartRef.value) echarts.dispose(statusChartRef.value);
  if (trendChartRef.value) echarts.dispose(trendChartRef.value);
  if (priceCategoryChartRef.value) echarts.dispose(priceCategoryChartRef.value);
  if (discountChartRef.value) echarts.dispose(discountChartRef.value);
  if (bindingChartRef.value) echarts.dispose(bindingChartRef.value);
  if (bookmarkTrendChartRef.value) echarts.dispose(bookmarkTrendChartRef.value);
  priceCategoryChart.value = null;

  // 装帧分布（玫瑰图）— 藏书卡片图表
  if (bindingChartRef.value) {
    const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107'];
    const data = readingStats.value.bindingStats.map((b, i) => ({
      name: b.label,
      value: b.count,
      itemStyle: { color: palette[i % palette.length] }
    }));
    const chart = echarts.init(bindingChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
      legend: { bottom: '5%', left: 'center', icon: 'circle' },
      series: [{
        type: 'pie',
        radius: ['25%', '70%'],
        center: ['50%', '45%'],
        roseType: 'radius',  // 玫瑰图：半径反映数量
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{c|本} ',
          rich: { c: { color: '#666', fontSize: 10 } }
        },
        data
      }]
    });
  }

  // 月度书摘趋势（柱状图）— 书摘卡片图表
  if (bookmarkTrendChartRef.value) {
    const { months, counts, hasData } = bookmarkTrendStats.value;
    const chart = echarts.init(bookmarkTrendChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 30, left: 50, right: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: hasData ? months.map(m => m.slice(2)) : ['暂无数据'],
        axisLabel: { fontSize: 10, color: '#666' },
        axisLine: { lineStyle: { color: '#e0e0e0' } }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 10, color: '#666' },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
      },
      series: [{
        type: 'bar',
        data: hasData ? counts : [0],
        barWidth: '55%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#4caf50' },
              { offset: 1, color: '#81c784' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', fontSize: 10, color: '#666' }
      }]
    });
  }

  // 阅读状态分布图
  if (statusChartRef.value) {
    const chart = echarts.init(statusChartRef.value);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '5%',
        left: 'center'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        data: [
          { value: readingStats.value.readBooks, name: '已读', itemStyle: { color: '#4caf50' } },
          { value: readingStats.value.readingBooks, name: '在读', itemStyle: { color: '#ff6b35' } },
          { value: readingStats.value.unreadBooks, name: '未读', itemStyle: { color: '#9e9e9e' } }
        ]
      }]
    });
  }

  // 月度趋势图
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value);
    const { trendMonths, trendCounts } = readingStats.value;
    // 把 YYYY-MM 转成显示标签，如 "25-03月"
    const axisLabels = trendMonths.map(m => {
      const [y, mo] = m.split('-');
      return `${String(y).slice(-2)}-${mo}月`;
    });

    chart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: axisLabels,
        axisLine: { lineStyle: { color: '#ddd' } },
        axisLabel: { color: '#666' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      series: [{
        data: trendCounts,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#ff6b35' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 53, 0.05)' }
          ])
        }
      }]
    });
  }

  // 购书花费分类环形图（分组模式 or 标签模式）—— 初次初始化
  renderPriceCategoryChart(true);

  // 折扣对比环形图（外环标准价 + 内环实付价）
  if (discountChartRef.value) {
    const chart = echarts.init(discountChartRef.value);
    const { totalPaid, totalStandard, savings } = priceStats.value;

    // 外环：标准价（已购书的 standardPrice 之和）
    // 内环：实付价 + 节省 = 标准价
    const standardData = [
      { name: '实付', value: Math.round(totalPaid * 100) / 100, itemStyle: { color: '#ff6b35' } },
      { name: '省下', value: Math.round(savings * 100) / 100, itemStyle: { color: '#4caf50' } },
    ];

    // 内环：按载体类型再细分
    const { typeAgg } = priceStats.value;
    const innerData = [
      {
        name: '电子书实付',
        value: Math.round(typeAgg['电子书'].spent * 100) / 100,
        itemStyle: { color: '#66bb6a' }
      },
      {
        name: '纸质书实付',
        value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
        itemStyle: { color: '#ff8a65' }
      },
    ].filter(d => d.value > 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>金额: ¥{c}<br/>占比: {d}%'
      },
      legend: {
        bottom: 10,
        left: 'center',
        textStyle: { fontSize: 12, color: '#666' }
      },
      title: {
        text: `实付占比\n${totalStandard > 0 ? Math.round((totalPaid / totalStandard) * 100) : 0}%`,
        left: '50%',
        top: '46%',
        textAlign: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          lineHeight: 20
        }
      },
      series: [
        {
          name: '外环(标准价)',
          type: 'pie',
          radius: ['52%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n¥{c}',
            fontSize: 11
          },
          data: standardData,
        },
        {
          name: '内环(实付构成)',
          type: 'pie',
          radius: ['24%', '44%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n¥{c}',
            fontSize: 10
          },
          data: innerData,
        }
      ]
    });
  }
};

// 单独渲染购书花费分类图表（供 initCharts 初次初始化 + watcher 模式切换复用）
function renderPriceCategoryChart(isInit: boolean) {
  if (!priceCategoryChartRef.value) return;

  const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107', '#e91e63', '#00bcd4', '#795548', '#607d8b', '#3f51b5', '#009688', '#cddc39', '#ff5722', '#673ab7'];
  const { groupAgg, tagAgg, typeAgg } = priceStats.value;
  const isTagMode = priceCategoryMode.value === 'tag';
  const sourceAgg = isTagMode ? tagAgg : groupAgg;
  const seriesName = isTagMode ? '按标签' : '按分组';
  const useUniqueCount = isTagMode;

  console.log('[购书花费分类] priceType=', priceType.value, 'mode=', priceCategoryMode.value, 'groupKeys=', Object.keys(sourceAgg), 'values=', Object.entries(sourceAgg).map(([, v]) => [(v as any).value, v.count]));
  // 按花费排序，取前 7 个，其他归入"其他"
  const sorted = Object.entries(sourceAgg)
    .map(([k, v]) => {
      const vAny = v as any;
      const count = useUniqueCount && vAny.bookIds ? vAny.bookIds.size : v.count;
      return {
        name: k,
        value: Math.round((vAny.value ?? 0) * 100) / 100,
        count,
      };
    })
    .sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  if (rest.length > 0) {
    const sumRest = rest.reduce((s, x) => s + x.value, 0);
    const countRest = rest.reduce((s, x) => s + x.count, 0);
    top.push({ name: `其他(${rest.length}类)`, value: Math.round(sumRest * 100) / 100, count: countRest });
  }

  // 外环：分组/标签（带色）
  const data = top
    .filter(d => d.value > 0)
    .map((d, i) => ({
      name: d.name,
      value: d.value,
      itemStyle: { color: palette[i % palette.length] },
    }));

  // 内环：电子/纸质载体
  const typeData = [
    {
      name: '电子书', value: Math.round(typeAgg['电子书'].spent * 100) / 100,
      itemStyle: { color: '#4caf50' }
    },
    {
      name: '纸质书', value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
      itemStyle: { color: '#ff6b35' }
    },
  ].filter(d => d.value > 0);

  const countDesc = isTagMode ? '涉及册数' : '册数';

  const option = {
    color: palette, // 兜底全局色板
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const datum = top.find(d => d.name === params.name);
        const count = datum ? datum.count : 0;
        const valueText = isTagMode && datum && datum.value < 10
          ? `¥${datum.value.toFixed(2)}（按标签分摊）`
          : datum
            ? `¥${datum.value.toFixed(2)}`
            : `¥${Number(params.value).toFixed(2)}`;
        return `${params.seriesName}<br/>${params.marker} ${params.name}<br/>花费: ${valueText}<br/>占比: ${params.percent}%<br/>${countDesc}: ${count}`;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'middle',
      textStyle: { fontSize: 11, color: '#666' }
    },
    series: [
      {
        name: '按载体',
        type: 'pie',
        radius: ['0%', '38%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: typeData,
      },
      {
        name: seriesName,
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['38%', '50%'],
        roseType: 'radius',
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n¥{c|{c}}',
          rich: { c: { color: '#333', fontSize: 10, fontWeight: 600 } }
        },
        labelLine: { length: 8, length2: 8 },
        data: data,
      }
    ]
  };

  if (isInit) {
    // 首次初始化：清理可能残留的实例（HMR 友好）
    const existing = echarts.getInstanceByDom(priceCategoryChartRef.value);
    if (existing) existing.dispose();
    // markRaw: 让 echarts 实例脱离 Vue 响应式代理，避免内部大量属性被代理导致性能/渲染异常
    priceCategoryChart.value = markRaw(echarts.init(priceCategoryChartRef.value));
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
    // 等待 DOM 完成布局后再 resize，避免容器尺寸为 0 导致渲染异常
    nextTick(() => priceCategoryChart.value && priceCategoryChart.value.resize());
  } else if (priceCategoryChart.value) {
    // 模式切换：setOption 不合并，强制替换
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
  }
}

// 组件挂载时初始化图表
onMounted(async () => {
  // 先加载分组列表，建立 ID -> 名称 映射后再初始化图表
  try {
    groups.value = await bookService.getAllGroups();
    console.log('[购书花费分类] loaded groups=', groups.value.map(g => ({ id: g.id, name: g.name })));
  } catch (e) {
    console.error('[购书花费分类] 加载分组失败:', e);
  }
  // 默认不显示图表（activeChart = null）；点击 stat-card 后才初始化
  // 点击事件触发 activeChart 变化，watch 会调用 initCharts
  // 注册全局点击监听：点击非设置按钮 / 非下拉时关闭下拉
  document.addEventListener('click', handleOutsideClick);
});

// 监听"全部图表"卡片切换：折叠→展开时按需初始化图表；展开→折叠时销毁图表避免资源浪费
// 监听 activeChart 切换图表：false→true 时按需初始化图表；true→false 时销毁
watch(activeChart, async (v) => {
  await nextTick();
  if (v) {
    initCharts();
  } else {
    disposeAllCharts();
  }
});

// 当分类模式切换时，重新渲染购书花费分类图表
watch(priceCategoryMode, async () => {
  await nextTick();
  // 仅刷新购书花费分类图，不影响其他图表
  renderPriceCategoryChart(false);
});

// 当价格口径切换时，重新渲染购书花费分类图表
watch(priceType, async () => {
  await nextTick();
  renderPriceCategoryChart(false);
});

// 时间范围变化时，重渲染所有图表
watch(globalTimeRange, async () => {
  await nextTick();
  initCharts();
});

// 自定义日期变化时（仅在 custom 模式下），重渲染图表
watch([customStartDate, customEndDate], async () => {
  if (globalTimeRange.value === 'custom') {
    await nextTick();
    initCharts();
  }
});

// watchEffect 自动追踪 priceStats 内的所有依赖（groupAgg/tagAgg 内任何字段变化都会触发）
watchEffect(() => {
  // 读取 groupIdToName / groupAgg / tagAgg 以建立追踪
  void groupIdToName.value; // 分组加载完成后会自动重渲染
  const { groupAgg, tagAgg } = priceStats.value;
  // 深度读取以触发 deep tracking
  for (const k in groupAgg) { void groupAgg[k].spent; }
  for (const k in tagAgg) { void tagAgg[k].spent; }
  // 仅在已初始化后刷新
  if (priceCategoryChart.value) {
    renderPriceCategoryChart(false);
  }
});

// 组件卸载时销毁图表
onUnmounted(() => {
  disposeAllCharts();
  document.removeEventListener('click', handleOutsideClick);
});

// 销毁全部图表实例（折叠时主动释放资源）
function disposeAllCharts() {
  if (statusChartRef.value) echarts.dispose(statusChartRef.value);
  if (trendChartRef.value) echarts.dispose(trendChartRef.value);
  if (priceCategoryChartRef.value) echarts.dispose(priceCategoryChartRef.value);
  if (discountChartRef.value) echarts.dispose(discountChartRef.value);
  if (bindingChartRef.value) echarts.dispose(bindingChartRef.value);
  if (bookmarkTrendChartRef.value) echarts.dispose(bookmarkTrendChartRef.value);
  priceCategoryChart.value = null;
}
</script>

<style scoped lang="scss">
.stats-page {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-primary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

/* 第 6 张：图表视图触发卡片 */
.stat-card--toggle {
  cursor: pointer;
  user-select: none;
  border: 1px dashed transparent;
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 107, 53, 0.05) 100%);

  &.is-active {
    border-color: #ff6b35;
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.04) 100%);
  }

  &:focus-visible {
    outline: 2px solid #ff6b35;
    outline-offset: 2px;
  }
}

/* 卡片底部扩展信息（装帧分布 / 阅读状态分布 / 提示语） */
.stat-extra {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-extra--hint {
  font-size: 11px;
  color: #ff6b35;
  font-weight: 500;
}

.stat-extra-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  white-space: nowrap;

  em {
    font-style: normal;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.stat-extra--status .stat-extra-chip em {
  /* 让数字有视觉强调 */
  margin-left: 1px;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 价格口径旁的"排除 0 元"复选框 */
.exclude-zero-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  margin-left: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 107, 53, 0.08);
  }

  input[type='checkbox'] {
    margin: 0;
    cursor: pointer;
    accent-color: #ff6b35;
  }
}

/* 全部图表区域：默认有适度上间距 */
.all-charts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

/* 合并卡：标准总价 / 购书花费 */
.stat-value--dual {
  font-size: 18px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1.1;
}

.dual-part {
  display: inline-flex;
  align-items: baseline;
  color: #9c27b0;  /* 紫色 = 标准价 */
}
.dual-part--alt {
  color: #ff6b35;  /* 橙色 = 实付价 */
}

.dual-currency {
  font-size: 12px;
  margin-right: 1px;
  opacity: 0.85;
}

.dual-divider {
  color: #ccc;
  font-weight: 400;
  margin: 0 2px;
}

.stat-extra-chip--paid em { color: #ff6b35; }
.stat-extra-chip--saved em { color: #4caf50; }

.stat-label {
  font-size: 13px;
  color: var(--text-hint);
  margin-top: 4px;
}

.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header--with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* 图表右上角设置按钮 + 下拉菜单 */
.card-header-actions {
  position: relative;
  margin-left: auto;
}

.chart-settings-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 107, 53, 0.08);
    color: #ff6b35;
    border-color: rgba(255, 107, 53, 0.2);
  }

  &.is-open {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.chart-settings-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  min-width: 220px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;

  .dark & {
    background: #2a2a2a;
    border-color: #3a3a3a;
  }
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;

  & + .settings-section {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-top: 10px;
    margin-top: 4px;
  }
}

.settings-section-title {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 自定义时间范围：两个日期输入 */
.settings-custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}

.settings-date-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  background: #fff;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #ff6b35;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
  }
}

.settings-range-sep {
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-opt {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #ff6b35;
    background: rgba(255, 107, 53, 0.08);
  }

  &.active {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.settings-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: #ff6b35;
  }
}

/* 模式切换按钮（分组 / 标签） */
.mode-switch {
  display: inline-flex;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 3px;
  border: 1px solid #e8e8e8;
}

.mode-switch--price {
  margin-left: auto;
}

.mode-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover:not(.active) {
    color: #ff6b35;
    background-color: rgba(255, 107, 53, 0.08);
  }

  &.active {
    background-color: #ff6b35;
    color: #fff;
    box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
  }
}

.mode-icon {
  width: 14px;
  height: 14px;
}

/* 模式说明提示 */
.mode-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: rgba(255, 107, 53, 0.06);
  border-left: 3px solid #ff6b35;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.mode-hint-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.card-title-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.card-title-tag--book     { background: linear-gradient(135deg, #ff6b35, #ff9558); }
.card-title-tag--read     { background: linear-gradient(135deg, #4caf50, #6fbf73); }
.card-title-tag--bookmark { background: linear-gradient(135deg, #2196f3, #42a5f5); }
.card-title-tag--price    { background: linear-gradient(135deg, #9c27b0, #ba68c8); }

.card-title-sep {
  color: #ccc;
  font-weight: 400;
  margin: 0 2px;
}

.chart-container {
  width: 100%;
  height: 250px;
}

.chart-container--tall {
  height: 320px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-hint);
  margin-left: 8px;
  font-weight: normal;
}

.price-charts-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.price-chart-col {
  flex: 1;
  min-width: 0;
}

.discount-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(76, 175, 80, 0.05));
  border-radius: var(--radius-md);
  height: 100%;
}

.summary-item {
  padding: 10px 12px;
  background: var(--bg-card);
  border-radius: 8px;
  border-left: 3px solid #ff6b35;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.summary-item--paid {
  border-left-color: #ff6b35;
}

.summary-item--saved {
  border-left-color: #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.02));
}

.summary-label {
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-percent {
  font-size: 11px;
  color: #4caf50;
  margin-top: 2px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .price-charts-row {
    flex-direction: column;
  }
  .chart-container--tall {
    height: 280px;
  }
}
</style>
