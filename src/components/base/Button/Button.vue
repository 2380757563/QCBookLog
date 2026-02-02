<template>
  <button
    :class="[
      'xm-button',
      `xm-button--${type}`,
      `xm-button--${size}`,
      {
        'xm-button--disabled': disabled || loading,
        'xm-button--block': block,
        'xm-button--round': round,
        'xm-button--loading': loading
      }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="xm-button__loading"></span>
    <span v-if="icon && !loading" class="xm-button__icon">
      <svg :class="`xm-icon-${icon}`" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <!-- 这里可以根据需要添加内置图标，或者使用外部图标库 -->
      </svg>
    </span>
    <span v-if="$slots.default" class="xm-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ButtonProps, ButtonEmits } from './types';

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
  round: false
});

const emit = defineEmits<ButtonEmits>();

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<style scoped>
.xm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  user-select: none;
}

.xm-button--primary {
  background-color: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.xm-button--primary:hover:not(.xm-button--disabled) {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

.xm-button--default {
  background-color: #fff;
  color: #333;
  border-color: #ddd;
}

.xm-button--default:hover:not(.xm-button--disabled) {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.xm-button--danger {
  background-color: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}

.xm-button--danger:hover:not(.xm-button--disabled) {
  background-color: #c0392b;
  border-color: #c0392b;
}

.xm-button--small {
  padding: 4px 12px;
  font-size: 12px;
}

.xm-button--medium {
  padding: 6px 16px;
  font-size: 14px;
}

.xm-button--large {
  padding: 8px 20px;
  font-size: 16px;
}

.xm-button--block {
  width: 100%;
  display: flex;
}

.xm-button--round {
  border-radius: 20px;
}

.xm-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.xm-button--loading {
  cursor: wait;
}

.xm-button__loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

.xm-button--default .xm-button__loading {
  border-color: rgba(0, 0, 0, 0.1);
  border-top-color: #3498db;
}

.xm-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.xm-button__text {
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
