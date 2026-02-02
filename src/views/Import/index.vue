<template>
  <div class="import-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">数据导入</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- 文件上传区域 -->
    <div class="upload-section">
      <div class="section-card">
        <h2 class="section-title">上传文件</h2>
        
        <div 
          class="upload-zone"
          :class="{ 'upload-zone--dragover': isDragOver, 'upload-zone--has-file': selectedFile }"
          @click="triggerFileInput"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <input 
            ref="fileInput" 
            type="file" 
            accept=".json,.csv,.xlsx,.xls,.zip"
            class="hidden-input"
            @change="handleFileSelect"
          />
          
          <div v-if="!selectedFile" class="upload-placeholder">
            <div class="upload-icon">📁</div>
            <p class="upload-text">点击或拖拽文件到此处</p>
            <p class="upload-hint">支持 JSON、CSV、Excel、ZIP 格式</p>
          </div>
          
          <div v-else class="upload-file">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <p class="file-name">{{ selectedFile.name }}</p>
              <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button class="file-remove" @click.stop="removeFile">×</button>
          </div>
        </div>

        <!-- 导入格式选择 -->
        <div class="format-select">
          <label class="format-label">文件格式</label>
          <select v-model="importFormat" class="format-dropdown">
            <option value="json">JSON 格式</option>
            <option value="csv">CSV 格式</option>
            <option value="excel">Excel 格式</option>
            <option value="zip">ZIP 压缩包（整库导入）</option>
          </select>
        </div>
      </div>

      <!-- 导入选项 -->
      <div class="section-card">
        <h2 class="section-title">导入选项</h2>
        <div class="options-list">
          <label class="option-item">
            <input type="checkbox" v-model="importOptions.skipDuplicates" />
            <div class="option-content">
              <span class="option-text">跳过重复的书籍</span>
              <span class="option-hint">如果ISBN已存在，将跳过该条记录。建议勾选，否则数据库有重复词条</span>
            </div>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="importOptions.updateExisting" />
            <div class="option-content">
              <span class="option-text">更新现有数据</span>
              <span class="option-hint">如果ISBN已存在，将更新该条记录</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 字段映射（解析后显示，非ZIP文件） -->
      <div v-if="importPreview && !isZipFile" class="section-card">
        <h2 class="section-title">字段映射</h2>
        <div class="mapping-info">
          <div class="info-icon">📋</div>
          <div class="info-content">
            <p class="info-title">已识别 {{ Object.keys(fieldMapping).length }} 个字段</p>
            <p class="info-desc">系统已自动匹配表头字段</p>
          </div>
        </div>
        <div class="field-mapping-grid">
          <div 
            v-for="(mapped, original) in fieldMapping" 
            :key="original"
            class="mapping-item"
          >
            <span class="mapping-original">{{ original }}</span>
            <span class="mapping-arrow">→</span>
            <span class="mapping-mapped">{{ mapped }}</span>
          </div>
        </div>
        
        <!-- 数据预览 -->
        <h3 class="preview-title">数据预览</h3>
        <div class="preview-table-container">
          <table class="preview-table">
            <thead>
              <tr>
                <th v-for="field in previewHeaders" :key="field">{{ field }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewRows" :key="idx">
                <td v-for="field in previewHeaders" :key="field">
                  {{ row[field] || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 导入操作 -->
        <div class="import-actions">
          <button
            class="btn-primary btn-large"
            @click="confirmImport"
            :disabled="isImporting"
          >
            <span v-if="isImporting">导入中...</span>
            <span v-else>确定导入</span>
          </button>
          <button
            class="btn-secondary"
            @click="resetImport"
            :disabled="isImporting"
          >
            重新选择文件
          </button>
        </div>
      </div>

      <!-- ZIP文件信息显示 -->
      <div v-if="importPreview && isZipFile && zipValidationResult" class="section-card">
        <h2 class="section-title">ZIP文件信息</h2>
        <div class="zip-info-grid">
          <div class="zip-info-item">
            <span class="zip-info-label">导出时间</span>
            <span class="zip-info-value">{{ formatDate(zipValidationResult.metadata?.exportTime) }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">版本</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.version }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">应用</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.appName }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">书籍数量</span>
            <span class="zip-info-value zip-highlight">{{ zipValidationResult.metadata?.books || 0 }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">分组数量</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.groups || 0 }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">标签数量</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.tags || 0 }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">书签数量</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.bookmarks || 0 }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">包含封面</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.includeCovers ? '是' : '否' }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">封面数量</span>
            <span class="zip-info-value">{{ zipValidationResult.covers?.size || 0 }}</span>
          </div>
        </div>

        <!-- 书籍预览 -->
        <h3 class="preview-title">书籍列表预览</h3>
        <div class="preview-table-container">
          <table class="preview-table">
            <thead>
              <tr>
                <th>书名</th>
                <th>作者</th>
                <th>ISBN</th>
                <th>封面</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(book, idx) in (zipValidationResult.books || []).slice(0, 5)" :key="idx">
                <td>{{ book.title || '-' }}</td>
                <td>{{ book.author || '-' }}</td>
                <td>{{ book.isbn || '-' }}</td>
                <td>
                  <span v-if="zipValidationResult.covers?.has(book.isbn)" class="cover-badge">
                    ✅ 有
                  </span>
                  <span v-else class="cover-badge cover-badge--none">
                    ❌ 无
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="zipValidationResult.books && zipValidationResult.books.length > 5" class="preview-more">
          还有 {{ zipValidationResult.books.length - 5 }} 本书籍未显示...
        </p>

        <!-- 导入操作 -->
        <div class="import-actions">
          <button
            class="btn-primary btn-large"
            @click="confirmImport"
            :disabled="isImporting"
          >
            <span v-if="isImporting">导入中...</span>
            <span v-else>确定导入</span>
          </button>
          <button
            class="btn-secondary"
            @click="resetImport"
            :disabled="isImporting"
          >
            重新选择文件
          </button>
        </div>
      </div>
    </div>

    <!-- 导入结果 -->
    <div v-if="importResult" class="result-section">
      <div class="result-card" :class="importResult.success ? 'result-card--success' : 'result-card--error'">
        <div class="result-header">
          <span class="result-icon">{{ importResult.success ? '✅' : '⚠️' }}</span>
          <h3 class="result-title">{{ importResult.success ? '导入完成' : '导入失败' }}</h3>
        </div>
        
        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-value">{{ importResult.total }}</span>
            <span class="stat-label">总数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value stat-value--success">{{ importResult.imported }}</span>
            <span class="stat-label">已导入</span>
          </div>
          <div class="stat-item">
            <span class="stat-value stat-value--warning">{{ importResult.skipped }}</span>
            <span class="stat-label">已跳过</span>
          </div>
        </div>

        <div v-if="importResult.errors.length > 0" class="result-errors">
          <h4 class="error-title">错误列表 ({{ importResult.errors.length }})</h4>
          <div class="error-list">
            <div 
              v-for="(error, idx) in importResult.errors.slice(0, 5)" 
              :key="idx"
              class="error-item"
            >
              <span class="error-row">第 {{ error.row }} 行</span>
              <span class="error-message">{{ error.message }}</span>
            </div>
            <p v-if="importResult.errors.length > 5" class="error-more">
              还有 {{ importResult.errors.length - 5 }} 条错误未显示...
            </p>
          </div>
        </div>

        <div v-if="importResult.warnings.length > 0" class="result-warnings">
          <h4 class="warning-title">警告列表 ({{ importResult.warnings.length }})</h4>
          <div class="warning-list">
            <div 
              v-for="(warning, idx) in importResult.warnings.slice(0, 5)" 
              :key="idx"
              class="warning-item"
            >
              {{ warning }}
            </div>
            <p v-if="importResult.warnings.length > 5" class="warning-more">
              还有 {{ importResult.warnings.length - 5 }} 条警告未显示...
            </p>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-primary" @click="resetImport">导入更多数据</button>
          <button class="btn-secondary" @click="goToBooks">查看书籍列表</button>
        </div>
      </div>
    </div>

    <!-- 导入进度 -->
    <div v-if="isImporting" class="progress-overlay">
      <div class="progress-card">
        <div class="progress-spinner"></div>
        <p class="progress-text">正在导入数据...</p>
        <p class="progress-hint">请勿关闭页面</p>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="guide-section">
      <h2 class="guide-title">导入说明</h2>
      <div class="guide-content">
        <div class="guide-item">
          <span class="guide-icon">📋</span>
          <div class="guide-text">
            <h3>支持的文件格式</h3>
            <p>JSON、CSV、Excel 文件均可导入</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">🔑</span>
          <div class="guide-text">
            <h3>必填字段</h3>
            <p>ISBN 是必填字段，书名和作者建议填写</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">🌐</span>
          <div class="guide-text">
            <h3>字段匹配</h3>
            <p>系统会自动匹配表头字段，支持中英文字段名</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">💾</span>
          <div class="guide-text">
            <h3>数据完整性</h3>
            <p>未匹配到的字段会自动留空，保留原始数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { importService, type ImportFormat, type ImportResult, type ImportOptions, type ZipImportResult } from '@/services/importService';

const router = useRouter();

// 文件相关
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);

// 导入设置
const importFormat = ref<ImportFormat>('json');
const importOptions = ref<ImportOptions>({
  format: 'json',
  skipDuplicates: true,
  updateExisting: false,
  fieldMapping: {}
});

// 解析预览
const importPreview = ref(false);
const fieldMapping = ref<Record<string, string>>({});
const previewHeaders = ref<string[]>([]);
const previewRows = ref<any[]>([]);

// ZIP相关
const zipValidationResult = ref<ZipImportResult | null>(null);
const isZipFile = computed(() => importFormat.value === 'zip');

// 状态
const isImporting = ref(false);
const importResult = ref<ImportResult | null>(null);

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    return;
  }
  
  const file = target.files[0];
  await processFile(file);
};

