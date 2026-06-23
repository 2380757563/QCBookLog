<template>
  <div class="edit-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">{{ isEdit ? '编辑书籍' : '添加书籍' }}</h1>
      <button class="save-btn" @click="handleSave" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <!-- 表单内容 -->
    <div class="form-content">
      <!-- 封面上传 -->
      <div class="cover-section">
        <div class="cover-preview" @click="triggerCoverUpload">
          <img v-if="form.coverUrl" :src="form.coverUrl" alt="封面" />
          <div v-else class="cover-placeholder">
            <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            <span>点击上传封面</span>
          </div>
        </div>
        <input type="file" ref="coverInput" accept="image/*" @change="handleCoverChange" hidden />
        <div class="isbn-scan">
          <input 
            v-model="isbnInput" 
            class="isbn-input"
            placeholder="输入或填入ISBN获取/更新信息"
          />
          <button class="scan-btn" @click="fetchBookByISBN" :disabled="fetching">
            {{ fetching ? '获取中...' : '获取' }}
          </button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        
        <div class="form-item">
          <label class="form-label required">书名</label>
          <input v-model="form.title" class="form-input" placeholder="请输入书名" />
        </div>

        <div class="form-item">
          <label class="form-label required">作者</label>
          <input v-model="form.author" class="form-input" placeholder="请输入作者" />
        </div>

        <div class="form-item">
          <label class="form-label required">ISBN</label>
          <input v-model="form.isbn" class="form-input" placeholder="请输入ISBN" />
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">出版社</label>
            <input v-model="form.publisher" class="form-input" placeholder="出版社" />
          </div>
          <div class="form-item">
            <label class="form-label">出版年份</label>
            <input v-model.number="form.publishYear" type="number" class="form-input" placeholder="年份" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">页数</label>
            <input v-model.number="form.pages" type="number" class="form-input" placeholder="页数" />
          </div>
          <div class="form-item">
            <label class="form-label">书籍载体类型</label>
            <select v-model="form.book_type" class="form-select">
              <option value="0">电子书</option>
              <option value="1">实体书</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">装帧</label>
            <select v-model.number="form.binding1" class="form-select" @change="resetBinding2">
              <option :value="0">电子书</option>
              <option :value="1">平装</option>
              <option :value="2">精装</option>
              <option :value="3">特殊装帧</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">细分类型</label>
            <select v-model.number="form.binding2" class="form-select">
              <option v-for="option in currentBinding2Options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">纸张</label>
            <select v-model.number="form.paper1" class="form-select">
              <option :value="0">未指定（默认）</option>
              <option :value="1">胶版纸（双胶纸）</option>
              <option :value="2">轻型纸</option>
              <option :value="3">道林纸</option>
              <option :value="4">铜版纸</option>
              <option :value="5">牛皮纸</option>
              <option :value="6">宣纸</option>
              <option :value="7">进口特种纸</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">刷边位置</label>
            <select v-model.number="form.edge1" class="form-select" @change="resetEdge2">
              <option :value="0">无刷边（默认）</option>
              <option :value="1">书口单侧</option>
              <option :value="2">多侧（书口+天头/地脚）</option>
              <option :value="3">全三边</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">刷边工艺</label>
            <select v-model.number="form.edge2" class="form-select" :disabled="form.edge1 === 0">
              <option v-for="option in currentEdge2Options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="form-item">
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">丛书系列</label>
          <input v-model="form.series" class="form-input" placeholder="所属丛书系列" />
        </div>

        <div class="form-item">
          <label class="form-label">书籍来源</label>
          <div class="source-display">
            <span v-if="form.source" class="source-badge">{{ getSourceLabel(form.source) }}</span>
            <input
              v-else
              v-model="form.source"
              class="form-input"
              placeholder="例如：douban / dbr / google / manual"
            />
            <small v-if="form.source" class="source-hint">已自动记录来源：{{ form.source }}</small>
          </div>
        </div>
      </div>

      <!-- 阅读信息 -->
      <div class="form-section">
        <h3 class="section-title">阅读信息</h3>
        
        <div class="form-item">
          <label class="form-label">阅读状态</label>
          <div class="status-options">
            <span
              v-for="status in readStatusOptions"
              :key="status.value"
              :class="['status-option', { active: form.readStatus === status.value }]"
              @click="toggleReadStatus(status.value)"
            >
              <span class="status-icon">{{ status.icon }}</span>
              <span>{{ status.label }}</span>
            </span>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">喜欢/待读</label>
          <div class="status-options">
            <span
              :class="['status-option', { active: form.favorite === 1 }]"
              @click="toggleFavorite"
            >
              <span class="status-icon">{{ form.favorite === 1 ? '❤️' : '🤍' }}</span>
              <span>喜欢</span>
            </span>
            <span
              :class="['status-option', { active: form.wants === 1 }]"
              @click="toggleWants"
            >
              <span class="status-icon">{{ form.wants === 1 ? '📚' : '📖' }}</span>
              <span>待读</span>
            </span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">评分（豆瓣）</label>
            <div class="rating-container">
              <div class="rating-stars-half">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="rating-star-half"
                  :class="{
                    'full': (form.rating || 0) >= i * 2,
                    'half': (form.rating || 0) >= i * 2 - 1 && (form.rating || 0) < i * 2
                  }"
                  @click="handleDoubanRatingClick($event, i)"
                >★</span>
              </div>
              <input 
                type="number" 
                v-model.number="doubanRatingInput" 
                class="form-input douban-rating-input"
                min="0" 
                max="10" 
                step="0.5"
                placeholder="0-10"
                @input="handleDoubanRatingInput"
              />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">个人评分</label>
            <div class="personal-rating-container">
              <div class="rating-stars-half">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="rating-star-half personal"
                  :class="{
                    'full': (form.personal_rating || 0) >= i * 2,
                    'half': (form.personal_rating || 0) >= i * 2 - 1 && (form.personal_rating || 0) < i * 2
                  }"
                  @click="handlePersonalRatingClick($event, i)"
                >★</span>
              </div>
              <input 
                type="number" 
                v-model.number="personalRatingInput" 
                class="form-input personal-rating-input"
                min="0.1" 
                max="10.0" 
                step="0.5"
                placeholder="0.1-10.0"
                @input="handlePersonalRatingInput"
              />
            </div>
          </div>
        </div>

        <div v-if="form.readStatus === '已读'" class="form-row">
          <div class="form-item">
            <label class="form-label">完成日期</label>
            <input type="date" v-model="form.readCompleteDate" class="form-input" />
          </div>
        </div>
      </div>

      <!-- 阅读进度控制 -->
      <div v-if="isEdit && form.id" class="form-section">
        <h3 class="section-title">阅读进度</h3>
        
        <div class="form-item">
          <label class="form-label">阅读进度</label>
          <ReadingProgressBar
            :value="readingProgress"
            :totalPages="form.pages || 0"
            :showInput="true"
            @update:value="handleProgressUpdate"
          />
        </div>

        <div class="form-item">
          <label class="form-label">阅读统计</label>
          <button class="toggle-stats-btn" @click="showReadingStats = !showReadingStats">
            {{ showReadingStats ? '隐藏统计' : '显示统计' }}
          </button>
        </div>

        <ReadingStatsCard
          v-if="showReadingStats && readingStats"
          :totalReadingTime="readingStats.totalReadingTime"
          :totalPages="readingStats.readPages"
          :totalBookPages="form.pages || 0"
          :readingCount="readingStats.readingCount"
          :lastReadDate="readingStats.lastReadDate"
          :lastReadDuration="readingStats.lastReadDuration"
          @viewRecords="handleViewRecords"
        />
      </div>

      <!-- 购买信息 -->
      <div class="form-section">
        <h3 class="section-title">购买信息</h3>
        
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">购买日期</label>
            <input type="date" v-model="form.purchaseDate" class="form-input" />
          </div>
          <div class="form-item">
            <label class="form-label">购买价格</label>
            <input v-model.number="form.purchasePrice" type="number" step="0.01" class="form-input" placeholder="元" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">标准价格</label>
            <input v-model.number="form.standardPrice" type="number" step="0.01" class="form-input" placeholder="元" />
          </div>
        </div>
      </div>

      <!-- 分组 -->
      <div class="form-section">
        <h3 class="section-title">分组</h3>

        <div class="form-item">
          <label class="form-label">分组</label>
          <div class="tags-container">
            <span
              v-for="group in allGroups"
              :key="group.id"
              :class="['tag-item', { active: form.groups.includes(group.id) }]"
              @click="toggleGroup(group.id)"
            >
              {{ group.name }}
            </span>
            <span v-if="allGroups.length === 0" class="no-tags">暂无分组</span>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="form-section">
        <h3 class="section-title">标签</h3>

        <div class="form-item">
          <label class="form-label">标签</label>
          
          <!-- 已选标签展示 -->
          <div class="tags-container" v-if="form.calibreTags && form.calibreTags.length > 0">
            <span
              v-for="(tag, index) in form.calibreTags"
              :key="index"
              class="tag-item active"
            >
              {{ tag }}
              <span class="tag-remove" @click="removeTag(index)">×</span>
            </span>
          </div>
          <div v-else class="no-tags">暂无标签</div>

          <!-- 标签输入 -->
          <div class="tag-input-container">
            <input
              v-model="calibreTagInput"
              class="tag-input"
              placeholder="输入标签名称，按回车添加"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <button
              v-if="calibreTagInput.trim()"
              class="tag-add-btn"
              @click="addTag"
            >
              添加
            </button>
          </div>

          <!-- 标签推荐 -->
          <div v-if="filteredTags.length > 0 && calibreTagInput.trim()" class="tag-suggestions">
            <span
              v-for="tag in filteredTags.slice(0, 5)"
              :key="tag"
              class="tag-suggestion"
              @click="selectTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 书籍简介 -->
      <div class="form-section">
        <h3 class="section-title">书籍简介</h3>
        <div class="form-item">
          <textarea 
            v-model="form.description" 
            class="form-textarea" 
            placeholder="添加书籍简介..."
            rows="6"
          ></textarea>
        </div>
      </div>

      <!-- 备注 -->
      <div class="form-section">
        <h3 class="section-title">备注</h3>
        <div class="form-item">
          <textarea
            v-model="form.note"
            class="form-textarea"
            placeholder="添加书籍备注..."
            rows="4"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 阅读记录弹窗 -->
    <div v-if="showReadingRecords" class="reading-records-modal" @click.self="closeReadingRecords">
      <div class="reading-records-dialog">
        <div class="reading-records-header">
          <h3 class="reading-records-title">阅读记录</h3>
          <button class="reading-records-close" @click="closeReadingRecords" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="reading-records-body">
          <div v-if="loadingReadingRecords" class="reading-records-loading">加载中...</div>
          <div v-else-if="!readingRecords.length" class="reading-records-empty">暂无阅读记录</div>
          <ul v-else class="reading-records-list">
            <li v-for="record in readingRecords" :key="record.id || record.startTime" class="reading-record-item">
              <div class="reading-record-date">{{ formatRecordDate(record.startTime) }}</div>
              <div class="reading-record-meta">
                <span class="reading-record-time">{{ formatRecordTimeRange(record.startTime, record.endTime) }}</span>
                <span v-if="record.duration" class="reading-record-duration">时长 {{ formatRecordDuration(record.duration) }}</span>
                <span v-if="record.startPage != null || record.endPage != null" class="reading-record-pages">
                  第 {{ record.startPage || 0 }} - {{ record.endPage || 0 }} 页
                  <template v-if="record.pagesRead">(共 {{ record.pagesRead }} 页)</template>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ISBN 多源获取对话框 -->
    <div v-if="showIsbnFetchDialog" class="isbn-fetch-dialog" @click.self="closeIsbnFetchDialog">
      <div class="isbn-fetch-content">
        <div class="dialog-header">
          <h3 class="dialog-title">📚 选择书源</h3>
          <span class="dialog-isbn">ISBN: {{ isbnCurrentIsbn }}</span>
          <button class="dialog-close" @click="closeIsbnFetchDialog" aria-label="关闭">✕</button>
        </div>

        <div class="dialog-body">
          <!-- 加载中 -->
          <div v-if="isbnFetchLoading" class="loading-state">
            <div class="spinner"></div>
            <p>正在从多个书源获取书籍信息...</p>
          </div>

          <!-- 错误提示 -->
          <div v-if="isbnFetchError && !isbnFetchLoading" class="error-state">
            <p>❌ {{ isbnFetchError }}</p>
          </div>

          <!-- 书源列表 -->
          <div v-if="!isbnFetchLoading" class="source-list">
            <div
              v-for="(config, key) in API_CONFIGS"
              :key="key"
              :class="[
                'source-item',
                {
                  'selected': isbnFetchSelectedSource === key,
                  'disabled': !isbnFetchResults[key]
                }
              ]"
              @click="isbnFetchResults[key] && (isbnFetchSelectedSource = key)"
            >
              <div class="source-radio">
                <input
                  type="radio"
                  :id="`isbn-source-${key}`"
                  :value="key"
                  v-model="isbnFetchSelectedSource"
                  :disabled="!isbnFetchResults[key]"
                />
                <label :for="`isbn-source-${key}`">
                  <span class="source-name">{{ config.name }}</span>
                  <span v-if="isbnFetchResults[key]" class="source-status success">✓</span>
                  <span v-else class="source-status empty">无数据</span>
                </label>
              </div>
              <div class="source-badges">
                <span v-if="config.isFree" class="badge free">免费</span>
                <span v-else class="badge paid">计费</span>
              </div>
            </div>
          </div>

          <!-- 数据预览 -->
          <div
            v-if="isbnFetchSelectedSource && isbnFetchResults[isbnFetchSelectedSource] && !isbnFetchLoading"
            class="preview-section"
          >
            <h4 class="preview-title">
              数据预览 · {{ getApiSourceLabel(isbnFetchSelectedSource) }}
            </h4>
            <div class="preview-content">
              <div
                v-if="isbnFetchResults[isbnFetchSelectedSource]?.coverUrl"
                class="preview-cover"
              >
                <img
                  :src="isbnFetchResults[isbnFetchSelectedSource]!.coverUrl"
                  alt="封面"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
              </div>
              <div class="preview-info">
                <div class="info-row">
                  <span class="info-label">书名:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.title || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">作者:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.author || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">出版社:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.publisher || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">出版年:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.publishYear || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">页数:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.pages || '无' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">装帧:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.binding || '无' }}</span>
                </div>
                <div v-if="isbnFetchResults[isbnFetchSelectedSource]?.rating" class="info-row">
                  <span class="info-label">评分:</span>
                  <span class="info-value rating">{{ isbnFetchResults[isbnFetchSelectedSource]?.rating?.toFixed(1) }}</span>
                </div>
                <div v-if="isbnFetchResults[isbnFetchSelectedSource]?.price" class="info-row">
                  <span class="info-label">价格:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.price }}</span>
                </div>
                <div v-if="isbnFetchResults[isbnFetchSelectedSource]?.series" class="info-row">
                  <span class="info-label">丛书:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.series }}</span>
                </div>
                <div
                  v-if="isbnFetchResults[isbnFetchSelectedSource]?.tags && isbnFetchResults[isbnFetchSelectedSource]?.tags && isbnFetchResults[isbnFetchSelectedSource]!.tags!.length > 0"
                  class="info-row"
                >
                  <span class="info-label">标签:</span>
                  <span class="info-value">{{ isbnFetchResults[isbnFetchSelectedSource]?.tags!.join(', ') }}</span>
                </div>
                <div
                  v-if="isbnFetchResults[isbnFetchSelectedSource]?.description"
                  class="info-row description-row"
                >
                  <span class="info-label">简介:</span>
                  <p class="description-text">{{ isbnFetchResults[isbnFetchSelectedSource]?.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 探数 API 重试 -->
          <div
            v-if="!isbnFetchLoading && !isbnFetchResults.tanshu && (isbnFetchError || (!isbnFetchResults.dbr && !isbnFetchResults.douban && !isbnFetchResults.isbnWork))"
            class="retry-paid-section"
          >
            <p class="hint-text">💡 免费书源未找到书籍信息</p>
            <p class="hint-subtext">您可以尝试使用探数图书 API（计费服务）</p>
            <button class="tanshu-btn" @click="tryTanshuInDialog" :disabled="isbnFetchLoading">
              {{ isbnFetchLoading ? '正在尝试...' : '尝试探数图书' }}
            </button>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="dialog-btn cancel-btn" @click="closeIsbnFetchDialog">取消</button>
          <button
            class="dialog-btn apply-btn"
            @click="applyIsbnFetchResult"
            :disabled="!isbnFetchSelectedSource || !isbnFetchResults[isbnFetchSelectedSource]"
          >
            应用此书源
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookStore } from '@/store/book';
import { useReaderStore } from '@/store/reader';
import { useReadingStore } from '@/store/reading';
import { bookService } from '@/services/book';
import readingTrackingService from '@/services/readingTracking';
import activityService from '@/services/activity';
import type { Book, BookGroup, Tag } from '@/services/book/types';
import { searchBookByISBN, searchBookByISBNWithSource, isbnCacheUtils } from '@/services/common/isbnApi';
import { API_CONFIGS } from '@/services/common/isbnApi/apiConfig';
import type { BookSearchResult } from '@/services/common/isbnApi/types';
import ReadingProgressBar from '@/components/ReadingProgressBar/ReadingProgressBar.vue';
import ReadingStatsCard from '@/components/ReadingStatsCard/ReadingStatsCard.vue';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();
const readerStore = useReaderStore();
const readingStore = useReadingStore();

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const fetching = ref(false);
const isbnInput = ref('');
const coverInput = ref<HTMLInputElement | null>(null);
const calibreTagInput = ref('');
const allGroups = ref<BookGroup[]>([]);
const allTags = ref<string[]>([]);

// ISBN 多源获取对话框
const showIsbnFetchDialog = ref(false);
const isbnFetchLoading = ref(false);
const isbnFetchError = ref('');
const isbnFetchResults = ref<Record<string, BookSearchResult | null>>({
  dbr: null,
  douban: null,
  isbnWork: null,
  tanshu: null
});
const isbnFetchSelectedSource = ref<string>('');
const isbnCurrentIsbn = ref<string>(''); // 当前正在查询的 ISBN

// 阅读进度相关
const readingProgress = ref(0);
const originalReadingProgress = ref(0); // 原始阅读进度（用于比较是否变化）
const readingStats = ref<any>(null);
const showReadingStats = ref(false);

// 原始阅读状态（用于比较是否变化）
const originalReadStatus = ref<string>('未读');

// 表单数据
const form = reactive<Omit<Book, 'id' | 'createTime' | 'updateTime'> & { id?: string }>({
  isbn: '',
  title: '',
  author: '',
  publisher: '',
  publishYear: undefined,
  pages: undefined,
  binding1: 1, // 默认平装（实体书）
  binding2: 0,
  paper1: 0, // 默认未指定
  edge1: 0, // 默认无刷边
  edge2: 0, // 默认无细分
  book_type: 1, // 默认实体书
  coverUrl: '',
  purchaseDate: '', // 空字符串表示未选择日期
  purchasePrice: undefined,
  standardPrice: undefined,
  readStatus: '未读',
  readCompleteDate: undefined,
  rating: undefined,
  personal_rating: 0,
  personal_rating_date: null,
  tags: [],
  groups: [],
  series: '',
  calibreTags: [],
  note: '',
  description: '',
  favorite: 0,
  favorite_date: null,
  wants: 0,
  wants_date: null,
  source: ''
});

// 阅读状态选项
const readStatusOptions: { value: '未读' | '在读' | '已读'; label: string; icon: string }[] = [
  { value: '未读', label: '未读', icon: '📕' },
  { value: '在读', label: '在读', icon: '📖' },
  { value: '已读', label: '已读', icon: '✅' }
];

const binding1Options = [
  { value: 0, label: '电子书' },
  { value: 1, label: '平装' },
  { value: 2, label: '精装' },
  { value: 3, label: '特殊装帧' }
];

const binding2OptionsMap: Record<number, { value: number; label: string }[]> = {
  0: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '精校版' },
    { value: 2, label: '魔改版' },
    { value: 3, label: '原版' }
  ],
  1: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '无线胶装（胶装）' },
    { value: 2, label: '骑马钉装订' },
    { value: 3, label: '活页装订' },
    { value: 4, label: '锁线胶装（线胶装）' }
  ],
  2: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '硬壳精装（圆脊）' },
    { value: 2, label: '硬壳精装（方脊）' },
    { value: 3, label: '布面精装' },
    { value: 4, label: 'PU 皮面精装' },
    { value: 5, label: '真皮精装（头层牛皮）' },
    { value: 6, label: '真皮精装（羊皮）' },
    { value: 7, label: '仿皮（人造革）精装' }
  ],
  3: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '线装' },
    { value: 2, label: '经折装' }
  ]
};

