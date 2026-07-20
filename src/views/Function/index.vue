<template>
  <div class="function-page">
    <div class="function-page__header">
      <h1 class="function-page__title">功能中心</h1>
    </div>

    <!-- 分组缩略图设置 -->
    <div class="function-page__section">
      <h2 class="section-title">显示设置</h2>
      <div class="setting-item">
        <div class="setting-item__label">
          <span class="setting-label">分组缩略图数量</span>
          <span class="setting-hint">设置分组框内显示的书籍缩略图数量</span>
        </div>
        <div class="setting-item__control">
          <select
            v-model="groupThumbnailMax"
            class="setting-select"
            @change="handleGroupThumbnailMaxChange"
          >
            <option :value="4">4 本</option>
            <option :value="9">9 本</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="function-page__section">
      <h2 class="section-title">数据管理</h2>
      <div class="function-grid">
        <router-link to="/export" class="function-card">
          <div class="function-card__icon">📤</div>
          <div class="function-card__label">导出数据</div>
          <div class="function-card__desc">导出书籍为JSON/CSV/Excel</div>
        </router-link>
        <router-link to="/import" class="function-card">
          <div class="function-card__icon">📥</div>
          <div class="function-card__label">导入数据</div>
          <div class="function-card__desc">从文件导入书籍数据</div>
        </router-link>
        <router-link to="/config" class="function-card">
          <div class="function-card__icon">🔄</div>
          <div class="function-card__label">配置书库</div>
          <div class="function-card__desc">设置书库同步</div>
        </router-link>
      </div>
    </div>

    <!-- 其他功能 -->
    <div class="function-page__section">
      <h2 class="section-title">快捷功能</h2>
      <div class="function-grid">
        <router-link to="/book/edit" class="function-card">
          <div class="function-card__icon">📚</div>
          <div class="function-card__label">添加书籍</div>
        </router-link>
        <router-link to="/bookmark/edit" class="function-card">
          <div class="function-card__icon">📝</div>
          <div class="function-card__label">添加书摘</div>
        </router-link>
        <router-link to="/search" class="function-card">
          <div class="function-card__icon">🔍</div>
          <div class="function-card__label">搜索</div>
        </router-link>
        <router-link to="/reading-settings" class="function-card">
          <div class="function-card__icon">⚙️</div>
          <div class="function-card__label">阅读设置</div>
        </router-link>
        <router-link to="/library-settings" class="function-card">
          <div class="function-card__icon">📚</div>
          <div class="function-card__label">书库设置</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

const groupThumbnailMax = computed({
  get: () => appStore.groupThumbnailMax,
  set: (value) => {
    appStore.setGroupThumbnailMax(value);
  }
});

const handleGroupThumbnailMaxChange = () => {
  appStore.setGroupThumbnailMax(groupThumbnailMax.value);
};
</script>

<style scoped>
.function-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 16px;
}

.function-page__header {
  padding: 16px 0;
  margin-bottom: 24px;
}

.function-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.function-page__section {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.setting-item__label {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.setting-hint {
  display: block;
  font-size: 13px;
  color: var(--text-hint);
}

.setting-item__control {
  min-width: 120px;
}

.setting-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
  cursor: pointer;
}

.setting-select:focus {
  border-color: var(--primary-color, #FF6B35);
}

/* 功能网格 */
.function-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.function-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  transition: all 0.3s ease;
}

.function-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.function-card__icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.function-card__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.function-card__desc {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .function-page {
    padding: 12px;
  }

  .function-grid {
    grid-template-columns: 1fr;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-item__control {
    width: 100%;
  }
}
</style>
