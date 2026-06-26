<template>
  <Teleport to="body">
    <Transition name="settings-card-flip">
      <div
        v-if="modelValue"
        class="chart-settings-card-mask"
        @click.self="handleCancel"
      >
        <div
          class="chart-settings-card"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          @click.stop
        >
          <!-- 标题区 -->
          <header class="csc-header">
            <div class="csc-title">
              <span class="csc-title-icon">⚙️</span>
              <span class="csc-title-text">{{ title }}</span>
            </div>
            <button
              class="csc-close"
              type="button"
              aria-label="关闭设置"
              @click="handleCancel"
            >×</button>
          </header>

          <!-- 选项区（来自父级 slot） -->
          <div class="csc-body">
            <slot />
          </div>

          <!-- 确认 / 取消 -->
          <footer class="csc-footer">
            <button
              class="csc-btn csc-btn--cancel"
              type="button"
              @click="handleCancel"
            >取消</button>
            <button
              class="csc-btn csc-btn--confirm"
              type="button"
              @click="handleConfirm"
            >确认</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  title: string;
  /**
   * 点击"确认"或"取消"时是否自动关闭面板
   * - 默认 true：点击即关闭
   * - 设置为 false：仅由父级在处理完业务后手动调用 emit('update:modelValue', false)
   */
  autoClose?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const close = () => emit('update:modelValue', false);

const handleCancel = () => {
  emit('cancel');
  if (props.autoClose !== false) close();
};
const handleConfirm = () => {
  emit('confirm');
  if (props.autoClose !== false) close();
};

// ESC 关闭
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    handleCancel();
  }
};
watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      document.addEventListener('keydown', onKey);
    } else {
      document.removeEventListener('keydown', onKey);
    }
  }
);
onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
.chart-settings-card-mask {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.chart-settings-card {
  position: relative;
  width: min(420px, 92vw);
  max-width: 92vw;
  height: 100%;
  background: #fff;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 从后往前：起始状态放在 z 平面更深处（缩放/透明度小），并向右偏移；进入时回到原始位置 */
  transform-origin: 100% 50%;
  will-change: transform, opacity;
}
.dark .chart-settings-card {
  background: #1f1f1f;
  color: var(--text-primary, #eee);
}

.csc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #fff7f0 0%, #fff 100%);
}
.dark .csc-header {
  background: linear-gradient(135deg, #2a1f1a 0%, #1f1f1f 100%);
  border-bottom-color: #333;
}
.csc-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.csc-title-icon {
  font-size: 16px;
}
.csc-close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: var(--text-secondary, #999);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.csc-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-primary, #333);
}

.csc-body {
  flex: 1 1 auto;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.csc-footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px 16px;
  border-top: 1px solid #eee;
  background: #fafafa;
}
.dark .csc-footer {
  background: #181818;
  border-top-color: #333;
}
.csc-btn {
  flex: 1 1 0;
  height: 38px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.csc-btn--cancel {
  background: #fff;
  border-color: #ddd;
  color: #555;
}
.csc-btn--cancel:hover {
  background: #f5f5f5;
  border-color: #ccc;
}
.csc-btn--confirm {
  background: #ff6b35;
  color: #fff;
  border-color: #ff6b35;
}
.csc-btn--confirm:hover {
  background: #e85a2b;
  border-color: #e85a2b;
}

/* 从后往前：进入时面板从右侧偏 + 半透明 + 缩小 推到前面；
   离开时反向 退到后面 */
.settings-card-flip-enter-active,
.settings-card-flip-leave-active {
  transition: transform 360ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 360ms ease;
}
.settings-card-flip-enter-from,
.settings-card-flip-leave-to {
  transform: translateX(40px) scale(0.92);
  opacity: 0;
}
.settings-card-flip-enter-to,
.settings-card-flip-leave-from {
  transform: translateX(0) scale(1);
  opacity: 1;
}

/* 遮罩淡入淡出 */
.settings-card-flip-enter-active .chart-settings-card-mask,
.settings-card-flip-leave-active .chart-settings-card-mask {
  transition: opacity 320ms ease;
}
.settings-card-flip-enter-from .chart-settings-card-mask,
.settings-card-flip-leave-to .chart-settings-card-mask {
  opacity: 0;
}

/* 响应式：小屏占满宽度 */
@media (max-width: 480px) {
  .chart-settings-card {
    width: 100vw;
  }
}
</style>
