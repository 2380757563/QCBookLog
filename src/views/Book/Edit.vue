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
            placeholder="输入ISBN自动获取信息"
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

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">评分</label>
            <div class="rating-input">
              <span
                v-for="i in 5"
                :key="i"
                class="rating-star"
                :class="{ active: i <= (form.rating || 0) }"
                @click="form.rating = i"
              >★</span>
              <span class="rating-value">{{ form.rating || 0 }}</span>
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
          <div class="tags-container" v-if="form.calibreTags.length > 0">
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
import type { Book, BookGroup, Tag } from '@/services/book/types';
import { searchBookByISBN, isbnCacheUtils } from '@/services/common/isbnApi';
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
  readCompleteDate: '',
  rating: undefined,
  tags: [],
  groups: [],
  series: '',
  calibreTags: [],
  note: '',
  description: ''
});

// 阅读状态选项
const readStatusOptions = [
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

// 通过ISBN获取书籍信息
const fetchBookByISBN = async () => {
  const isbn = isbnInput.value.trim();
  if (!isbn) return;
  
  fetching.value = true;
  try {
    // 清除该ISBN的缓存，确保获取最新数据
    if (isbnCacheUtils) {
      isbnCacheUtils.clearByISBN(isbn);

    }
    
    // 调用综合ISBN搜索API
    const searchResults = await searchBookByISBN(isbn);
    
    // 使用最佳结果
    const bookInfo = searchResults.bestResult;
    
    if (bookInfo) {
          form.isbn = bookInfo.isbn || isbn;
          form.title = bookInfo.title || '';
          form.author = bookInfo.author || '';
          form.publisher = bookInfo.publisher || '';
          form.publishYear = bookInfo.publishYear;
          form.pages = bookInfo.pages;
          
          // 根据API返回的装帧信息设置binding1和book_type
          if (bookInfo.binding1 !== undefined && bookInfo.binding1 !== null) {
            form.binding1 = bookInfo.binding1;
            form.book_type = bookInfo.book_type !== undefined && bookInfo.book_type !== null ? bookInfo.book_type : (bookInfo.binding1 === 0 ? 0 : 1);
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
          
          form.binding2 = bookInfo.binding2 || 0; // 默认无细分

          form.coverUrl = bookInfo.coverUrl || '';
          // 设置书籍简介
          form.description = bookInfo.description || '';
          // 设置标准价格（从API获取的价格）
          if (bookInfo.price) {
            // 去除"元"等非数字字符后再转换
            form.standardPrice = parseFloat(bookInfo.price.replace(/[^\d.]/g, ''));
          }
    } else {
      alert('未找到相关书籍信息');
    }
  } catch (error) {
    console.error('获取书籍信息失败:', error);
    alert('获取书籍信息失败，请重试');
  } finally {
    fetching.value = false;
  }
};

// 切换阅读状态
const toggleReadStatus = (status: string) => {
  form.readStatus = status;
};

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
const handleViewRecords = () => {
  if (!form.id) return;
  
  const bookId = parseInt(form.id as string);
  router.push(`/book/detail/${bookId}?tab=reading-records`);
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
  if (form.calibreTags.includes(tagName)) {
    alert('该标签已存在');
    return;
  }

  // 添加标签
  form.calibreTags.push(tagName);
  calibreTagInput.value = '';
};

// 选择推荐标签
const selectTag = (tagName: string) => {
  if (!form.calibreTags.includes(tagName)) {
    form.calibreTags.push(tagName);
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
    return tagLower.includes(input) && !form.calibreTags.includes(tag);
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
    if (form.rating < 0 || form.rating > 5) {
      errors.push('评分应在0-5之间');
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
        // 确保这些字段被正确传递
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
        groups: saveData.groups || []
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

      const updatedBook = await bookService.updateBook(finalSaveData as Book);

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
          readPages
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

// 加载数据
onMounted(async () => {
  // 加载分组和标签
  try {
    allGroups.value = await bookService.getAllGroups();
    allTags.value = await bookService.getAllTags('book');
  } catch (error) {
    console.error('加载数据失败:', error);
  }

  // 编辑模式，加载书籍信息
  if (isEdit.value) {
    const bookId = route.params.id as string;
    const book = await bookService.getBookById(parseInt(bookId));
    if (book) {
      // 复制书籍信息到表单，同时确保关键字段不会为null
      Object.assign(form, {
        ...book,
        publishYear: book.publishYear ?? undefined,
        pages: book.pages ?? undefined,
        standardPrice: book.standardPrice ?? undefined,
        purchasePrice: book.purchasePrice ?? undefined,
        purchaseDate: book.purchaseDate ? new Date(book.purchaseDate).toISOString().split('T')[0] : '',
        readCompleteDate: book.readCompleteDate ? new Date(book.readCompleteDate).toISOString().split('T')[0] : '',
        // 确保书籍类型和装帧字段正确设置
        book_type: book.book_type !== undefined && book.book_type !== null ? book.book_type : 1,
        binding1: book.binding1 !== undefined && book.binding1 !== null ? book.binding1 : 0,
        binding2: book.binding2 !== undefined && book.binding2 !== null ? book.binding2 : 0,
      });

      // 保存原始阅读状态（用于比较是否变化）
      if (book.readStatus) {
        originalReadStatus.value = book.readStatus;
      }

      // 将tags字段（Calibre标签）复制到calibreTags字段
      if (Array.isArray(book.tags)) {
        form.calibreTags = book.tags as string[];
        form.tags = []; // 清空tags，用于应用自己的Tag系统
      }

      // 加载阅读统计
      loadReadingStats();
    }
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

</style>