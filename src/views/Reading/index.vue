<template>
  <div class="reading-container">
    <!-- 顶部导航 -->
    <ReadingHeader v-model="activeTab" />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 在读页面 -->
      <div v-show="activeTab === 'reading'" class="tab-content">
        <!-- 今年已读计划 -->
        <ReadingGoalCard ref="goalCardRef" :reading-stats="readingStats" />

        <!-- 阅读热力图（卷轴式全景布局） -->
        <ReadingHeatmap />

        <!-- 在读书籍 -->
        <ReadingBooksList />
      </div>

      <!-- 时间线页面 -->
      <TimelinePage v-if="activeTab === 'timeline'" />

      <!-- 统计页面 -->
      <StatsPage v-if="activeTab === 'stats'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBookStore } from '@/store/book';
import { useBookmarkStore } from '@/store/bookmark';
import { bookService } from '@/services/book';
import { bookmarkService } from '@/services/bookmark';
import ReadingHeader from './components/ReadingHeader.vue';
import ReadingGoalCard from './components/ReadingGoalCard.vue';
import ReadingBooksList from './components/ReadingBooksList.vue';
import ReadingHeatmap from './components/ReadingHeatmap.vue';
import TimelinePage from './components/TimelinePage.vue';
import StatsPage from './components/StatsPage.vue';
const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();

const activeTab = ref('reading');
const goalCardRef = ref<InstanceType<typeof ReadingGoalCard> | null>(null);

const readingStats = computed(() => {
  const books = bookStore.allBooks;
  const bookmarks = bookmarkStore.allBookmarks;
  const thisYear = new Date().getFullYear();
  
  return {
    totalBooks: books.length,
    readBooks: books.filter(b => b.readStatus === '已读').length,
    readingBooks: books.filter(b => b.readStatus === '在读').length,
    unreadBooks: books.filter(b => b.readStatus === '未读').length,
    totalBookmarks: bookmarks.length,
    totalSpent: books.reduce((sum, b) => sum + (b.purchasePrice || 0), 0),
    totalStandardPrice: books.reduce((sum, b) => sum + (b.standardPrice || 0), 0),
    readThisYear: books.filter(b => {
      if (b.readStatus !== '已读' || !b.readCompleteDate) return false;
      return new Date(b.readCompleteDate).getFullYear() === thisYear;
    }).length
  };
});

onMounted(async () => {

  if (goalCardRef.value) {
    goalCardRef.value.loadGoal();
  }

  try {

    const books = await bookService.getAllBooks();

    console.log('📚 书籍列表:', books.map(b => ({ id: b.id, title: b.title })));
    bookStore.setBooks(books);

    const bookmarks = await bookmarkService.getAllBookmarks();
    bookmarkStore.setBookmarks(bookmarks);
  } catch (error) {
    console.error('❌ 加载数据失败:', error);
  }
});
</script>

<style scoped>
.reading-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.content {
  padding: 16px;
}

@media (max-width: 768px) {
  .content {
    padding: 8px;
  }
}

.tab-content {
  /* 移除动画，提升切换速度 */
}

.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

@media (max-width: 768px) {
  .card {
    padding: 12px;
    margin-bottom: 12px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .card-header {
    margin-bottom: 12px;
  }
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .card-title {
    font-size: 14px;
  }
}

.card-action {
  font-size: 14px;
  color: var(--text-hint);
  cursor: pointer;
}

@media (max-width: 768px) {
  .card-action {
    font-size: 12px;
  }
}
</style>
