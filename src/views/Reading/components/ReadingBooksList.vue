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
            <ReadingProgressBarList v-if="book.read_pages && book.pages" :book="{ ...book, read_pages: book.read_pages }" :show-duration="true" />
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
import { useBookStore } from '@/store/book';
import ReadingProgressBarList from '@/components/ReadingProgressBarList/ReadingProgressBarList.vue';

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
}

const router = useRouter();
const { handleImgLoad, handleImgError, getBookCoverUrl } = useBookImage();
const bookStore = useBookStore();

// 在读书籍
const readingBooks = computed(() => {
  return bookStore.allBooks.filter((b: Book) => b.readStatus === '在读');
});

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
