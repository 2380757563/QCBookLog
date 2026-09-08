<template>
  <div class="git-sync-settings">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">GitHub 同步</h1>
      <div class="header-right"></div>
    </div>

    <div class="content">
      <GitSyncPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import GitSyncPanel from './GitSyncPanel.vue';

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>

<style scoped>
.git-sync-settings {
  min-height: 100vh;
  background-color: var(--bg-page, #f5f5f5);
}

.header {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.back-btn {
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary, #333);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  width: 32px;
}

.content {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 16px;
}
</style>
