<!-- 阅读篇：完成量 / 页数 / 时长 / 书目 -->
<template>
  <SectionShell
    :index="3"
    title="阅读篇"
    :caption="caption"
    anchor="reading"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div class="metrics">
      <div class="metric">
        <span class="metric__value">{{ reading.completedCount || 0 }}</span>
        <span class="metric__label">读完</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ reading.totalPages || 0 }}</span>
        <span class="metric__label">总页数</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ reading.totalDurationText || '—' }}</span>
        <span class="metric__label">阅读时长</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ avgRatingText }}</span>
        <span class="metric__label">平均评分</span>
      </div>
    </div>

    <ul v-if="recentBooks.length" class="book-list">
      <li v-for="(book, i) in recentBooks" :key="`${book.title}-${i}`" class="book-item">
        <span class="book-item__index">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="book-item__main">
          <span class="book-item__title">《{{ book.title || '未命名' }}》</span>
          <span v-if="book.author" class="book-item__author">{{ book.author }}</span>
        </div>
        <span v-if="book.rating" class="book-item__rating">{{ Number(book.rating).toFixed(1) }}</span>
      </li>
    </ul>

    <div v-if="mostRead.length" class="most-read">
      <span class="most-read__tag">投入最多</span>
      <span v-for="book in mostRead" :key="book.title" class="most-read__item">
        《{{ book.title }}》<em>{{ book.humanized || `${book.minutes || 0} 分钟` }}</em>
      </span>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, isMeaningfulBlock } from '../../composables/useReportContext';

const ctx = useReportContext();

const reading = computed(() => ctx.section('reading') ?? {});
const text = computed(() => ctx.text('reading'));
const empty = computed(() => !isMeaningfulBlock(reading.value));

const avgRatingText = computed(() => {
  const r = Number(reading.value.avgRating);
  return isFinite(r) && r > 0 ? r.toFixed(1) : '—';
});

const recentBooks = computed<any[]>(() => {
  const raw = reading.value.recentCompleted;
  return Array.isArray(raw) ? raw.slice(0, 10) : [];
});

const mostRead = computed<any[]>(() => {
  const raw = reading.value.mostRead;
  return Array.isArray(raw) ? raw.slice(0, 3) : [];
});

const caption = computed(() => (reading.value.activeDays ? `${reading.value.activeDays} 天有记录` : ''));
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 26px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border: 1px solid rgba(201, 162, 39, 0.25);
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.7);
}

.metric__value {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  color: #8c6239;
}

.metric__label {
  font-size: 12px;
  color: #9c8b73;
}

.book-list {
  margin: 0 0 22px;
  padding: 0;
  list-style: none;
}

.book-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed rgba(201, 191, 174, 0.6);
}

.book-item:last-child {
  border-bottom: none;
}

.book-item__index {
  font-family: Georgia, serif;
  font-size: 12px;
  color: #c9a227;
}

.book-item__main {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.book-item__title {
  font-size: 15px;
  color: #2b2118;
}

.book-item__author {
  font-size: 12px;
  color: #9c8b73;
}

.book-item__rating {
  margin-left: auto;
  font-family: Georgia, serif;
  font-size: 14px;
  color: #8c6239;
}

.most-read {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 16px;
  border-left: 3px solid #c9a227;
  background: rgba(255, 253, 247, 0.7);
}

.most-read__tag {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #c9a227;
}

.most-read__item {
  font-size: 13px;
  color: #4a3d2f;
}

.most-read__item em {
  margin-left: 6px;
  font-style: normal;
  color: #9c8b73;
}

@media (max-width: 640px) {
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
