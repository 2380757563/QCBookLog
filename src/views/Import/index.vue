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

        <!-- 格式示例下载 -->
        <div class="template-section">
          <div class="template-header">
            <span class="template-icon">📥</span>
            <span class="template-title">没有模板?下载格式示例</span>
          </div>
          <div class="template-buttons">
            <button class="template-btn" @click="downloadCsvTemplate" :disabled="generating">
              <span class="template-btn-icon">📄</span>
              <span class="template-btn-text">CSV 示例</span>
            </button>
            <button class="template-btn" @click="downloadExcelTemplate" :disabled="generating">
              <span class="template-btn-icon">📊</span>
              <span class="template-btn-text">Excel 示例(含封面)</span>
            </button>
            <button class="template-btn" @click="downloadJsonTemplate" :disabled="generating">
              <span class="template-btn-icon">📋</span>
              <span class="template-btn-text">JSON 示例</span>
            </button>
          </div>
          <div class="template-hint">
            💡 <strong>整库备份(ZIP)</strong>:请到
            <router-link to="/export" class="inline-link">数据导出</router-link>
            页面使用「整库导出」功能生成,生成的 ZIP 可直接拖到此处进行整库恢复。
          </div>
          <details class="template-fields">
            <summary class="template-fields-toggle">查看支持的字段及格式说明</summary>
            <div class="template-fields-content">
              <p class="template-fields-note">
                <strong>必填字段:</strong> ISBN、书名 (只有这两项是必填,其他都可省略)<br>
                <strong>多值字段:</strong> 标签 / 分组 — 用 <code>,</code> 或 <code>;</code> 分隔多个值
              </p>
              <table class="field-table">
                <thead>
                  <tr><th>字段名</th><th>是否必填</th><th>类型</th><th>说明</th><th>示例</th></tr>
                </thead>
                <tbody>
                  <tr><td>ISBN <span class="required-mark">*</span></td><td class="required-yes">必填</td><td>字符串</td><td>系统按 ISBN 去重</td><td>9787020002207</td></tr>
                  <tr><td>书名 <span class="required-mark">*</span></td><td class="required-yes">必填</td><td>字符串</td><td>书籍标题</td><td>红楼梦</td></tr>
                  <tr><td>作者</td><td class="required-no">选填</td><td>字符串</td><td>多人用 / 分隔</td><td>曹雪芹 / 人民文学出版社编辑部</td></tr>
                  <tr><td>出版社</td><td class="required-no">选填</td><td>字符串</td><td>-</td><td>人民文学出版社</td></tr>
                  <tr><td>出版年份</td><td class="required-no">选填</td><td>数字</td><td>4 位年份</td><td>1996</td></tr>
                  <tr><td>页数</td><td class="required-no">选填</td><td>数字</td><td>-</td><td>1606</td></tr>
                  <tr><td>评分</td><td class="required-no">选填</td><td>数字</td><td>0-10</td><td>9.6</td></tr>
                  <tr><td>阅读状态</td><td class="required-no">选填</td><td>字符串</td><td>未读 / 在读 / 已读</td><td>已读</td></tr>
                  <tr><td>完成阅读日期</td><td class="required-no">选填</td><td>日期</td><td>YYYY-MM-DD</td><td>2024-12-31</td></tr>
                  <tr><td>购买日期</td><td class="required-no">选填</td><td>日期</td><td>YYYY-MM-DD</td><td>2024-01-15</td></tr>
                  <tr><td>购买价格</td><td class="required-no">选填</td><td>数字</td><td>单位:元</td><td>68.00</td></tr>
                  <tr><td>定价</td><td class="required-no">选填</td><td>数字</td><td>单位:元</td><td>98.00</td></tr>
                  <tr><td>标签</td><td class="required-no">选填</td><td>数组</td><td>逗号分隔</td><td>古典文学,四大名著,经典</td></tr>
                  <tr><td>分组</td><td class="required-no">选填</td><td>数组</td><td>逗号分隔</td><td>已购,书架A</td></tr>
                  <tr><td>丛书</td><td class="required-no">选填</td><td>字符串</td><td>丛书系列名</td><td>中国古典四大名著</td></tr>
                  <tr><td>装帧</td><td class="required-no">选填</td><td>字符串</td><td>精装 / 平装</td><td>精装</td></tr>
                  <tr><td>备注</td><td class="required-no">选填</td><td>字符串</td><td>个人备注</td><td>经典必读</td></tr>
                  <tr><td>简介</td><td class="required-no">选填</td><td>字符串</td><td>书籍简介</td><td>中国古典小说巅峰之作...</td></tr>
                  <tr><td>封面</td><td class="required-no">选填</td><td>图片</td><td>仅 Excel 支持:把图片插入到该行"封面"列即可随书导入</td><td>(插入图片)</td></tr>
                  <tr><td>创建时间</td><td class="required-no">选填</td><td>日期</td><td>ISO 8601</td><td>2024-01-15T10:00:00.000Z</td></tr>
                  <tr><td>更新时间</td><td class="required-no">选填</td><td>日期</td><td>ISO 8601</td><td>2024-12-31T15:30:00.000Z</td></tr>
                </tbody>
              </table>
            </div>
          </details>
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

      <!-- 整库备份(full-library-backup)专属 UI -->
      <div v-if="importPreview && isZipFile && zipValidationResult?.isFullLibraryBackup" class="section-card section-card--fullbackup">
        <h2 class="section-title">
          <span class="backup-icon">📦</span>
          整库备份信息
        </h2>

        <div class="fullbackup-warn">
          <div class="warn-icon">⚠️</div>
          <div class="warn-content">
            <p class="warn-title">整库恢复会覆盖当前所有数据</p>
            <p class="warn-desc">
              当前 Calibre 书库、Talebook 数据库、QCBookLog 数据库(包含分组、标签、书签、热力图、阅读目标等)
              将被备份文件中的数据<strong>完全替换</strong>。恢复过程会自动备份当前数据到临时目录。
            </p>
            <p class="warn-desc">
              <strong>恢复完成后后端会自动重启</strong>(约 5~10 秒),期间接口会短暂不可用,刷新页面即可。
            </p>
          </div>
        </div>

        <div class="zip-info-grid">
          <div class="zip-info-item">
            <span class="zip-info-label">备份类型</span>
            <span class="zip-info-value zip-highlight">整库备份 (full-library-backup)</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">版本</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.version }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">导出时间</span>
            <span class="zip-info-value">{{ formatDate(zipValidationResult.metadata?.exportTime) }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">应用</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.appName }}</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">Calibre 书籍</span>
            <span class="zip-info-value zip-highlight">约 {{ zipValidationResult.metadata?.books || 0 }} 本</span>
          </div>
          <div class="zip-info-item">
            <span class="zip-info-label">包含封面</span>
            <span class="zip-info-value">{{ zipValidationResult.metadata?.includeCovers ? '是' : '否' }}</span>
          </div>
        </div>

        <div class="fullbackup-contents">
          <h3 class="preview-title">📋 恢复内容</h3>
          <ul class="contents-list">
            <li>✅ <strong>Calibre 书库</strong>: calibre-library/ 目录(所有书籍文件 + metadata.db)</li>
            <li>✅ <strong>Talebook 数据库</strong>: talebook.db(含用户/权限等)</li>
            <li>✅ <strong>QCBookLog 数据库</strong>: qcbooklog.db + WAL/SHM(含分组、标签、书签、热力图、阅读目标等)</li>
          </ul>
        </div>

        <!-- 恢复进度条 -->
        <div v-if="restoreInProgress || restoreResult" class="fullbackup-progress">
          <h3 class="preview-title">🔄 恢复进度</h3>
          <div class="progress-bar-wrap">
            <div class="progress-bar" :style="{ width: restoreProgress + '%' }"></div>
          </div>
          <p class="progress-text">{{ restoreProgressText }}</p>
        </div>

        <!-- 恢复成功提示 -->
        <div v-if="restoreResult?.success" class="fullbackup-success">
          <div class="success-icon">🎉</div>
          <div>
            <h3>恢复成功!</h3>
            <p>{{ restoreResult.message }}</p>
            <p class="success-tip">
              <strong>请等待后端重启完成</strong>(通常 5~10 秒),之后请刷新页面以加载新数据。
            </p>
            <button class="btn-primary" @click="reloadPage" style="margin-top: 12px;">立即刷新页面</button>
          </div>
        </div>

        <!-- 恢复失败提示 -->
        <div v-if="restoreResult && !restoreResult.success" class="fullbackup-failed">
          <div class="failed-icon">❌</div>
          <div>
            <h3>恢复失败</h3>
            <p>{{ restoreResult.message || restoreResult.error }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="import-actions">
          <button
            v-if="!restoreInProgress && !restoreResult?.success"
            class="btn-primary btn-large btn-danger"
            @click="confirmFullLibraryRestore"
            :disabled="restoreInProgress"
          >
            <span>开始整库恢复(会覆盖当前数据)</span>
          </button>
          <button
            class="btn-secondary"
            @click="resetImport"
            :disabled="restoreInProgress"
          >
            重新选择文件
          </button>
        </div>
      </div>

      <!-- ZIP文件信息显示(仅普通 ZIP 备份,整库备份走专属 UI) -->
      <div v-if="importPreview && isZipFile && zipValidationResult && !zipValidationResult.isFullLibraryBackup" class="section-card">
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
        <p class="progress-text">{{ importProgress.message || '正在导入数据...' }}</p>

        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div
              class="progress-bar-fill"
              :style="{ width: importProgress.percent + '%' }"
            ></div>
          </div>
          <div class="progress-bar-label">{{ importProgress.percent }}%</div>
        </div>

        <p class="progress-status" v-if="importTotal > 0">
          {{ importCurrent }}/{{ importTotal }}
        </p>
        <p class="progress-stats" v-if="showImportStats">
          已导入 {{ importedCount }} · 已跳过 {{ skippedCount }} · 错误 {{ errorsCount }}
        </p>
        <p class="progress-hint">请勿关闭页面</p>
      </div>
    </div>

    <!-- 重复书籍弹窗(与 ISBN 扫描共用同一组件) -->
    <DuplicateBookDialog
      :visible="duplicateDialogVisible"
      :duplicates="duplicateList"
      :mode="duplicateDialogMode"
      :batch-stats="batchDupStats ?? undefined"
      :incoming-duplicate-books="incomingDuplicateBooks"
      :current-book-title="currentBookTitle"
      @cancel="onDupCancel"
      @continue="onDupContinue"
      @view-existing="onDupViewExisting"
      @skip-all="onDupSkipAll"
      @continue-all="onDupContinueAll"
      @review-one-by-one="onDupReviewOneByOne"
    />

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
import { importService, type ImportFormat, type ImportResult, type ImportOptions, type ZipImportResult, type ImportProgress } from '@/api/importService';
import { bookService } from '@/api/book';
import { normalizeIsbn } from '@/utils/isbnUtils';
import DuplicateBookDialog from '@/views/Book/components/DuplicateBookDialog.vue';
import ExcelJS from 'exceljs';

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

// 整库恢复相关
const restoreInProgress = ref(false);
const restoreProgress = ref(0);
const restoreProgressText = ref('');
const restoreResult = ref<{ success: boolean; message?: string; error?: string } | null>(null);

// 重复处理弹窗(与 ISBN 扫描保持一致)
const duplicateDialogVisible = ref(false);
const duplicateDialogMode = ref<'single' | 'batch-summary'>('single');
const duplicateList = ref<any[]>([]);
const batchDupStats = ref<{ totalCount: number; duplicateCount: number } | null>(null);
const incomingDuplicateBooks = ref<Array<{ isbn: string; title: string }>>([]);
const currentBookTitle = ref<string | undefined>(undefined);
let pendingDuplicateResolver: ((r: any) => void) | null = null;

// 状态
const isImporting = ref(false);
const importResult = ref<ImportResult | null>(null);
const generating = ref(false);

// 导入进度
const importProgress = ref<ImportProgress>({
  percent: 0,
  phase: 'parsing',
  message: '准备导入...'
});
const importPercent = computed(() => importProgress.value.percent);
const importTotal = computed(() => importProgress.value.total ?? 0);
const importCurrent = computed(() => importProgress.value.current ?? 0);
const importedCount = computed(() => importProgress.value.imported ?? 0);
const skippedCount = computed(() => importProgress.value.skipped ?? 0);
const errorsCount = computed(() => importProgress.value.errors ?? 0);
const showImportStats = computed(() =>
  importProgress.value.phase === 'creating' ||
  importProgress.value.phase === 'covers' ||
  importProgress.value.phase === 'done'
);

// ===== 格式示例下载 =====

/**
 * 模板通用示例数据(2-3 本书,包含各种字段类型,供用户参考)
 */
const TEMPLATE_SAMPLE_ROWS: Array<Record<string, any>> = [
  {
    ISBN: '9787020002207',
    书名: '红楼梦',
    作者: '曹雪芹',
    出版社: '人民文学出版社',
    出版年份: 1996,
    页数: 1606,
    评分: 9.6,
    阅读状态: '已读',
    完成阅读日期: '2024-12-31',
    购买日期: '2024-01-15',
    购买价格: 68.00,
    定价: 98.00,
    标签: '古典文学,四大名著,经典',
    分组: '已购,书架A',
    丛书: '中国古典四大名著',
    装帧: '精装',
    备注: '经典必读',
    简介: '中国古典小说巅峰之作,讲述贾府兴衰与宝黛爱情悲剧。',
    创建时间: '2024-01-15T10:00:00.000Z',
    更新时间: '2024-12-31T15:30:00.000Z'
  },
  {
    ISBN: '9787544253994',
    书名: '百年孤独',
    作者: '加西亚·马尔克斯 / 范晔',
    出版社: '南海出版公司',
    出版年份: 2011,
    页数: 360,
    评分: 9.2,
    阅读状态: '在读',
    标签: '魔幻现实主义,外国文学,经典',
    分组: '在读',
    装帧: '平装',
    简介: '魔幻现实主义文学代表作,讲述马孔多小镇布恩迪亚家族七代人的传奇故事。',
    创建时间: '2024-06-01T09:00:00.000Z'
  },
  {
    ISBN: '9787508672069',
    书名: '人类简史',
    作者: '尤瓦尔·赫拉利 / 林俊宏',
    出版社: '中信出版社',
    出版年份: 2017,
    页数: 440,
    评分: 9.0,
    阅读状态: '未读',
    标签: '历史,科普,思维',
    分组: '想读',
    装帧: '平装',
    简介: '从十万年前有生命迹象到21世纪,讲述人类发展的关键历程。',
    创建时间: '2024-11-01T14:00:00.000Z'
  }
];

/**
 * 模板表头顺序(中英文对照,按用户最常用排序)
 * 注意:封面列不参与字段映射,仅作为图片插入位置参考
 */
const TEMPLATE_HEADERS: Array<{ key: string; label: string }> = [
  { key: 'ISBN', label: 'ISBN' },
  { key: '书名', label: '书名' },
  { key: '作者', label: '作者' },
  { key: '出版社', label: '出版社' },
  { key: '出版年份', label: '出版年份' },
  { key: '页数', label: '页数' },
  { key: '评分', label: '评分' },
  { key: '阅读状态', label: '阅读状态' },
  { key: '完成阅读日期', label: '完成阅读日期' },
  { key: '购买日期', label: '购买日期' },
  { key: '购买价格', label: '购买价格' },
  { key: '定价', label: '定价' },
  { key: '标签', label: '标签' },
  { key: '分组', label: '分组' },
  { key: '丛书', label: '丛书' },
  { key: '装帧', label: '装帧' },
  { key: '备注', label: '备注' },
  { key: '简介', label: '简介' },
  { key: '封面', label: '封面' },
  { key: '创建时间', label: '创建时间' },
  { key: '更新时间', label: '更新时间' }
];

/**
 * 示例封面配色方案(每本书用不同配色,方便用户区分)
 */
const TEMPLATE_COVER_SCHEMES: Array<{ primary: string; secondary: string; accent: string }> = [
  { primary: '#8B2C2C', secondary: '#4A1818', accent: '#D4A574' },  // 红楼梦 - 暗红
  { primary: '#1E3A5F', secondary: '#0F1F33', accent: '#E8C547' },  // 百年孤独 - 暗蓝
  { primary: '#3D5A40', secondary: '#1F2E22', accent: '#F4A261' }   // 人类简史 - 暗绿
];

/**
 * 使用 Canvas 生成示例封面图(240x320, 渐变背景 + 装饰 + 书名)
 * 浏览器环境下生成,服务端不可用
 */
async function generateCoverImage(
  title: string,
  author: string,
  scheme: { primary: string; secondary: string; accent: string }
): Promise<ArrayBuffer> {
  const W = 240;
  const H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

  // 1. 渐变背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, scheme.primary);
  bg.addColorStop(1, scheme.secondary);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. 装饰圆 + 边框
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(W - 50, 50, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-30, H - 80, 70, 0, Math.PI * 2);
  ctx.fill();

  // 3. 顶部装饰条
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(20, 20, 40, 4);

  // 4. 书名(自动换行, 居中)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxWidth = W - 40;
  const lineHeight = 30;
  const chars = Array.from(title);
  const lines: string[] = [];
  let current = '';
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const displayLines = lines.slice(0, 4);
  const startY = H / 2 - (displayLines.length * lineHeight) / 2;
  displayLines.forEach((l, i) => {
    ctx.fillText(l, W / 2, startY + i * lineHeight);
  });

  // 5. 底部作者
  ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const authorText = author.length > 18 ? author.slice(0, 18) + '…' : author;
  ctx.fillText(authorText, W / 2, H - 35);

  // 6. 底部装饰
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(20, H - 20, 40, 3);

  // 7. 转换为 PNG ArrayBuffer
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('生成封面图失败'));
        return;
      }
      resolve(await blob.arrayBuffer());
    }, 'image/png');
  });
}

