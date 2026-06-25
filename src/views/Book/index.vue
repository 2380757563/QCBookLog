<template>
  <div class="book-container">
    <!-- 顶部工具栏（使用拆分后的 BookToolbar 子组件） -->
    <BookToolbar
      :layout="layout"
      :group-thumbnail-max="groupThumbnailMax"
      :grid-columns="gridColumns"
      :manual-column-count="manualColumnCount"
      @go-to-search="goToSearch"
      @go-to-isbn="goToISBN"
      @go-to-batch-scanner="goToBatchScanner"
      @toggle-layout="toggleViewLayout"
      @start-organize-mode="startOrganizeMode"
      @set-group-thumbnail-max="appStore.setGroupThumbnailMax"
      @set-grid-columns="(v: string) => setViewGridColumns(v as any)"
      @use-auto-columns="useViewAutoColumns"
      @use-manual-columns="applyViewManualColumns"
      @update-manual-columns="(n: number) => { manualColumnCount = n; applyViewManualColumns(); }"
      @add-book="goToAddBook"
    />

    <!-- 标签快速筛选（始终可见的输入框） -->
    <TagQuickFilter
      :selected-tags="filterConditions.tags"
      :available-tags="availableTags"
      :match-count="filteredBooks.length"
      @update:selected-tags="setTags"
    />

    <!-- 高级筛选弹窗 -->
    <AdvancedFilterDialog
      :show="showAdvancedFilter"
      :conditions="filterConditions"
      :available-tags="availableTags"
      :total-books="bookStore.allBooks.length"
      :filtered-count="filteredBooks.length"
      @update:show="showAdvancedFilter = $event"
      @update:conditions="(c) => { filterConditions = c; saveFilterConditions(); }"
      @reset="clearFilterConditions"
    />

    <!-- Tab切换 -->
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <button
        :class="['filter-btn', { 'filter-btn--active': hasActiveFilters }]"
        @click="toggleAdvancedFilter"
      >
        <svg class="filter-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h6V5H3zm10 0h-6v2h6v-2zm0 8h-6v2h6V5zm0 6h-6v2h6V9zm0 8h-6v2h6v-2zm2 0v2h6v-2h-6v2h6V5zm8 0h-6v2h6V5zm0 6h-6v2h6V9zm0 8h-6v2h6v-2zm2 0v2h6v-2h-6v2h6v-2z"/>
        </svg>
        筛选
        <span v-if="hasActiveFilters" class="filter-badge">{{ filteredBooks.length }}</span>
      </button>
      <select v-model="sortBy" class="filter-select">
        <option value="updateTime">更新时间</option>
        <option value="createTime">添加时间</option>
        <option value="title">书名</option>
        <option value="author">作者</option>
        <option value="rating">评分</option>
      </select>
    </div>

    <!-- 整理模式遮罩层 -->
    <OrganizeModeBar
      v-if="isOrganizeMode"
      :selected-book-count="selectedBookIds.length"
      :selected-group-count="selectedGroupIds.length"
      @select-all-books="selectAllBooks"
      @select-all-groups="selectAllGroups"
      @invert-selection="invertSelection"
      @scroll-to-top="scrollToTop"
      @pin-to-top="pinToTop"
      @move-to-start="moveToStart"
      @move-to-end="moveToEnd"
      @move-to-group="moveToGroup"
      @change-status="changeStatus"
      @delete-selected="deleteSelected"
      @exit-organize-mode="exitOrganizeMode"
    />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 书库页面 -->
      <div v-if="activeTab === 'library'" class="tab-content">
        <!-- 分组区域 -->
        <div v-if="isLoadingGroups || loadGroupsError || sortedGroups.length > 0" class="groups-section">
          <h3 v-if="!isOrganizeMode" class="section-title section-title--collapsible" @click="toggleGroupsCollapse">
            <svg :class="['collapse-icon', { 'collapse-icon--collapsed': isGroupsCollapsed }]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
            分组
          </h3>
          <div :class="['section-content', { 'section-content--collapsed': isGroupsCollapsed }]">
          <!-- 分组加载状态 -->
          <div v-if="isLoadingGroups" class="groups-loading">
            <div class="loading-spinner-small"></div>
            <span>加载分组中...</span>
          </div>
          <!-- 分组加载错误 -->
          <div v-else-if="loadGroupsError" class="groups-error">
            <span class="error-icon">⚠️</span>
            <span>{{ loadGroupsError }}</span>
            <button class="btn-retry btn-retry--small" @click="retryLoadGroups">重试</button>
          </div>
          <!-- 分组列表 -->
          <div v-else :class="['groups-grid', `book-grid-cols-${gridColumns}`, { 'groups-grid--organize': isOrganizeMode }]">
            <BookGroupCard
              v-for="group in sortedGroups"
              :key="group.id"
              :group="group"
              :books="groupBooks(group.id)"
              :max-thumbnails="groupThumbnailMax"
              :selected="selectedGroupIds.includes(group.id)"
              :is-organize-mode="isOrganizeMode"
              @click="isOrganizeMode ? toggleGroupSelection(group.id) : handleGroupClick(group.id)"
              @update-group="handleUpdateGroupName"
            />
          </div>
          </div>
        </div>

        <!-- 书籍区域 -->
        <div class="books-section">
          <!-- 面包屑导航 -->
          <div v-if="currentGroupId" class="breadcrumb-nav">
            <span class="breadcrumb-item" @click="backToAllBooks">全部书籍</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item breadcrumb-item--current">
              {{ currentGroup?.name }}
            </span>
          </div>
          <h3 v-else-if="!isOrganizeMode && sortedGroups.length > 0" class="section-title section-title--collapsible" @click="toggleBooksCollapse">
            <svg :class="['collapse-icon', { 'collapse-icon--collapsed': isBooksCollapsed }]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
            全部书籍
            <!-- 当前筛选条件 chip 展示 -->
            <span v-if="hasActiveFilters" class="filter-chips" @click.stop>
              <span
                v-for="chip in activeFilterChips"
                :key="chip.key"
                class="filter-chip"
                :title="`移除：${chip.label}`"
              >
                <span class="filter-chip__label">{{ chip.label }}</span>
                <button
                  type="button"
                  class="filter-chip__close"
                  aria-label="移除筛选"
                  @click.stop="chip.remove()"
                >×</button>
              </span>
            </span>
          </h3>

          <div :class="['section-content', { 'section-content--collapsed': isBooksCollapsed }]">
          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          
          <!-- 错误状态 -->
          <div v-else-if="loadError" class="error-state">
            <span class="error-icon">⚠️</span>
            <p>{{ loadError }}</p>
            <button class="btn-retry" @click="retryLoad">重试</button>
          </div>
          
          <template v-else>
            <div v-if="filteredBooks.length > 0" :class="['book-grid', `book-grid--${layout}`, layout === 'grid' ? `book-grid-cols-${gridColumns}` : '']">
            <div
              v-for="book in filteredBooks"
              :key="book.id"
              :class="['book-card', `book-card--${layout}`, { 'book-card--selected': selectedBookIds.includes(book.id), 'book-card--organize': isOrganizeMode }]"
              @click="isOrganizeMode ? toggleBookSelection(book.id) : goToBookDetail(String(book.id))"
              :title="book.title"
            >
              <!-- 整理模式下的选择复选框 -->
              <div v-if="isOrganizeMode" class="book-select-checkbox">
                <svg v-if="selectedBookIds.includes(book.id)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H6v-2h3v2zm0-3H6v-2h3v2zm0-3H6V8h3v2zm7 6h-5v-2h5v2zm0-3h-5v-2h5v2zm0-3h-5V8h5v2z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div class="book-card-inner" :style="getBookBorderStyle(book)">
                <div class="book-cover">
                  <img 
                    v-if="book.coverUrl || book.path" 
                    :src="book.coverUrl || getBookCoverUrl(book)" 
                    :alt="book.title" 
                    loading="lazy" 
                    decoding="async"
                    @load="handleImgLoad"
                    @error="handleImgError" 
                  />
                  <div v-else class="cover-placeholder">
                    <span>{{ book.title ? book.title.charAt(0) : '?' }}</span>
                  </div>
                  <div v-if="readingStore.progressDisplayMode === 'label'" :class="['read-status', `read-status--${book.readStatus}`]">{{ book.readStatus }}</div>
                </div>
                <div class="book-info">
                  <h3 class="book-title">{{ book.title || '未知书名' }}</h3>
                  <p class="book-author">{{ book.author || '未知作者' }}</p>
                  <ReadingProgressBarList v-if="readingStore.progressDisplayMode === 'progress' && book.read_pages && book.pages" :book="book" :show-duration="true" />
                  <div v-if="book.rating" class="book-rating">
                    <RatingDisplay :value="book.rating" :show-value="true" size="small" />
                  </div>
                </div>
              </div>
              <!-- 装帧包边 - 仅右下角 -->
              <BindingBorder
                :binding1="getBinding1(book)"
                :binding2="getBinding2(book)"
                :params="getBindingBorderParams(book)"
              />
              <div v-if="isOrganizeMode" class="book-actions">
                <button class="action-btn-sm" @click.stop="handleEdit(book.id)" title="编辑">
                  <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="action-btn-sm" @click.stop="handleDelete(book.id)" title="删除">
                  <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 加载更多指示器 -->
          <div v-if="isLoadingMore" class="loading-more">
            <div class="loading-spinner-small"></div>
            <span>加载更多...</span>
          </div>

          <!-- 加载更多失败 -->
          <div v-else-if="loadMoreError" class="load-more-error">
            <span>{{ loadMoreError }}</span>
            <button class="btn-retry-small" @click="retryLoadMore">重试</button>
          </div>

          <!-- 没有更多数据提示 -->
          <div v-else-if="!hasMoreBooks && usePagination && filteredBooks.length > 0" class="no-more-data">
            已加载全部 {{ filteredBooks.length }} 本书籍
          </div>

          <!-- 滚动加载哨兵（IntersectionObserver 触发点） -->
          <div
            v-if="usePagination && hasMoreBooks && !isLoadingMore && !loadMoreError && filteredBooks.length > 0"
            ref="loadMoreSentinelRef"
            class="load-more-sentinel"
          >
            <div class="sentinel-dot"></div>
            <span>下拉加载更多</span>
          </div>
          </template>
          
          <div v-if="!isLoading && !loadError && filteredBooks.length === 0" class="empty-state">
            <span class="empty-icon">📚</span>
            <p>暂无书籍</p>
            <button class="btn-primary" @click="goToAddBook">添加第一本书</button>
          </div>
        </div>
        </div>
      </div>

      <!-- 书单页面 -->
      <div v-if="activeTab === 'wishlist'" class="tab-content">
        <div class="wishlist-header">
          <h3>待购买书单</h3>
          <button class="btn-text" @click="showAddWishlist = true">+ 添加</button>
        </div>
        <WishlistPanel :wishlist="wishlist" @remove="removeFromWishlist" />
      </div>
    </div>

    <!-- 分组选择弹窗 -->
    <GroupSelectorDialog
      v-if="showGroupSelector"
      :show="showGroupSelector"
      :groups="groups"
      :selected-group-id="selectedGroupId"
      :editing-group-id="editingGroupId"
      :editing-group-name="editingGroupName"
      @update:show="showGroupSelector = $event"
      @select="selectedGroupId = $event"
      @start-edit="startEditGroupName"
      @save-name="saveGroupName"
      @cancel-edit="cancelEditGroupName"
      @create-new="() => { showGroupSelector = false; showAddGroup = true; }"
      @confirm="handleGroupConfirm"
    />

    <!-- 添加/编辑分组弹窗 -->
    <GroupEditDialog
      v-if="showAddGroup"
      :show="showAddGroup"
      :is-editing="!!editingGroup"
      :initial-name="editingGroup?.name || ''"
      @update:show="showAddGroup = $event"
      @save="saveGroup"
    />

    <!-- 删除确认弹窗 -->
    <DeleteConfirmDialog
      v-if="showDeleteConfirm"
      :show="showDeleteConfirm"
      message="确定要删除这本书吗？"
      warning="删除将会联级删除对应的全部数据，无法恢复。"
      @update:show="showDeleteConfirm = $event"
      @confirm="confirmDelete"
    />

    <!-- 状态选择弹窗 -->
    <div v-if="showStatusSelector" class="dialog-overlay" @click="showStatusSelector = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>设置阅读状态</span>
          <span class="dialog-close" @click="showStatusSelector = false">×</span>
        </div>
        <div class="dialog-body">
          <p>已选择 {{ selectedBookIds.length }} 本书</p>
          <div class="status-selector">
            <button
              :class="['status-btn', { active: newStatus === '未读' }]"
              @click="newStatus = '未读'"
            >
              <span class="status-dot status-dot--未读"></span>
              未读
            </button>
            <button
              :class="['status-btn', { active: newStatus === '在读' }]"
              @click="newStatus = '在读'"
            >
              <span class="status-dot status-dot--在读"></span>
              在读
            </button>
            <button
              :class="['status-btn', { active: newStatus === '已读' }]"
              @click="newStatus = '已读'"
            >
              <span class="status-dot status-dot--已读"></span>
              已读
            </button>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showStatusSelector = false">取消</button>
          <button class="btn btn-primary" @click="confirmChangeStatus">确定</button>
        </div>
      </div>
    </div>

    <!-- 返回顶部按钮 -->
    <transition name="fade">
      <button 
        v-if="showBackToTop" 
        class="back-to-top-btn" 
        @click="scrollToTop"
        title="返回顶部"
      >
        <svg viewBox="0 0 24 24">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      </button>
    </transition>


  </div>


