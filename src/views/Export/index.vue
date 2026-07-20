<template>
  <div class="export-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">数据导出</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- 导出模式选择 -->
    <div class="mode-selector">
      <button 
        :class="['mode-btn', { active: exportMode === 'books' }]"
        @click="exportMode = 'books'"
      >
        <span class="mode-icon">📚</span>
        <span class="mode-text">书籍数据</span>
      </button>
      <button 
        :class="['mode-btn', { active: exportMode === 'library' }]"
        @click="exportMode = 'library'"
      >
        <span class="mode-icon">📦</span>
        <span class="mode-text">整库导出</span>
      </button>
    </div>

    <!-- 书籍数据导出 -->
    <div v-if="exportMode === 'books'" class="export-section">
      <!-- 导出格式选择 -->
      <div class="section-card">
        <h2 class="section-title">选择导出格式</h2>
        <div class="format-options">
          <label class="format-option" :class="{ active: exportFormat === 'csv' }">
            <input type="radio" v-model="exportFormat" value="csv" />
            <div class="format-info">
              <span class="format-icon">📊</span>
              <div class="format-details">
                <span class="format-name">CSV 格式（推荐）</span>
                <span class="format-desc">纯文本表格数据，文件小，导出速度快</span>
              </div>
            </div>
          </label>
          
          <label class="format-option" :class="{ active: exportFormat === 'excel' }">
            <input type="radio" v-model="exportFormat" value="excel" />
            <div class="format-info">
              <span class="format-icon">📈</span>
              <div class="format-details">
                <span class="format-name">Excel 格式</span>
                <span class="format-desc">含图片表格数据，可以导出封面，速度慢，数据多时可能崩溃</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- 字段选择 -->
      <div class="section-card">
        <h2 class="section-title">
          选择导出字段
          <div class="field-actions">
            <button class="action-link" @click="selectAllFields">全选</button>
            <span class="action-separator">|</span>
            <button class="action-link" @click="deselectAllFields">清空</button>
            <span class="action-separator">|</span>
            <button class="action-link" @click="selectCommonFields">常用字段</button>
          </div>
        </h2>
        <div class="fields-grid">
          <label v-for="field in exportFields" :key="field.key" class="field-checkbox">
            <input 
              type="checkbox" 
              v-model="selectedFields" 
              :value="field.key"
              :disabled="field.required"
            />
            <span class="field-info">
              <span class="field-name">{{ field.label }}</span>
              <span v-if="field.description" class="field-desc">{{ field.description }}</span>
              <span v-if="field.required" class="field-required">必填</span>
            </span>
          </label>
        </div>
        <div class="field-summary">
          已选择 <strong>{{ selectedFields.length }}</strong> / {{ exportFields.length }} 个字段
        </div>
      </div>

      <!-- 其他选项 -->
      <div class="section-card">
        <h2 class="section-title">其他选项</h2>
        <div class="options-list">
          <label class="option-item">
            <input type="checkbox" v-model="useCompression" />
            <span class="option-text">使用压缩（ZIP格式）</span>
          </label>
        </div>
      </div>

      <!-- 导出按钮 -->
      <div class="action-section">
        <button 
          class="btn-primary btn-large" 
          @click="handleExport"
          :disabled="selectedFields.length === 0 || isExporting"
        >
          <span v-if="isExporting">导出中...</span>
          <span v-else>导出数据</span>
        </button>
      </div>
    </div>

    <!-- 整库导出 -->
    <div v-if="exportMode === 'library'" class="export-section">
      <div class="section-card">
        <h2 class="section-title">整库备份</h2>
        <div class="library-export-info">
          <div class="info-icon">📦</div>
          <div class="info-content">
            <p class="info-title">导出完整书库备份</p>
            <p class="info-desc">导出 Calibre 书库（书籍文件夹和数据库）以及 Talebook 数据库的完整备份文件，用于数据迁移和灾难恢复</p>
          </div>
        </div>
        <div class="backup-details">
          <h3 class="detail-title">导出内容包括：</h3>
          <ul class="detail-list">
            <li class="detail-item">
              <span class="detail-icon">📚</span>
              <span class="detail-text">Calibre 书库目录（所有书籍文件夹和元数据文件）</span>
            </li>
            <li class="detail-item">
              <span class="detail-icon">🗄️</span>
              <span class="detail-text">Calibre 数据库文件（metadata.db）</span>
            </li>
            <li class="detail-item">
              <span class="detail-icon">📊</span>
              <span class="detail-text">Talebook 数据库文件（calibre-webserver.db）</span>
            </li>
            <li class="detail-item">
              <span class="detail-icon">📋</span>
              <span class="detail-text">备份元数据文件</span>
            </li>
          </ul>
        </div>
        <div class="backup-warning">
          <span class="warning-icon">⚠️</span>
          <p class="warning-text">备份文件可能很大，请确保有足够的磁盘空间。导出过程中请勿关闭页面。</p>
        </div>
      </div>

      <!-- 导出按钮 -->
      <div class="action-section">
        <button
          class="btn-primary btn-large"
          @click="handleLibraryExport"
          :disabled="isExporting"
        >
          <span v-if="isExporting">导出中...</span>
          <span v-else>开始备份</span>
        </button>
      </div>
    </div>

    <!-- 导出进度 -->
    <div v-if="isExporting" class="progress-overlay">
      <div class="progress-card">
        <div class="progress-spinner"></div>
        <p class="progress-text">正在导出数据...</p>
        <p class="progress-hint">请勿关闭页面</p>
      </div>
    </div>

    <!-- 导出成功提示 -->
    <div v-if="exportSuccess" class="toast toast-success">
      <span class="toast-icon">✅</span>
      <span class="toast-message">导出成功！文件已开始下载</span>
      <button class="toast-close" @click="exportSuccess = false">×</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="exportError" class="toast toast-error">
      <span class="toast-icon">❌</span>
      <span class="toast-message">{{ exportError }}</span>
      <button class="toast-close" @click="exportError = ''">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { bookService } from '@/api/book';
