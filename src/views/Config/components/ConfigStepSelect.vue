<template>
  <div class="step-content">
    <h2 class="step-title">
      步骤 1: 选择 {{ isCalibre ? 'Calibre' : 'Talebook' }} 书库目录
    </h2>
    <p class="step-description">
      请输入包含 <code>{{ dbFileName }}</code> 的 {{ isCalibre ? 'Calibre' : 'Talebook' }} 书库目录路径。
    </p>

    <!-- 模式选择 -->
    <div class="mode-selection">
      <button
        class="mode-button"
        :class="{ active: configMode === 'existing' }"
        @click="onModeChange('existing')"
      >
        📁 使用现有数据库
      </button>
      <button
        class="mode-button"
        :class="{ active: configMode === 'new' }"
        @click="onModeChange('new')"
      >
        📦 数据转移
      </button>
    </div>

    <!-- 现有数据库路径选择 -->
    <div v-if="configMode === 'existing'" class="input-group">
      <label class="input-label">{{ isCalibre ? 'Calibre' : 'Talebook' }} 书库路径</label>
      <div class="input-with-button">
        <input
          v-model="activePathProxy"
          type="text"
          class="input-field"
          :placeholder="`例如: D:\\MyBooks\\${isCalibre ? 'Calibre Library' : 'Talebook'}`"
          @keypress.enter="$emit('validate')"
        />
        <button class="button button--secondary" @click="onPickForActive">
          📁 选择文件夹
        </button>
        <input
          ref="folderInputProxy"
          type="file"
          webkitdirectory
          directory
          multiple="false"
          class="folder-input"
          @change="onActiveInputChange"
        />
      </div>
      <p class="input-hint">
        💡 由于浏览器安全限制，可能无法直接获取完整路径。您可以手动输入完整路径，或使用选择按钮获取文件夹名称后补充完整路径。
      </p>
    </div>

    <!-- 创建新数据库 -->
    <div v-else class="input-group">
      <label class="input-label">新数据库存储路径</label>
      <div class="input-with-button">
        <input
          v-model="activeNewPathProxy"
          type="text"
          class="input-field"
          :placeholder="`例如: D:\\MyBooks\\${isCalibre ? 'Calibre Library' : 'Talebook'}`"
          @keypress.enter="$emit('create-new')"
        />
        <button class="button button--secondary" @click="onPickForNew">
          📁 选择文件夹
        </button>
        <input
          ref="newFolderInputProxy"
          type="file"
          webkitdirectory
          directory
          multiple="false"
          class="folder-input"
          @change="onNewInputChange"
        />
      </div>
      <div class="default-path-option">
        <button class="default-path-button" @click="useDefaultPath">
          ⚡ 使用默认路径
        </button>
        <span class="default-path-text">
          默认路径：{{ isCalibre ? './data/calibre' : './data/talebook' }}
        </span>
      </div>
      <p class="input-hint">
        💡 请输入新数据库的存储路径。系统将在该路径下创建 {{ dbFileName }} 文件。
      </p>
    </div>

    <button
      v-if="configMode === 'existing'"
      class="button button--primary"
      :disabled="!activePathProxy || loading"
      @click="$emit('validate')"
    >
      {{ loading ? '验证中...' : '验证书库' }}
    </button>
    <button
      v-else-if="isCalibre"
      class="button button--primary"
      :disabled="!activeNewPathProxy || loading"
      @click="$emit('create-new')"
    >
      {{ loading ? '创建中...' : '创建数据库' }}
    </button>

    <!-- Talebook 切换数据库时使用数据转移模块代替创建按钮 -->
    <TransferCard
      v-if="configMode === 'new' && !isCalibre"
      :source-info="sourceInfo"
      :loading="transferLoading"
      :logs="transferLogs"
      @open-dialog="$emit('open-transfer-dialog')"
      @load-logs="$emit('load-transfer-logs')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ConfigMode, SelectedType } from '@/composables/useConfig';
