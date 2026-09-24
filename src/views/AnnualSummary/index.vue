<!--
  年度报告页
  ------------------------------------------------------------------
  流程：选年份 → 检测数据可用性 → 生成（或读取缓存）→ 卷轴渲染 → 导出
  生成结果持久化在后端 qc_user_settings（key: annualSummaryReport_<year>），
  因此刷新页面不会重复调用 AI、不会重复扣费。
-->
<template>
  <div class="annual-summary-page">
    <!-- 顶部工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <button class="back-btn" type="button" @click="goBack">← 返回</button>
        <h1 class="page-title">AI 年度报告</h1>
      </div>

      <div class="toolbar-right">
        <label class="year-picker">
          <span class="year-picker__label">年份</span>
          <select v-model.number="year" class="year-picker__select" :disabled="generating">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
          </select>
        </label>

        <button
          class="action-btn action-btn--primary"
          type="button"
          :disabled="generating || !canGenerate"
          @click="handleGenerate()"
        >
          <span v-if="generating" class="spinner"></span>
          {{ generating ? progressText : report ? '重新生成' : '生成报告' }}
        </button>
      </div>
    </div>

    <!-- 未配置 AI 提示 -->
    <div v-if="!loading && !aiReady" class="notice notice--warn">
      <span class="notice__icon">⚠️</span>
      <div class="notice__body">
        <strong>尚未配置 AI 服务</strong>
        <p>请先在「第三方设置」中填写 API Key 与模型，再回来生成报告。</p>
      </div>
      <button class="notice__action" type="button" @click="goSettings">前往设置</button>
    </div>

    <!-- 数据可用性提示 -->
    <div v-if="!loading && aiReady && !availabilityTotal" class="notice notice--info">
      <span class="notice__icon">📭</span>
      <div class="notice__body">
        <strong>{{ year }} 年暂无可用于生成的数据</strong>
        <p>换一个年份，或先去记录一些购书 / 阅读 / 书摘数据。</p>
      </div>
    </div>

    <!-- 错误提示（按后端错误码分类） -->
    <div v-if="errorMessage" class="notice notice--error">
      <span class="notice__icon">✕</span>
      <div class="notice__body">
        <strong>{{ errorTitle }}</strong>
        <p>{{ errorMessage }}</p>
        <p v-if="errorSuggestion" class="notice__hint">{{ errorSuggestion }}</p>
      </div>
      <button v-if="errorCode === 'AUTH' || errorCode === 'NO_KEY' || errorCode === 'NO_BASE_URL'" class="notice__action" type="button" @click="goSettings">
        前往设置
      </button>
      <button v-else class="notice__action" type="button" :disabled="generating" @click="handleGenerate()">重试</button>
    </div>

    <!-- 骨架 / 加载 -->
    <div v-if="loading" class="state-block">
      <span class="spinner spinner--large"></span>
      <p>正在读取报告…</p>
    </div>

    <!-- 空态 -->
    <div v-else-if="!report && !generating" class="state-block state-block--empty">
      <p class="state-block__emoji">🏆</p>
      <p class="state-block__title">还没有 {{ year }} 年的报告</p>
      <p class="state-block__desc">点击右上角「生成报告」，AI 会把这一年的买书、读书、书摘整理成一份长卷。</p>
    </div>

    <!-- 生成中 -->
    <div v-else-if="generating && !report" class="state-block">
      <p class="state-block__title">{{ progressText }}</p>
      <div class="progress-track">
        <div class="progress-track__bar"></div>
      </div>
      <p class="state-block__desc">通常需要 20~60 秒，请勿关闭页面。</p>
    </div>

    <!-- 报告主体 -->
    <div v-if="report" class="report-stage">
      <div v-if="generating" class="regenerating-mask">
        <span class="spinner"></span>
        <span>{{ progressText }}</span>
        <span class="progress-track progress-track--inline">
          <span class="progress-track__bar"></span>
        </span>
      </div>
      <ScrollReport ref="scrollRef" :report="report" :bgm-url="bgmUrl" />

      <!-- 报告信息 + 导出入口 -->
      <div class="report-meta">
        <div class="report-meta__info">
          <span>模型：{{ report.meta?.model || '—' }}</span>
          <span v-if="report.meta?.elapsed">耗时 {{ (report.meta.elapsed / 1000).toFixed(1) }}s</span>
          <span v-if="report.meta?.usage?.total_tokens">Token：{{ report.meta.usage.total_tokens }}</span>
          <span v-if="report.meta?.repaired" class="report-meta__flag">部分段落走兜底</span>
        </div>

        <div class="report-meta__actions">
          <button class="export-btn" type="button" :disabled="exporting" @click="handleExportPdf('scroll')">
            长图 PDF
          </button>
          <button class="export-btn" type="button" :disabled="exporting" @click="handleExportPdf('a4')">
            分页 PDF
          </button>
          <button class="export-btn" type="button" :disabled="exporting" @click="handleExportHtml">
            单文件 HTML
          </button>
          <button class="export-btn export-btn--ghost" type="button" :disabled="exporting" @click="handlePrint">
            打印
          </button>
        </div>
      </div>

      <!-- 导出错误提示 -->
      <div v-if="exportError" class="export-toast export-toast--error">
        <span>{{ exportError }}</span>
      </div>

      <!-- 导出进度 -->
      <div v-else-if="exporting" class="export-toast">
        <span class="spinner spinner--sm"></span>
        <span>{{ exportProgress.text }}</span>
        <span class="export-toast__percent">{{ exportProgress.percent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  annualSummaryApi,
  type AnnualSummaryReport,
  type DataAvailability
} from '@/api/annualSummaryService';
import ScrollReport from './components/ScrollReport.vue';
import { useReportExport, type PdfMode } from './composables/useReportExport';

const route = useRoute();
const router = useRouter();

/* ---------------- 基础状态 ---------------- */

const THIS_YEAR = new Date().getFullYear();
const year = ref<number>(Number(route.query.year) || THIS_YEAR);

const yearOptions = computed(() => {
  const list: number[] = [];
  for (let y = THIS_YEAR; y >= THIS_YEAR - 9; y--) list.push(y);
  return list;
});

const loading = ref(false);
const generating = ref(false);
const aiReady = ref(false);
const report = ref<AnnualSummaryReport | null>(null);
const availability = ref<DataAvailability>({});
const bgmUrl = ref('');
/** 是否在导出的 HTML 中内联动画脚本（来自 AI 设置） */
const htmlAnimated = ref(false);
const scrollRef = ref<InstanceType<typeof ScrollReport> | null>(null);

const errorCode = ref('');
const errorMessage = ref('');

const progressText = ref('正在整理这一年的阅读数据…');

/**
 * 生成过程的阶段文案。
 * 后端为单次阻塞调用、无阶段回调，因此按已耗时推进文案，
 * 让用户在等待期间有推进感；不显示百分比，避免展示失真数字。
 */
const PROGRESS_STAGES: Array<{ at: number; text: string }> = [
  { at: 0, text: '正在整理这一年的阅读数据…' },
  { at: 4000, text: '正在把数据交给 AI…' },
  { at: 9000, text: 'AI 正在构思这份年度长卷…' },
  { at: 18000, text: '正在润色收尾…' }
];

let progressTimer: ReturnType<typeof setInterval> | null = null;

const startProgress = (regenerate: boolean) => {
  const startedAt = Date.now();
  const tick = () => {
    const elapsed = Date.now() - startedAt;
    let text = PROGRESS_STAGES[0].text;
    for (const stage of PROGRESS_STAGES) {
      if (elapsed >= stage.at) text = stage.text;
    }
    progressText.value = regenerate ? `重新生成 · ${text}` : text;
  };
  tick();
  progressTimer = setInterval(tick, 500);
};

const stopProgress = () => {
  if (progressTimer !== null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
};

/* ---------------- 错误码 → 中文提示 ---------------- */

const ERROR_MAP: Record<string, { title: string; suggestion: string }> = {
  DISABLED: { title: 'AI 年度总结未启用', suggestion: '请到「第三方设置 → AI 年度总结」打开开关。' },
  NO_KEY: { title: '尚未填写 API Key', suggestion: '请到「第三方设置」补全 API Key 后重试。' },
  NO_BASE_URL: { title: '接口地址缺失', suggestion: '请检查 Base URL 是否为 OpenAI 兼容格式。' },
  AUTH: { title: 'API Key 无效或无权限', suggestion: '请确认 Key 未过期、余额充足，并选择与服务商匹配的模型。' },
  RATE_LIMIT: { title: '请求过于频繁', suggestion: '稍等一会儿再点「重新生成」。' },
  TIMEOUT: { title: 'AI 响应超时', suggestion: '可到设置里调大超时时间，或换用更快的模型。' },
  PARSE_ERROR: { title: 'AI 返回内容无法解析', suggestion: '可换一个模型或降低温度后重试。' },
  NETWORK: { title: '网络连接失败', suggestion: '请检查服务器能否访问该 API 地址。' }
};

const errorTitle = computed(() => ERROR_MAP[errorCode.value]?.title ?? '生成失败');
const errorSuggestion = computed(() => ERROR_MAP[errorCode.value]?.suggestion ?? '');

const clearError = () => {
  errorCode.value = '';
  errorMessage.value = '';
};

/* ---------------- 数据可用性 ---------------- */

const availabilityTotal = computed(() =>
  Object.values(availability.value).reduce((sum, n) => sum + (Number(n) || 0), 0)
);

const canGenerate = computed(() => aiReady.value && availabilityTotal.value > 0);

const loadAvailability = async (y: number) => {
  try {
    const res = await annualSummaryApi.getAvailability(y);
    availability.value = res.data?.available ?? {};
  } catch {
    availability.value = {};
  }
};

/* ---------------- 读取缓存报告 ---------------- */

const loadReport = async (y: number) => {
  loading.value = true;
  report.value = null;
  clearError();
  try {
    const res = await annualSummaryApi.getReport(y);
    report.value = res.data?.report ?? null;
  } catch (e: any) {
    errorCode.value = e?.code || '';
    errorMessage.value = e?.message || '读取报告失败';
  } finally {
    loading.value = false;
  }
};

/* ---------------- 检查 AI 是否配置 ---------------- */

const loadAiReady = async () => {
  try {
    const res = await annualSummaryApi.getSettings();
    const s = res.data?.settings;
    aiReady.value =
      !!s &&
      Number(s.annualSummaryEnabled) === 1 &&
      s.hasApiKey === true &&
      !!s.annualSummaryBaseUrl;
    htmlAnimated.value = Number(s?.annualSummaryHtmlAnimated) === 1;
  } catch {
    aiReady.value = false;
  }
};

/* ---------------- 生成 ---------------- */

/**
 * 生成报告。
 * - 首次生成：regenerate = false，后端若已有缓存则直接返回，不重复扣费
 * - 已有报告时点击「重新生成」：regenerate = true，强制忽略缓存重新调用 AI
 * - 出错后点击「重试」：沿用当前是否已有报告来判断，避免无谓地重跑 AI
 */
const handleGenerate = async (regenerate: boolean = !!report.value) => {
  if (generating.value || !canGenerate.value) return;

  generating.value = true;
  clearError();
  startProgress(regenerate);

  try {
    const res = await annualSummaryApi.generate({ year: year.value, regenerate });
    report.value = res.data?.report ?? null;
    if (res.data?.available) availability.value = res.data.available;
  } catch (e: any) {
    errorCode.value = e?.code || '';
    errorMessage.value = e?.detail || e?.message || '生成失败，请稍后重试。';
  } finally {
    stopProgress();
    generating.value = false;
  }
};

/* ---------------- 路由交互 ---------------- */

const goBack = () => router.back();
const goSettings = () => router.push('/third-party-settings');

/* ---------------- 导出 ---------------- */

/**
 * 导出根节点：ScrollReport 通过 defineExpose 暴露的卷轴 DOM。
 * 这里用 getter 读取，避免 ref 尚未挂载时拿到 null。
 */
const exportRoot = computed<HTMLElement | null>(() => {
  const instance: any = scrollRef.value;
  if (!instance) return null;
  const raw = instance.exportRoot;
  return raw?.value ?? raw ?? null;
});

const {
  exporting,
  progress: exportProgress,
  errorMessage: exportError,
  exportPdf,
  exportHtml,
  printReport
} = useReportExport({
  root: exportRoot,
  beforeExport: async () => {
    await scrollRef.value?.setExportMode(true);
  },
  afterExport: () => {
    scrollRef.value?.setExportMode(false);
  }
});

const handleExportPdf = (mode: PdfMode) => {
  if (!report.value) return;
  exportPdf(mode, { year: report.value.year });
};

const handleExportHtml = () => {
  if (!report.value) return;
  exportHtml({ year: report.value.year, animated: htmlAnimated.value });
};

const handlePrint = () => {
  scrollRef.value?.setPrintMode(true);
  window.addEventListener(
    'afterprint',
    () => scrollRef.value?.setPrintMode(false),
    { once: true }
  );
  printReport();
};

/* ---------------- 年份切换 ---------------- */

watch(year, async y => {
  router.replace({ query: { ...route.query, year: String(y) } });
  await Promise.all([loadAvailability(y), loadReport(y)]);
});

onMounted(async () => {
  await Promise.all([loadAiReady(), loadAvailability(year.value), loadReport(year.value)]);
});

onBeforeUnmount(stopProgress);
</script>

<style scoped>
.annual-summary-page {
  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 48px) 80px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f7f5ef 0%, #f2efe6 100%);
}

/* ---------------- 工具栏 ---------------- */

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto 20px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn {
  padding: 7px 14px;
  font-size: 13px;
  color: #6b5c47;
  background: transparent;
  border: 1px solid rgba(201, 191, 174, 0.9);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.7);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2b2118;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.year-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b5c47;
}

