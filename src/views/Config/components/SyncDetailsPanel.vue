<template>
  <div class="sync-details">
    <div class="sync-details__header">
      <h3 class="sync-details__title">同步详情日志</h3>
    </div>
    <div class="sync-logs">
      <div v-for="(log, index) in logs" :key="index" class="sync-log-item">
        <span class="sync-log-time">{{ log.time }}</span>
        <span class="sync-log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  logs: Array<{ time: string; message: string }>;
}>();
</script>

<style scoped>
.sync-details {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sync-details__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sync-details__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-logs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.sync-logs::-webkit-scrollbar {
  width: 6px;
}

.sync-logs::-webkit-scrollbar-track {
  background-color: var(--bg-tertiary);
  border-radius: 3px;
}

.sync-logs::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.sync-logs::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}

.sync-log-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  font-size: 14px;
}

.sync-log-time {
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.sync-log-message {
  color: var(--text-primary);
  flex: 1;
  line-height: 1.5;
}

@media (max-width: 767px) {
  .sync-details {
    padding: 16px;
  }
  .sync-details__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .sync-log-item {
    flex-direction: column;
    gap: 4px;
  }
  .sync-log-time {
    font-size: 12px;
  }
}
</style>