</template>

<script setup lang="ts">
/**
 * 书库页面主组件（已模块化重构）
 *
 * 通过 composables 组合实现：
 * - useBookPagination: 书籍列表分页/加载
 * - useBookGroups: 分组管理
 * - useBookFilters: 筛选条件
 * - useBookList: 筛选/排序后的最终列表
 * - useOrganizeMode: 整理模式
 * - useWishlist: 书单管理
 * - useBookScroll: 滚动监听
 * - useBookLayout: 布局切换
 * - useBookImage: 图片加载处理
 *
 * 通过子组件实现：
 * - BookToolbar: 顶部工具栏
 * - TagQuickFilter: 标签快速筛选
 * - AdvancedFilterDialog: 高级筛选弹窗
 * - OrganizeModeBar: 整理模式操作栏
 * - GroupSelectorDialog / GroupEditDialog / DeleteConfirmDialog / WishlistPanel
 */
import { ref, computed, onMounted, onActivated, watch, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useBookStore } from '@/store/book';
import { useAppStore } from '@/store/app';
import { useReaderStore } from '@/store/reader';
import { useReadingStore } from '@/store/reading';
import { useBookBorderStore } from '@/store/bookBorder';
import { useBindingBorderStore } from '@/store/bindingBorder';
import { useBookViewSettings } from '@/composables/useBookViewSettings';