.year-picker__label {
  color: #9c8b73;
}

.year-picker__select {
  padding: 7px 10px;
  font-size: 13px;
  color: #2b2118;
  background: #fffdf8;
  border: 1px solid rgba(201, 191, 174, 0.9);
  border-radius: 7px;
  cursor: pointer;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  font-size: 14px;
  color: #fff;
  background: linear-gradient(135deg, #c9a227, #a98a2b);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---------------- 提示卡片 ---------------- */

.notice {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 900px;
  margin: 0 auto 18px;
  padding: 16px 18px;
  border-radius: 10px;
  font-size: 13px;
}

.notice--warn {
  background: rgba(255, 244, 224, 0.9);
  border: 1px solid rgba(214, 158, 46, 0.36);
}

.notice--info {
  background: rgba(238, 244, 250, 0.9);
  border: 1px solid rgba(120, 160, 200, 0.32);
}

.notice--error {
  background: rgba(253, 238, 238, 0.94);
  border: 1px solid rgba(200, 96, 96, 0.34);
}

.notice__icon {
  font-size: 16px;
  line-height: 1.4;
}

.notice__body {
  flex: 1;
  min-width: 0;
}

.notice__body strong {
  display: block;
  margin-bottom: 4px;
  color: #2b2118;
}

.notice__body p {
  margin: 0;
  line-height: 1.7;
  color: #6b5c47;
}

.notice__hint {
  margin-top: 4px !important;
  color: #8c7a63 !important;
}

.notice__action {
  flex-shrink: 0;
  padding: 6px 14px;
  font-size: 12px;
  color: #8c6239;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(201, 162, 39, 0.45);
  border-radius: 999px;
  cursor: pointer;
}

/* ---------------- 状态块 ---------------- */

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 900px;
  margin: 80px auto 0;
  padding: 48px 24px;
  text-align: center;
  color: #8c7a63;
}

.state-block__emoji {
  margin: 0;
  font-size: 42px;
}

.state-block__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2b2118;
}