/**
 * CSV 字段转义(包含逗号/引号/换行的字段用双引号包裹,内部引号双写)
 */
function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 触发浏览器下载
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * 下载 CSV 格式示例
 */
async function downloadCsvTemplate() {
  if (generating.value) return;
  generating.value = true;
  try {
    const headers = TEMPLATE_HEADERS.map(h => h.key);
    const lines: string[] = [headers.join(',')];
    for (const row of TEMPLATE_SAMPLE_ROWS) {
      lines.push(headers.map(h => csvEscape(row[h])).join(','));
    }
    // \uFEFF BOM 保证 Excel 正确识别中文 UTF-8
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, 'qc-booklog-template.csv');
  } catch (e) {
    console.error('生成 CSV 示例失败:', e);
    alert('生成 CSV 示例失败: ' + (e as Error).message);
  } finally {
    generating.value = false;
  }
}

/**
 * 下载 Excel 格式示例(真 .xlsx 二进制,带示例封面)
 */
async function downloadExcelTemplate() {
  if (generating.value) return;
  generating.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'QC-booklog';
    wb.created = new Date();
    const ws = wb.addWorksheet('书籍数据');

    ws.columns = TEMPLATE_HEADERS.map(h => ({
      header: h.label,
      key: h.key,
      width: h.key === '简介' ? 30 : (h.key === '封面' ? 14 : 18)
    }));
    // 封面列单独设置较窄宽度（图片会按比例自适应）
    const coverColIndex = TEMPLATE_HEADERS.findIndex(h => h.key === '封面') + 1; // 1-based
    if (coverColIndex > 0) {
      ws.getColumn(coverColIndex).width = 14;
    }

    ws.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 28;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // 行高统一为 110(刚好容纳封面预览,Excel 默认 15)
    const dataRowStart = 2;
    for (let i = 0; i < TEMPLATE_SAMPLE_ROWS.length; i++) {
      const row = TEMPLATE_SAMPLE_ROWS[i];
      const worksheetRow = ws.addRow(TEMPLATE_HEADERS.map(h => h.key === '封面' ? '' : row[h.key]));
      worksheetRow.height = 110;  // 封面大约 100px
      // 数字列格式化
      worksheetRow.getCell('评分').numFmt = '0.0';
      worksheetRow.getCell('购买价格').numFmt = '0.00';
      worksheetRow.getCell('定价').numFmt = '0.00';
      // 边框
      worksheetRow.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
      // 封面列的 cell 居中
      if (coverColIndex > 0) {
        worksheetRow.getCell(coverColIndex).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }

    // 在备注列添加说明批注
    ws.getCell('A1').note = 'ISBN 是必填字段,系统按 ISBN 去重。';
    ws.getCell('B1').note = '书名 是必填字段(与 ISBN 二者必须都有)。';
    ws.getCell('N1').note = '多个值用英文逗号分隔,例如: 古典文学,经典,必读';
    ws.getCell('O1').note = '多个值用英文逗号分隔,例如: 书架A,2024年购入';

    // ===== 生成并嵌入封面图 =====
    // 每张图嵌入位置: tl.col = 封面列(0-based), tl.row = dataRowStart - 1 + i(0-based 行索引,row 0 是表头)
    // 图片尺寸(按 Excel 列宽估算):宽 90px ≈ 14 列宽,高 100px ≈ 110 行高
    try {
      for (let i = 0; i < TEMPLATE_SAMPLE_ROWS.length; i++) {
        const book = TEMPLATE_SAMPLE_ROWS[i];
        const scheme = TEMPLATE_COVER_SCHEMES[i] || TEMPLATE_COVER_SCHEMES[0];
        const coverBuf = await generateCoverImage(book['书名'] || '未知', book['作者'] || '', scheme);
        const imageId = wb.addImage({
          buffer: coverBuf,
          extension: 'png'
        });
        // 0-based 行列:封面列索引(0-based),行索引 = dataRowStart - 1 + i
        // 例如 i=0 时 tl.row = 1 (刚好是第 2 行 = 第一个数据行,匹配 importService 中 rowNumber-1=1)
        // 使用 ImagePosition 形式: tl + ext, 避免 Anchor 类的 nativeCol/nativeRow 等字段
        ws.addImage(imageId, {
          tl: { col: coverColIndex - 1, row: dataRowStart - 1 + i },
          ext: { width: 100, height: 100 },
          editAs: 'oneCell'
        } as any);
      }
    } catch (imgErr) {
      console.warn('⚠️ 生成 Excel 封面图失败,继续生成无封面模板:', imgErr);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    triggerDownload(blob, 'qc-booklog-template.xlsx');
  } catch (e) {
    console.error('生成 Excel 示例失败:', e);
    alert('生成 Excel 示例失败: ' + (e as Error).message);
  } finally {
    generating.value = false;
  }
}

/**
 * 注: 整库备份 ZIP(full-library-backup)由后端「数据导出 → 整库导出」生成,
 *     此处不提供模板下载。 用户可到「数据导出」页面导出后,直接拖到此处进行整库恢复。
 */

/**
 * 下载 JSON 格式示例
 */
async function downloadJsonTemplate() {
  if (generating.value) return;
  generating.value = true;
  try {
    const data = {
      version: '1.0',
      books: TEMPLATE_SAMPLE_ROWS
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, 'qc-booklog-template.json');
  } catch (e) {
    console.error('生成 JSON 示例失败:', e);
    alert('生成 JSON 示例失败: ' + (e as Error).message);
  } finally {
    generating.value = false;
  }
}

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

      const validation = await importService.validateZipFile(file);
      zipValidationResult.value = validation;

      if (!validation.success) {
        alert('ZIP文件验证失败: ' + validation.message);
        selectedFile.value = null;
        return;
      }

      // 显示ZIP文件信息
      importPreview.value = true;

    } else {
      // 预览文件内容
      if (importFormat.value === 'excel') {
        // 真 xlsx 是二进制,必须用 ArrayBuffer 读取后再用 ExcelJS 解析
        const ab = await readFileAsArrayBuffer(file);
        await previewExcel(ab);
      } else {
        const content = await readFileContent(file);
        if (importFormat.value === 'json') {
          previewJSON(content);
        } else {
          previewCSV(content);
        }
      }

      importPreview.value = true;
    }
  } catch (e) {
    console.error('文件解析失败:', e);
    alert('文件解析失败: ' + (e as Error).message);
    selectedFile.value = null;
  }
};

