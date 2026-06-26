<!--
  StackedSettingsPanel.vue
  堆叠式设置面板：作为浮层（overlay）完整覆盖父卡片。
  打开时：淡入 + 轻微缩放放大；关闭时反向。
  与 ChartSettingsCard（侧边抽屉）并存的轻量替代：完全覆盖父卡片，
  确保所有设置内容（不限高度）都能展示，不会被截断。
-->
<template>
  <Transition :name="transitionName">
    <div
      v-if="modelValue"
      class="stacked-settings-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <!-- 卡片底色（与图表卡片同底色） + 轻微遮罩，让图表隐约可见，营造"推至前方"的视觉 -->
      <div class="stacked-settings-panel__backdrop" @click="handleCancel"></div>

      <!-- 实际面板：完全覆盖父卡片 -->
      <div class="stacked-settings-panel__sheet" @click.stop>
        <header class="ssp-header">
          <div class="ssp-title">
            <span class="ssp-title-icon">⚙️</span>
            <span class="ssp-title-text">{{ title }}</span>
          </div>
          <button
            type="button"
            class="ssp-close"
            aria-label="关闭设置"
            @click="handleCancel"
          >×</button>
        </header>

        <div class="ssp-body">
          <slot />
        </div>

        <footer class="ssp-footer">
          <button
            type="button"
            class="ssp-btn ssp-btn--cancel"
            @click="handleCancel"
          >取消</button>
          <button
            type="button"
            class="ssp-btn ssp-btn--confirm"
            @click="handleConfirm"
          >确认</button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  /**
   * 过渡动画名：
   * - 'ssp-overlay'（默认）：淡入 + 轻微放大
   * - 'ssp-fade'：仅淡入淡出
   */
  transitionName?: string;
  autoClose?: boolean;
}>(), {
  transitionName: 'ssp-overlay',
  autoClose: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const close = () => emit('update:modelValue', false);

const handleCancel = () => {
  emit('cancel');
  if (props.autoClose) close();
};
const handleConfirm = () => {
  emit('confirm');
  if (props.autoClose) close();
};

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) handleCancel();
};
watch(() => props.modelValue, (v) => {
  if (v) document.addEventListener('keydown', onKey);
  else document.removeEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
/* 浮层根节点：完全覆盖父卡片 */
.stacked-settings-panel {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: auto;
}

/* 半透明遮罩：覆盖图表并轻微模糊，营造"推至前方"的视觉 */
.stacked-settings-panel__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(4px) saturate(140%);
  -webkit-backdrop-filter: blur(4px) saturate(140%);
}

/* 实际面板：完全填充父卡片 */
.stacked-settings-panel__sheet {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #fff);
  border-radius: inherit;
  overflow: hidden;
  will-change: transform, opacity;
}

.dark .stacked-settings-panel__sheet {
  background: #1f1f1f;
  color: #eee;
}
.dark .stacked-settings-panel__backdrop {
  background: rgba(20, 20, 20, 0.6);
}

/* 头部 */
.ssp-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #fff7f0 0%, #fff 100%);
}
.dark .ssp-header {
  background: linear-gradient(135deg, #2a1f1a 0%, #1f1f1f 100%);
  border-bottom-color: #333;
}
.ssp-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.ssp-title-icon { font-size: 16px; }

.ssp-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.ssp-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #333;
}

/* 内容：可滚动（即使长设置项也能完整展示） */
.ssp-body {
  flex: 1 1 auto;
  padding: 14px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* 底部按钮 */
.ssp-footer {
  flex: 0 0 auto;
  display: flex;
  gap: 10px;
  padding: 10px 16px 14px;
  border-top: 1px solid #eee;
  background: #fafafa;
}
.dark .ssp-footer {
  background: #181818;
  border-top-color: #333;
}
.ssp-btn {
  flex: 1 1 0;
  height: 36px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
.ssp-btn:active { transform: scale(0.98); }
.ssp-btn--cancel {
  background: #fff;
  border-color: #ddd;
  color: #555;
}
.ssp-btn--cancel:hover { background: #f5f5f5; }
.ssp-btn--confirm {
  background: linear-gradient(135deg, #ff8a5b 0%, #ff6b35 100%);
  color: #fff;
}
.ssp-btn--confirm:hover { filter: brightness(1.05); }

/* ===== 过渡动画：淡入 + 轻微放大 ===== */
.ssp-overlay-enter-active,
.ssp-overlay-leave-active {
  transition: opacity 260ms ease;
}
.ssp-overlay-enter-active .stacked-settings-panel__sheet,
.ssp-overlay-leave-active .stacked-settings-panel__sheet {
  transition:
    transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 260ms ease;
}
.ssp-overlay-enter-active .stacked-settings-panel__backdrop,
.ssp-overlay-leave-active .stacked-settings-panel__backdrop {
  transition: opacity 260ms ease;
}

/* 进入前：遮罩透明 + 面板从 95% 缩放、半透明 */
.ssp-overlay-enter-from,
.ssp-overlay-leave-to {
  opacity: 0;
}
.ssp-overlay-enter-from .stacked-settings-panel__sheet,
.ssp-overlay-leave-to .stacked-settings-panel__sheet {
  transform: scale(0.95);
  opacity: 0;
}
.ssp-overlay-enter-from .stacked-settings-panel__backdrop,
.ssp-overlay-leave-to .stacked-settings-panel__backdrop {
  opacity: 0;
}

/* 进入后：还原 */
.ssp-overlay-enter-to,
.ssp-overlay-leave-from {
  opacity: 1;
}
.ssp-overlay-enter-to .stacked-settings-panel__sheet,
.ssp-overlay-leave-from .stacked-settings-panel__sheet {
  transform: scale(1);
  opacity: 1;
}
.ssp-overlay-enter-to .stacked-settings-panel__backdrop,
.ssp-overlay-leave-from .stacked-settings-panel__backdrop {
  opacity: 1;
}

/* 纯淡入淡出备用 */
.ssp-fade-enter-active,
.ssp-fade-leave-active { transition: opacity 200ms ease; }
.ssp-fade-enter-from,
.ssp-fade-leave-to { opacity: 0; }

/* ===== 响应式 ===== */
@media (max-width: 600px) {
  .ssp-body { padding: 12px; }
  .ssp-header { padding: 12px; }
  .ssp-footer { padding: 8px 12px 12px; }
}
</style>
