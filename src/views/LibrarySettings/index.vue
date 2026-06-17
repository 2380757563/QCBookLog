<template>
  <div class="library-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">
        <svg viewBox="0 0 24 24">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </button>
      <h1 class="title">书库设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <!-- ========== 视图布局 ========== -->
      <div class="settings-section">
        <h2 class="section-title">📐 视图布局</h2>
        <p class="section-desc">切换书库页面的网格视图与列表视图</p>

        <div class="option-cards">
          <div
            :class="['option-card', { active: layout === 'grid' }]"
            role="button"
            tabindex="0"
            @click="onSetLayout('grid')"
            @keyup.enter="onSetLayout('grid')"
          >
            <div class="option-icon">▦</div>
            <div class="option-content">
              <h3 class="option-title">网格视图</h3>
              <p class="option-desc">以卡片网格形式展示书籍</p>
            </div>
            <div v-if="layout === 'grid'" class="check-icon">✓</div>
          </div>

          <div
            :class="['option-card', { active: layout === 'list' }]"
            role="button"
            tabindex="0"
            @click="onSetLayout('list')"
            @keyup.enter="onSetLayout('list')"
          >
            <div class="option-icon">☰</div>
            <div class="option-content">
              <h3 class="option-title">列表视图</h3>
              <p class="option-desc">以紧凑列表形式展示书籍</p>
            </div>
            <div v-if="layout === 'list'" class="check-icon">✓</div>
          </div>
        </div>
      </div>

      <!-- ========== 每行书籍数 ========== -->
      <div class="settings-section">
        <h2 class="section-title">📊 每行书籍数</h2>
        <p class="section-desc">设置网格视图下每行显示的书籍数量</p>

        <div class="segmented-control">
          <button
            :class="['segmented-btn', { active: gridColumns === 'auto' }]"
            @click="onUseAutoColumns"
          >
            自动
          </button>
          <button
            :class="['segmented-btn', { active: gridColumns !== 'auto' }]"
            @click="onUseManualColumns"
          >
            手动
          </button>
        </div>

        <div v-if="gridColumns !== 'auto'" class="column-slider">
          <input
            type="range"
            :min="manualColumnRange.min"
            :max="manualColumnRange.max"
            v-model.number="manualColumnCount"
            @change="onApplyManualColumns"
            class="slider"
          />
          <div class="column-display">
            <span class="column-number">{{ manualColumnCount }}</span>
            <span class="column-unit">列</span>
          </div>
          <div class="slider-hint">拖动滑块设置每行显示 1-20 列书籍</div>
        </div>
      </div>

      <!-- ========== 分组缩略图数 ========== -->
      <div class="settings-section">
        <h2 class="section-title">🖼️ 分组缩略图数</h2>
        <p class="section-desc">设置分组卡片上显示的书籍缩略图数量</p>

        <div class="option-cards">
          <div
            :class="['option-card option-card--compact', { active: groupThumbnailMax === 4 }]"
            role="button"
            tabindex="0"
            @click="onSetGroupThumbnail(4)"
            @keyup.enter="onSetGroupThumbnail(4)"
          >
            <div class="option-content">
              <h3 class="option-title">4 本</h3>
              <p class="option-desc">紧凑布局</p>
            </div>
            <div v-if="groupThumbnailMax === 4" class="check-icon">✓</div>
          </div>

          <div
            :class="['option-card option-card--compact', { active: groupThumbnailMax === 9 }]"
            role="button"
            tabindex="0"
            @click="onSetGroupThumbnail(9)"
            @keyup.enter="onSetGroupThumbnail(9)"
          >
            <div class="option-content">
              <h3 class="option-title">9 本</h3>
              <p class="option-desc">完整布局</p>
            </div>
            <div v-if="groupThumbnailMax === 9" class="check-icon">✓</div>
          </div>
        </div>
      </div>

      <!-- ========== 阅读状态显示方式 ========== -->
      <div class="settings-section">
        <h2 class="section-title">📖 阅读状态显示方式</h2>
        <p class="section-desc">选择在书籍列表中显示阅读状态的方式</p>

        <div class="option-cards">
          <div
            :class="['option-card', { active: progressDisplayMode === 'label' }]"
            role="button"
            tabindex="0"
            @click="onSetProgressMode('label')"
            @keyup.enter="onSetProgressMode('label')"
          >
            <div class="option-icon">🏷️</div>
            <div class="option-content">
              <h3 class="option-title">标签模式</h3>
              <p class="option-desc">显示"未读"、"在读"、"已读"标签</p>
              <div class="option-preview">
                <span class="preview-label preview-label--unread">未读</span>
                <span class="preview-label preview-label--reading">在读</span>
                <span class="preview-label preview-label--read">已读</span>
              </div>
            </div>
            <div v-if="progressDisplayMode === 'label'" class="check-icon">✓</div>
          </div>

          <div
            :class="['option-card', { active: progressDisplayMode === 'progress' }]"
            role="button"
            tabindex="0"
            @click="onSetProgressMode('progress')"
            @keyup.enter="onSetProgressMode('progress')"
          >
            <div class="option-icon">📊</div>
            <div class="option-content">
              <h3 class="option-title">进度条模式</h3>
              <p class="option-desc">显示阅读进度百分比和进度条</p>
              <div class="option-preview">
                <div class="preview-progress">
                  <span class="preview-text">25 / 100 页 (25%)</span>
                  <div class="preview-bar">
                    <div class="preview-fill" style="width: 25%"></div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="progressDisplayMode === 'progress'" class="check-icon">✓</div>
          </div>
        </div>
      </div>

      <!-- ========== 评分显示模式 ========== -->
      <div class="settings-section">
        <h2 class="section-title">⭐ 评分显示模式</h2>
        <p class="section-desc">
          切换书籍评分的展示方式。数据库中存储的原始评分范围是 0–10（如 7.8、9.0、8、7），
          切换显示模式仅改变前端渲染逻辑，不会修改原始数据。
        </p>

        <div class="option-cards">
          <div
            :class="['option-card', { active: ratingMode === '10' }]"
            role="button"
            tabindex="0"
            @click="onSetRatingMode('10')"
            @keyup.enter="onSetRatingMode('10')"
          >
            <div class="option-icon">🔟</div>
            <div class="option-content">
              <h3 class="option-title">十星制</h3>
              <p class="option-desc">精细展示，每颗星代表 1 分</p>
              <div class="option-preview">
                <RatingDisplay :value="7.8" mode="10" :show-value="true" size="large" />
                <span class="preview-hint">7.8 分（7 满 + 1 半 + 2 空）</span>
              </div>
            </div>
            <div v-if="ratingMode === '10'" class="check-icon">✓</div>
          </div>

          <div
            :class="['option-card', { active: ratingMode === '5' }]"
            role="button"
            tabindex="0"
            @click="onSetRatingMode('5')"
            @keyup.enter="onSetRatingMode('5')"
          >
            <div class="option-icon">⭐</div>
            <div class="option-content">
              <h3 class="option-title">五星制</h3>
              <p class="option-desc">经典展示，每颗星代表 2 分</p>
              <div class="option-preview">
                <RatingDisplay :value="7.8" mode="5" :show-value="true" size="large" />
                <span class="preview-hint">7.8 分（3 满 + 1 半 + 1 空）</span>
              </div>
            </div>
            <div v-if="ratingMode === '5'" class="check-icon">✓</div>
          </div>
        </div>
      </div>

      <!-- ========== 外观设置（导航到子页面） ========== -->
      <div class="settings-section">
        <h2 class="section-title">🎨 外观设置</h2>
        <p class="section-desc">为不同阅读状态的书籍配置边框样式与装帧包边效果</p>

        <div class="nav-cards">
          <router-link to="/border-settings" class="nav-card">
            <div class="nav-card__icon">🖼️</div>
            <div class="nav-card__content">
              <h3 class="nav-card__title">书籍边框</h3>
              <p class="nav-card__desc">为未读/在读/已读等状态的书籍配置专属边框样式</p>
            </div>
            <div class="nav-card__arrow">›</div>
          </router-link>

          <router-link to="/binding-settings" class="nav-card">
            <div class="nav-card__icon">📕</div>
            <div class="nav-card__content">
              <h3 class="nav-card__title">装帧包边</h3>
              <p class="nav-card__desc">为不同装订类型的书籍设置包边效果与材质</p>
            </div>
            <div class="nav-card__arrow">›</div>
          </router-link>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="action-section">
        <button class="btn-secondary" @click="onResetAll">恢复默认</button>
      </div>
    </div>

    <!-- 保存成功提示 -->
    <div v-if="showSuccessToast" class="toast toast-success">
      <span class="toast-icon">✅</span>
      <span class="toast-message">设置已保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * LibrarySettings - 书库设置统一页面
 *
 * 整合所有书库相关设置：
 *   - 视图布局（网格/列表）
 *   - 每行书籍数
 *   - 分组缩略图数
 *   - 阅读状态显示方式
 *   - 评分显示模式
 *   - 外观（书籍边框、装帧包边 - 导航到子页面）
 *
 * 状态来源：
 *   - 视图布局 / 列数  -> useBookViewSettings（composable + localStorage）
 *   - 分组缩略图数    -> useAppStore（Pinia + localStorage）
 *   - 阅读状态显示    -> useReadingStore（Pinia + localStorage）
 *   - 评分显示模式    -> useRatingDisplayMode（composable + userSettings service）
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import RatingDisplay from '@/components/business/RatingDisplay.vue';
import { useAppStore } from '@/store/app';
import { useReadingStore } from '@/store/reading';
import { useBookViewSettings } from '@/composables/useBookViewSettings';
import { useRatingDisplayMode, type RatingDisplayMode } from '@/composables/useRatingDisplayMode';