// 读取文件内容(文本, 用于 JSON / CSV)
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
};

// 读取文件内容(二进制 ArrayBuffer, 用于真 xlsx)
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 字段名归一化映射(中文/驼峰/大写 -> 内部标准字段)
// 与 importService 中的 mapFieldName 保持一致
const FIELD_MAPPING: Record<string, string> = {
  isbn: 'isbn', title: 'title', author: 'author', publisher: 'publisher',
  publishYear: 'publishYear', pages: 'pages', binding: 'binding', series: 'series',
  readStatus: 'readStatus', readCompleteDate: 'readCompleteDate', rating: 'rating',
  purchaseDate: 'purchaseDate', purchasePrice: 'purchasePrice', standardPrice: 'standardPrice',
  tags: 'tags', groups: 'groups', note: 'note', description: 'description',
  createTime: 'createTime', updateTime: 'updateTime',
  ISBN: 'isbn', 书名: 'title', 作者: 'author', 出版社: 'publisher',
  出版年份: 'publishYear', 页数: 'pages', 装帧: 'binding', 丛书: 'series',
  阅读状态: 'readStatus', 完成阅读日期: 'readCompleteDate', 评分: 'rating',
  购买日期: 'purchaseDate', 购买价格: 'purchasePrice', 定价: 'standardPrice',
  标签: 'tags', 分组: 'groups', 备注: 'note', 简介: 'description',
  创建时间: 'createTime', 更新时间: 'updateTime'
};

