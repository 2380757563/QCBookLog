<template>
  <div class="system-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </button>
      <h1 class="title">系统设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <div class="settings-section">
        <h2 class="section-title">📚 评分显示已迁移</h2>
        <p class="section-desc">
          "评分显示模式"等书库相关设置已统一整合到 <strong>书库设置</strong> 页面。
          点击下方按钮前往。
        </p>

        <router-link to="/library-settings" class="nav-card">
          <div class="nav-card__icon">📚</div>
          <div class="nav-card__content">
            <h3 class="nav-card__title">书库设置</h3>
            <p class="nav-card__desc">包含评分显示模式、视图布局、阅读状态显示等所有书库相关设置</p>
          </div>
          <div class="nav-card__arrow">›</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}
</script>

<style scoped>
.system-settings-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding-bottom: 40px;
}

.header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
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
  transition: background-color 0.2s ease;
}

.back-btn:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.title {
  flex: 1;
  text-align: center;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-spacer {
  width: 40px;
}

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.settings-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: var(--bg-primary, #fff);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.nav-card:hover {
  border-color: var(--primary-color-light, #93c5fd);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-card__icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary, #f8f9fa);
  border-radius: 10px;
  flex-shrink: 0;
}

.nav-card__content {
  flex: 1;
  min-width: 0;
}

.nav-card__title {
  margin: 0 0 2px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-card__desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.nav-card__arrow {
  font-size: 24px;
  color: var(--text-tertiary, #999);
  font-weight: 300;
}
</style>