const router = useRouter();
const appStore = useAppStore();
const readingStore = useReadingStore();
const {
  layout,
  gridColumns,
  manualColumnCount,
  manualColumnRange,
  setLayout,
  useAutoColumns,
  applyManualColumns
} = useBookViewSettings();
const { mode: ratingMode, setMode: setRatingMode, load: loadRatingMode } = useRatingDisplayMode();

// 派生：分组缩略图数
const groupThumbnailMax = ref(appStore.groupThumbnailMax);

// 派生：阅读状态显示模式（从 store 同步）
const progressDisplayMode = ref<'label' | 'progress'>(readingStore.progressDisplayMode);

const showSuccessToast = ref(false);

function flashToast() {
  showSuccessToast.value = true;
  setTimeout(() => {
    showSuccessToast.value = false;
  }, 1500);
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}

// ---- 视图布局 ----
function onSetLayout(target: 'grid' | 'list') {
  if (layout.value === target) return;
  setLayout(target);
  flashToast();
}

// ---- 每行书籍数 ----
function onUseAutoColumns() {
  useAutoColumns();
  flashToast();
}

function onUseManualColumns() {
  applyManualColumns();
  flashToast();
}

function onApplyManualColumns() {
  applyManualColumns();
  flashToast();
}

// ---- 分组缩略图数 ----
function onSetGroupThumbnail(value: number) {
  if (groupThumbnailMax.value === value) return;
  appStore.setGroupThumbnailMax(value);
  groupThumbnailMax.value = value;
  flashToast();
}