import type { TransferLogEntry } from '@/services/config/dataTransferService';
import { useFolderPicker } from '@/composables/useFolderPicker';
import TransferCard from './TransferCard.vue';

const props = defineProps<{
  selectedType: SelectedType;
  configMode: ConfigMode;
  loading: boolean;
  calibrePath: string;
  talebookPath: string;
  newCalibrePath: string;
  newTalebookPath: string;
  sourceInfo?: any;
  transferLoading?: boolean;
  transferLogs?: TransferLogEntry[];
}>();

const emit = defineEmits<{
  (e: 'update:configMode', value: ConfigMode): void;
  (e: 'update:calibrePath', value: string): void;
  (e: 'update:talebookPath', value: string): void;
  (e: 'update:newCalibrePath', value: string): void;
  (e: 'update:newTalebookPath', value: string): void;
  (e: 'validate'): void;
  (e: 'create-new'): void;
  (e: 'set-error', message: string): void;
  (e: 'open-transfer-dialog'): void;
  (e: 'load-transfer-logs'): void;
}>();

const isCalibre = computed(() => props.selectedType === 'calibre');
const dbFileName = computed(() => (isCalibre.value ? 'metadata.db' : 'calibre-webserver.db'));

const activePathProxy = computed({
  get: () => (isCalibre.value ? props.calibrePath : props.talebookPath),
  set: (v: string) => {
    if (isCalibre.value) emit('update:calibrePath', v);
    else emit('update:talebookPath', v);
  }
});

const activeNewPathProxy = computed({
  get: () => (isCalibre.value ? props.newCalibrePath : props.newTalebookPath),
  set: (v: string) => {
    if (isCalibre.value) emit('update:newCalibrePath', v);
    else emit('update:newTalebookPath', v);
  }
});

function onModeChange(value: ConfigMode) {
  emit('update:configMode', value);
}

function useDefaultPath() {
  const defaultPath = isCalibre.value ? './data/calibre' : './data/talebook';
  if (isCalibre.value) emit('update:newCalibrePath', defaultPath);
  else emit('update:newTalebookPath', defaultPath);
}

const { folderInput, pickFolder, handleFolderSelect } = useFolderPicker();
const folderInputProxy = folderInput;
const newFolderInputProxy = ref<HTMLInputElement | null>(null);

// 把 ref 暴露给父级（可由 index.vue 绑定）
defineExpose({
  folderInput: folderInputProxy,
  newFolderInput: newFolderInputProxy
});

async function onPickForActive() {
  const current = activePathProxy.value;
  const newPath = await pickFolder(current);
  if (newPath !== null) {
    activePathProxy.value = newPath;
  }
}

async function onPickForNew() {
  const current = activeNewPathProxy.value;
  // 新数据库使用 newFolderInput 暂存，picker 内部仍用同一个 input
  // 如果父级绑定了 newFolderInput，会自动处理
  const newPath = await pickFolder(current);
  if (newPath !== null) {
    activeNewPathProxy.value = newPath;
  }
}

function onActiveInputChange(event: Event) {
  handleFolderSelect(event, (folderName) => {
    if (!folderName) {
      emit('set-error', '无法获取完整文件夹路径，请手动输入');
      return;
    }
    activePathProxy.value = folderName;
  });
}

function onNewInputChange(event: Event) {
  handleFolderSelect(event, (folderName) => {
    if (!folderName) {
      emit('set-error', '无法获取完整文件夹路径，请手动输入');
      return;
    }
    activeNewPathProxy.value = folderName;
  });
}
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

.step-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.step-description code {
  padding: 2px 6px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.mode-selection {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.mode-button {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mode-button:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.mode-button.active {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.default-path-option {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.default-path-button {
  padding: 8px 16px;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.default-path-button:hover {
  background-color: var(--primary-color);
  color: white;
}

.default-path-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
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

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 0;
}

.folder-input {
  display: none;
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