import { bookService } from '@/services/book';
import type { Book } from '@/services/book/types';
import type { WishlistItem } from '@/services/wishlistService';
import { BookStatus } from '@/store/bookBorder/types';
import {
  getBindingType,
  getHardcoverTexture,
  shouldShowOilEdge,
  getSpecialPattern,
  BindingBorderParams,
  Binding1Type,
  Binding2Type
} from '@/store/bindingBorder/types';

import BookGroupCard from '@/components/business/BookGroupCard/BookGroupCard.vue';
import ReadingProgressBarList from '@/components/ReadingProgressBarList/ReadingProgressBarList.vue';
import BindingBorder from '@/components/business/BindingBorder/BindingBorder.vue';
import RatingDisplay from '@/components/business/RatingDisplay.vue';

import { useBookFilters } from './composables/useBookFilters';
import { useBookPagination } from './composables/useBookPagination';
import { useBookGroups } from './composables/useBookGroups';
import { useBookList, type SortBy } from './composables/useBookList';
import { useOrganizeMode } from './composables/useOrganizeMode';
import { useWishlist } from './composables/useWishlist';
import { useBookScroll } from './composables/useBookScroll';
import { useBookLayout } from './composables/useBookLayout';
import { useBookImage } from './composables/useBookImage';

import { getBookStatus, getBookBorderStyle } from './utils/bookDisplay';

