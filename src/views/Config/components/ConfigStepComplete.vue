<template>
  <div class="step-content">
    <h2 class="step-title">{{ valid ? '配置成功！' : '配置异常' }}</h2>

    <div v-if="valid" class="alert alert--success">
      <span class="alert__icon">✅</span>
      <span class="alert__message">
        应用和 {{ isCalibre ? 'Calibre' : 'Talebook' }} 现在共享同一个数据库
      </span>
    </div>

    <div v-else class="alert alert--error">
      <span class="alert__icon">⚠️</span>
      <span class="alert__message">{{ errorMessage || '数据库验证失败' }}</span>
    </div>

    <div class="info-card">
      <div class="info-item">
        <span class="info-label">{{ isCalibre ? 'Calibre' : 'Talebook' }} 数据库:</span>
        <span class="info-value">{{ currentPath }}</span>
      </div>
      <div v-if="stats" class="info-item">
        <span class="info-label">书籍数量:</span>
        <span class="info-value">{{ stats.bookCount || 0 }} 本</span>
      </div>
      <div v-if="isCalibre && stats?.libraryUuid" class="info-item">
        <span class="info-label">书库 UUID:</span>
        <span class="info-value">{{ stats.libraryUuid }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">同步说明:</span>
        <span class="info-value">
          {{
            isCalibre
              ? '应用添加的书籍会立即出现在 Calibre 中，Calibre 的修改也会立即反映在应用中。'
              : '应用添加的书籍会立即出现在 Talebook 中，Talebook 的修改也会立即反映在应用中。'
          }}
        </span>
      </div>
      <div class="info-item info-item--default">
        <span class="info-label">默认书库:</span>
        <div class="default-toggle">
          <span class="default-status" :class="{ active: isDefault }">
            {{ isDefault ? '⭐ 是' : '否' }}
          </span>
          <button
            class="button button--small"
            :class="isDefault ? 'button--secondary' : 'button--primary'"
            @click="$emit('toggle-default')"
          >
            {{ isDefault ? '取消默认' : '设为默认' }}
          </button>
        </div>
      </div>
    </div>

    <div class="button-group" style="justify-content: center; margin-bottom: 16px;">
      <button class="button button--primary" @click="$emit('go-home')">
        开始使用
      </button>
    </div>

    <button class="button button--secondary" style="width: 100%;" @click="$emit('reconfigure')">
      🔁 切换到其他数据库
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SelectedType } from '@/composables/useConfig';

const props = defineProps<{
  selectedType: SelectedType;
  valid: boolean;
  currentPath: string;
  stats: any;
  isDefault: boolean;
  errorMessage?: string | null;
}>();

defineEmits<{
  (e: 'toggle-default'): void;
  (e: 'go-home'): void;
  (e: 'reconfigure'): void;
}>();

const isCalibre = computed(() => props.selectedType === 'calibre');
</script>

<style scoped>
.step-content {
  max-width: 600px;
  margin: 0 auto;
}

.step-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert--success {
  background-color: var(--success-color-light);
  color: var(--success-color);
}

.alert--error {
  background-color: var(--error-color-light);
  color: var(--error-color);
}

.alert__icon {
  font-size: 20px;
}

.alert__message {
  flex: 1;
  font-size: 14px;
}

.info-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-item--default {
  align-items: center;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  margin-right: 16px;
}

.info-value {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: right;
  word-break: break-all;
}

.default-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.default-status {
  padding: 4px 12px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  font-size: 13px;
  color: var(--text-secondary);
}

.default-status.active {
  background-color: var(--warning-color-light);
  color: var(--warning-color);
  font-weight: 600;
}

.button-group {
  display: flex;
  gap: 12px;
}

.button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button--small {
  padding: 6px 12px;
  font-size: 13px;
}

.button--primary {
  background-color: var(--primary-color);
  color: white;
}

.button--primary:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.button--secondary:hover {
  background-color: var(--bg-tertiary);
}
</style>