const mapFieldName = (name: string): string => FIELD_MAPPING[name] || name;

// 把原始 row 转换为预览友好的对象:键名归一化,标签/分组数组化
const normalizeRowForPreview = (row: any): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row || {})) {
    const canonical = mapFieldName(k);
    const v = row[k];
    if (canonical === 'tags' || canonical === 'groups') {
      out[canonical] = typeof v === 'string' ? v.split(/[,;，；]/).map((s: string) => s.trim()).filter(Boolean)
                       : Array.isArray(v) ? v : v;
    } else if (typeof v === 'number') {
      out[canonical] = v;
    } else if (v instanceof Date) {
      out[canonical] = v.toISOString();
    } else if (v && typeof v === 'object' && 'result' in v) {
      out[canonical] = (v as any).result;
    } else if (v && typeof v === 'object' && 'richText' in v) {
      out[canonical] = (v as any).richText.map((r: any) => r.text).join('');
    } else if (v && typeof v === 'object' && 'text' in v) {
      out[canonical] = (v as any).text;
    } else {
      out[canonical] = v == null ? '' : v;
    }
  }
  return out;
};

// 预览JSON
const previewJSON = (content: string) => {
  try {
    const data = JSON.parse(content);

    // 提取字段
    const rawBooks = data.books && Array.isArray(data.books) ? data.books : Array.isArray(data) ? data : [];

    if (rawBooks.length > 0) {
      const firstBook = rawBooks[0];
      const rawFields = Object.keys(firstBook);
      // 先把原始字段归一化,收集所有归一化后的字段
      const normalized = rawBooks.map(normalizeRowForPreview);
      const allFieldsSet = new Set<string>();
      normalized.forEach((n: Record<string, any>) => Object.keys(n).forEach(k => allFieldsSet.add(k)));
      const fields = Array.from(allFieldsSet);

      // 字段映射(原始字段 -> 归一化字段)
      fieldMapping.value = {};
      rawFields.forEach(f => {
        const canon = mapFieldName(f);
        if (!fieldMapping.value[canon]) fieldMapping.value[canon] = canon;
      });

      // 预览数据(用归一化后的字段,方便用户查看)
      const displayFields = ['isbn', 'title', 'author', 'publisher', 'rating', 'readStatus'].filter(f => fields.includes(f));
      const finalFields = displayFields.length > 0 ? displayFields : fields.slice(0, 6);
      previewHeaders.value = finalFields;
      previewRows.value = normalized.slice(0, 3);
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
    const canon = mapFieldName(h);
    if (!fieldMapping.value[canon]) fieldMapping.value[canon] = canon;
  });

  // 预览数据
  const displayHeaders = ['ISBN', '书名', '作者', '出版社', '评分', '阅读状态'].filter(h => headers.includes(h));
  const finalHeaders = displayHeaders.length > 0 ? displayHeaders : headers.slice(0, 6);
  previewHeaders.value = finalHeaders;
  previewRows.value = lines.slice(1, 4).map(line => {
    const values = parseCSVLine(line);
    const row: any = {};
    headers.forEach((h, i) => {
      const canon = mapFieldName(h);
      const v = values[i] || '';
      if (canon === 'tags' || canon === 'groups') {
        row[canon] = v.split(/[,;，；]/).map((s: string) => s.trim()).filter(Boolean);
      } else {
        row[canon] = v;
      }
    });
    return row;
  });
};