import BookToolbar from './components/BookToolbar.vue';
import TagQuickFilter from './components/TagQuickFilter.vue';
import AdvancedFilterDialog from './components/AdvancedFilterDialog.vue';
import OrganizeModeBar from './components/OrganizeModeBar.vue';
import GroupSelectorDialog from './components/GroupSelectorDialog.vue';
import GroupEditDialog from './components/GroupEditDialog.vue';
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue';
import WishlistPanel from './components/WishlistPanel.vue';

import './index.css';

const router = useRouter();
const route = useRoute();

const bookStore = useBookStore();
const appStore = useAppStore();
const readerStore = useReaderStore();
const readingStore = useReadingStore();
const borderStore = useBookBorderStore();
const bindingBorderStore = useBindingBorderStore();
const { books: storeBooks } = storeToRefs(bookStore);

// ============ 视图设置 ============
const {
  layout,
  gridColumns,
  manualColumnCount,
  setLayout: setViewLayout,
  toggleLayout: toggleViewLayout,
  setGridColumns: setViewGridColumns,
  applyManualColumns: applyViewManualColumns,
  useAutoColumns: useViewAutoColumns
} = useBookViewSettings();
const { toggleLayout: toggleLayoutWithStore, setGridColumns: setGridColumnsCompat, applyManualColumns, toggleManualColumns } = useBookLayout();