// 处理拖放
const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  
  if (!event.dataTransfer || !event.dataTransfer.files.length) {
    return;
  }
  
  const file = event.dataTransfer.files[0];
  await processFile(file);
};

// 处理文件
const processFile = async (file: File) => {
  selectedFile.value = file;
  importResult.value = null;
  zipValidationResult.value = null;

  // 根据文件扩展名自动选择格式
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    importFormat.value = 'json';
  } else if (ext === 'csv') {
    importFormat.value = 'csv';
  } else if (ext === 'xlsx' || ext === 'xls') {
    importFormat.value = 'excel';
  } else if (ext === 'zip') {
    importFormat.value = 'zip';
  }

  try {
    // 如果是ZIP文件，先验证
    if (importFormat.value === 'zip') {
      console.log('📦 检测到ZIP文件，开始验证...');
      const validation = await importService.validateZipFile(file);
      zipValidationResult.value = validation;

      if (!validation.success) {
        alert('ZIP文件验证失败: ' + validation.message);
        selectedFile.value = null;
        return;
      }

      // 显示ZIP文件信息
      importPreview.value = true;
      console.log('✅ ZIP文件验证成功:', validation);
    } else {
      // 预览文件内容
      const content = await readFileContent(file);
      
      if (importFormat.value === 'json') {
        previewJSON(content);
      } else {
        previewCSV(content);
      }

      importPreview.value = true;
    }
  } catch (e) {
    console.error('文件解析失败:', e);
    alert('文件解析失败: ' + (e as Error).message);
    selectedFile.value = null;
  }
};