.state-block__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #9c8b73;
}

/* ---------------- 报告主体 ---------------- */

.report-stage {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.regenerating-mask {
  position: absolute;
  inset: 0 0 auto;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  font-size: 13px;
  color: #8c6239;
  background: rgba(253, 250, 243, 0.92);
  border-radius: 8px;
}

.report-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 18px;
  margin-top: 18px;
  font-size: 12px;
  color: #a99983;
}

.report-meta__info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.report-meta__flag {
  color: #c08a2e;
}

/* ---------------- 导出操作 ---------------- */

.report-meta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.export-btn {
  padding: 7px 14px;
  font-size: 12px;
  color: #6b5c47;
  background: rgba(255, 254, 250, 0.9);
  border: 1px solid rgba(201, 162, 39, 0.42);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.export-btn:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn--ghost {
  border-color: rgba(201, 191, 174, 0.9);
  color: #9c8b73;
}

.export-toast {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 16px;
  font-size: 12px;
  color: #6b5c47;
  background: rgba(253, 250, 243, 0.94);
  border: 1px solid rgba(201, 162, 39, 0.32);
  border-radius: 8px;
}

.export-toast--error {
  color: #9c3a2e;
  background: rgba(253, 244, 242, 0.96);
  border-color: rgba(178, 58, 58, 0.32);
}

.export-toast__percent {
  font-variant-numeric: tabular-nums;
  color: #c9a227;
}

/* ---------------- 生成进度条（不定量：只表达「进行中」，不伪造百分比） ---------------- */

.progress-track {
  position: relative;
  width: 100%;
  max-width: 320px;
  height: 4px;
  background: rgba(201, 162, 39, 0.16);
  border-radius: 999px;
  overflow: hidden;
}

.progress-track--inline {
  flex: 1;
  max-width: 220px;
  height: 3px;
}

.progress-track__bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, rgba(201, 162, 39, 0), #c9a227, rgba(201, 162, 39, 0));
  border-radius: 999px;
  animation: progress-slide 1.4s ease-in-out infinite;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(360%);
  }
}

/* ---------------- loading ---------------- */

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner--large {
  width: 26px;
  height: 26px;
  border-width: 3px;
  border-color: rgba(201, 162, 39, 0.28);
  border-top-color: #c9a227;
}

.spinner--sm {
  width: 12px;
  height: 12px;
  border-color: rgba(201, 162, 39, 0.28);
  border-top-color: #c9a227;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .page-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: space-between;
  }
}
</style>