const { showBackToTop, toggleGroupsCollapse, toggleBooksCollapse, isGroupsCollapsed, isBooksCollapsed, scrollToTop, setupIntersectionObserver: setupBookScrollObserver } = useBookScroll({
  onReachBottom: () => {},
  isEnabled: () => false
});

// ============ 筛选条件 ============
const {
  filterConditions,
  availableTags,
  availablePublishers,
  availableAuthors,
  hasActiveFilters,
  activeFilterChips,
  toggleTagFilter,
  setTags,
  clearFilterConditions,
  saveFilterConditions,
  loadFilterConditions
} = useBookFilters();

const filterStatus = ref('');
const sortBy = ref<SortBy>('createTime');
const showAdvancedFilter = ref(false);
const resetFilters = () => clearFilterConditions();

const advancedTagSearch = ref('');
const filteredAdvancedTags = computed(() => {
  const q = advancedTagSearch.value.trim().toLowerCase();
  if (!q) return availableTags.value;
  return availableTags.value.filter(t => t.toLowerCase().includes(q));
});

const groupThumbnailMax = computed(() => appStore.groupThumbnailMax);

// ============ 分页与加载 ============
const {
  isLoading,
  isLoadingMore,
  hasMoreBooks,
  currentPage,
  pageSize,
  totalBooksCount,
  displayBooks,
  loadError,
  loadMoreError,
  usePagination,
  loadMoreSentinelRef,
  loadBooksCount,
  loadBooksFirstPage,
  loadMoreBooks,
  retryLoad,
  retryLoadMore,
  setupIntersectionObserver
} = useBookPagination();

// ============ 整理模式（依赖 selectedBookIds/selectedGroupIds，先用占位 ref） ============
const _selectedBookIdsForGroups = ref<number[]>([]);
const _selectedGroupIdsForGroups = ref<string[]>([]);

// ============ 分组管理 ============
const {
  groups,
  isLoadingGroups,
  loadGroupsError,
  currentGroupId,
  showAddGroup,
  showGroupSelector,
  selectedGroupId,
  groupName,
  editingGroup,
  editingGroupId,
  editingGroupName,
  sortedGroups,
  currentGroup,
  groupBooksMap,
  groupThumbnailBooksMap,
  groupBooks,
  loadGroups,
  retryLoadGroups,
  handleGroupClick,
  backToAllBooks,
  editGroup,
  saveGroup,
  deleteGroup,
  startEditGroupName,
  cancelEditGroupName,
  saveGroupName,
  handleUpdateGroupName,
  moveToGroup: openGroupSelector,
  handleGroupConfirm
} = useBookGroups({
  displayBooks,
  usePagination,
  pageSize,
  hasMoreBooks,
  currentPage,
  isLoading,
  selectedBookIds: _selectedBookIdsForGroups,
  selectedGroupIds: _selectedGroupIdsForGroups
});

