<template>
  <div v-if="validation" class="step-content">
    <h2 class="step-title">步骤 2: 验证结果</h2>

    <div class="alert alert--success">
      <span class="alert__icon">✅</span>
      <span class="alert__message">验证通过！找到有效的 {{ isCalibre ? 'Calibre' : 'Talebook' }} 数据库</span>
    </div>

    <div class="info-card">
      <div class="info-item">
        <span class="info-label">书籍数量:</span>
        <span class="info-value">{{ validation.stats?.bookCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">书库 UUID:</span>
        <span class="info-value">{{ validation.stats?.libraryUuid }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">数据库路径:</span>
        <span class="info-value">{{ validation.stats?.dbPath }}</span>
      </div>
    </div>

    <div class="button-group">
      <button class="button button--primary" :disabled="loading" @click="$emit('save')">
        {{ loading ? '保存中...' : '保存配置' }}
      </button>
      <button class="button button--secondary" @click="$emit('back')">
        返回修改
      </button>
    </div>
  </div>

  <div v-else class="step-content">
    <h2 class="step-title">步骤 2: 验证 {{ isCalibre ? 'Calibre' : 'Talebook' }} 书库</h2>

    <div class="info-card">
      <div class="info-item">
        <span class="info-label">当前配置路径:</span>
        <span class="info-value">{{ currentPath || '未配置' }}</span>
      </div>
    </div>

    <div class="button-group">
      <button
        class="button button--primary"
        :disabled="loading || !currentPath"
        @click="$emit('validate')"
      >
        {{ loading ? '验证中...' : '验证数据库' }}
      </button>
      <button class="button button--secondary" @click="$emit('back')">
        返回修改
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SelectedType } from '@/composables/useConfig';

const props = defineProps<{
  selectedType: SelectedType;
  loading: boolean;
  validation: any;
  currentPath: string;
}>();

defineEmits<{
  (e: 'save'): void;
  (e: 'back'): void;
  (e: 'validate'): void;
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