import { exportService, EXPORT_FIELDS, type ExportFormat, type ExportOptions } from '@/api/exportService';

const router = useRouter();

// 导出模式：书籍数据 或 整库导出
const exportMode = ref<'books' | 'library'>('books');

// 导出格式
const exportFormat = ref<ExportFormat>('csv');

// 选中的字段
const selectedFields = ref<string[]>(['isbn', 'title', 'author']);

// 其他选项
const useCompression = ref(false);

// 状态
const isExporting = ref(false);
const exportSuccess = ref(false);
const exportError = ref('');

// 可用的导出字段
const exportFields = EXPORT_FIELDS;

// 字段操作
const selectAllFields = () => {
  selectedFields.value = exportFields.map(f => f.key);
};

const deselectAllFields = () => {
  selectedFields.value = exportFields.filter(f => f.required).map(f => f.key);
};

const selectCommonFields = () => {
  selectedFields.value = ['isbn', 'title', 'author', 'publisher', 'publishYear', 'readStatus', 'rating'];
};

// 导出书籍数据
const handleExport = async () => {
  if (selectedFields.value.length === 0) {
    exportError.value = '请至少选择一个字段';
    return;
  }

  isExporting.value = true;
  exportError.value = '';
  exportSuccess.value = false;

  try {
    const options: ExportOptions = {
      format: exportFormat.value,
      selectedFields: selectedFields.value,
      compression: useCompression.value
    };

    const blob = await exportService.exportBooks(options);
    const filename = exportService.generateFilename(exportFormat.value);
    exportService.downloadFile(blob, filename);

    exportSuccess.value = true;
    setTimeout(() => exportSuccess.value = false, 3000);
  } catch (e) {
    console.error('导出失败:', e);
    exportError.value = e instanceof Error ? e.message : '导出失败，请重试';
  } finally {
    isExporting.value = false;
  }
};

// 导出整库
const handleLibraryExport = async () => {
  isExporting.value = true;
  exportError.value = '';
  exportSuccess.value = false;

  try {
    const blob = await exportService.exportLibrary({});
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `library-backup-${date}.zip`;
    exportService.downloadFile(blob, filename);

    exportSuccess.value = true;
    setTimeout(() => exportSuccess.value = false, 3000);
  } catch (e) {
    console.error('整库导出失败:', e);
    exportError.value = e instanceof Error ? e.message : '导出失败，请重试';
  } finally {
    isExporting.value = false;
  }
};

// 返回上一页
const goBack = () => {
  router.back();
};
</script>

<style scoped>
.export-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  color: #333;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.header-spacer {
  width: 2rem;
}

/* 模式选择器 */
.mode-selector {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #fff;
  margin: 0.5rem;
  border-radius: 8px;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.mode-btn.active {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.mode-icon {
  font-size: 2rem;
}

.mode-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

/* 导出区域 */
.export-section {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 卡片样式 */
.section-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.field-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.action-link {
  background: none;
  border: none;
  color: #2196F3;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.action-link:hover {
  background-color: #e3f2fd;
}

.action-separator {
  color: #e0e0e0;
}

/* 格式选项 */
.format-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.format-option {
  display: flex;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-option:hover {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.format-option.active {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.format-option input {
  display: none;
}

.format-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.format-icon {
  font-size: 1.5rem;
}

.format-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.format-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.format-desc {
  font-size: 0.85rem;
  color: #666;
}

/* 字段网格 */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.field-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-checkbox:hover {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.field-checkbox input {
  margin-top: 0.25rem;
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
}

.field-desc {
  font-size: 0.8rem;
  color: #999;
}

.field-required {
  font-size: 0.75rem;
  color: #F44336;
  font-weight: 600;
}

.field-summary {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.field-summary strong {
  color: #4CAF50;
  font-weight: 600;
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.option-item input {
  margin-top: 0.25rem;
}

.option-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
}

.option-hint {
  display: block;
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.25rem;
}

/* 整库导出信息 */
.library-export-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
  margin-bottom: 1rem;
}

.info-icon {
  font-size: 2rem;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.info-desc {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

/* 备份详情 */
.backup-details {
  margin-bottom: 1.5rem;
}

.detail-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.75rem 0;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-icon {
  font-size: 1.5rem;
  width: 2rem;
  text-align: center;
}

.detail-text {
  font-size: 0.95rem;
  color: #555;
}

/* 备份警告 */
.backup-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fff3e0;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.warning-icon {
  font-size: 1.5rem;
  margin-top: 0.25rem;
}

.warning-text {
  font-size: 0.9rem;
  color: #e65100;
  margin: 0;
  line-height: 1.5;
}



/* 操作区域 */
.action-section {
  padding: 0 1rem 1rem;
}

.btn-large {
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 12px;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 进度覆盖层 */
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.progress-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.progress-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.progress-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.progress-hint {
  font-size: 0.9rem;
  color: #999;
  margin: 0;
}

/* 提示 */
.toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slide-in 0.3s ease;
  z-index: 50;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  background-color: #e8f5e9;
  border-left: 4px solid #4CAF50;
  color: #2e7d32;
}

.toast-error {
  background-color: #ffebee;
  border-left: 4px solid #F44336;
  color: #c62828;
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-message {
  font-size: 0.95rem;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
  line-height: 1;
  padding: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .fields-grid {
    grid-template-columns: 1fr;
  }
}
</style>