// ============ 筛选/排序后的最终列表 ============
const { filteredBooks } = useBookList({
  filterConditions,
  filterStatus,
  sortBy,
  currentGroupId,
  usePagination,
  displayBooks
});

// ============ 整理模式 ============
const {
  isOrganizeMode,
  selectedBookIds,
  selectedGroupIds,
  showStatusSelector,
  newStatus,
  startOrganizeMode,
  exitOrganizeMode,
  toggleBookSelection,
  toggleGroupSelection,
  selectAllBooks,
  selectAllGroups,
  invertSelection,
  pinToTop,
  moveToStart,
  moveToEnd,
  changeStatus,
  confirmChangeStatus,
  deleteSelected
} = useOrganizeMode({
  onMoveToGroup: openGroupSelector,
  onReload: loadData,
  filteredBooks,
  sortedGroups,
  currentGroupId
});
// 同步到 useBookGroups 使用的占位 ref
watch([selectedBookIds, selectedGroupIds], () => {
  _selectedBookIdsForGroups.value = selectedBookIds.value;
  _selectedGroupIdsForGroups.value = selectedGroupIds.value;
}, { deep: true });

// ============ 书单 ============
const { wishlist, showAddWishlist, loadWishlist, addToWishlist, removeFromWishlist } = useWishlist();

// ============ 滚动监听（无限滚动回调接 loadMoreBooks）============
useBookScroll({
  onReachBottom: () => {
    if (hasMoreBooks.value && !isLoadingMore.value && !isLoading.value) {
      loadMoreBooks();
    }
  },
  isEnabled: () => usePagination.value && hasMoreBooks.value && !isOrganizeMode.value
});

// ============ 图片处理 ============
const { handleImgLoad, handleImgError, getBookCoverUrl: resolveCoverUrl } = useBookImage();
// 模板中仍使用 getBookCoverUrl 作为别名
const getBookCoverUrl = resolveCoverUrl;

// ============ 装帧边框样式（与原内联实现一致）============
const getBindingBorderParams = (book: Book): BindingBorderParams => {
  const binding1 = (book.binding1 ?? 1) as Binding1Type;
  const binding2 = (book.binding2 ?? 0) as Binding2Type;
  const type = getBindingType(binding1);
  const settings = bindingBorderStore.settings;
  switch (type) {
    case 'ebook':
      return { ...settings.ebook };
    case 'paperback':
      return { ...settings.paperback };
    case 'hardcover': {
      const texture = getHardcoverTexture(binding2);
      const oilEdge = shouldShowOilEdge(binding2);
      return { ...settings.hardcover, texture, oilEdgeEnabled: oilEdge };
    }
    case 'special': {
      const pattern = getSpecialPattern(binding2);
      return { ...settings.special, texture: pattern };
    }
    default:
      return settings.paperback;
  }
};

const getBinding1 = (book: Book): Binding1Type => (book.binding1 ?? 1) as Binding1Type;
const getBinding2 = (book: Book): Binding2Type => (book.binding2 ?? 0) as Binding2Type;

const getBinding1Name = (value: number): string => {
  const map: Record<number, string> = { 0: '电子书', 1: '纸质书', 2: '有声书', 3: '其他' };
  return map[value] || '未知';
};
const getBinding2Name = (value: number): string => {
  const map: Record<number, string> = {
    0: '无装帧', 1: '无线胶装', 2: '骑马钉装订', 3: '活页装订', 4: '锁线胶装',
    5: '硬壳精装（圆脊）', 6: '硬壳精装（方脊）', 7: '布面精装', 8: 'PU皮面精装',
    9: '真皮精装（头层牛皮）', 10: '真皮精装（羊皮）', 11: '仿皮（人造革）精装',
    12: '线装', 13: '经折装'
  };
  return map[value] || '未知';
};