// 预览真 Excel(xlsx 二进制,使用 ExcelJS 解析)
const previewExcel = async (arrayBuffer: ArrayBuffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets.find(s => s.rowCount > 0);
  if (!ws) {
    throw new Error('Excel文件中没有可用的工作表');
  }

  // 解析表头
  const headerRow = ws.getRow(1);
  const rawHeaders: string[] = [];
  const headerCols: number[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const v = cell.value;
    const text = v == null ? '' : (typeof v === 'object' && 'text' in v ? (v as any).text : String(v)).trim();
    if (text) {
      rawHeaders.push(text);
      headerCols.push(col);
    }
  });
  if (rawHeaders.length === 0) {
    throw new Error('Excel文件表头为空');
  }

  // 归一化表头
  const canonicalHeaders = rawHeaders.map(mapFieldName);
  fieldMapping.value = {};
  canonicalHeaders.forEach(c => { if (!fieldMapping.value[c]) fieldMapping.value[c] = c; });

  // 解析数据行
  const normalizedRows: any[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    const obj: Record<string, any> = {};
    rawHeaders.forEach((_rawH, idx) => {
      const canon = canonicalHeaders[idx];
      const cell = row.getCell(headerCols[idx]);
      let v: any = cell.value;
      if (v && typeof v === 'object') {
        if ('result' in v) v = v.result;
        else if ('richText' in v) v = (v.richText || []).map((r: any) => r.text).join('');
        else if ('text' in v) v = v.text;
        else if (v instanceof Date) v = v.toISOString();
        else v = String(v);
      }
      if (canon === 'tags' || canon === 'groups') {
        obj[canon] = typeof v === 'string' ? v.split(/[,;，；]/).map((s: string) => s.trim()).filter(Boolean)
                     : Array.isArray(v) ? v : [];
      } else {
        obj[canon] = v == null ? '' : v;
      }
    });
    normalizedRows.push(obj);
  });

  // 选择展示列(优先常见字段)
  const displayHeaders = ['isbn', 'title', 'author', 'publisher', 'rating', 'readStatus']
    .filter(h => canonicalHeaders.includes(h));
  const finalHeaders = displayHeaders.length > 0 ? displayHeaders : canonicalHeaders.slice(0, 6);
  previewHeaders.value = finalHeaders;
  previewRows.value = normalizedRows.slice(0, 3);
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
  // 清除整库恢复状态
  restoreInProgress.value = false;
  restoreProgress.value = 0;
  restoreProgressText.value = '';
  restoreResult.value = null;
};