const currentBinding2Options = computed(() => {
  return binding2OptionsMap[form.binding1 || 0] || binding2OptionsMap[0];
});

const resetBinding2 = () => {
  form.binding2 = 0;
};

const paper1Options = [
  { value: 0, label: '未指定（默认）' },
  { value: 1, label: '胶版纸（双胶纸）' },
  { value: 2, label: '轻型纸' },
  { value: 3, label: '道林纸' },
  { value: 4, label: '铜版纸' },
  { value: 5, label: '牛皮纸' },
  { value: 6, label: '宣纸' },
  { value: 7, label: '进口特种纸' }
];

const edge2OptionsMap: Record<number, { value: number; label: string }[]> = {
  0: [
    { value: 0, label: '无细分（默认）' }
  ],
  1: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '基础单色' },
    { value: 2, label: '烫边（烫金/银）' },
    { value: 3, label: '磨边（毛边）' },
    { value: 4, label: '彩绘艺术刷边' },
    { value: 5, label: '鎏金高端刷边' }
  ],
  2: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '基础单色' },
    { value: 2, label: '烫边（烫金/银）' },
    { value: 3, label: '磨边（毛边）' },
    { value: 4, label: '彩绘艺术刷边' },
    { value: 5, label: '鎏金高端刷边' }
  ],
  3: [
    { value: 0, label: '无细分（默认）' },
    { value: 1, label: '基础单色' },
    { value: 2, label: '烫边（烫金/银）' },
    { value: 3, label: '磨边（毛边）' },
    { value: 4, label: '彩绘艺术刷边' },
    { value: 5, label: '鎏金高端刷边' }
  ]
};

