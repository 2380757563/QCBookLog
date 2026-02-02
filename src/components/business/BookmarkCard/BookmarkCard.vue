<template>
  <div
    :class="[
      'xm-bookmark-card',
      {
        'xm-bookmark-card--hover': showActions
      }
    ]"
    @click="handleClick"
  >
    <!-- 书籍标题 -->
    <div v-if="showBookTitle && bookmark.bookTitle" class="bookmark-card__book-title">
      {{ bookmark.bookTitle }}
    </div>

    <!-- 书摘内容 -->
    <div class="bookmark-card__content" v-html="formattedContent"></div>

    <!-- 笔记 -->
    <div v-if="bookmark.note" class="bookmark-card__note">
      <div class="bookmark-card__note-label">笔记：</div>
      <div class="bookmark-card__note-content">{{ bookmark.note }}</div>
    </div>

    <!-- 页脚信息 -->
    <div class="bookmark-card__footer">
      <!-- 页码 -->
      <span v-if="bookmark.pageNum" class="bookmark-card__page-num">
        第 {{ bookmark.pageNum }} 页
      </span>

      <!-- 创建时间 -->
      <span class="bookmark-card__create-time">
        {{ formatDate(bookmark.createTime) }}
      </span>

      <!-- 标签 -->
      <div v-if="bookmark.tags.length > 0" class="bookmark-card__tags">
        <span
          v-for="tag in bookmark.tags"
          :key="tag"
          class="bookmark-card__tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="showActions" class="bookmark-card__actions">
      <button
        class="bookmark-card__action-btn bookmark-card__action-btn--edit"
        @click.stop="handleEdit"
        title="编辑"
      >
        ✏️
      </button>
      <button
        class="bookmark-card__action-btn bookmark-card__action-btn--delete"
        @click.stop="handleDelete"
        title="删除"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BookmarkCardProps, BookmarkCardEmits } from './types';

const props = withDefaults(defineProps<BookmarkCardProps>(), {
  showBookTitle: true,
  showActions: true
});

const emit = defineEmits<BookmarkCardEmits>();

// 格式化富文本内容
const formattedContent = computed(() => {
  return props.bookmark.content
    // 替换加粗标记
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 替换斜体标记
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 替换引用标记
    .replace(/>(.*?)\n/g, '<blockquote>$1</blockquote>')
    // 替换换行符
    .replace(/\n/g, '<br>');
});

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const handleClick = () => {
  emit('click', props.bookmark.id);
};

const handleEdit = () => {
  emit('edit', props.bookmark.id);
};

const handleDelete = () => {
  emit('delete', props.bookmark.id);
};
</script>

<style scoped>
.xm-bookmark-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.xm-bookmark-card--hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 书籍标题 */
.bookmark-card__book-title {
  font-size: 16px;
  font-weight: 600;
  color: #3498db;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 书摘内容 */
.bookmark-card__content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.bookmark-card__content strong {
  font-weight: 600;
}

.bookmark-card__content em {
  font-style: italic;
}

.bookmark-card__content blockquote {
  margin: 8px 0;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-left: 4px solid #3498db;
  border-radius: 4px;
  font-style: italic;
}

/* 笔记 */
.bookmark-card__note {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #fff9c4;
  border-radius: 4px;
  font-size: 14px;
}

.bookmark-card__note-label {
  font-weight: 500;
  color: #f39c12;
  margin-bottom: 4px;
}

.bookmark-card__note-content {
  color: #666;
  line-height: 1.5;
  word-break: break-word;
}

/* 页脚信息 */
.bookmark-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #999;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.bookmark-card__page-num {
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 标签 */
.bookmark-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}

.bookmark-card__tag {
  padding: 2px 6px;
  background-color: #e3f2fd;
  border-radius: 4px;
  font-size: 12px;
  color: #3498db;
}

/* 操作按钮 */
.bookmark-card__actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.xm-bookmark-card--hover:hover .bookmark-card__actions {
  opacity: 1;
}

.bookmark-card__action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.bookmark-card__action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.bookmark-card__action-btn--edit:hover {
  background-color: #fff3e0;
}

.bookmark-card__action-btn--delete:hover {
  background-color: #ffebee;
}
</style>
