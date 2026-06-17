<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-container modal-container--transfer">
      <div class="modal-header">
        <h3 class="modal-title">
          <span class="modal-icon">⚡</span>
          数据转移配置
        </h3>
        <button class="modal-close" @click="onClose" aria-label="关闭">×</button>
      </div>

      <div class="modal-body">
        <!-- 步骤 1: 配置 Talebook 路径 -->
        <div v-if="step === 'config'" class="transfer-step">
          <div class="modal-section">
            <h4 class="modal-section__title">📁 源目录（Calibre 书库）</h4>
            <div class="transfer-source-box">
              <code>{{ sourceDirDisplay }}</code>
              <span v-if="sourceInfo" class="transfer-source-stat">
                {{ sourceInfo.fileCount }} 个文件 · {{ formattedSize }}
              </span>
            </div>
          </div>

          <div class="modal-section">
            <h4 class="modal-section__title">🎯 目标目录（Talebook 数据库）</h4>
            <div class="input-with-button">
              <input
                v-model="targetDirProxy"
                type="text"
                class="input-field"
                placeholder="例如: /data/talebook 或 D:\TalebookData"
                @keypress.enter="$emit('go-confirm')"
              />
              <button class="button button--secondary" @click="$emit('select-target-folder')">
                📂 选择文件夹
              </button>
              <input
                ref="folderInputProxy"
                type="file"
                webkitdirectory
                directory
                multiple="false"
                class="folder-input"
                @change="$emit('target-folder-change', $event)"
              />
            </div>

            <div
              v-if="targetInfo"
              class="transfer-target-info"
              :class="`transfer-target-info--${targetInfo.exists ? 'exists' : 'new'}`"
            >
              <span v-if="targetInfo.exists">
                ⚠️ 目标目录已存在，将<strong>全量覆盖</strong>
                {{ targetInfo.fileCount }} 个文件（{{ formattedTargetSize }}）
              </span>
              <span v-else>✨ 目标目录不存在，操作将自动创建</span>
            </div>
          </div>
        </div>

        <!-- 步骤 2: 二次确认 -->
        <div v-else-if="step === 'confirm'" class="transfer-step">
          <div class="modal-warning-box">
            <h4 class="modal-warning-box__title">🚨 二次确认：高危操作</h4>
            <p>您即将执行<strong>数据转移</strong>操作，详情如下：</p>
            <ul class="confirm-details">
              <li><strong>源：</strong><code>{{ sourceDirDisplay }}</code></li>
              <li><strong>目标：</strong><code>{{ targetDir }}</code></li>
              <li v-if="targetInfo?.exists">
                <strong>⚠️ 目标现有内容：</strong>
                {{ targetInfo.fileCount }} 个文件（{{ formattedTargetSize }}）将被
                <strong style="color: var(--color-danger);">全量覆盖</strong>
              </li>
              <li>
                <strong>完成后：</strong>Talebook 数据库路径将自动切换为
                <code>{{ targetDir }}/calibre-webserver.db</code>
              </li>
            </ul>
            <p class="confirm-risk">
              <strong>风险提示：</strong
              >此操作不可逆，目标目录的所有现有数据将被覆盖。如有重要数据，请提前备份！
            </p>
          </div>

          <div class="modal-confirm-input">
            <label class="confirm-label">
              请输入 <code>确认覆盖</code> 以启用确认按钮：
            </label>
            <input v-model="confirmTextProxy" type="text" class="input-field" placeholder="确认覆盖" />
          </div>
        </div>

        <!-- 步骤 3: 执行结果 -->
        <div v-else-if="step === 'result'" class="transfer-step">
          <div v-if="result?.success" class="transfer-result transfer-result--success">
            <h4 class="transfer-result__title">✅ 数据转移完成</h4>
            <ul class="confirm-details">
              <li><strong>源目录：</strong><code>{{ result.source }}</code></li>
              <li><strong>目标目录：</strong><code>{{ result.target }}</code></li>
              <li><strong>复制文件数：</strong>{{ result.stats.copiedFiles }}</li>
              <li><strong>总大小：</strong>{{ formattedResultSize }}</li>
              <li v-if="result.stats.failedFiles > 0">
                <strong style="color: var(--color-danger);">失败文件数：</strong>
                <span style="color: var(--color-danger);">{{ result.stats.failedFiles }}</span>
              </li>
              <li><strong>新 Talebook 路径：</strong><code>{{ result.talebookDbPath }}</code></li>
            </ul>
            <p class="transfer-result__hint">Talebook 数据库路径已自动切换，下次同步将使用新路径。</p>
          </div>
          <div v-else class="transfer-result transfer-result--failed">
            <h4 class="transfer-result__title">❌ 数据转移失败</h4>
            <p class="transfer-result__error">{{ result?.error || '未知错误' }}</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <template v-if="step === 'config'">
          <button class="button button--secondary" @click="onClose">取消</button>
          <button
            class="button button--primary"
            :disabled="!targetDir || targetLoading"
            @click="$emit('go-confirm')"
          >
            下一步：确认操作
          </button>
        </template>
        <template v-else-if="step === 'confirm'">
          <button class="button button--secondary" :disabled="loading" @click="$emit('back-to-config')">
            上一步
          </button>
          <button
            class="button button--danger"
            :disabled="confirmText !== CONFIRM_PHRASE || loading"
            @click="$emit('execute')"
          >
            {{ loading ? '执行中...' : '⚡ 确认执行覆盖' }}
          </button>
        </template>
        <template v-else-if="step === 'result'">
          <button class="button button--primary" @click="onClose">完成</button>
          <button
            v-if="result?.success"
            class="button button--secondary"
            @click="$emit('reload-talebook')"
          >
            刷新 Talebook 配置
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TransferStep } from '@/composables/useDataTransfer';
import { formatBytes } from '@/utils/format';