/**
 * 确认执行整库恢复
 * 上传 ZIP 到 /api/backup/library/restore,由后端完成文件替换和重启
 */
const confirmFullLibraryRestore = async () => {
  if (!selectedFile.value) {
    alert('请先选择文件');
    return;
  }
  if (!zipValidationResult.value?.isFullLibraryBackup) {
    alert('当前文件不是整库备份格式');
    return;
  }
  if (!confirm('⚠️ 整库恢复会覆盖当前所有数据,且不可撤销!确定要继续吗?')) {
    return;
  }

  restoreInProgress.value = true;
  restoreResult.value = null;
  restoreProgress.value = 0;
  restoreProgressText.value = '准备中...';

  try {
    const result = await importService.restoreLibrary(
      selectedFile.value,
      (msg, percent) => {
        restoreProgressText.value = msg;
        restoreProgress.value = percent;
      }
    );
    restoreResult.value = result;
    if (result.success) {
      restoreProgress.value = 100;
      restoreProgressText.value = '恢复完成!后端即将自动重启...';
      // 5 秒后自动尝试刷新页面(让用户看到后端重启完成)
      setTimeout(() => {
        // 尝试自动重连(若后端已重启好)
        fetch('/api/health', { method: 'GET' })
          .then(r => {
            if (r.ok) {
              console.log('✅ 后端已重启,自动刷新页面');
              window.location.reload();
            }
          })
          .catch(() => {
            // 后端还在重启中,5 秒后再试
            console.log('⏳ 后端还在重启,稍后重试...');
          });
      }, 5000);
    } else {
      restoreProgressText.value = '恢复失败,请查看下方错误信息';
    }
  } catch (e) {
    restoreResult.value = {
      success: false,
      message: '恢复过程出错: ' + ((e as Error)?.message || String(e))
    };
    restoreProgressText.value = '恢复失败';
  } finally {
    restoreInProgress.value = false;
  }
};

/**
 * 刷新当前页面
 */
const reloadPage = () => {
  window.location.reload();
};

