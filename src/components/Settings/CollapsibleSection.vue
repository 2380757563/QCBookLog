<!--
  CollapsibleSection.vue
  设置页通用可折叠分区卡片（与第三方设置页的折叠卡片交互一致）：
  点击标题行展开/收起，箭头旋转，展开用 CSS Grid 0fr→1fr 过渡动画，
  任意内容高度都能完整显示，不依赖 max-height 猜值
-->
<template>
  <div class="collapse-card" :class="{ 'collapse-card--expanded': expanded }">
    <div class="collapse-row" @click="expanded = !expanded">
      <span v-if="icon" class="collapse-icon">{{ icon }}</span>
      <div class="collapse-info">
        <span class="collapse-title">{{ title }}</span>
        <span v-if="desc" class="collapse-desc">{{ desc }}</span>
      </div>
      <svg class="collapse-arrow" :class="{ 'collapse-arrow--expanded': expanded }" viewBox="0 0 24 24">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
      </svg>
    </div>
    <!-- 始终渲染内容，靠 grid-template-rows 0fr/1fr 折叠；inert 防止聚焦隐藏控件 -->
    <div class="collapse-content-wrap">
      <div class="collapse-content" :inert="!expanded">
        <!-- padding/border 必须放在内层：grid 轨道最小高度会计入 item 自身的
             padding+border，放在 item 上会导致收起时底部残留一条空白 -->
        <div class="collapse-content-inner">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    desc?: string;
    icon?: string;
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: false }
);

const expanded = ref(props.defaultOpen);
</script>

<style scoped>
.collapse-card {
  background-color: var(--bg-card, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  /* 与第三方设置页 .bookmark-card 的间距保持一致 */
  margin-bottom: 16px;
}

.collapse-card--expanded {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.collapse-row {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.collapse-row:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.03));
}

.collapse-icon {
  font-size: 24px;
  flex-shrink: 0;
  line-height: 1;
}

.collapse-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.collapse-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.collapse-desc {
  font-size: 12px;
  color: var(--text-hint, #999);
}

.collapse-arrow {
  width: 20px;
  height: 20px;
  fill: var(--text-hint, #999);
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.collapse-arrow--expanded {
  transform: rotate(180deg);
}

.collapse-content {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.collapse-card--expanded .collapse-content {
  opacity: 1;
}

/* 分隔线与内边距放在内层：grid 轨道最小高度只计入 item(.collapse-content)
   自身的 padding/border，放内层才能让收起时轨道真正归零，不留空白 */
.collapse-content-inner {
  border-top: 1px solid var(--border-light, #eee);
  /* 统一内边距：内容不贴卡片边缘，与标题行留白对齐 */
  padding: 16px;
}

/* 展开/收起动画：grid 0fr→1fr，内容任意高度都能完整展开，无需 max-height 猜值 */
.collapse-content-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
  overflow: hidden;
}

.collapse-card--expanded .collapse-content-wrap {
  grid-template-rows: 1fr;
}
</style>