// ============ 删除确认 ============
const showDeleteConfirm = ref(false);
const deletingBookId = ref<number>(0);
const handleDelete = (id: number) => {
  deletingBookId.value = id;
  showDeleteConfirm.value = true;
};
const confirmDelete = async () => {
  try {
    await bookService.deleteBook(deletingBookId.value);
    bookStore.deleteBook(deletingBookId.value);
    showDeleteConfirm.value = false;
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// ============ 导航 ============
const goToSearch = () => router.push('/search');
const goToAddBook = () => router.push('/book/edit');
const goToISBN = () => router.push('/book/isbn-search');
const goToBatchScanner = () => router.push('/book/batch-scanner');
const goToBookDetail = (id: string) => router.push(`/book/detail/${id}`);
const handleEdit = (id: number) => router.push(`/book/edit/${id}`);

// ============ 高级筛选开关 ============
const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value;
  if (showAdvancedFilter.value) advancedTagSearch.value = '';
};

// ============ 加载数据 ============
async function loadData() {
  isLoading.value = true;
  try {
    appStore.loadSettings();
    bookStore.setLayout(layout.value);

    if (selectedBookIds.value.length > 0 || selectedGroupIds.value.length > 0) {
      selectedBookIds.value = [];
      selectedGroupIds.value = [];
    }

    await loadBooksCount();
    await loadGroups();

    const hasGroupFilter = !!currentGroupId.value;
    const needsFullData = hasGroupFilter || hasActiveFilters.value;
    const hasGroups = groups.value.length > 0;

    if (usePagination.value && !needsFullData) {
      if (hasGroups) {
        try {
          const allBooks = await bookService.getAllBooks(readerStore.currentReaderId);
          bookStore.setBooks(allBooks);
          displayBooks.value = allBooks.slice(0, pageSize.value);
          hasMoreBooks.value = allBooks.length > pageSize.value;
          currentPage.value = 1;
        } catch (error) {
          console.error('加载书籍失败:', error);
          await loadBooksFirstPage();
        }
      } else {
        await loadBooksFirstPage();
      }
    } else {
      try {
        const books = await bookService.getAllBooks(readerStore.currentReaderId);
        bookStore.setBooks(books);
        displayBooks.value = books;
        hasMoreBooks.value = false;
      } catch (error) {
        console.error('加载书籍失败:', error);
      }
    }

    try {
      await loadWishlist();
    } catch (error) {
      console.error('加载愿望清单失败:', error);
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  await loadData();
  loadFilterConditions();
  readingStore.loadProgressDisplayMode();
  if (route.query.status) {
    filterStatus.value = route.query.status as string;
  }
  await nextTick();
  setupIntersectionObserver();
});

onActivated(async () => {
  await loadData();
});

watch(() => readerStore.currentReaderId, async (newReaderId, oldReaderId) => {
  if (newReaderId !== oldReaderId) {
    await loadData();
  }
});

watch(
  () => [filterConditions.value.tags, filterConditions.value.readStatus, currentGroupId.value, hasMoreBooks.value, isLoadingMore.value],
  async () => {
    await nextTick();
    setupIntersectionObserver();
  }
);

watch(
  () => route.path,
  (newPath, oldPath) => {
    if (newPath === '/book' && oldPath && oldPath.startsWith('/book/')) {
      loadData();
    }
  }
);

onUnmounted(() => {
  // useBookScroll 自行清理
});

// ============ Tab 配置 ============
const tabs = computed(() => [
  { key: 'library', label: '书库', count: usePagination.value ? totalBooksCount.value : bookStore.allBooks.length },
  { key: 'wishlist', label: '书单' }
]);
const activeTab = ref('library');

// 暴露工具函数给模板（保持兼容）
const __keepRefs = { showBackToTop, isGroupsCollapsed, isBooksCollapsed, toggleGroupsCollapse, toggleBooksCollapse };
</script>




<style>
/* 全局样式：整理模式下隐藏底部导航栏 */
body.organize-mode-active .bottom-nav {
  display: none !important;
}

/* 整理模式下调整内容底部间距 */
body.organize-mode-active .main-content {
  padding-bottom: 72px !important;
}

@media (max-width: 640px) {
  body.organize-mode-active .main-content {
    padding-bottom: 64px !important;
  }
}

@media (max-width: 480px) {
  body.organize-mode-active .main-content {
    padding-bottom: 56px !important;
  }
}
</style>