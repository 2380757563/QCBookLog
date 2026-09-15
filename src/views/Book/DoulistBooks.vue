<template>
  <div class="doulist-books">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书单</h1>
      <div class="header-right"></div>
    </div>

    <div class="content">
      <DoulistBooksPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import DoulistBooksPanel from './components/DoulistBooksPanel.vue';

const router = useRouter();
const goBack = () => router.back();
</script>

<style scoped>
.doulist-books {
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

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-primary);
  padding: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.header-right {
  width: 40px;
}

.content {
  padding: 16px;
}
</style>