// 读取文件内容
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
};

// 预览JSON
const previewJSON = (content: string) => {
  try {
    const data = JSON.parse(content);
    
    // 提取字段
    let books = data.books && Array.isArray(data.books) ? data.books : Array.isArray(data) ? data : [];
    
    if (books.length > 0) {
      const firstBook = books[0];
      const fields = Object.keys(firstBook);
      
      // 字段映射（原始字段 -> 映射字段）
      fieldMapping.value = {};
      fields.forEach(f => {
        fieldMapping.value[f] = f;
      });
      
      // 预览数据
      previewHeaders.value = fields.slice(0, 6);
      previewRows.value = books.slice(0, 3).map((book: any) => {
        const row: any = {};
        fields.slice(0, 6).forEach(f => {
          row[f] = book[f];
        });
        return row;
      });
    }
  } catch (e) {
    throw new Error('JSON格式不正确');
  }
};

// 预览CSV
const previewCSV = (content: string) => {
  // 移除BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV文件为空或格式不正确');
  }

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  fieldMapping.value = {};
  headers.forEach(h => {
    fieldMapping.value[h] = h;
  });

  // 预览数据
  previewHeaders.value = headers.slice(0, 6);
  previewRows.value = lines.slice(1, 4).map(line => {
    const values = parseCSVLine(line);
    const row: any = {};
    headers.slice(0, 6).forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
};

// 解析CSV行
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

// 移除文件
const removeFile = () => {
  selectedFile.value = null;
  importPreview.value = false;
  fieldMapping.value = {};
  previewHeaders.value = [];
  previewRows.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 重置导入
const resetImport = () => {
  removeFile();
  importResult.value = null;
};

// 确认导入
const confirmImport = async () => {
  if (!selectedFile.value) {
    return;
  }

  // 确认对话框
  const message = isZipFile.value
    ? `确定要导入 ZIP 文件吗？\n包含 ${zipValidationResult.value?.metadata?.books || 0} 本书籍`
    : `确定要导入文件 ${selectedFile.value.name} 吗？`;

  if (!confirm(message)) {
    return;
  }

  isImporting.value = true;
  importResult.value = null;

  try {
    const options: ImportOptions = {
      format: importFormat.value,
      skipDuplicates: importOptions.value.skipDuplicates,
      updateExisting: importOptions.value.updateExisting,
      fieldMapping: fieldMapping.value
    };

    const result = await importService.importFromFile(selectedFile.value, options);
    importResult.value = result;

    if (result.success) {
      console.log('✅ 导入成功:', result);
    }
  } catch (e) {
    console.error('导入失败:', e);
    importResult.value = {
      success: false,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, message: (e as Error).message }],
      warnings: []
    };
  } finally {
    isImporting.value = false;
  }
};