// 确认导入
const confirmImport = async () => {
  if (!selectedFile.value) {
    return;
  }

  // ZIP 走原流程(整库已有自己的元数据校验)
  if (isZipFile.value) {
    const message = `确定要导入 ZIP 文件吗？\n包含 ${zipValidationResult.value?.metadata?.books || 0} 本书籍`;
    if (!confirm(message)) return;

    isImporting.value = true;
    importResult.value = null;
    importProgress.value = { percent: 0, phase: 'parsing', message: '读取 ZIP 文件...' };
    try {
      const options: ImportOptions = {
        format: 'zip',
        skipDuplicates: importOptions.value.skipDuplicates,
        updateExisting: importOptions.value.updateExisting,
        fieldMapping: fieldMapping.value
      };
      const result = await importService.importFromFile(
        selectedFile.value,
        options,
        (p) => { importProgress.value = p; }
      );
      importResult.value = result;
    } catch (e) {
      importResult.value = {
        success: false, total: 0, imported: 0, skipped: 0,
        errors: [{ row: 0, message: (e as Error).message }], warnings: []
      };
    } finally {
      isImporting.value = false;
    }
    return;
  }

  // 非 ZIP: 先解析 + ISBN 重复预检,与 ISBN 扫描走相同流程
  isImporting.value = true;
  importResult.value = null;
  importProgress.value = { percent: 0, phase: 'parsing', message: '解析文件中...' };

  try {
    const parsed = await importService.parseFileOnly(selectedFile.value, importFormat.value);
    if (!parsed || parsed.length === 0) {
      importResult.value = {
        success: false, total: 0, imported: 0, skipped: 0,
        errors: [{ row: 0, message: '文件中没有可导入的书籍数据' }], warnings: []
      };
      isImporting.value = false;
      return;
    }

    // ISBN 重复预检(与 BatchScanner 一致)
    const isbnList = parsed.map(b => (b?.isbn || '').toString()).filter(Boolean);
    const dupMap = await bookService.findDuplicates(isbnList);
    const dupIsbnSet = new Set<string>();
    const seenIds = new Set<number>();
    const dupListAll: any[] = [];
    for (const k of Object.keys(dupMap)) {
      for (const d of dupMap[k]) {
        if (!seenIds.has(d.id)) { seenIds.add(d.id); dupListAll.push(d); }
        dupIsbnSet.add(k);
      }
    }

    let booksToImport = parsed;

    if (dupListAll.length > 0) {
      // 触发用户决策
      incomingDuplicateBooks.value = parsed
        .filter(b => dupIsbnSet.has(normalizeIsbn(b.isbn || '')))
        .map(b => ({ isbn: normalizeIsbn(b.isbn || ''), title: b.title || '（无标题）' }));

      const choice = await new Promise<any>((resolve) => {
        duplicateDialogMode.value = 'batch-summary';
        duplicateList.value = dupListAll;
        batchDupStats.value = { totalCount: parsed.length, duplicateCount: dupIsbnSet.size };
        pendingDuplicateResolver = (r) => {
          duplicateDialogVisible.value = false;
          incomingDuplicateBooks.value = [];
          currentBookTitle.value = undefined;
          pendingDuplicateResolver = null;
          resolve(r);
        };
        duplicateDialogVisible.value = true;
      });

      if (choice === 'view' || choice === 'cancel') {
        isImporting.value = false;
        return;
      }
      if (choice === 'skip-all') {
        booksToImport = parsed.filter(b => !dupIsbnSet.has(normalizeIsbn(b.isbn || '')));
        if (booksToImport.length === 0) {
          importResult.value = {
            success: true, total: parsed.length, imported: 0, skipped: parsed.length,
            errors: [], warnings: [`所有 ${parsed.length} 本书 ISBN 已存在,已全部跳过`]
          };
          isImporting.value = false;
          return;
        }
      } else if (choice === 'review-one-by-one') {
        const perBookDecisions = new Map<string, boolean>();
        for (const book of parsed) {
          const nk = normalizeIsbn(book.isbn || '');
          const list = dupMap[nk];
          if (!list || list.length === 0) {
            perBookDecisions.set(nk, true);
            continue;
          }
          currentBookTitle.value = book.title || '（无标题）';
          const c = await new Promise<any>((resolve) => {
            duplicateDialogMode.value = 'single';
            duplicateList.value = list;
            batchDupStats.value = null;
            pendingDuplicateResolver = (r) => {
              duplicateDialogVisible.value = false;
              currentBookTitle.value = undefined;
              pendingDuplicateResolver = null;
              resolve(r);
            };
            duplicateDialogVisible.value = true;
          });
          perBookDecisions.set(nk, !(c === 'view' || c === 'cancel'));
        }
        booksToImport = parsed.filter(b => perBookDecisions.get(normalizeIsbn(b.isbn || '')) === true);
        if (booksToImport.length === 0) {
          importResult.value = {
            success: true, total: parsed.length, imported: 0, skipped: parsed.length,
            errors: [], warnings: ['所有重复书籍已跳过']
          };
          isImporting.value = false;
          return;
        }
      }
      // 'continue-all' / 'continue' 走原循环,booksToImport 保持不变
    }

    // 调用导入服务(重复项已在前置处理,这里关闭 skipDuplicates 避免二次判断)
    const result = await importService.importParsedBooks(
      booksToImport,
      {
        format: importFormat.value,
        skipDuplicates: false,
        updateExisting: importOptions.value.updateExisting,
        fieldMapping: fieldMapping.value
      },
      (p) => { importProgress.value = p; }
    );
    importResult.value = result;
  } catch (e) {
    console.error('导入失败:', e);
    importResult.value = {
      success: false, total: 0, imported: 0, skipped: 0,
      errors: [{ row: 0, message: (e as Error).message }], warnings: []
    };
  } finally {
    isImporting.value = false;
  }
};

// 重复弹窗事件处理
const onDupCancel = () => { pendingDuplicateResolver?.('cancel'); };
const onDupContinue = () => { pendingDuplicateResolver?.('continue'); };
const onDupViewExisting = (id: number) => {
  // 打开书籍详情(通过 router)
  router.push({ path: '/book/detail', query: { id: String(id) } });
  pendingDuplicateResolver?.('view');
};
const onDupSkipAll = () => { pendingDuplicateResolver?.('skip-all'); };
const onDupContinueAll = () => { pendingDuplicateResolver?.('continue-all'); };
const onDupReviewOneByOne = () => { pendingDuplicateResolver?.('review-one-by-one'); };

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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-primary, #333);
  transition: background-color 0.2s ease;
  padding: 0;
}

