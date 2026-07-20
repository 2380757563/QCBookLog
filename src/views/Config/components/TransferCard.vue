<template>
  <div class="sync-card sync-card--transfer">
    <div class="sync-card__header">
      <h3 class="sync-card__title">📦 数据转移</h3>
      <div class="sync-status-badge sync-status-badge--warning">高危操作</div>
    </div>
    <div class="sync-card__content">
      <p class="transfer-warning">
        ⚠️
        <strong
          >警告：此操作会覆盖 Talebook 数据库中的现有内容。如果仅需使用 Talebook
          数据而不进行覆盖，请直接切换到 Talebook 数据目录即可。</strong
        >
      </p>
      <p class="transfer-description">
        将当前 Calibre 书库文件夹（<code>{{ sourceDirDisplay }}</code
        >）的全部文件与子目录<strong>全量覆盖</strong>到指定的 Talebook
        数据库目录。覆盖完成后，Talebook 路径将自动切换为刚才覆盖的目标目录。
      </p>

      <div v-if="sourceInfo" class="transfer-stats">
        <div class="transfer-stat">
          <span class="transfer-stat-label">源文件数</span>
          <span class="transfer-stat-value">{{ sourceInfo.fileCount }}</span>
        </div>
        <div class="transfer-stat">
          <span class="transfer-stat-label">源总大小</span>
          <span class="transfer-stat-value">{{ formattedSize }}</span>
        </div>
      </div>

      <div class="transfer-actions">
        <button class="button button--danger" :disabled="loading" @click="$emit('open-dialog')">
          {{ loading ? '转移中...' : '⚡ 数据转移' }}
        </button>
        <button class="button button--secondary" :disabled="loading" @click="$emit('load-logs')">
          📜 查看历史日志
        </button>
      </div>

      <div v-if="logs.length > 0" class="transfer-logs">
        <h4 class="transfer-logs__title">最近转移记录</h4>
        <div v-for="(log, idx) in logs.slice(0, 5)" :key="idx" class="transfer-log-item">
          <span class="transfer-log-time">{{ log.timestamp }}</span>
          <span class="transfer-log-status" :class="`transfer-log-status--${log.result}`">
            {{ resultLabel(log.result) }}
          </span>
          <span class="transfer-log-path">{{ log.source }} → {{ log.target }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TransferLogEntry } from '@/api/config/dataTransferService';
import { formatBytes } from '@/utils/format';

const props = defineProps<{
  sourceInfo: any;
  loading: boolean;
  logs: TransferLogEntry[];
}>();

defineEmits<{
  (e: 'open-dialog'): void;
  (e: 'load-logs'): void;
}>();

const sourceDirDisplay = computed(() => props.sourceInfo?.calibreDir || '加载中...');
const formattedSize = computed(() => formatBytes(props.sourceInfo?.totalSize || 0));

function resultLabel(result?: string) {
  switch (result) {
    case 'success':
      return '✓ 成功';
    case 'partial':
      return '⚠ 部分';
    case 'failed':
      return '✗ 失败';
    case 'rejected':
      return '⛔ 已拒绝';
    default:
      return result || '';
  }
}
</script>

<style scoped>
.sync-card--transfer {
  border-left: 4px solid var(--color-warning, #f59e0b);
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

.sync-status-badge--warning {
  background: var(--color-warning, #f59e0b);
  color: #fff;
}

.sync-card__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transfer-warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid var(--color-warning, #f59e0b);
  border-left: 4px solid var(--color-warning, #f59e0b);
  color: var(--color-warning, #b45309);
  padding: 12px 14px;
  border-radius: 6px;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.transfer-description {
  color: var(--text-secondary, #666);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.transfer-description code {
  background: var(--bg-secondary, #f3f4f6);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
}

.transfer-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.transfer-stat {
  background: var(--bg-secondary, #f3f4f6);
  padding: 8px 14px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.transfer-stat-label {
  font-size: 11px;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.transfer-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.transfer-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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

.button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.button--secondary:hover {
  background-color: var(--bg-tertiary);
}

.button--danger {
  background: var(--color-danger, #ef4444);
  color: #fff;
  border: 1px solid var(--color-danger, #ef4444);
}

.button--danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.button--danger:disabled {
  background: #fca5a5;
  border-color: #fca5a5;
  cursor: not-allowed;
  opacity: 0.6;
}

.transfer-logs {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.transfer-logs__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--text-primary, #1f2937);
}

.transfer-log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  font-size: 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 4px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.transfer-log-time {
  color: var(--text-secondary, #666);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  flex-shrink: 0;
}

.transfer-log-status {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  flex-shrink: 0;
}

.transfer-log-status--success { background: #d1fae5; color: #047857; }
.transfer-log-status--partial { background: #fef3c7; color: #b45309; }
.transfer-log-status--failed { background: #fee2e2; color: #b91c1c; }
.transfer-log-status--rejected { background: #e5e7eb; color: #4b5563; }

.transfer-log-path {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  color: var(--text-secondary, #666);
  flex: 1;
  word-break: break-all;
}
</style>