// 执行导入（保留原有的函数名以兼容）
const handleImport = confirmImport;

// 格式化日期
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
};

// 返回书籍列表
const goToBooks = () => {
  router.push('/book');
};

// 返回上一页
const goBack = () => {
  router.back();
};
</script>

<style scoped>
.import-container {
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

/* 上传区域 */
.upload-section {
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
}

/* 上传区域 */
.upload-zone {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fafafa;
}

.upload-zone:hover {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.upload-zone--dragover {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.upload-zone--has-file {
  border-style: solid;
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.hidden-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.upload-icon {
  font-size: 3rem;
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.upload-hint {
  font-size: 0.9rem;
  color: #999;
  margin: 0;
}

.upload-file {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.file-icon {
  font-size: 2.5rem;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.file-size {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

.file-remove {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #F44336;
  padding: 0;
  line-height: 1;
}

/* 格式选择 */
.format-select {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.format-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
}

.format-dropdown {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
}

.format-dropdown:focus {
  border-color: #4CAF50;
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

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
}

.option-hint {
  font-size: 0.8rem;
  color: #999;
}

/* 字段映射 */
.mapping-info {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
  margin-bottom: 1rem;
}

.info-icon {
  font-size: 1.5rem;
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

.field-mapping-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.85rem;
}

.mapping-original {
  color: #666;
}

.mapping-arrow {
  color: #999;
}

.mapping-mapped {
  color: #4CAF50;
  font-weight: 500;
}

/* 预览表格 */
.preview-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.75rem 0;
}

.preview-table-container {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.preview-table th,
.preview-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.preview-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.preview-table td {
  color: #666;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作区域 */
.action-section,
.import-actions {
  padding: 0 1rem 1rem;
  display: flex;
  gap: 1rem;
}

.btn-large {
  flex: 1;
  padding: 1rem;
  font-size: 1rem;
}

.btn-primary {
  flex: 1;
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

.btn-secondary {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #333;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #4CAF50;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 导入结果 */
.result-section {
  padding: 1rem;
}

.result-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-card--success {
  border-left: 4px solid #4CAF50;
}

.result-card--error {
  border-left: 4px solid #F44336;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.result-icon {
  font-size: 2rem;
}

.result-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.result-card--success .result-title {
  color: #2e7d32;
}

.result-card--error .result-title {
  color: #c62828;
}

/* 统计数据 */
.result-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-value--success {
  color: #4CAF50;
}

.stat-value--warning {
  color: #FF9800;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

/* 错误和警告 */
.result-errors,
.result-warnings {
  margin-bottom: 1.5rem;
}

.error-title,
.warning-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.error-title {
  color: #c62828;
}

.warning-title {
  color: #FF9800;
}

.error-list,
.warning-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0.75rem;
  background-color: #fafafa;
}

.error-item,
.warning-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.error-item:last-child,
.warning-item:last-child {
  border-bottom: none;
}

.error-row {
  font-weight: 600;
  color: #c62828;
  margin-right: 0.5rem;
}

.error-message {
  color: #666;
}

.warning-item {
  color: #666;
}

.error-more,
.warning-more {
  text-align: center;
  padding: 0.5rem;
  color: #999;
  font-size: 0.85rem;
  margin: 0;
}

/* 结果操作 */
.result-actions {
  display: flex;
  gap: 1rem;
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

/* 说明区域 */
.guide-section {
  padding: 1rem;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

.guide-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.guide-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.guide-item {
  display: flex;
  gap: 0.75rem;
}

.guide-icon {
  font-size: 1.5rem;
}

.guide-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.guide-text h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.guide-text p {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .guide-content {
    grid-template-columns: 1fr;
  }

  .action-section,
  .result-actions {
    flex-direction: column;
  }

  .result-stats {
    flex-direction: column;
  }
}

/* 封面徽章 */
.cover-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.cover-badge--none {
  color: #999;
}
</style>
