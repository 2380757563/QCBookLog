<!-- 书评篇：本年书评选登 -->
<template>
  <SectionShell
    :index="7"
    title="书评篇"
    :caption="caption"
    anchor="reviews"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div v-if="items.length" class="reviews">
      <article v-for="(item, i) in items" :key="i" class="review">
        <header class="review__head">
          <span class="review__title">{{ item.title || '（无标题书评）' }}</span>
          <span v-if="item.rating" class="review__rating">{{ Number(item.rating).toFixed(1) }} 分</span>
        </header>
        <p v-if="item.excerpt" class="review__excerpt">{{ item.excerpt }}</p>
        <footer class="review__source">
          《{{ item.bookTitle || '未知书籍' }}》<span v-if="item.bookAuthor">{{ item.bookAuthor }}</span>
        </footer>
      </article>
    </div>

    <p v-if="truncatedHint" class="truncated">{{ truncatedHint }}</p>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, isMeaningfulBlock } from '../../composables/useReportContext';

const ctx = useReportContext();

const MAX_SHOW = 5;

const reviewsBlock = computed(() => ctx.section('reviews') ?? {});
const text = computed(() => ctx.text('reviews'));
const empty = computed(() => !isMeaningfulBlock(reviewsBlock.value));

const allItems = computed<any[]>(() => {
  const raw = reviewsBlock.value.items;
  return Array.isArray(raw) ? raw.filter(it => it && (it.title || it.excerpt)) : [];
});

const items = computed(() => allItems.value.slice(0, MAX_SHOW));

const caption = computed(() => {
  const total = Number(reviewsBlock.value.total);
  return total > 0 ? `全年 ${total} 篇` : '';
});

const truncatedHint = computed(() => {
  const total = Number(reviewsBlock.value.total) || 0;
  const shown = items.value.length;
  if (total > shown && shown > 0) {
    return `本页选登 ${shown} 篇，另有 ${total - shown} 篇未展示。`;
  }
  return '';
});
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.review {
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.72);
  border: 1px solid rgba(201, 162, 39, 0.18);
}

.review:last-child {
  margin-bottom: 0;
}

.review__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}

.review__title {
  font-size: 15px;
  font-weight: 600;
  color: #2b2118;
}

.review__rating {
  margin-left: auto;
  font-family: Georgia, serif;
  font-size: 13px;
  color: #c9a227;
}

.review__excerpt {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.95;
  color: #4a3d2f;
  white-space: pre-wrap;
  word-break: break-word;
}

.review__source {
  font-size: 12px;
  color: #9c8b73;
}

.truncated {
  margin: 16px 0 0;
  font-size: 12px;
  color: #a99983;
  text-align: right;
}
</style>