const currentEdge2Options = computed(() => {
  return edge2OptionsMap[form.edge1 || 0] || edge2OptionsMap[0];
});

const resetEdge2 = () => {
  form.edge2 = 0;
};

// 返回
const goBack = () => {
  router.back();
};

// 触发封面上传
const triggerCoverUpload = () => {
  coverInput.value?.click();
};

// 处理封面上传
const handleCoverChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      form.coverUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

// 将 API 返回的 source 字符串标准化为 key
const normalizeSourceKey = (source: string): string => {
  if (!source) return '';
  const s = source.toLowerCase();
  if (s.includes('dbr')) return 'dbr';
  if (s.includes('豆瓣') || s.includes('douban')) return 'douban';
  if (s.includes('公共') || s.includes('isbnwork') || s.includes('isbn_work') || s.includes('isbn-work')) return 'isbnWork';
  if (s.includes('探数') || s.includes('tanshu')) return 'tanshu';
  return s;
};

// 获取书源显示名称
const getApiSourceLabel = (key: string): string => {
  return API_CONFIGS[key]?.name || key;
};

// 通过ISBN获取书籍信息（多源选择流程）
const fetchBookByISBN = async () => {
  const isbn = isbnInput.value.trim();
  if (!isbn) return;

  // 初始化弹窗状态
  isbnCurrentIsbn.value = isbn;
  isbnFetchError.value = '';
  isbnFetchResults.value = { dbr: null, douban: null, isbnWork: null, tanshu: null };
  isbnFetchSelectedSource.value = '';
  showIsbnFetchDialog.value = true;
  fetching.value = true;
  isbnFetchLoading.value = true;

  try {
    // 清除该ISBN的缓存，确保获取最新数据
    if (isbnCacheUtils) {
      isbnCacheUtils.clearByISBN(isbn);
    }

    // 并行调用所有免费书源
    const searchResults = await searchBookByISBN(isbn);

    isbnFetchResults.value.dbr = searchResults.dbr;
    isbnFetchResults.value.douban = searchResults.douban;
    isbnFetchResults.value.isbnWork = searchResults.isbnWork;
    // 探数 API 不自动调用，等待用户主动点击

    // 根据最佳结果默认选中
    if (searchResults.bestResult) {
      isbnFetchSelectedSource.value = normalizeSourceKey(searchResults.bestResult.source);
    }

    // 检查所有免费书源是否均失败
    if (!searchResults.bestResult) {
      isbnFetchError.value = '所有免费书源均未找到该 ISBN 对应的书籍信息';
    }
  } catch (error) {
    console.error('获取书籍信息失败:', error);
    isbnFetchError.value = '获取书籍信息失败，请重试';
  } finally {
    fetching.value = false;
    isbnFetchLoading.value = false;
  }
};

