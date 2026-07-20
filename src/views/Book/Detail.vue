<template>
  <div class="detail-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书籍详情</h1>
      <button class="action-btn" @click="showActions = !showActions">
        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </button>
      <!-- 操作菜单 -->
      <div v-if="showActions" class="actions-menu">
        <div class="menu-item" @click="handleEdit">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>编辑</span>
        </div>
        <div class="menu-item" @click="handleDelete">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          <span>删除</span>
        </div>
      </div>
    </div>

    <div v-if="book" class="content">
      <!-- 书籍基本信息 -->
      <div class="book-hero">
        <div class="book-cover">
          <img
            v-if="getBookCoverUrl(book)"
            :src="getBookCoverUrl(book)"
            :alt="book.title"
            @load="handleImgLoad"
            @error="handleImgError"
          />
          <div v-else class="cover-placeholder">
            <span>{{ book.title.charAt(0) }}</span>
          </div>
        </div>
        <div class="book-meta">
          <h2 class="book-title">{{ book.title }}</h2>
          <p class="book-author">{{ book.author }}</p>
          <div class="book-status" :class="`status--${book.readStatus}`">
            {{ book.readStatus }}
          </div>
          <div v-if="book.rating" class="book-rating">
            <span class="rating-label">书籍评分</span>
            <RatingDisplay :value="book.rating" :show-value="true" size="large" />
          </div>
          <div v-if="book.personal_rating" class="book-rating">
            <span class="rating-label">个人评分</span>
            <RatingDisplay :value="book.personal_rating" :show-value="true" size="large" />
          </div>
        </div>
      </div>

      <!-- 书籍详细信息 -->
      <div class="card">
        <h3 class="card-title">书籍信息</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">ISBN</span>
            <span class="info-value">{{ book.isbn }}</span>
          </div>
          <div class="info-item" v-if="book.publisher">
            <span class="info-label">出版社</span>
            <span class="info-value">{{ book.publisher }}</span>
          </div>
          <div class="info-item" v-if="book.publishYear">
            <span class="info-label">出版年份</span>
            <span class="info-value">{{ book.publishYear }}</span>
          </div>
          <div class="info-item" v-if="book.pages">
            <span class="info-label">页数</span>
            <span class="info-value">{{ book.pages }} 页</span>
          </div>
          <div class="info-item" v-if="book.binding1 !== undefined">
            <span class="info-label">装帧</span>
            <span class="info-value">
              {{
                book.binding1 === 0 ? '电子书' :
                book.binding1 === 1 ? '平装' :
                book.binding1 === 2 ? '精装' :
                book.binding1 === 3 ? '特殊装帧' :
                book.binding1 === 4 ? '套装' : '未设置'
              }}
              <span v-if="book.binding2 !== undefined && book.binding2 !== 0">
                - {{
                  (book.binding1 === 0 && book.binding2 === 1) ? '精校版' :
                  (book.binding1 === 0 && book.binding2 === 2) ? '魔改版' :
                  (book.binding1 === 0 && book.binding2 === 3) ? '原版' :
                  (book.binding1 === 1 && book.binding2 === 1) ? '无线胶装' :
                  (book.binding1 === 1 && book.binding2 === 2) ? '骑马钉装订' :
                  (book.binding1 === 1 && book.binding2 === 3) ? '活页装订' :
                  (book.binding1 === 1 && book.binding2 === 4) ? '锁线胶装' :
                  (book.binding1 === 2 && book.binding2 === 1) ? '硬壳精装（圆脊）' :
                  (book.binding1 === 2 && book.binding2 === 2) ? '硬壳精装（方脊）' :
                  (book.binding1 === 2 && book.binding2 === 3) ? '布面精装' :
                  (book.binding1 === 2 && book.binding2 === 4) ? 'PU 皮面精装' :
                  (book.binding1 === 2 && book.binding2 === 5) ? '真皮精装（头层牛皮）' :
                  (book.binding1 === 2 && book.binding2 === 6) ? '真皮精装（羊皮）' :
                  (book.binding1 === 2 && book.binding2 === 7) ? '仿皮（人造革）精装' :
                  (book.binding1 === 3 && book.binding2 === 1) ? '线装' :
                  (book.binding1 === 3 && book.binding2 === 2) ? '经折装' :
                  (book.binding1 === 4 && book.binding2 === 1) ? '套装精装' :
                  (book.binding1 === 4 && book.binding2 === 2) ? '套装平装' :
                  (book.binding1 === 4 && book.binding2 === 3) ? '套装其他' : ''
                }}
              </span>
            </span>
          </div>
          <div class="info-item" v-if="book.paper1 !== undefined && book.paper1 !== 0">
            <span class="info-label">纸张</span>
            <span class="info-value">
              {{ 
                book.paper1 === 1 ? '胶版纸（双胶纸）' :
                book.paper1 === 2 ? '轻型纸' :
                book.paper1 === 3 ? '道林纸' :
                book.paper1 === 4 ? '铜版纸' :
                book.paper1 === 5 ? '牛皮纸' :
                book.paper1 === 6 ? '宣纸' :
                book.paper1 === 7 ? '进口特种纸' : ''
              }}
            </span>
          </div>
          <div class="info-item" v-if="book.edge1 !== undefined && book.edge1 !== 0">
            <span class="info-label">刷边</span>
            <span class="info-value">
              {{ 
                book.edge1 === 1 ? '书口单侧' :
                book.edge1 === 2 ? '多侧（书口+天头/地脚）' :
                book.edge1 === 3 ? '全三边' : ''
              }}
              <span v-if="book.edge2 !== undefined && book.edge2 !== 0">
                - {{ 
                  book.edge2 === 1 ? '基础单色' :
                  book.edge2 === 2 ? '烫边（烫金/银）' :
                  book.edge2 === 3 ? '磨边（毛边）' :
                  book.edge2 === 4 ? '彩绘艺术刷边' :
                  book.edge2 === 5 ? '鎏金高端刷边' : ''
                }}
              </span>
            </span>
          </div>
          <div class="info-item" v-if="book.standardPrice">
            <span class="info-label">标准价格</span>
            <span class="info-value">¥{{ book.standardPrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.purchasePrice">
            <span class="info-label">购入价格</span>
            <span class="info-value">¥{{ book.purchasePrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.series">
            <span class="info-label">丛书</span>
            <span class="info-value">{{ book.series }}</span>
          </div>
          <div class="info-item" v-if="book.source">
            <span class="info-label">书籍来源</span>
            <span class="info-value">{{ getSourceLabel(book.source) }}</span>
          </div>
        </div>
      </div>

      <!-- 阅读信息 -->
      <div class="card" v-if="book.readStatus === '已读' || book.purchaseDate || book.read_pages">
        <h3 class="card-title">阅读信息</h3>
        <div class="info-list">
          <!-- 阅读进度条 -->
          <div v-if="readingStore.progressDisplayMode === 'progress' && book.read_pages && book.pages" class="reading-progress-section">
            <ReadingProgressBarList :book="book" :show-duration="true" />
          </div>
          <div class="info-item" v-if="book.readCompleteDate">
            <span class="info-label">完成日期</span>
            <span class="info-value">{{ formatDate(book.readCompleteDate) }}</span>
          </div>
          <div class="info-item" v-if="book.purchaseDate">
            <span class="info-label">购买日期</span>
            <span class="info-value">{{ formatDate(book.purchaseDate) }}</span>
          </div>
          <div class="info-item" v-if="book.purchasePrice">
            <span class="info-label">购买价格</span>
            <span class="info-value">¥{{ book.purchasePrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.standardPrice">
            <span class="info-label">标准价格</span>
            <span class="info-value">¥{{ book.standardPrice.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 开始阅读按钮 -->
      <button
        v-if="book && !isCurrentlyReadingBook"
        class="start-reading-btn"
        @click="handleStartReading"
      >
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        <span>开始阅读</span>
      </button>

      <!-- 跳转Talebook按钮组 -->
      <div v-if="talebookEnabled && book" class="talebook-jump-section">
        <h3 class="card-title">跳转 Talebook</h3>
        <div class="talebook-jump-buttons">
          <button
            v-if="talebookLocalUrl"
            class="talebook-jump-btn talebook-jump-btn--local"
            @click="jumpToTalebook('local')"
          >
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span>内网跳转</span>
          </button>
          <button
            v-if="talebookRemoteUrl"
            class="talebook-jump-btn talebook-jump-btn--remote"
            @click="jumpToTalebook('remote')"
          >
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span>外网跳转</span>
          </button>
        </div>
      </div>

      <!-- 分组 -->
      <div class="card" v-if="bookGroups.length > 0 || (book.calibreTags && book.calibreTags.length > 0) || bookCustomTags.length > 0">
        <h3 class="card-title">分组与标签</h3>
        <div v-if="bookGroups.length > 0" class="tags-section">
          <span class="tags-label">分组</span>
          <div class="tags-list">
            <span v-for="group in bookGroups" :key="group.id" class="tag-item">
              {{ group.name }}
            </span>
          </div>
        </div>
        <div v-if="bookCustomTags.length > 0" class="tags-section">
          <span class="tags-label">标签</span>
          <div class="tags-list">
            <span v-for="tag in bookCustomTags" :key="tag" class="tag-item">
              {{ tag }}
            </span>
          </div>
        </div>
        <div v-if="book.calibreTags && book.calibreTags.length > 0" class="tags-section">
          <span class="tags-label">Calibre标签</span>
          <div class="tags-list">
            <span v-for="tag in book.calibreTags" :key="tag" class="tag-item calibre-tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 书籍简介 -->
      <div class="card" v-if="book.description">
        <h3 class="card-title">书籍简介</h3>
        <div class="description-content">
          <p>{{ book.description }}</p>
        </div>
      </div>

      <!-- 备注 -->
      <div class="card" v-if="book.note">
        <h3 class="card-title">备注</h3>
        <p class="note-content">{{ book.note }}</p>
      </div>

      <!-- 相关书摘 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">相关书摘</h3>
          <span class="card-count">{{ filteredBookmarks.length }} 条</span>
        </div>
        <div v-if="filteredBookmarks.length > 0" class="bookmarks-list">
          <div
            v-for="bookmark in filteredBookmarks.slice(0, 5)"
            :key="bookmark.id"
            class="bookmark-item"
            @click="goToBookmarkDetail(String(bookmark.id))"
          >
            <p class="bookmark-content">{{ bookmark.content }}</p>
            <div class="bookmark-meta">
              <span v-if="bookmark.pageNum">第 {{ bookmark.pageNum }} 页</span>
              <span>{{ formatDate(bookmark.createTime) }}</span>
            </div>
          </div>
          <button
            v-if="filteredBookmarks.length > 5"
            class="btn-text"
            @click="goToBookmarks"
          >
            查看全部 {{ filteredBookmarks.length }} 条书摘
          </button>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📝</span>
          <p>暂无书摘</p>
          <button class="btn-primary" @click="goToAddBookmark">添加书摘</button>
        </div>

        <!-- 书摘内容联动展示区 -->
        <div v-if="selectedBookmark" class="bookmark-detail-panel" :key="selectedBookmark.id">
          <div class="bookmark-detail-header">
            <h4 class="bookmark-detail-title">书摘内容</h4>
            <div class="bookmark-detail-actions">
              <button class="btn-icon" @click="goToBookmarkDetail(String(selectedBookmark.id))" title="查看完整详情">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>
              </button>
              <button class="btn-icon" @click="closeBookmarkDetail" title="关闭">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          </div>
          <div class="bookmark-detail-body">
            <p class="bookmark-detail-content">{{ selectedBookmark.content }}</p>
            <div class="bookmark-detail-info">
              <div v-if="selectedBookmark.pageNum" class="detail-info-item">
                <span class="detail-info-label">页码</span>
                <span class="detail-info-value">第 {{ selectedBookmark.pageNum }} 页</span>
              </div>
              <div v-if="selectedBookmark.chapter" class="detail-info-item">
                <span class="detail-info-label">章节</span>
                <span class="detail-info-value">{{ selectedBookmark.chapter }}</span>
              </div>
              <div class="detail-info-item">
                <span class="detail-info-label">创建时间</span>
                <span class="detail-info-value">{{ formatDate(selectedBookmark.createTime) }}</span>
              </div>
              <div v-if="selectedBookmark.note" class="detail-info-item">
                <span class="detail-info-label">备注</span>
                <span class="detail-info-value">{{ selectedBookmark.note }}</span>
              </div>
              <div v-if="selectedBookmark.tags && selectedBookmark.tags.length" class="detail-info-item">
                <span class="detail-info-label">标签</span>
                <span class="detail-info-value">
                  <span v-for="tag in selectedBookmark.tags" :key="tag" class="mini-tag">{{ tag }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>

    <!-- 书摘详情弹窗（联动面板的另一种展示方式 - 弹窗模式） -->
    <Teleport to="body">
      <transition name="bookmark-fade">
        <div v-if="selectedBookmark" class="bookmark-modal-mask" @click.self="closeBookmarkDetail">
          <div class="bookmark-modal">
            <div class="bookmark-modal-header">
              <h4 class="bookmark-modal-title">📖 书摘内容</h4>
              <div class="bookmark-modal-actions">
                <button class="btn-icon" @click="goToBookmarkDetail(String(selectedBookmark.id))" title="查看完整详情">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>
                </button>
                <button class="btn-icon" @click="closeBookmarkDetail" title="关闭">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </div>
            <div class="bookmark-modal-body">
              <p class="bookmark-modal-content">{{ selectedBookmark.content }}</p>
              <div class="bookmark-modal-info">
                <div v-if="selectedBookmark.pageNum" class="modal-info-item">
                  <span class="modal-info-label">📄 页码</span>
                  <span class="modal-info-value">第 {{ selectedBookmark.pageNum }} 页</span>
                </div>
                <div v-if="selectedBookmark.chapter" class="modal-info-item">
                  <span class="modal-info-label">📑 章节</span>
                  <span class="modal-info-value">{{ selectedBookmark.chapter }}</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">🕐 创建时间</span>
                  <span class="modal-info-value">{{ formatDate(selectedBookmark.createTime) }}</span>
                </div>
                <div v-if="selectedBookmark.note" class="modal-info-item">
                  <span class="modal-info-label">📝 备注</span>
                  <span class="modal-info-value">{{ selectedBookmark.note }}</span>
                </div>
                <div v-if="selectedBookmark.tags && selectedBookmark.tags.length" class="modal-info-item">
                  <span class="modal-info-label">🏷️ 标签</span>
                  <span class="modal-info-value">
                    <span v-for="tag in selectedBookmark.tags" :key="tag" class="mini-tag">{{ tag }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>确认删除</span>
          <span class="dialog-close" @click="showDeleteConfirm = false">×</span>
        </div>
        <div class="dialog-body">
          <p>确定要删除《{{ book?.title }}》吗？删除后无法恢复。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { useReaderStore } from '@/stores/reader';
import { useReadingStore } from '@/stores/reading';
import { useTalebookStore } from '@/stores/talebook';
import { bookService } from '@/api/book';
import { bookmarkService } from '@/api/bookmark';
import readingTrackingService from '@/api/readingTracking';
import type { Book, BookGroup, ReadingState } from '@/api/book/types';
import type { Bookmark } from '@/api/bookmark/types';
import { useBookImage } from './composables/useBookImage';
import ReadingProgressBarList from '@/components/ReadingProgressBarList/ReadingProgressBarList.vue';
import RatingDisplay from '@/components/business/RatingDisplay.vue';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();
const readerStore = useReaderStore();
const readingStore = useReadingStore();
const talebookStore = useTalebookStore();

const book = ref<Book | null>(null);
const bookmarks = ref<Bookmark[]>([]);
const bookGroups = ref<BookGroup[]>([]);
const bookCustomTags = ref<string[]>([]);
const { handleImgLoad, handleImgError, getBookCoverUrl } = useBookImage();
// 书摘联动相关状态
const selectedBookmarkId = ref<string | number | null>(null);
const selectedBookmark = computed<Bookmark | null>(() => {
  if (selectedBookmarkId.value === null) return null;
  return filteredBookmarks.value.find(bm => bm.id === selectedBookmarkId.value) || null;
});
const showActions = ref(false);
const showDeleteConfirm = ref(false);
const readingState = ref<ReadingState>({
  book_id: 0,
  reader_id: 0,
  favorite: 0,
  favorite_date: null,
  wants: 0,
  wants_date: null,
  read_state: 0,
  read_date: null,
  online_read: 0,
  download: 0
});
const currentReadingState = ref<number>(0);

// 监听Talebook配置变化
watch(() => talebookStore.settings.value, (newSettings) => {
  talebookEnabled.value = newSettings.enabled;
  talebookLocalUrl.value = newSettings.localUrl;
  talebookLocalPort.value = newSettings.localPort;
  talebookRemoteUrl.value = newSettings.remoteUrl;
  talebookRemotePort.value = newSettings.remotePort;
  remoteUseHttps.value = newSettings.remoteUseHttps;
}, { deep: true });

// Talebook 配置
const talebookEnabled = ref(false);
const talebookLocalUrl = ref('');
const talebookLocalPort = ref('');
const talebookRemoteUrl = ref('');
const talebookRemotePort = ref('');
const remoteUseHttps = ref(false);

// 加载Talebook配置
const loadTalebookConfig = () => {
  talebookEnabled.value = talebookStore.enabled.value;
  talebookLocalUrl.value = talebookStore.localUrl.value;
  talebookLocalPort.value = talebookStore.localPort.value;
  talebookRemoteUrl.value = talebookStore.remoteUrl.value;
  talebookRemotePort.value = talebookStore.remotePort.value;
  remoteUseHttps.value = talebookStore.remoteUseHttps.value;
};

// 获取Talebook跳转URL
const getTalebookUrl = (type: 'local' | 'remote'): string => {
  if (!book.value) return '';

  let baseUrl = '';
  let port = '';

  if (type === 'local') {
    baseUrl = talebookLocalUrl.value;
    port = talebookLocalPort.value;
  } else {
    baseUrl = talebookRemoteUrl.value;
    port = talebookRemotePort.value;
  }

  if (!baseUrl) return '';

  // 构建URL - 内网使用http，外网根据配置决定
  const protocol = type === 'local' ? 'http' : (remoteUseHttps.value ? 'https' : 'http');
  const portPart = port && port !== '80' && port !== '443' ? `:${port}` : '';
  const bookId = book.value.id;

  return `${protocol}://${baseUrl}${portPart}/book/${bookId}`;
};

// 跳转Talebook
const jumpToTalebook = (type: 'local' | 'remote') => {
  const url = getTalebookUrl(type);
  if (url) {
    window.open(url, '_blank');
  }
};

// 过滤后的书摘列表，确保只显示与当前书籍ID匹配的书摘
const filteredBookmarks = computed(() => {
  if (!book.value) return [];

  const result = bookmarks.value.filter(bm => {
    const bookmarkBookId = bm.bookId;
    const isValid = bookmarkBookId === book.value?.id;

    if (!isValid && bm.id) {
      console.warn(`⚠️ 书摘 ${bm.id} 的书籍ID (${bookmarkBookId}) 不匹配当前书籍ID (${book.value?.id})，将被过滤掉`);
    }

    return isValid;
  });

  return result;
});

// 判断当前是否正在阅读这本书
const isCurrentlyReadingBook = computed(() => {
  return readingStore.isReading && readingStore.currentBookId === book.value?.id;
});

// 返回
const goBack = () => {
  router.back();
};

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 格式化日期时间（保留以备未来精确到时分秒的字段使用）
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
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

// 编辑
const handleEdit = () => {
  showActions.value = false;
  router.push(`/book/edit/${book.value?.id}`);
};

// 删除
const handleDelete = () => {
  showActions.value = false;
  showDeleteConfirm.value = true;
};

// 选择书摘 - 联动显示书摘内容
const selectBookmark = (bookmark: Bookmark) => {
  if (selectedBookmarkId.value === bookmark.id) {
    // 再次点击同一个书摘，关闭联动面板
    closeBookmarkDetail();
  } else {
    selectedBookmarkId.value = bookmark.id;
    // 滚动到联动面板
    nextTick(() => {
      const panel = document.querySelector('.bookmark-detail-panel');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
};

// 关闭书摘联动面板
const closeBookmarkDetail = () => {
  selectedBookmarkId.value = null;
};

const confirmDelete = async () => {
  if (!book.value) return;
  try {
    await bookService.deleteBook(book.value.id);
    bookStore.deleteBook(book.value.id);
    router.back();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 导航
const goToBookmarkDetail = (id: string) => {
  router.push(`/bookmark/detail/${id}`);
};

const goToBookmarks = () => {
  // 使用正确的书籍ID（数字类型）
  const bookId = book.value?.id;

  router.push({ path: '/bookmark', query: { bookId: bookId } });
};

const goToAddBookmark = () => {
  router.push({ path: '/bookmark/edit', query: { bookId: book.value?.id } });
};

// 更新阅读进度
const handleUpdateProgress = async (page: number) => {
  if (!book.value) return;

  try {
    await bookService.updateReadingProgress(book.value.id, page);
  } catch (error) {
    console.error('更新阅读进度失败:', error);
  }
};

// 加载阅读状态
const loadReadingState = async () => {
  if (!book.value) return;

  try {
    const state = await bookService.getReadingState(book.value.id, readerStore.currentReaderId);
    if (state) {
      readingState.value = state;
      currentReadingState.value = state.read_state;
    }
  } catch (error) {
    console.error('加载阅读状态失败:', error);
  }
};

// 加载阅读统计
const loadReadingStats = async () => {
  if (!book.value) return;

  try {
    const stats = await readingTrackingService.getBookReadingStats(book.value.id);
    // 将统计信息应用到书籍对象
    if (stats && book.value) {
      book.value.read_pages = stats.readPages;
      book.value.total_reading_time = stats.totalReadingTime;
      book.value.reading_count = stats.readingCount;
      book.value.last_read_date = stats.lastReadDate;
      book.value.last_read_duration = stats.lastReadDuration;
      // 使用 totalPages 作为 pages（兼容不同字段名）
      if (!book.value.pages && stats.totalPages) {
        book.value.pages = stats.totalPages;
      }

    }
  } catch (error) {
    console.error('加载阅读统计失败:', error);
  }
};

// 开始阅读
const handleStartReading = () => {
  if (!book.value) return;

  // 计算开始页码（基于当前已读页数）
  const startPage = book.value.read_pages || 0;

  // 调用 store 开始阅读
  readingStore.startReading(
    book.value.id,
    book.value.title || '未知书名',
    startPage
  );

  // 跳转到阅读页面
  router.push(`/book/reading/${book.value.id}`);
};

// 加载数据
onMounted(async () => {
  // 加载阅读设置中的进度显示模式
  readingStore.loadProgressDisplayMode();

  // 加载Talebook配置
  loadTalebookConfig();

  const bookIdStr = route.params.id as string;
  const bookId = Number(bookIdStr);


  try {
    book.value = await bookService.getBookById(bookId, readerStore.currentReaderId) || null;

    console.log(`📖 [Detail.vue] 获取书籍数据: id=${book.value?.id}, coverUrl=${book.value?.coverUrl}, has_cover=${book.value?.has_cover}, path=${book.value?.path}`);

    if (book.value) {
      // 将API返回的tags字段（Calibre标签）复制到calibreTags
      if (Array.isArray(book.value.tags)) {
        // 处理 tags 可能是字符串数组或对象数组两种情况
        book.value.calibreTags = (book.value.tags as any[]).map((t: any) => {
          if (typeof t === 'string') return t;
          if (t && typeof t === 'object' && typeof t.name === 'string') return t.name;
          return String(t);
        });
        // 清空tags字段，用于应用自己的Tag系统
        book.value.tags = [];
      }
      // 更新缓存
      bookStore.updateBook(book.value);

      // 确保groups字段存在且为数组
      if (!Array.isArray(book.value.groups)) {
        book.value.groups = [];
      }

      // 标准化自定义标签 - 处理后端可能返回的多种格式
      if (Array.isArray(book.value.customTags)) {
        bookCustomTags.value = (book.value.customTags as any[]).map((t: any) => {
          if (typeof t === 'string') return t;
          if (t && typeof t === 'object' && typeof t.name === 'string') return t.name;
          return String(t);
        });
      } else {
        // 兼容旧版本：调用单独接口
        try {
          const tags = await bookService.getTags(bookId);
          bookCustomTags.value = (Array.isArray(tags) ? tags : []).map((t: any) => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object' && typeof t.name === 'string') return t.name;
            return String(t);
          });
        } catch (error) {
          console.error('加载自定义标签失败:', error);
          bookCustomTags.value = [];
        }
      }

      // 加载相关书摘
      bookmarks.value = await bookmarkService.getBookmarksByBookId(bookId);

      console.log('书摘详情:', bookmarks.value.map(b => ({
        id: b.id,
        bookId: b.bookId,
        content: b.content?.substring(0, 30) + '...'
      })));

      // 加载分组信息
      const allGroups = await bookService.getAllGroups();
      // 兼容处理：groups 可能是 string[] 或 number[] 或 Array<{id, name}>
      const bookGroupIds: string[] = (book.value?.groups || []).map((g: any) => {
        if (typeof g === 'string') return g;
        if (typeof g === 'number') return String(g);
        if (g && typeof g === 'object' && g.id !== undefined) return String(g.id);
        return String(g);
      });
      bookGroups.value = allGroups.filter(g => bookGroupIds.includes(String(g.id)));

      // 加载阅读状态
      await loadReadingState();

      // 加载阅读统计
      await loadReadingStats();
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});

// 监听用户切换，重新加载阅读状态
watch(() => readerStore.currentReaderId, async (newReaderId, oldReaderId) => {
  if (newReaderId !== oldReaderId && book.value) {
    console.log('👤 用户切换，重新加载阅读状态:', { oldReaderId, newReaderId });
    await loadReadingState();
  }
});
</script>

<style scoped>
.detail-container {
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

.detail-container .back-btn,
.detail-container .action-btn {
  width: 36px !important;
  height: 36px !important;
  border: none !important;
  background: none !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  border-radius: 0 !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
}

.detail-container .back-btn svg,
.detail-container .action-btn svg {
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

.actions-menu {
  position: absolute;
  top: 100%;
  right: 16px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 200;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item svg {
  width: 20px;
  height: 20px;
  fill: var(--text-secondary);
}

.content {
  padding: 16px;
}

/* 书籍头部 */
.book-hero {
  display: flex;
  gap: 16px;
  padding: 24px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.book-cover {
  width: 100px;
  height: 133px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32px;
  font-weight: 500;
}

.book-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.book-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.book-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  margin-bottom: 8px;
}

.status--未读 { background-color: #9e9e9e; }
.status--在读 { background-color: var(--primary-color); }
.status--已读 { background-color: #4caf50; }

.book-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.book-rating .rating-label {
  font-size: 13px;
  color: var(--text-secondary, #666);
  min-width: 64px;
}

.stars {
  color: #ffc107;
  font-size: 16px;
}

.rating-value {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 卡片 */
.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.card-count {
  font-size: 14px;
  color: var(--text-hint);
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: var(--text-hint);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

/* 开始阅读按钮 */
.start-reading-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  margin-bottom: 16px;
}

.start-reading-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}

.start-reading-btn:active {
  transform: translateY(0);
}

.start-reading-btn svg {
  width: 24px;
  height: 24px;
  fill: white;
}

/* 阅读状态 */
.reading-state-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reading-status-buttons {
  display: flex;
  gap: 8px;
}

.status-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-light);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  background-color: var(--bg-hover);
}

.status-btn.active {
  background-color: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.reading-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

/* 标签 */
.tags-section {
  margin-bottom: 12px;
}

.tags-section:last-child {
  margin-bottom: 0;
}

.tags-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.calibre-tag {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

/* 书籍简介 */
.description-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap; /* 保留换行符 */
  overflow-wrap: break-word; /* 长单词换行 */
}

.description-content p {
  margin: 0 0 12px 0;
}

.description-content p:last-child {
  margin-bottom: 0;
}

/* 备注 */
.note-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 书摘列表 */
.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bookmark-item {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.bookmark-item:hover {
  background-color: #f0f0f0;
}

.bookmark-item.active {
  background-color: #e3f2fd;
  border-color: var(--primary-color, #1976d2);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
}

.bookmark-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 书摘联动详情面板 */
.bookmark-detail-panel {
  margin-top: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f0f4f8 100%);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--primary-color, #1976d2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  animation: slideIn 0.25s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bookmark-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.bookmark-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color, #1976d2);
  margin: 0;
}

.bookmark-detail-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.btn-icon svg {
  fill: currentColor;
}

.bookmark-detail-body {
  font-size: 14px;
  color: var(--text-primary);
}

.bookmark-detail-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.bookmark-detail-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.detail-info-label {
  color: var(--text-secondary, #666);
  font-weight: 500;
  min-width: 60px;
  flex-shrink: 0;
}

.detail-info-value {
  color: var(--text-primary);
}

.mini-tag {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 4px;
  background-color: var(--primary-color, #1976d2);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
}

/* 书摘弹窗 */
.bookmark-modal-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.bookmark-modal {
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-lg, 12px);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.bookmark-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light, #eee);
}

.bookmark-modal-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.bookmark-modal-actions {
  display: flex;
  gap: 4px;
}

.bookmark-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.bookmark-modal-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.bookmark-modal-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  padding: 6px 0;
}

.modal-info-label {
  color: var(--text-secondary, #666);
  font-weight: 500;
  min-width: 80px;
  flex-shrink: 0;
}

.modal-info-value {
  color: var(--text-primary);
}

.bookmark-fade-enter-active,
.bookmark-fade-leave-active {
  transition: opacity 0.2s ease;
}

.bookmark-fade-enter-active .bookmark-modal,
.bookmark-fade-leave-active .bookmark-modal {
  transition: transform 0.2s ease;
}

.bookmark-fade-enter-from,
.bookmark-fade-leave-to {
  opacity: 0;
}

.bookmark-fade-enter-from .bookmark-modal,
.bookmark-fade-leave-to .bookmark-modal {
  transform: scale(0.95) translateY(-10px);
}

.bookmark-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-hint);
}

.btn-text {
  width: 100%;
  padding: 12px;
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: var(--text-hint);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-primary {
  padding: 10px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

/* 加载 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-hint);
}

/* 弹窗 */
.dialog-overlay {
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
}

.dialog {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 320px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 500;
}

.dialog-close {
  font-size: 24px;
  color: var(--text-hint);
  cursor: pointer;
}

.dialog-body {
  padding: 24px 16px;
}

.dialog-body p {
  margin: 0;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

.btn-default {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

.btn-danger {
  background-color: #f44336;
  color: #fff;
}

/* Talebook跳转按钮组 */
.talebook-jump-section {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.talebook-jump-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.talebook-jump-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.talebook-jump-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.talebook-jump-btn--local {
  background-color: #e3f2fd;
  color: #1976d2;
}

.talebook-jump-btn--local:hover {
  background-color: #bbdefb;
}

.talebook-jump-btn--remote {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.talebook-jump-btn--remote:hover {
  background-color: #e1bee7;
}
</style>