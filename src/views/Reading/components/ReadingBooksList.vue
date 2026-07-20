<template>
  <div class="reading-books-list">
    <!-- 在读书籍 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📖 正在阅读</span>
        <span class="card-action" @click="handleViewAll">查看全部 &gt;</span>
      </div>
      <div v-if="readingBooks.length > 0" class="book-list">
        <div
          v-for="book in readingBooks.slice(0, 3)"
          :key="book.id"
          class="book-item"
          @click="handleBookClick(book.id)"
        >
          <div class="book-cover">
            <img v-if="getBookCoverUrl(book)" :src="getBookCoverUrl(book)" :alt="book.title" @load="handleImgLoad" @error="handleImgError" />
            <div v-else class="cover-placeholder">{{ book.title.charAt(0) }}</div>
          </div>
          <div class="book-info">
            <div class="book-title">{{ book.title }}</div>
            <div class="book-author">{{ book.author }}</div>
            <div v-if="book.read_pages !== undefined && book.pages && book.pages > 0" class="book-progress">
              <!-- 进度条 -->
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: getProgressPercent(book) + '%' }"></div>
              </div>
              <!-- 已读/总页数 + 百分比 -->
              <div class="progress-meta">
                <span class="progress-pages">已读{{ book.read_pages || 0 }}页/共{{ book.pages }}页</span>
                <span class="progress-percent">{{ getProgressPercent(book) }}%</span>
              </div>
              <!-- 阅读时长/次数（如果有） -->
              <div v-if="book.total_reading_time || book.last_read_date" class="progress-extra">
                <span v-if="book.total_reading_time" class="extra-item">⏱ {{ formatDuration(book.total_reading_time) }}</span>
                <span v-if="book.last_read_date" class="extra-item">📅 {{ formatDate(book.last_read_date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon">📚</span>
        <p>暂无在读书籍</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBookImage } from '@/views/Book/composables/useBookImage';
import { useBookStore } from '@/stores/book';

// 书籍接口
interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
  path?: string;
  readStatus: string;
  read_pages?: number;
  pages?: number;
  total_reading_time?: number;
  last_read_date?: string | null;
}

const router = useRouter();
const { handleImgLoad, handleImgError, getBookCoverUrl } = useBookImage();
const bookStore = useBookStore();

// 在读书籍
const readingBooks = computed(() => {
  return bookStore.allBooks.filter((b: Book) => b.readStatus === '在读');
});

// 计算阅读进度百分比
const getProgressPercent = (book: Book): number => {
  if (!book.pages || book.pages === 0) return 0;
  const readPages = book.read_pages || 0;
  return Math.min(100, Math.round((readPages / book.pages) * 100));
};

// 格式化阅读时长
const formatDuration = (minutes: number): string => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

// 格式化日期
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

// 查看全部
const handleViewAll = () => {
  router.push({ path: '/book', query: { status: 'reading' } });
};

// 点击书籍
const handleBookClick = (id: number) => {
  router.push(`/book/detail/${id}`);
};
</script>

<style scoped lang="scss">
.reading-books-list {
  width: 100%;
}

.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-action {
      font-size: 14px;
      color: var(--primary-color);
      cursor: pointer;
      transition: opacity 0.3s ease;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .book-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .book-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--bg-tertiary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .book-cover {
      flex-shrink: 0;
      width: 60px;
      height: 90px;
      border-radius: var(--radius-md);
      overflow: hidden;
      background-color: var(--bg-tertiary);

      img {
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
        font-size: 24px;
        font-weight: 600;
        color: var(--primary-color);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
    }

    .book-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;

      .book-title {
        font-size: 15px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .book-author {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .book-progress {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: auto;

        .progress-track {
          width: 100%;
          height: 6px;
          background-color: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff8c5a 0%, #ff6b35 100%);
            border-radius: 3px;
            transition: width 0.3s ease;
          }
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;

          .progress-pages {
            color: var(--text-secondary);
          }

          .progress-percent {
            font-weight: 600;
            color: #ff6b35;
          }
        }

        .progress-extra {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--text-hint);

          .extra-item {
            display: flex;
            align-items: center;
            gap: 2px;
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-hint);

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    p {
      font-size: 14px;
      margin: 0;
    }
  }
}
</style>