// 主动尝试探数书源（计费 API）
const tryTanshuInDialog = async () => {
  const isbn = isbnCurrentIsbn.value || isbnInput.value.trim();
  if (!isbn) return;

  if (!confirm('探数图书 API 为计费服务，是否确认调用？\n\n该服务仅在免费 API 无法找到书籍时建议使用。')) {
    return;
  }

  isbnFetchLoading.value = true;
  try {
    const result = await searchBookByISBNWithSource(isbn, 'tanshu');
    if (result) {
      isbnFetchResults.value.tanshu = result;
      isbnFetchSelectedSource.value = 'tanshu';
      isbnFetchError.value = '';
    } else {
      alert('探数图书未找到该 ISBN 对应的书籍信息');
    }
  } catch (error) {
    console.error('探数 API 调用失败:', error);
    alert('探数图书 API 调用失败');
  } finally {
    isbnFetchLoading.value = false;
  }
};

// 将书源数据应用到表单
const applyIsbnFetchResult = () => {
  const sourceKey = isbnFetchSelectedSource.value;
  if (!sourceKey) {
    alert('请先选择一个书源');
    return;
  }

  const bookInfo = isbnFetchResults.value[sourceKey];
  if (!bookInfo) {
    alert('所选书源暂无数据');
    return;
  }

  // 填充表单
  form.isbn = bookInfo.isbn || isbnCurrentIsbn.value;
  form.title = bookInfo.title || '';
  form.author = bookInfo.author || '';
  form.publisher = bookInfo.publisher || '';
  form.publishYear = bookInfo.publishYear;
  form.pages = bookInfo.pages;

  // 根据 API 返回的装帧信息设置 binding1 和 book_type
  if (bookInfo.binding1 !== undefined && bookInfo.binding1 !== null) {
    form.binding1 = bookInfo.binding1;
    form.book_type = bookInfo.book_type !== undefined && bookInfo.book_type !== null
      ? bookInfo.book_type
      : (bookInfo.binding1 === 0 ? 0 : 1);
  } else {
    const bindingText = (bookInfo.binding || '').toLowerCase();
    if (bindingText.includes('平装') || bindingText.includes('paperback') || bindingText.includes('平裝')) {
      form.binding1 = 1;
      form.book_type = 1;
    } else if (bindingText.includes('精装') || bindingText.includes('hardcover') || bindingText.includes('精裝')) {
      form.binding1 = 2;
      form.book_type = 1;
    } else if (bindingText.includes('电子') || bindingText.includes('ebook') || bindingText.includes('电子书')) {
      form.binding1 = 0;
      form.book_type = 0;
    } else {
      form.binding1 = 3;
      form.book_type = 1;
    }
  }

  form.binding2 = bookInfo.binding2 || 0;
  form.coverUrl = bookInfo.coverUrl || '';
  form.description = bookInfo.description || '';

  if (bookInfo.price) {
    form.standardPrice = parseFloat(bookInfo.price.replace(/[^\d.]/g, ''));
  }
  if (bookInfo.rating !== undefined && bookInfo.rating !== null) {
    form.rating = bookInfo.rating;
    doubanRatingInput.value = bookInfo.rating;
  }
  if (bookInfo.series) {
    form.series = bookInfo.series;
  }
  if (bookInfo.tags && bookInfo.tags.length > 0) {
    // 合并而不是覆盖，保留用户已添加的标签
    const existing = form.calibreTags || [];
    const merged = Array.from(new Set([...existing, ...bookInfo.tags]));
    form.calibreTags = merged;
  }

  // 关键：写入书源（标准化为 key）
  form.source = sourceKey;

  // 关闭弹窗
  showIsbnFetchDialog.value = false;
};