// ---- 阅读状态显示 ----
function onSetProgressMode(mode: 'label' | 'progress') {
  if (progressDisplayMode.value === mode) return;
  progressDisplayMode.value = mode;
  readingStore.setProgressDisplayMode(mode);
  flashToast();
}

// ---- 评分显示模式 ----
async function onSetRatingMode(mode: RatingDisplayMode) {
  if (ratingMode.value === mode) return;
  await setRatingMode(mode);
  flashToast();
}

// ---- 恢复默认 ----
async function onResetAll() {
  setLayout('grid');
  useAutoColumns();
  appStore.setGroupThumbnailMax(9);
  groupThumbnailMax.value = 9;
  onSetProgressMode('label');
  await setRatingMode('10');
  flashToast();
}

onMounted(async () => {
  // 同步最新值（应对直接深链进入页面时 store 未及时初始化的场景）
  groupThumbnailMax.value = appStore.groupThumbnailMax;
  progressDisplayMode.value = readingStore.progressDisplayMode;
  // 显式加载评分模式
  await loadRatingMode();
});
</script>

<style scoped>
.library-settings-container {
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

/* 选项卡片 */
.option-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.option-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-primary, #fff);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.option-card:hover {
  border-color: var(--primary-color-light, #93c5fd);
  transform: translateY(-1px);
}

.option-card.active {
  border-color: var(--primary-color, #3b82f6);
  background-color: var(--primary-color-light, #eff6ff);
}

.option-card--compact {
  align-items: center;
  text-align: center;
  justify-content: center;
  flex-direction: column;
  padding: 14px 16px;
}

.option-card--compact .option-content {
  text-align: center;
}

.option-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-card--compact .option-icon {
  display: none;
}

.option-content {
  flex: 1;
  min-width: 0;
}

.option-title {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.option-desc {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.option-card--compact .option-desc {
  margin: 0;
}

.option-preview {
  padding: 10px;
  background-color: var(--bg-tertiary, #f8f9fa);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.preview-hint {
  font-size: 11px;
  color: var(--text-tertiary, #999);
}

/* 阅读状态预览标签 */
.preview-label {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-right: 4px;
}

.preview-label--unread {
  background-color: #fee2e2;
  color: #b91c1c;
}

.preview-label--reading {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.preview-label--read {
  background-color: #dcfce7;
  color: #15803d;
}

/* 阅读进度预览 */
.preview-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-bar {
  height: 6px;
  background-color: var(--border-color, #e5e7eb);
  border-radius: 3px;
  overflow: hidden;
}

.preview-fill {
  height: 100%;
  background-color: var(--primary-color, #3b82f6);
  border-radius: 3px;
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--primary-color, #3b82f6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
}

/* 分段控件 */
.segmented-control {
  display: flex;
  background-color: var(--bg-tertiary, #f1f5f9);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 16px;
}

.segmented-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.segmented-btn.active {
  background-color: var(--bg-primary, #fff);
  color: var(--primary-color, #3b82f6);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 列数滑块 */
.column-slider {
  padding: 16px;
  background-color: var(--bg-tertiary, #f8f9fa);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color, #e5e7eb);
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--primary-color, #3b82f6);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--primary-color, #3b82f6);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.column-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.column-number {
  font-size: 32px;
  font-weight: 600;
  color: var(--primary-color, #3b82f6);
}

.column-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.slider-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

/* 导航卡片 */
.nav-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

/* 操作区 */
.action-section {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 24px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary, #fff);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

/* Toast */
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slide-up 0.3s ease;
}

.toast-success {
  background-color: var(--success-color, #10b981);
  color: #fff;
}

.toast-icon {
  font-size: 16px;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 600px) {
  .option-cards {
    grid-template-columns: 1fr;
  }
}
</style>
