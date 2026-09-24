<!--
  年度报告卷轴
  ------------------------------------------------------------------
  职责：
  - 组装「卷首 + 10 个段落 + 卷尾」的长卷结构
  - provide 报告上下文（useReportContext）与导出模式标记（.export-mode）
  - 承载动效层：卷首点击礼花、BGM 开关、逐段淡入（由 SectionShell 负责）
  - 对外暴露 exportRoot / setExportMode / forceRevealAll，供 P6 导出流程调用

  宽度基准 750px：与 PDF 导出时的 A4 打印宽度接近，缩放损失最小。
-->
<template>
  <div ref="exportRoot" class="scroll-report" :class="{ 'export-mode': exportMode, 'print-mode': printMode }">
    <!-- 卷首 -->
    <header class="report-hero" @click="onHeroClick">
      <div class="report-hero__frame">
        <p class="report-hero__kicker">年度读书记录</p>
        <p class="report-hero__year">{{ report.stats?.year || '—' }}</p>
        <p class="report-hero__divider">
          <span></span>
          <em>{{ report.narrative?.opening ? '见字如面' : '青橙读书记录' }}</em>
          <span></span>
        </p>
        <p class="report-hero__meta">
          <span>{{ totalBooks }} 本藏书</span>
          <span class="dot">·</span>
          <span>生成于 {{ generatedAtText }}</span>
        </p>
      </div>
      <p class="report-hero__hint">轻触卷首，为自己放一场礼花</p>
    </header>

    <!-- 正文段落 -->
    <article class="report-body">
      <OpeningSection />
      <BuyingSection v-if="visible('buying')" />
      <SpendingSection v-if="visible('spending')" />
      <ReadingSection v-if="visible('reading')" />
      <HabitSection v-if="visible('habit')" />
      <TasteSection v-if="visible('taste')" />
      <BookmarkSection v-if="visible('bookmarks')" />
      <ReviewSection v-if="visible('reviews')" />
      <GoalSection v-if="visible('goals')" />
      <PersonaSection />
      <ClosingSection />
    </article>

    <!-- 卷尾 -->
    <footer class="report-foot">
      <span class="report-foot__line"></span>
      <span class="report-foot__text">本报告由 AI 依据你的读书记录生成，仅供留念</span>
      <span class="report-foot__line"></span>
    </footer>

    <!-- 动效：礼花（导出模式下不触发） -->
    <ConfettiBurst ref="confettiRef" />

    <!-- 动效：BGM 开关（默认关，音源为空则隐藏） -->
    <button
      v-if="bgmUrl"
      class="report-bgm"
      type="button"
      :title="bgmPlaying ? '暂停背景音乐' : '播放背景音乐'"
      @click="toggleBgm"
    >
      <span class="report-bgm__icon">{{ bgmPlaying ? '❚❚' : '♪' }}</span>
      <span class="report-bgm__text">{{ bgmPlaying ? '暂停' : '配乐' }}</span>
    </button>

    <audio ref="audioRef" :src="bgmUrl" loop preload="none" @ended="bgmPlaying = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue';
import type { AnnualSummaryReport } from '@/api/annualSummaryService';
import ConfettiBurst from '@/components/ConfettiBurst.vue';
import SectionShell from './section/SectionShell.vue';
import OpeningSection from './section/OpeningSection.vue';
import BuyingSection from './section/BuyingSection.vue';
import SpendingSection from './section/SpendingSection.vue';
import ReadingSection from './section/ReadingSection.vue';
import HabitSection from './section/HabitSection.vue';
import TasteSection from './section/TasteSection.vue';
import BookmarkSection from './section/BookmarkSection.vue';
import ReviewSection from './section/ReviewSection.vue';
import GoalSection from './section/GoalSection.vue';
import PersonaSection from './section/PersonaSection.vue';
import ClosingSection from './section/ClosingSection.vue';
import { createReportContext, REPORT_CONTEXT_KEY } from '../composables/useReportContext';

const props = withDefaults(
  defineProps<{
    report: AnnualSummaryReport;
    /** 背景音乐地址，为空则不显示按钮 */
    bgmUrl?: string;
  }>(),
  { bgmUrl: '' }
);

/* ---------------- 上下文 ---------------- */

const reportRef = computed(() => props.report);
const context = createReportContext(reportRef);
provide(REPORT_CONTEXT_KEY, context);

/* ---------------- 导出模式 ---------------- */

const exportMode = ref(false);
const printMode = ref(false);
provide('reportExportMode', exportMode);

const exportRoot = ref<HTMLElement | null>(null);
const sectionRefs = ref<any[]>([]);

/** 导出前调用：切断动画、强制显示全部段落 */
const setExportMode = async (enabled: boolean) => {
  exportMode.value = enabled;
  if (enabled) {
    stopBgm();
    // 等一帧让 .export-mode 生效后再返回，避免 html2canvas 抓到过渡中间态
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  }
};

const setPrintMode = (enabled: boolean) => {
  printMode.value = enabled;
  if (enabled) stopBgm();
};

/* ---------------- 段落可见性 ---------------- */

const enabledSources = computed<string[]>(() => {
  const fromMeta = props.report.meta?.sources;
  if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta;
  return Object.keys(props.report.stats ?? {});
});

/** 段落是否渲染：AI 文案为空且无统计数据时整段隐藏，避免长卷被空段撑开 */
const visible = (key: string) => {
  const text = context.narrative.value[key];
  const hasText = typeof text === 'string' && text.trim() !== '';
  if (hasText) return true;
  return context.hasData(key) && enabledSources.value.includes(key);
};