// 关闭 ISBN 弹窗
const closeIsbnFetchDialog = () => {
  showIsbnFetchDialog.value = false;
  isbnFetchError.value = '';
  isbnFetchResults.value = { dbr: null, douban: null, isbnWork: null, tanshu: null };
  isbnFetchSelectedSource.value = '';
  isbnCurrentIsbn.value = '';
};

// 切换阅读状态
const toggleReadStatus = (status: '未读' | '在读' | '已读') => {
  form.readStatus = status;
};

const toggleFavorite = () => {
  form.favorite = form.favorite === 1 ? 0 : 1;
  if (form.favorite === 1) {
    form.favorite_date = new Date().toISOString();
  } else {
    form.favorite_date = null;
  }
};

const toggleWants = () => {
  form.wants = form.wants === 1 ? 0 : 1;
  if (form.wants === 1) {
    form.wants_date = new Date().toISOString();
  } else {
    form.wants_date = null;
  }
};

const doubanRatingInput = ref<number | undefined>(undefined);

const handleDoubanRatingInput = () => {
  let value = doubanRatingInput.value;
  if (value !== undefined) {
    if (value < 0) value = 0;
    if (value > 10) value = 10;
    value = Math.round(value * 2) / 2;
    form.rating = value;
    doubanRatingInput.value = value;
  }
};

const handleDoubanRatingClick = (event: MouseEvent, starIndex: number) => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const isHalf = clickX < rect.width / 2;
  
  if (isHalf) {
    form.rating = starIndex * 2 - 1;
  } else {
    form.rating = starIndex * 2;
  }
  doubanRatingInput.value = form.rating;
};

const personalRatingInput = ref<number | undefined>(undefined);

const handlePersonalRatingInput = () => {
  let value = personalRatingInput.value;
  if (value !== undefined) {
    if (value < 0.1) value = 0.1;
    if (value > 10.0) value = 10.0;
    value = Math.round(value * 2) / 2;
    form.personal_rating = value;
    personalRatingInput.value = value;
    form.personal_rating_date = new Date().toISOString();
  }
};

const handlePersonalRatingClick = (event: MouseEvent, starIndex: number) => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const isHalf = clickX < rect.width / 2;
  
  if (isHalf) {
    form.personal_rating = starIndex * 2 - 1;
  } else {
    form.personal_rating = starIndex * 2;
  }
  personalRatingInput.value = form.personal_rating;
  form.personal_rating_date = new Date().toISOString();
};

watch(() => form.personal_rating, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    personalRatingInput.value = newVal;
  }
});

watch(() => form.rating, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    doubanRatingInput.value = newVal;
  }
});

// 加载阅读统计
const loadReadingStats = async () => {
  if (!isEdit.value || !form.id) return;

  try {
    const bookId = parseInt(form.id as string);
    const stats = await readingTrackingService.getBookReadingStats(bookId);
    readingStats.value = stats;

      // 更新阅读进度（存储为页码而不是百分比）
    if (stats && stats.totalPages && stats.readPages) {
      readingProgress.value = stats.readPages; // 直接存储已读页数
      originalReadingProgress.value = readingProgress.value; // 保存原始值
    }
  } catch (error) {
    console.error('加载阅读统计失败:', error);
    readingStats.value = null;
  }
};

// 更新阅读进度
const handleProgressUpdate = (newProgress: number) => {
  readingProgress.value = newProgress;
};

// 查看阅读记录
const showReadingRecords = ref(false);
const readingRecords = ref<any[]>([]);
const loadingReadingRecords = ref(false);

const handleViewRecords = async () => {
  if (!form.id) return;
  showReadingRecords.value = true;
  loadingReadingRecords.value = true;
  try {
    const bookId = parseInt(form.id as string, 10);

    // 优先从活动日志（与时间线页面同一数据源），保证日期/时间/页数/时长齐全
    let records: any[] = [];
    try {
      const activities = await activityService.getActivities({
        bookId,
        type: 'reading_record',
        limit: 200
      });
      records = (activities || []).filter((r) => r && r.startTime && r.endTime);
    } catch (e) {
      console.warn('⚠️ 从活动日志读取阅读记录失败，回退到 readingTracking:', e);
    }

    if (records.length === 0) {
      // 回退到原接口（解决历史数据问题）
      const fallback = await readingTrackingService.getBookReadingRecords(bookId, 200);
      records = (fallback || []).filter((r) => r && r.startTime && r.endTime);
    }

    // 按开始时间倒序排序（最新在前）
    readingRecords.value = records.slice().sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  } catch (error) {
    console.error('加载阅读记录失败:', error);
    readingRecords.value = [];
  } finally {
    loadingReadingRecords.value = false;
  }
};

const closeReadingRecords = () => {
  showReadingRecords.value = false;
};

// 格式化阅读记录日期
const formatRecordDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 格式化阅读记录时间范围
const formatRecordTimeRange = (start: string, end: string): string => {
  if (!start) return '';
  const startDate = new Date(start);
  const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
  if (!end) return startTime;
  const endDate = new Date(end);
  const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
  return `${startTime} - ${endTime}`;
};

// 书籍来源显示映射
const sourceLabelMap: Record<string, string> = {
  douban: '豆瓣读书',
  dbr: '豆瓣读书 (DBR)',
  google: 'Google Books',
  openlibrary: 'Open Library',
  manual: '手动添加',
  import: '批量导入',
  calibre: 'Calibre 书库',
  talebook: 'Talebook 书库'
};
const getSourceLabel = (source: string): string => {
  if (!source) return '';
  const lower = source.toLowerCase();
  if (sourceLabelMap[lower]) return sourceLabelMap[lower];
  return source;
};

// 格式化阅读时长（分钟 -> "X小时Y分钟"）
const formatRecordDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  return `${m}分钟`;
};

// 切换分组
const toggleGroup = (groupId: string) => {
  const index = form.groups.indexOf(groupId);
  if (index === -1) {
    form.groups.push(groupId);
  } else {
    form.groups.splice(index, 1);
  }
};

// 删除标签
const removeTag = (index: number) => {
  if (form.calibreTags) {
    form.calibreTags.splice(index, 1);
  }
};

// 添加标签
const addTag = () => {
  const tagName = calibreTagInput.value.trim();
  if (!tagName) return;

  // 检查标签是否已存在
  if (form.calibreTags?.includes(tagName)) {
    alert('该标签已存在');
    return;
  }

  // 添加标签
  form.calibreTags?.push(tagName);
  calibreTagInput.value = '';
};

// 选择推荐标签
const selectTag = (tagName: string) => {
  if (!form.calibreTags?.includes(tagName)) {
    form.calibreTags?.push(tagName);
  }
  calibreTagInput.value = '';
};

