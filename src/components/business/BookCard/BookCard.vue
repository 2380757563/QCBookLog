<template>
  <div
    :class="[
      'xm-book-card',
      `xm-book-card--${layout}`,
      {
        'xm-book-card--hover': showActions
      }
    ]"
    @click="handleClick"
  >
    <!-- 书籍封面 -->
    <div class="book-card__cover-wrapper">
      <img
        v-if="book.localCoverData || book.coverUrl"
        :src="book.localCoverData || book.coverUrl"
        :alt="book.title"
        class="book-card__cover"
        loading="lazy"
      />
      <div
        v-else
        class="book-card__cover book-card__cover--placeholder"
      >
        <span class="book-card__cover-placeholder-text">{{ book.title.charAt(0) }}</span>
      </div>
      <div class="book-card__read-status" :class="`book-card__read-status--${book.readStatus}`">
        {{ book.readStatus }}
      </div>
    </div>

    <!-- 书籍信息 -->
    <div class="book-card__info">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>
      
      <!-- 评分 -->
      <div v-if="book.rating" class="book-card__rating">
        <span class="book-card__rating-text">{{ book.rating.toFixed(1) }}</span>
        <div class="book-card__rating-stars">
          <span
            v-for="i in 5"
            :key="i"
            class="book-card__rating-star"
            :class="{
              'book-card__rating-star--filled': i <= Math.floor(book.rating),
              'book-card__rating-star--half': i > Math.floor(book.rating) && i < book.rating + 1
            }"
          >
            ★
          </span>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="book.tags.length > 0" class="book-card__tags">
        <span
          v-for="tag in book.tags.slice(0, 3)"
          :key="tag"
          class="book-card__tag"
        >
          {{ tag }}
        </span>
        <span v-if="book.tags.length > 3" class="book-card__tag-more">
          +{{ book.tags.length - 3 }}
        </span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="showActions" class="book-card__actions">
      <button
        class="book-card__action-btn book-card__action-btn--view"
        @click.stop="handleViewBookmarks"
        title="查看书摘"
      >
        📝
      </button>
      <button
        class="book-card__action-btn book-card__action-btn--edit"
        @click.stop="handleEdit"
        title="编辑"
      >
        ✏️
      </button>
      <button
        class="book-card__action-btn book-card__action-btn--delete"
        @click.stop="handleDelete"
        title="删除"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookCardProps, BookCardEmits } from './types';

const props = withDefaults(defineProps<BookCardProps>(), {
  layout: 'grid',
  showActions: true
});

const emit = defineEmits<BookCardEmits>();

const handleClick = () => {
  emit('click', props.book.id);
};

const handleEdit = () => {
  emit('edit', props.book.id);
};

const handleDelete = () => {
  emit('delete', props.book.id);
};

const handleViewBookmarks = () => {
  emit('viewBookmarks', props.book.id);
};
</script>

<style scoped>
.xm-book-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.xm-book-card--grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 200px;
}

.xm-book-card--list {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
}

.xm-book-card--hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 封面样式 */
.book-card__cover-wrapper {
  position: relative;
  width: 100%;
  padding-top: 133.33%; /* 3:4 比例 */
  overflow: hidden;
  background-color: #f5f5f5;
}

.xm-book-card--list .book-card__cover-wrapper {
  width: 80px;
  height: 107px;
  padding-top: 0;
  margin-right: 16px;
}

.book-card__cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.xm-book-card--hover:hover .book-card__cover {
  transform: scale(1.05);
}

.book-card__cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  color: #666;
  font-size: 48px;
}

.xm-book-card--list .book-card__cover--placeholder {
  font-size: 32px;
}

.book-card__cover-placeholder-text {
  line-height: 1;
}

/* 阅读状态标签 */
.book-card__read-status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}

.book-card__read-status--未读 {
  background-color: #999;
}

.book-card__read-status--在读 {
  background-color: #3498db;
}

.book-card__read-status--已读 {
  background-color: #2ecc71;
}

/* 信息部分 */
.book-card__info {
  padding: 12px;
  flex: 1;
}

.xm-book-card--list .book-card__info {
  flex: 1;
  padding: 0;
}

.book-card__title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.xm-book-card--list .book-card__title {
  -webkit-line-clamp: 1;
  font-size: 18px;
}

.book-card__author {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 评分 */
.book-card__rating {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.book-card__rating-text {
  margin-right: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #f39c12;
}

.book-card__rating-stars {
  display: flex;
}

.book-card__rating-star {
  font-size: 14px;
  color: #ddd;
}

.book-card__rating-star--filled {
  color: #f39c12;
}

.book-card__rating-star--half {
  background: linear-gradient(90deg, #f39c12 50%, #ddd 50%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 标签 */
.book-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.book-card__tag {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.book-card__tag-more {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

/* 操作按钮 */
.book-card__actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.xm-book-card--hover:hover .book-card__actions {
  opacity: 1;
}

.xm-book-card--list .book-card__actions {
  position: static;
  opacity: 1;
  margin-left: auto;
}

.book-card__action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.book-card__action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.book-card__action-btn--view:hover {
  background-color: #e3f2fd;
}

.book-card__action-btn--edit:hover {
  background-color: #fff3e0;
}

.book-card__action-btn--delete:hover {
  background-color: #ffebee;
}
</style>