const CONFIRM_PHRASE = '确认覆盖';

const props = defineProps<{
  visible: boolean;
  step: TransferStep;
  sourceInfo: any;
  targetDir: string;
  targetInfo: any;
  targetLoading: boolean;
  loading: boolean;
  confirmText: string;
  result: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:targetDir', value: string): void;
  (e: 'update:confirmText', value: string): void;
  (e: 'go-confirm'): void;
  (e: 'back-to-config'): void;
  (e: 'execute'): void;
  (e: 'select-target-folder'): void;
  (e: 'target-folder-change', event: Event): void;
  (e: 'reload-talebook'): void;
}>();

const targetDirProxy = computed({
  get: () => props.targetDir,
  set: (v: string) => emit('update:targetDir', v)
});

const confirmTextProxy = computed({
  get: () => props.confirmText,
  set: (v: string) => emit('update:confirmText', v)
});

const sourceDirDisplay = computed(() => props.sourceInfo?.calibreDir || '加载中...');
const formattedSize = computed(() => formatBytes(props.sourceInfo?.totalSize || 0));
const formattedTargetSize = computed(() => formatBytes(props.targetInfo?.totalSize || 0));
const formattedResultSize = computed(() => formatBytes(props.result?.stats?.totalBytes || 0));

function onClose() {
  emit('close');
}

// 暴露 ref 给父级使用
const folderInputProxy = ref<HTMLInputElement | null>(null);
function setFolderInput(el: HTMLInputElement | null) {
  folderInputProxy.value = el;
}
defineExpose({ setFolderInput });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-container--transfer {
  max-width: 640px;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-icon { font-size: 22px; }

.modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px 10px;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-section {
  margin-bottom: 20px;
}

.modal-section__title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.input-with-button {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.input-field {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
}

.folder-input {
  display: none;
}

.transfer-source-box {
  background: var(--bg-secondary, #f3f4f6);
  padding: 12px 14px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transfer-source-box code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--text-primary, #1f2937);
  word-break: break-all;
}

.transfer-source-stat {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.transfer-target-info {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.transfer-target-info--exists {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger, #ef4444);
  color: #b91c1c;
}

.transfer-target-info--new {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  color: #047857;
}

.modal-warning-box {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid var(--color-warning, #f59e0b);
  border-left: 4px solid var(--color-warning, #f59e0b);
  padding: 16px;
  border-radius: 6px;
}

.modal-warning-box__title {
  margin: 0 0 12px 0;
  color: #b45309;
  font-size: 16px;
}

.confirm-details {
  margin: 12px 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.8;
}

.confirm-details code {
  background: var(--bg-secondary, #f3f4f6);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.confirm-risk {
  margin: 12px 0 0 0;
  font-size: 14px;
  color: #b91c1c;
  font-weight: 500;
  padding-top: 10px;
  border-top: 1px dashed rgba(245, 158, 11, 0.4);
}

.modal-confirm-input {
  margin-top: 16px;
}

.confirm-label {
  display: block;
  font-size: 13px;
  color: var(--text-primary, #1f2937);
  margin-bottom: 8px;
}

.confirm-label code {
  background: var(--bg-secondary, #f3f4f6);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
}

.transfer-result {
  padding: 16px;
  border-radius: 6px;
}

.transfer-result--success {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid #10b981;
}

.transfer-result--failed {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid #ef4444;
  color: #b91c1c;
}

.transfer-result__title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.transfer-result__error {
  font-size: 14px;
  margin: 0;
}

.transfer-result__hint {
  margin-top: 12px;
  font-size: 13px;
  color: #047857;
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
</style>