/* ---------------- 卷首信息 ---------------- */

const totalBooks = computed(() => {
  const stats = props.report.stats ?? {};
  return stats.collection?.libraryTotal ?? stats.binding?.total ?? 0;
});

const generatedAtText = computed(() => {
  const raw = props.report.generatedAt;
  if (!raw) return '—';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
});

/* ---------------- 动效：礼花 ---------------- */

const confettiRef = ref<InstanceType<typeof ConfettiBurst> | null>(null);

const onHeroClick = () => {
  if (exportMode.value) return;
  confettiRef.value?.fire();
};

/* ---------------- 动效：BGM ---------------- */

const audioRef = ref<HTMLAudioElement | null>(null);
const bgmPlaying = ref(false);

const toggleBgm = async () => {
  const audio = audioRef.value;
  if (!audio) return;
  if (bgmPlaying.value) {
    audio.pause();
    bgmPlaying.value = false;
    return;
  }
  try {
    audio.volume = 0.35;
    await audio.play();
    bgmPlaying.value = true;
  } catch {
    bgmPlaying.value = false;
  }
};

const stopBgm = () => {
  const audio = audioRef.value;
  if (audio && !audio.paused) audio.pause();
  bgmPlaying.value = false;
};

/** 报告切换（重新生成 / 换年份）时复位播放状态 */
watch(
  () => props.report.generatedAt,
  () => stopBgm()
);

onBeforeUnmount(() => stopBgm());

defineExpose({
  /** P6 导出时挂载的 DOM 根节点 */
  exportRoot,
  /** P6 导出 / 卸下导出模式 */
  setExportMode,
  setPrintMode,
  /** 段落组件引用（批量 forceReveal 用） */
  sectionRefs,
  SectionShell
});
</script>

<style scoped>
.scroll-report {
  position: relative;
  width: 750px;
  max-width: 100%;
  margin: 0 auto;
  padding: 48px 56px 56px;
  box-sizing: border-box;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(201, 162, 39, 0.09), transparent 60%),
    linear-gradient(180deg, #fdfaf3 0%, #faf6ee 55%, #f6f1e6 100%);
  border: 1px solid rgba(201, 191, 174, 0.62);
  border-radius: 4px;
  box-shadow: 0 18px 48px rgba(90, 74, 48, 0.12);
  color: #4a3d2f;
  font-family: 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
}

/* ---------------- 卷首 ---------------- */

.report-hero {
  padding: 24px 0 44px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.report-hero__frame {
  padding: 34px 20px 30px;
  border: 1px solid rgba(201, 162, 39, 0.42);
  border-radius: 3px;
  background: rgba(255, 254, 250, 0.62);
}

.report-hero__kicker {
  margin: 0 0 14px;
  font-size: 13px;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  color: #9c8b73;
}

.report-hero__year {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 76px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #2b2118;
}

.report-hero__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 22px 0 18px;
}

.report-hero__divider span {
  width: 72px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.7), transparent);
}

.report-hero__divider em {
  font-style: normal;
  font-size: 13px;
  letter-spacing: 0.24em;
  text-indent: 0.24em;
  color: #8c6239;
}

.report-hero__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  color: #9c8b73;
}

.report-hero__meta .dot {
  color: #c9bfae;
}

.report-hero__hint {
  margin: 18px 0 0;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #c0b19a;
}

/* ---------------- 正文 ---------------- */

.report-body {
  padding-top: 8px;
}

/* ---------------- 卷尾 ---------------- */

.report-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 36px;
  padding-top: 26px;
}

.report-foot__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 191, 174, 0.9), transparent);
}

.report-foot__text {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: #b3a48c;
  white-space: nowrap;
}

/* ---------------- BGM ---------------- */

.report-bgm {
  position: fixed;
  right: 26px;
  bottom: 26px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  font-size: 12px;
  color: #6b5c47;
  background: rgba(253, 250, 243, 0.94);
  border: 1px solid rgba(201, 162, 39, 0.4);
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(90, 74, 48, 0.14);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 30;
}

.report-bgm:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(90, 74, 48, 0.2);
}

.report-bgm__icon {
  font-size: 11px;
  color: #c9a227;
}

/* ---------------- 导出 / 打印模式 ---------------- */

.export-mode,
.print-mode {
  box-shadow: none;
  border-radius: 0;
}

/* 导出模式下所有动效归零，保证 html2canvas 抓到终态 */
.export-mode *,
.print-mode * {
  animation: none !important;
  transition: none !important;
}

.export-mode .report-hero__hint,
.export-mode .report-bgm,
.print-mode .report-bgm {
  display: none !important;
}

@media (max-width: 780px) {
  .scroll-report {
    width: 100%;
    padding: 32px 22px 40px;
  }

  .report-hero__year {
    font-size: 56px;
  }
}
</style>

<!--
  打印兜底样式（非 scoped）
  ------------------------------------------------------------------
  window.print() 时只有全局样式能影响 body 与分页行为，
  因此单独放在第二个 <style> 块中，不参与 scoped 编译。
-->
<style>
@media print {
  /* 隐藏应用外壳，只留报告本身 */
  body * {
    visibility: hidden;
  }

  .scroll-report,
  .scroll-report * {
    visibility: visible;
  }

  .scroll-report {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: #faf6ee;
  }

  .report-hero__hint,
  .report-bgm {
    display: none !important;
  }

  /* 段落尽量不被劈成两页 */
  .report-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @page {
    margin: 12mm;
  }
}
</style>