// 过滤标签（用于自动完成）
const filteredTags = computed(() => {
  const input = calibreTagInput.value.trim().toLowerCase();
  if (!input) return [];

  // 从所有标签中过滤
  return allTags.value.filter(tag => {
    const tagLower = tag.toLowerCase();
    return tagLower.includes(input) && !form.calibreTags?.includes(tag);
  });
});

// 删除Calibre标签
const removeCalibreTag = (index: number) => {
  if (form.calibreTags) {
    form.calibreTags.splice(index, 1);
  }
};

// 验证表单数据
const validateForm = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 必填字段验证
  if (!form.title?.trim()) {
    errors.push('请填写书名');
  }
  if (!form.author?.trim()) {
    errors.push('请填写作者');
  }
  if (!form.isbn?.trim()) {
    errors.push('请填写ISBN');
  }

  // 可选字段格式验证
  if (form.publishYear !== undefined && form.publishYear !== null) {
    const currentYear = new Date().getFullYear();
    if (form.publishYear < 1000 || form.publishYear > currentYear + 10) {
      errors.push(`出版年份应在1000-${currentYear + 10}之间`);
    }
  }

  if (form.pages !== undefined && form.pages !== null) {
    if (form.pages < 0 || form.pages > 100000) {
      errors.push('页数应在0-100000之间');
    }
  }

  if (form.standardPrice !== undefined && form.standardPrice !== null) {
    if (form.standardPrice < 0) {
      errors.push('标准价格不能为负数');
    }
    if (form.standardPrice > 100000) {
      errors.push('标准价格超出合理范围');
    }
  }

  if (form.purchasePrice !== undefined && form.purchasePrice !== null) {
    if (form.purchasePrice < 0) {
      errors.push('购买价格不能为负数');
    }
    if (form.purchasePrice > 100000) {
      errors.push('购买价格超出合理范围');
    }
  }

  if (form.rating !== undefined && form.rating !== null) {
    if (form.rating < 0 || form.rating > 10) {
      errors.push('评分应在0-10之间');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 保存
  const handleSave = async () => {
    // 验证表单
    const validation = validateForm();
    if (!validation.valid) {
      alert('表单验证失败:\n' + validation.errors.join('\n'));
      return;
    }

    saving.value = true;
    try {



      console.log('💾 原始form数据:', JSON.parse(JSON.stringify(form)));

      // 检查阅读状态是否有变化
      const readStatusChanged = form.readStatus !== originalReadStatus.value;

      // 检查阅读进度是否有变化
      const readingProgressChanged = readingProgress.value !== originalReadingProgress.value;

      // 保存前，将calibreTags复制到tags字段（API期望的格式）
      const { calibreTags, ...saveData } = form as any;
      if (calibreTags) {
        saveData.tags = calibreTags;
      }

      // 确保所有重要字段都被包含
      const finalSaveData = {
        ...saveData,
        book_type: saveData.book_type,
        binding1: saveData.binding1,
        binding2: saveData.binding2,
        paper1: saveData.paper1,
        edge1: saveData.edge1,
        edge2: saveData.edge2,
        purchasePrice: saveData.purchasePrice,
        standardPrice: saveData.standardPrice,
        note: saveData.note,
        purchaseDate: saveData.purchaseDate,
        publishYear: saveData.publishYear,
        rating: saveData.rating,
        groups: saveData.groups || [],
        favorite: saveData.favorite || 0,
        favorite_date: saveData.favorite_date || null,
        wants: saveData.wants || 0,
        wants_date: saveData.wants_date || null,
        personal_rating: saveData.personal_rating || 0,
        personal_rating_date: saveData.personal_rating_date || null
      };

      console.log('💾 要保存的数据:', JSON.parse(JSON.stringify(finalSaveData)));

      // 将日期转换为完整的ISO日期时间字符串
      if (finalSaveData.purchaseDate && finalSaveData.purchaseDate.trim() !== '') {
        try {
          finalSaveData.purchaseDate = new Date(finalSaveData.purchaseDate).toISOString();

        } catch (e) {
          console.error('❌ purchaseDate转换失败:', finalSaveData.purchaseDate, e);
        }
      }
      if (finalSaveData.readCompleteDate && finalSaveData.readCompleteDate.trim() !== '') {
        try {
          finalSaveData.readCompleteDate = new Date(finalSaveData.readCompleteDate).toISOString();

        } catch (e) {
          console.error('❌ readCompleteDate转换失败:', finalSaveData.readCompleteDate, e);
        }
      }

    let savedBook: Book;

    if (isEdit.value && form.id) {

      console.log('🔍 保存书籍时当前读者ID:', readerStore.currentReaderId);
      const updatedBook = await bookService.updateBook(finalSaveData as Book, readerStore.currentReaderId);

      bookStore.updateBook(updatedBook);
      savedBook = updatedBook;
    } else {

      const newBook = await bookService.addBook(finalSaveData);
      bookStore.addBook(newBook);
      savedBook = newBook;
    }

    // 检查阅读状态是否有变化并更新
    if (readStatusChanged && savedBook.id) {

      try {
        // 将字符串状态转换为数字
        const statusMap: Record<string, number> = {
          '未读': 0,
          '在读': 1,
          '已读': 2
        };
        const readStateNumber = statusMap[form.readStatus] || 0;

        // 调用专门的阅读状态更新API
        const readingStateData = {
          read_state: readStateNumber,
          read_date: form.readCompleteDate || new Date().toISOString()
        };

        const updatedReadingState = await bookService.updateReadingState(
          parseInt(savedBook.id.toString(), 10),
          readingStateData,
          readerStore.currentReaderId
        );

        // 更新本地书籍对象的阅读状态
        savedBook.readStatus = form.readStatus;
        savedBook.readCompleteDate = updatedReadingState.read_date || undefined;

        // 更新Store中的书籍
        bookStore.updateBook(savedBook);
      } catch (readingStateError) {
        console.error('❌ 更新阅读状态失败:', readingStateError);
        // 阅读状态更新失败不影响主流程，只提示用户
        alert(`书籍保存成功，但阅读状态更新失败: ${(readingStateError as Error).message}`);
      }
    }

    // 检查阅读进度是否有变化并更新
    if (readingProgressChanged && savedBook.id && form.pages) {


      try {
        // readingProgress.value 现在是页码，直接使用
        const readPages = readingProgress.value;

        const updatedProgress = await bookService.updateReadingProgress(
          parseInt(savedBook.id.toString(), 10),
          readPages,
          readerStore.currentReaderId
        );

        // 更新本地书籍对象的阅读进度
        savedBook.read_pages = updatedProgress.readPages;

        // 更新Store中的书籍
        bookStore.updateBook(savedBook);
      } catch (readingProgressError) {
        console.error('❌ 更新阅读进度失败:', readingProgressError);
        // 阅读进度更新失败不影响主流程，只提示用户
        alert(`书籍保存成功，但阅读进度更新失败: ${(readingProgressError as Error).message}`);
      }
    }

    router.back();
  } catch (error) {
    console.error('❌ ============ 保存失败 ============');
    console.error('❌ 错误对象:', error);
    console.error('❌ 错误消息:', (error as Error).message);
    console.error('❌ 错误堆栈:', (error as Error).stack);
    alert(`保存失败: ${(error as Error).message || '未知错误'}\n\n请查看控制台获取详细信息`);
  } finally {
    saving.value = false;
  }
};

// 加载书籍数据的函数
const loadBookData = async () => {
  if (!isEdit.value) return;
  
  const bookId = route.params.id as string;
  const book = await bookService.getBookById(parseInt(bookId), readerStore.currentReaderId);
  if (book) {
    Object.assign(form, {
      ...book,
      publishYear: book.publishYear ?? undefined,
      pages: book.pages ?? undefined,
      standardPrice: book.standardPrice ?? undefined,
      purchasePrice: book.purchasePrice ?? undefined,
      purchaseDate: book.purchaseDate ? new Date(book.purchaseDate).toISOString().split('T')[0] : '',
      readCompleteDate: book.readCompleteDate ? new Date(book.readCompleteDate).toISOString().split('T')[0] : '',
      book_type: book.book_type !== undefined && book.book_type !== null ? book.book_type : 1,
      binding1: book.binding1 !== undefined && book.binding1 !== null ? book.binding1 : 0,
      binding2: book.binding2 !== undefined && book.binding2 !== null ? book.binding2 : 0,
      favorite: book.favorite ?? 0,
      wants: book.wants ?? 0,
      favorite_date: book.favorite_date ?? null,
      wants_date: book.wants_date ?? null,
      personal_rating: book.personal_rating ?? 0,
      personal_rating_date: book.personal_rating_date ?? null,
      source: book.source ?? ''
    });

    if (book.rating !== undefined && book.rating !== null) {
      doubanRatingInput.value = book.rating;
    }

    if (book.personal_rating) {
      personalRatingInput.value = book.personal_rating;
    }

    if (book.readStatus) {
      originalReadStatus.value = book.readStatus;
    }

    if (Array.isArray(book.tags)) {
      form.calibreTags = book.tags as string[];
      form.tags = [];
    }

    // 把现有 ISBN 同步到 ISBN 获取输入框（便于直接重新拉取更新）
    if (book.isbn) {
      isbnInput.value = book.isbn;
    }

    loadReadingStats();
  }
};

// 监听用户切换，重新加载书籍数据
watch(() => readerStore.currentReaderId, async (newReaderId, oldReaderId) => {
  if (newReaderId !== oldReaderId && isEdit.value) {
    console.log('👤 用户切换，重新加载书籍数据:', { oldReaderId, newReaderId });
    await loadBookData();
  }
});

// 加载数据
onMounted(async () => {
  // 确保退出整理模式，恢复导航栏显示
  document.body.classList.remove('organize-mode-active');

  // 加载分组和标签
  try {
    allGroups.value = await bookService.getAllGroups();
    allTags.value = await bookService.getAllTags();
  } catch (error) {
    console.error('加载数据失败:', error);
  }

  // 编辑模式，加载书籍信息
  if (isEdit.value) {
    await loadBookData();
  } else {
      // 新增模式，检查是否有ISBN搜索参数
      const query = route.query;
      if (query.isbn) {
        form.isbn = query.isbn as string;
        form.title = (query.title as string) || '';
        form.author = (query.author as string) || '';
        form.publisher = (query.publisher as string) || '';
        form.publishYear = query.publishYear ? parseInt(query.publishYear as string) : undefined;
        form.pages = query.pages ? parseInt(query.pages as string) : undefined;
        // 处理查询参数中的binding值，转换为binding1和binding2
        const oldBinding = parseInt(query.binding as string) || 0;
        if (oldBinding === 0) {
          form.binding1 = 0;
          form.binding2 = 0;
        } else if (oldBinding === 1 || oldBinding >= 101 && oldBinding <= 104) {
          form.binding1 = 1;
          form.binding2 = oldBinding === 1 ? 0 : oldBinding - 100;
        } else if (oldBinding === 2 || oldBinding >= 201 && oldBinding <= 203) {
          form.binding1 = 2;
          form.binding2 = oldBinding === 2 ? 0 : oldBinding - 200;
        } else if (oldBinding >= 301 && oldBinding <= 302) {
          form.binding1 = 3;
          form.binding2 = oldBinding - 300;
        } else {
          form.binding1 = 3;
          form.binding2 = 0;
        }
        form.coverUrl = (query.coverUrl as string) || '';
        isbnInput.value = query.isbn as string;
        
        // 转换日期格式为 yyyy-MM-dd
        form.purchaseDate = query.purchaseDate ? new Date(query.purchaseDate as string).toISOString().split('T')[0] : '';
        form.readCompleteDate = query.readCompleteDate ? new Date(query.readCompleteDate as string).toISOString().split('T')[0] : '';
        
        // 设置标准价格（从查询参数中获取）
        form.standardPrice = query.price ? parseFloat((query.price as string).replace(/[^\d.]/g, '')) : undefined;
        // 设置购入价格
        form.purchasePrice = query.purchasePrice ? parseFloat((query.purchasePrice as string).replace(/[^\d.]/g, '')) : undefined;
        // 设置评分
        form.rating = query.rating ? parseFloat(query.rating as string) : undefined;
        // 设置丛书
        form.series = query.series as string || '';
        // 设置书籍来源
        if (query.source) {
          form.source = query.source as string;
        }
        // 设置Calibre标签
        if (query.tags) {
          try {
            const tags = JSON.parse(query.tags as string);
            if (Array.isArray(tags)) {
              form.calibreTags = tags;
            }
          } catch (error) {
            console.error('解析标签失败:', error);
          }
        }
      }
    }
});
</script>

<style scoped>
.edit-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.save-btn {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn:hover {
  background-color: var(--primary-dark);
}

.save-btn:disabled {
  background-color: var(--text-disabled);
  cursor: not-allowed;
}

.form-content {
  padding: 16px;
}

/* 封面区域 */
.cover-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.cover-preview {
  width: 120px;
  height: 160px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 16px;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: var(--text-hint);
}

.cover-placeholder svg {
  width: 32px;
  height: 32px;
  fill: var(--text-hint);
  margin-bottom: 8px;
}

.cover-placeholder span {
  font-size: 12px;
}

.isbn-scan {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 300px;
}

.isbn-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
}

.isbn-input:focus {
  border-color: var(--primary-color);
}

.scan-btn {
  padding: 10px 16px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.scan-btn:disabled {
  background-color: var(--text-disabled);
}

/* 表单区域 */
.form-section {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.form-item {
  margin-bottom: 16px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-item {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-label.required::after {
  content: '*';
  color: #f44336;
  margin-left: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  background-color: #fff;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--primary-color);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

/* 阅读状态 */
.status-options {
  display: flex;
  gap: 12px;
}

.status-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s;
}

.status-option.active {
  background-color: rgba(255, 107, 53, 0.1);
  border: 1px solid var(--primary-color);
}

.status-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

/* 评分 */
.rating-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-stars-half {
  display: flex;
  gap: 4px;
}

.rating-star-half {
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
}

.rating-star-half.full {
  color: #ffc107;
}

.rating-star-half.half {
  background: linear-gradient(90deg, #ffc107 50%, #ddd 50%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rating-star-half:hover {
  color: #ffc107;
}

.rating-star-half.personal.full {
  color: #ff9800;
}

.rating-star-half.personal.half {
  background: linear-gradient(90deg, #ff9800 50%, #ddd 50%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rating-star-half.personal:hover {
  color: #ff9800;
}

.douban-rating-input {
  width: 80px;
  text-align: center;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-star {
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s;
}

.rating-star.active {
  color: #ffc107;
}

.rating-star:hover {
  color: #ffc107;
}

.rating-value {
  margin-left: 8px;
  font-size: 16px;
  color: var(--text-secondary);
}

.personal-rating-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.personal-rating-input {
  width: 80px;
  text-align: center;
}

.personal-rating-stars {
  display: flex;
  gap: 2px;
}

.rating-star-small {
  font-size: 16px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s;
}

.rating-star-small.active {
  color: #ff9800;
}

.rating-star-small:hover {
  color: #ff9800;
}

/* 标签和分组 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 6px 12px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding-right: 28px;
}

.tag-item.active {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

.tag-remove {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s;
}

.tag-remove:hover {
  opacity: 1;
}

.no-tags {
  color: var(--text-hint);
  font-size: 14px;
}

/* 标签输入 */
.tag-input-container {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tag-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.tag-input:focus {
  border-color: var(--primary-color);
}

.tag-add-btn {
  padding: 10px 16px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.3s;
}

.tag-add-btn:hover {
  background-color: var(--primary-dark);
}

/* 标签推荐 */
.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.tag-suggestion {
  padding: 6px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.tag-suggestion:hover {
  background-color: rgba(255, 107, 53, 0.2);
  transform: translateY(-1px);
}

/* Calibre标签输入 */
.calibre-tags-input {
  width: 100%;
}

.calibre-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.calibre-tag-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  border-radius: 16px;
  font-size: 13px;
  gap: 6px;
}

.remove-tag {
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-tag:hover {
  opacity: 1;
}

.calibre-tag-input {
  width: 100%;
}

.hint {
  font-size: 12px;
  color: var(--text-hint);
  margin: 8px 0 0 0;
}

/* 阅读进度 */
.toggle-stats-btn {
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-stats-btn:hover {
  background-color: rgba(255, 107, 53, 0.1);
  border-color: var(--primary-color);
}

.start-reading-btn {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.start-reading-btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
}

.start-reading-btn svg {
  width: 20px;
  height: 20px;
  fill: #fff;
}

/* 阅读记录弹窗 */
.reading-records-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.reading-records-dialog {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.reading-records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.reading-records-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.reading-records-close {
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border-radius: 50%;
  transition: all 0.2s;
}

.reading-records-close:hover {
  background: #f5f5f5;
  color: #333;
}

.reading-records-close svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.reading-records-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.reading-records-loading,
.reading-records-empty {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

.reading-records-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.reading-record-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.reading-record-item:last-child {
  border-bottom: none;
}

.reading-record-date {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.reading-record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.reading-record-time,
.reading-record-duration,
.reading-record-pages {
  display: inline-block;
}

/* 书籍来源 */
.source-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.source-display .form-input {
  flex: 1;
  min-width: 220px;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background-color: var(--primary-color-light, #e6f3ff);
  color: var(--primary-color, #1e88e5);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.source-hint {
  color: var(--text-tertiary, #888);
  font-size: 12px;
  flex-basis: 100%;
}

/* ============ ISBN 多源获取对话框 ============ */
.isbn-fetch-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.isbn-fetch-content {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.dialog-isbn {
  font-size: 13px;
  color: var(--text-tertiary, #888);
  flex: 1;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-tertiary, #888);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
}

.dialog-close:hover {
  background-color: var(--bg-hover, #f5f5f5);
  color: var(--text-primary, #333);
}

.dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 24px 0;
  color: var(--text-secondary, #666);
}

.error-state p {
  color: #e74c3c;
  margin: 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #eee);
  border-top-color: var(--primary-color, #3498db);
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.source-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-primary, #fff);
}

.source-item:hover:not(.disabled) {
  border-color: var(--primary-color, #3498db);
  background-color: var(--bg-hover, #f8fbff);
}

.source-item.selected {
  border-color: var(--primary-color, #3498db);
  background-color: rgba(52, 152, 219, 0.06);
}

.source-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-secondary, #fafafa);
}

.source-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.source-radio input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.source-radio input[type="radio"]:disabled {
  cursor: not-allowed;
}

.source-radio label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.source-item.disabled .source-radio label {
  cursor: not-allowed;
}

.source-name {
  font-weight: 500;
}

.source-status.success {
  color: #2ecc71;
  font-size: 12px;
}

.source-status.empty {
  color: var(--text-tertiary, #999);
  font-size: 12px;
}

.source-badges {
  display: flex;
  gap: 4px;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.badge.free {
  background-color: #e8f8f0;
  color: #27ae60;
}

.badge.paid {
  background-color: #fff5e6;
  color: #e67e22;
}

.preview-section {
  border-top: 1px dashed var(--border-color, #e5e5e5);
  padding-top: 16px;
  margin-top: 8px;
}

.preview-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.preview-content {
  display: flex;
  gap: 16px;
}

.preview-cover {
  flex-shrink: 0;
  width: 90px;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--bg-secondary, #f5f5f5);
}

.preview-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info {
  flex: 1;
  font-size: 13px;
  min-width: 0;
}

.info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  line-height: 1.5;
}

.info-label {
  color: var(--text-tertiary, #888);
  flex-shrink: 0;
  min-width: 56px;
}

.info-value {
  color: var(--text-primary, #333);
  word-break: break-word;
  flex: 1;
}

.info-value.rating {
  color: #f39c12;
  font-weight: 600;
}

.description-row {
  flex-direction: column;
  align-items: flex-start;
}

.description-row .info-label {
  margin-bottom: 4px;
}

.description-text {
  margin: 0;
  color: var(--text-secondary, #666);
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.retry-paid-section {
  text-align: center;
  padding: 16px 0 4px;
  border-top: 1px dashed var(--border-color, #e5e5e5);
  margin-top: 16px;
}

.hint-text {
  margin: 0 0 4px 0;
  color: var(--text-primary, #333);
  font-size: 14px;
}

.hint-subtext {
  margin: 0 0 12px 0;
  color: var(--text-tertiary, #888);
  font-size: 12px;
}

.tanshu-btn {
  background-color: #e67e22;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.tanshu-btn:hover:not(:disabled) {
  background-color: #d35400;
}

.tanshu-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color, #eee);
  background-color: var(--bg-secondary, #fafafa);
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: var(--bg-primary, #fff);
  border-color: var(--border-color, #d0d0d0);
  color: var(--text-primary, #333);
}

.cancel-btn:hover {
  background-color: var(--bg-hover, #f5f5f5);
}

.apply-btn {
  background-color: var(--primary-color, #3498db);
  color: #fff;
  border-color: var(--primary-color, #3498db);
}

.apply-btn:hover:not(:disabled) {
  background-color: #2980b9;
  border-color: #2980b9;
}

.apply-btn:disabled {
  background-color: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}

</style>