.back-btn:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
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

/* ===== 整库备份专属样式 ===== */
.section-card--fullbackup {
  border-left: 4px solid #ff9800;
  background: linear-gradient(135deg, #fffbf0 0%, #fff 100%);
}
.fullbackup-warn {
  display: flex;
  gap: 12px;
  background: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 1rem;
}
.fullbackup-warn .warn-icon {
  font-size: 24px;
  flex-shrink: 0;
}
.fullbackup-warn .warn-title {
  font-weight: 600;
  color: #e65100;
  margin: 0 0 4px 0;
  font-size: 15px;
}
.fullbackup-warn .warn-desc {
  color: #5d4037;
  margin: 4px 0 0 0;
  font-size: 13px;
  line-height: 1.6;
}
.fullbackup-contents {
  margin: 1.25rem 0;
}
.contents-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
  color: #555;
  line-height: 1.8;
}
.fullbackup-progress {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin: 1rem 0;
}
.progress-bar-wrap {
  width: 100%;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}
.progress-text {
  color: #666;
  font-size: 13px;
  margin: 0;
}
.fullbackup-success {
  display: flex;
  gap: 16px;
  background: #e8f5e9;
  border: 1px solid #66bb6a;
  border-radius: 8px;
  padding: 16px;
  margin: 1rem 0;
}
.fullbackup-success .success-icon {
  font-size: 40px;
  flex-shrink: 0;
}
.fullbackup-success h3 {
  color: #2e7d32;
  margin: 0 0 8px 0;
}
.fullbackup-success p {
  color: #1b5e20;
  margin: 4px 0;
}
.fullbackup-success .success-tip {
  color: #2e7d32;
  font-size: 13px;
  margin-top: 8px;
}
.fullbackup-failed {
  display: flex;
  gap: 16px;
  background: #ffebee;
  border: 1px solid #ef5350;
  border-radius: 8px;
  padding: 16px;
  margin: 1rem 0;
}
.fullbackup-failed .failed-icon {
  font-size: 40px;
  flex-shrink: 0;
}
.fullbackup-failed h3 {
  color: #c62828;
  margin: 0 0 8px 0;
}
.fullbackup-failed p {
  color: #b71c1c;
  margin: 4px 0;
}
.backup-icon {
  font-size: 1.3rem;
  margin-right: 6px;
}
.btn-danger {
  background: linear-gradient(135deg, #ff7043 0%, #f4511e 100%) !important;
  color: white !important;
  border: none !important;
}
.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #f4511e 0%, #d84315 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
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

/* 格式示例下载 */
.template-section {
  margin-top: 1.25rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0f9f1 0%, #f8fdf8 100%);
  border: 1px dashed #81c784;
  border-radius: 8px;
}
.template-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #2e7d32;
  font-weight: 500;
  font-size: 0.9rem;
}
.template-icon { font-size: 1.1rem; }
.template-title { font-weight: 600; }
.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.template-hint {
  margin-top: 0.5rem;
  padding: 0.6rem 0.9rem;
  background: #e3f2fd;
  border-left: 3px solid #2196F3;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #1565c0;
  line-height: 1.6;
}
.template-hint .inline-link {
  color: #1976d2;
  font-weight: 600;
  text-decoration: underline;
  margin: 0 2px;
}
.template-hint .inline-link:hover {
  color: #0d47a1;
}
.template-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  color: #2e7d32;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.template-btn:hover:not(:disabled) {
  background: #4CAF50;
  border-color: #4CAF50;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}
.template-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.template-btn-icon { font-size: 1rem; }
.template-fields {
  margin-top: 0.5rem;
}
.template-fields-toggle {
  cursor: pointer;
  color: #558b2f;
  font-size: 0.82rem;
  user-select: none;
  padding: 0.25rem 0;
}
.template-fields-toggle:hover { color: #2e7d32; }
.template-fields-content {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e8f5e9;
  border-radius: 6px;
  font-size: 0.8rem;
}
.template-fields-note {
  margin: 0 0 0.5rem;
  color: #555;
  line-height: 1.5;
}
.template-fields-note code {
  background: #f1f8e9;
  padding: 0 0.25rem;
  border-radius: 3px;
  color: #33691e;
  font-family: ui-monospace, monospace;
}
.field-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.field-table th,
.field-table td {
  padding: 0.35rem 0.5rem;
  border: 1px solid #e0e0e0;
  text-align: left;
  vertical-align: top;
}
.field-table th {
  background: #f1f8e9;
  color: #33691e;
  font-weight: 600;
}
.field-table td {
  color: #333;
}
.field-table td:first-child {
  font-weight: 500;
  color: #2e7d32;
}
.field-table tr:hover {
  background: #f9fbe7;
}
.required-mark {
  color: #e53935;
  font-weight: 700;
  margin-left: 2px;
}
.required-yes {
  color: #c62828;
  font-weight: 600;
  background: #ffebee;
  text-align: center;
  border-radius: 3px;
}
.required-no {
  color: #999;
  text-align: center;
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

/* 进度条 */
.progress-bar-wrapper {
  margin: 1.25rem 0 0.5rem;
}
.progress-bar {
  width: 100%;
  height: 10px;
  background-color: #e8f5e9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #c8e6c9;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #66bb6a 0%, #4CAF50 100%);
  border-radius: 6px;
  transition: width 0.25s ease;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}
.progress-bar-label {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2e7d32;
}
.progress-status {
  margin: 0.75rem 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  font-variant-numeric: tabular-nums;
}
.progress-stats {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #666;
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
