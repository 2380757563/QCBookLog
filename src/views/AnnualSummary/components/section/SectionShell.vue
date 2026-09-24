/**
 * 年度报告段落：共用外壳
 *
 * 统一负责：标题、序号、淡入动画、无数据降级提示。
 * 各业务段落只需把内容塞进默认插槽。
 */
<template>
  <section
    ref="rootRef"
    class="report-section"
    :class="{
      'report-section--revealed': revealed,
      'report-section--empty': empty,
      'report-section--static': isExportMode
    }"
    :data-section="anchor"
  >
    <header class="report-section__head">
      <span v-if="index" class="report-section__index">{{ String(index).padStart(2, '0') }}</span>
      <h2 class="report-section__title">{{ title }}</h2>
      <span v-if="caption" class="report-section__caption">{{ caption }}</span>
    </header>

    <div class="report-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 通过 IntersectionObserver 逐段淡入。
 * 在 .export-mode 下由父级统一切断观察并强制显示，保证导出时无动画残留。
 */
import { computed, ref, onMounted, onBeforeUnmount, inject, type Ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 段落序号，用于左侧的 01 / 02 … 装饰 */
    index?: number;
    /** 段落中文标题 */
    title: string;
    /** 标题右侧的补充说明 */
    caption?: string;
    /** 段落锚点，导出 / 定位用 */
    anchor?: string;
    /** 无有效数据时置为 true，展示降级样式 */
    empty?: boolean;
  }>(),
  { index: 0, caption: '', anchor: '', empty: false }
);

const revealed = ref(false);
const rootRef = ref<HTMLElement | null>(null);

/** 父级注入的导出模式标记：导出时禁止动画 */
const exportMode = inject<Ref<boolean> | null>('reportExportMode', null);

/** 导出模式下给段落自身挂类，避免跨组件作用域的祖先选择器失效 */
const isExportMode = computed(() => !!exportMode?.value);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !rootRef.value) {
    // 无法观察时直接显示，避免段落永久停留在 opacity: 0
    revealed.value = true;
    return;
  }

  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          revealed.value = true;
          observer?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  if (rootRef.value) observer.observe(rootRef.value);
});

onBeforeUnmount(() => observer?.disconnect());

/** 导出模式开启时，父级会调用此方法强制显示 */
const forceReveal = () => {
  revealed.value = true;
};

defineExpose({ forceReveal, revealed });
</script>

<style scoped>
.report-section {
  position: relative;
  padding: 40px 0 8px;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.report-section__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}

.report-section__index {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #c9a227;
  font-family: Georgia, 'Times New Roman', serif;
}

.report-section__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #2b2118;
}

.report-section__caption {
  margin-left: auto;
  font-size: 12px;
  color: #9c8b73;
}

.report-section__body {
  font-size: 15px;
  line-height: 2.1;
  color: #4a3d2f;
}

/* 无数据降级：弱化但不留白 */
.report-section--empty .report-section__body {
  color: #a99983;
  font-style: italic;
}

/* 导出模式下彻底静态化。
   注意：不能用 `.export-mode .report-section` 这类跨组件祖先选择器 ——
   .export-mode 挂在父组件 ScrollReport 的根节点上，而 scoped 样式会给
   .report-section 带上本组件独有的 data-v，两者永远无法同时命中。
   因此改由 exportMode 注入值直接驱动本元素的类名。

   注意：本规则必须排在 .report-section--revealed 之前。两者同为单类选择器、
   特异性相同，后定义者胜出；若 --static 在后，它的 transition: none 会一直
   压住 --revealed，导出文件里的淡入动画永远播不出来。 */
.report-section--static {
  opacity: 1;
  transform: none;
  transition: none;
}

.report-section--revealed {
  opacity: 1;
  transform: none;
  transition: opacity 0.7s ease, transform 0.7s ease;
}
</style>
