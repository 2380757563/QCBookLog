<template>
  <div class="sync-cards">
    <!-- 总体同步状态 -->
    <div class="sync-card sync-card--overall">
      <div class="sync-card__header">
        <h3 class="sync-card__title">总体同步状态</h3>
        <div class="sync-status-badge" :class="overallSyncStatus">
          {{ overallSyncStatusText }}
        </div>
      </div>
      <div class="sync-card__content">
        <div class="sync-info-item">
          <span class="sync-info-label">最后同步时间:</span>
          <span class="sync-info-value">{{ lastSyncTime }}</span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">上次同步结果:</span>
          <span class="sync-info-value">{{ lastSyncResult }}</span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">同步模式:</span>
          <span class="sync-info-value">{{ syncMode }}</span>
        </div>
        <div class="sync-actions">
          <button class="button button--primary" :disabled="syncing" @click="$emit('execute-sync')">
            {{ syncing ? '同步中...' : '🔄 执行同步' }}
          </button>
          <button class="button button--secondary" :disabled="syncing" @click="$emit('refresh')">
            🔄 刷新状态
          </button>
        </div>
      </div>
    </div>

    <!-- Calibre → Talebook -->
    <div class="sync-card">
      <div class="sync-card__header">
        <h3 class="sync-card__title">Calibre → Talebook</h3>
        <div class="sync-status-badge" :class="calibreToTalebookStatus">
          {{ calibreToTalebookStatusText }}
        </div>
      </div>
      <div class="sync-card__content">
        <div class="sync-info-item">
          <span class="sync-info-label">同步进度:</span>
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: calibreToTalebookProgress + '%' }"></div>
          </div>
          <span class="sync-info-value">{{ calibreToTalebookProgress }}%</span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">已同步书籍:</span>
          <span class="sync-info-value">
            {{ calibreToTalebookSyncedBooks }} / {{ calibreToTalebookTotalBooks }}
          </span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">同步时长:</span>
          <span class="sync-info-value">{{ calibreToTalebookDuration }}</span>
        </div>
      </div>
    </div>

    <!-- Talebook → Calibre -->
    <div class="sync-card">
      <div class="sync-card__header">
        <h3 class="sync-card__title">Talebook → Calibre</h3>
        <div class="sync-status-badge" :class="talebookToCalibreStatus">
          {{ talebookToCalibreStatusText }}
        </div>
      </div>
      <div class="sync-card__content">
        <div class="sync-info-item">
          <span class="sync-info-label">同步进度:</span>
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: talebookToCalibreProgress + '%' }"></div>
          </div>
          <span class="sync-info-value">{{ talebookToCalibreProgress }}%</span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">已同步书籍:</span>
          <span class="sync-info-value">
            {{ talebookToCalibreSyncedBooks }} / {{ talebookToCalibreTotalBooks }}
          </span>
        </div>
        <div class="sync-info-item">
          <span class="sync-info-label">同步时长:</span>
          <span class="sync-info-value">{{ talebookToCalibreDuration }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  overallSyncStatus: string;
  overallSyncStatusText: string;
  lastSyncTime: string;
  lastSyncResult: string;
  syncMode: string;
  syncing: boolean;
  calibreToTalebookStatus: string;
  calibreToTalebookStatusText: string;
  calibreToTalebookProgress: number;
  calibreToTalebookSyncedBooks: number;
  calibreToTalebookTotalBooks: number;
  calibreToTalebookDuration: string;
  talebookToCalibreStatus: string;
  talebookToCalibreStatusText: string;
  talebookToCalibreProgress: number;
  talebookToCalibreSyncedBooks: number;
  talebookToCalibreTotalBooks: number;
  talebookToCalibreDuration: string;
}>();

defineEmits<{
  (e: 'execute-sync'): void;
  (e: 'refresh'): void;
}>();
</script>

<style scoped>
.sync-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .sync-cards {
    grid-template-columns: 1fr 1fr;
  }
  .sync-card--overall {
    grid-column: 1 / -1;
  }
}

.sync-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sync-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.sync-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sync-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sync-status-badge.synced {
  background-color: var(--success-color-light);
  color: var(--success-color);
}

.sync-status-badge.syncing {
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  animation: pulse 1.5s infinite;
}

.sync-status-badge.failed {
  background-color: var(--error-color-light);
  color: var(--error-color);
}

.sync-status-badge.conflicted {
  background-color: var(--warning-color-light);
  color: var(--warning-color);
  animation: pulse 1.5s infinite;
}

.sync-status-badge.pending {
  background-color: var(--info-color-light);
  color: var(--info-color);
}

.sync-card__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sync-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.sync-actions .button {
  flex: 1;
}

.sync-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sync-info-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-info-value {
  font-size: 16px;
  color: var(--text-secondary);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar__fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
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

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

@media (max-width: 767px) {
  .sync-card {
    padding: 16px;
  }
  .sync-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
