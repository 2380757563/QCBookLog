<!--
  AnnualSummaryCard.vue
  年度总结卡片
  - 顶部：标题 + 年份切换
  - 四个关键指标：年度阅读书籍 / 总阅读页数 / 阅读时长 / 完成比例
  - 数据来源：bookStore.allBooks（当年 readCompleteDate 聚合）

  设计遵循统计页既有卡片风格（使用 --bg-card/--radius-lg 等 CSS 变量）
-->
<template>
  <section class="annual-card" aria-label="年度总结">
    <!-- 头部：标题 + 年份选择 -->
    <div class="annual-header">
      <div class="annual-title-wrap">
        <span class="annual-icon">🏆</span>
        <span class="annual-title">年度总结</span>
        <span class="annual-subtitle">{{ year }} 年阅读回顾</span>
      </div>
      <div class="year-selector" role="group" aria-label="选择年份">
        <button
          v-for="y in yearOptions"
          :key="y"
          class="year-opt"
          :class="{ active: y === year }"
          @click="year = y"
        >{{ y }}</button>
      </div>
    </div>

    <!-- 数据区 -->
    <div v-if="hasData" class="annual-stats">
      <div class="annual-grid">
        <div class="annual-item">
          <div class="annual-value">{{ bookCount }}</div>
          <div class="annual-label">年度阅读书籍</div>
        </div>
        <div class="annual-item">
          <div class="annual-value">{{ totalPages.toLocaleString() }}</div>
          <div class="annual-label">总阅读页数</div>
        </div>
        <div class="annual-item">
          <div class="annual-value">{{ totalHours }}<span class="unit">小时</span></div>
          <div class="annual-label">阅读时长</div>
        </div>
        <div class="annual-item">
          <div class="annual-value">{{ percent }}<span class="unit">%</span></div>
          <div class="annual-label">阅读完成率</div>
        </div>
      </div>

      <!-- 完成度进度条 -->
      <div class="annual-progress-row">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: percent + '%' }"></div>
        </div>
        <span class="progress-text">已读完 {{ doneCount }} / {{ relatedCount }} 本</span>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="annual-empty">
      <span class="empty-icon">📅</span>
      <p>{{ year }} 年暂无可统计的阅读数据</p>
    </div>

    <!-- AI 年度报告入口 -->
    <div class="annual-ai-row">
      <button
        class="annual-ai-btn"
        type="button"
        :disabled="aiChecking"
        :title="aiReady ? `用 AI 生成 ${year} 年报告` : aiHint"
        @click="goReport"
      >
        <span class="annual-ai-btn__icon">✨</span>
        <span>{{ aiChecking ? '正在检查 AI 配置…' : '生成 AI 年度报告' }}</span>
      </button>
      <span class="annual-ai-hint" :class="{ 'annual-ai-hint--warn': !aiReady && !aiChecking }">
        {{ aiChecking ? '' : aiReady ? `${year} 年长卷，可导出 PDF` : aiHint }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { annualSummaryApi } from '@/api/annualSummaryService';

/** 统计可用的年份：当年 + 前一年 */
const currentYear = new Date().getFullYear();
const yearOptions = computed(() => {
  // 收集所有出现过的年份，取当年与最近出现年份的最大范围
  const store = useBookStore();
  const years = new Set<number>([currentYear, currentYear - 1]);
  for (const b of store.allBooks) {
    // 阅读完成时间
    if (b.readCompleteDate) {
      const y = new Date(b.readCompleteDate).getFullYear();
      if (!isNaN(y)) years.add(y);
    }
    // 购书时间
    if (b.purchaseDate) {
      const y = new Date(b.purchaseDate).getFullYear();
      if (!isNaN(y)) years.add(y);
    }
  }
  return Array.from(years).sort((a, b) => b - a);
});

const year = ref(currentYear);

const bookStore = useBookStore();

/**
 * 当年数据：
 * - 该年读完的书（readCompleteDate 在当年）为核心统计对象
 * - completedInYear：当年读完的书（贡献"已完成阅读"）
 * - inYear：当年读完 或 当年购买的书（作为阅读完成率分母）
 */
const inYearBooks = computed(() => {
  const completedInYear = bookStore.allBooks.filter(
    b => b.readStatus === '已读' && inYear(b.readCompleteDate)
  );
  const purchasedInYear = bookStore.allBooks.filter(
    b => b.readStatus !== '已读' && inYear(b.purchaseDate)
  );
  return { completedInYear, purchasedInYear };
});

function inYear(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year.value;
}

const hasData = computed(() => {
  const { completedInYear, purchasedInYear } = inYearBooks.value;
  return completedInYear.length > 0 || purchasedInYear.length > 0;
});

/** 年度阅读书籍数量（当年读完的书） */
const bookCount = computed(() => inYearBooks.value.completedInYear.length);

/** 已读完数量 */
const doneCount = computed(() => inYearBooks.value.completedInYear.length);

/** 相关书籍（读完 + 当年购买未读完） */
const relatedCount = computed(() => {
  const { completedInYear, purchasedInYear } = inYearBooks.value;
  return completedInYear.length + purchasedInYear.length;
});

/** 完成比例 */
const percent = computed(() => {
  if (!relatedCount.value) return 0;
  return Math.round((doneCount.value / relatedCount.value) * 100);
});

/** 阅读页数合计（当年读完的书，优先累计已读页码 read_pages，否则用总页数 pages） */
const totalPages = computed(() =>
  inYearBooks.value.completedInYear.reduce(
    (sum, b) => sum + (b.read_pages || b.pages || 0),
    0
  )
);

/** 阅读时长合计（当年读完的书，单位分钟 → 由分钟转为小时） */
const totalMinutes = computed(() =>
  inYearBooks.value.completedInYear.reduce(
    (sum, b) => sum + (b.total_reading_time || 0),
    0
  )
);
const totalHours = computed(() =>
  Math.round((totalMinutes.value / 60) * 10) / 10
);

/* ---------------- AI 年度报告入口 ---------------- */

const router = useRouter();

const aiReady = ref(false);
const aiChecking = ref(true);

/** 未配置时的提示文案 */
const aiHint = computed(() => '尚未配置 AI 服务，请先到「第三方设置」填写 API Key');

const loadAiReady = async () => {
  try {
    const res = await annualSummaryApi.getSettings();
    const s = res.data?.settings;
    aiReady.value =
      !!s &&
      Number(s.annualSummaryEnabled) === 1 &&
      s.hasApiKey === true &&
      !!s.annualSummaryBaseUrl;
  } catch {
    aiReady.value = false;
  } finally {
    aiChecking.value = false;
  }
};

/**
 * 跳转到 AI 年度报告页。
 * 未配置 AI 时仍允许跳转，由报告页给出引导（避免用户在此页无从下手）。
 */
const goReport = () => {
  router.push({ path: '/annual-summary', query: { year: String(year.value) } });
};
onMounted(loadAiReady);
</script>

<style scoped lang="scss">
.annual-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

.annual-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.annual-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.annual-icon {
  font-size: 22px;
}
.annual-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.annual-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.year-selector {
  display: flex;
  gap: 6px;
}
.year-opt {
  padding: 4px 12px;
  border: 1px solid var(--border-light, #eee);
  border-radius: 14px;
  background: transparent;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.year-opt:hover {
  background: rgba(255, 107, 53, 0.06);
}
.year-opt.active {
  background: var(--primary-color, #ff6b35);
  border-color: var(--primary-color, #ff6b35);
  color: #fff;
}

/* 指标网格：2 列，桌面 4 列 */
.annual-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (min-width: 640px) {
  .annual-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.annual-item {
  text-align: center;
  padding: 12px 8px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.03));
  border-radius: var(--radius-md, 10px);
}
.annual-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.annual-value .unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.annual-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 进度条 */
.annual-progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.progress-track {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.08));
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #7fd17f);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 空态 */
.annual-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: var(--text-hint);
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.annual-empty p {
  margin: 0;
  font-size: 14px;
}

/* AI 年度报告入口 */
.annual-ai-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-light, #eee);
}
.annual-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff8c5a, var(--primary-color, #ff6b35));
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}
.annual-ai-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.annual-ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.annual-ai-btn__icon {
  font-size: 14px;
}
.annual-ai-hint {
  font-size: 12px;
  color: var(--text-hint);
}
.annual-ai-hint--warn {
  color: #c08a2e;
}
</style>