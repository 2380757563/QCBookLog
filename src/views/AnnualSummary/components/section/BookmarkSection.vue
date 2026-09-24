<!-- 书摘篇：本年摘录选登 -->
<template>
  <SectionShell
    :index="6"
    title="书摘篇"
    :caption="caption"
    anchor="bookmarks"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div v-if="items.length" class="excerpts">
      <blockquote v-for="(item, i) in items" :key="i" class="excerpt">
        <p class="excerpt__text">{{ item.text }}</p>
        <p v-if="item.note" class="excerpt__note">批注：{{ item.note }}</p>
        <footer class="excerpt__source">
          <span class="excerpt__book">《{{ item.bookTitle || '未知书籍' }}》</span>
          <span v-if="item.bookAuthor" class="excerpt__author">{{ item.bookAuthor }}</span>
          <span v-if="item.chapter" class="excerpt__chapter">{{ item.chapter }}</span>
        </footer>
      </blockquote>
    </div>

    <p v-if="truncatedHint" class="truncated">{{ truncatedHint }}</p>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, isMeaningfulBlock } from '../../composables/useReportContext';

const ctx = useReportContext();

const MAX_SHOW = 6;

const bookmarks = computed(() => ctx.section('bookmarks') ?? {});
const text = computed(() => ctx.text('bookmarks'));
const empty = computed(() => !isMeaningfulBlock(bookmarks.value));

const allItems = computed<any[]>(() => {
  const raw = bookmarks.value.items;
  return Array.isArray(raw) ? raw.filter(it => it && it.text) : [];
});

const items = computed(() => allItems.value.slice(0, MAX_SHOW));

const caption = computed(() => {
  const total = Number(bookmarks.value.total);
  return total > 0 ? `全年 ${total} 条` : '';
});

const truncatedHint = computed(() => {
  const total = Number(bookmarks.value.total) || 0;
  const shown = items.value.length;
  if (total > shown && shown > 0) {
    return `本页选登 ${shown} 条，另有 ${total - shown} 条未展示。`;
  }
  return '';
});
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.excerpt {
  position: relative;
  margin: 0 0 20px;
  padding: 16px 20px 14px;
  border-left: 3px solid rgba(201, 162, 39, 0.55);
  background: rgba(255, 253, 247, 0.72);
  border-radius: 0 6px 6px 0;
}

.excerpt:last-child {
  margin-bottom: 0;
}

.excerpt__text {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.95;
  color: #3d3226;
  white-space: pre-wrap;
  word-break: break-word;
}

.excerpt__note {
  margin: 0 0 10px;
  padding-left: 10px;
  font-size: 13px;
  line-height: 1.8;
  color: #8c7a63;
  border-left: 2px solid rgba(201, 191, 174, 0.7);
}

.excerpt__source {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  color: #9c8b73;
}

.excerpt__book {
  color: #8c6239;
  font-weight: 600;
}

.excerpt__chapter {
  padding: 1px 8px;
  background: rgba(201, 191, 174, 0.28);
  border-radius: 999px;
}

.truncated {
  margin: 16px 0 0;
  font-size: 12px;
  color: #a99983;
  text-align: right;
}
</style>
