<template>
  <div class="reading-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">阅读设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <!-- 热力图设置 -->
      <div class="settings-section">
        <h2 class="section-title">🔥 热力图滚动设置</h2>
        <p class="section-desc">自定义热力图的滚轮和触摸划动灵敏度</p>
        
        <!-- 预设选项 -->
        <div class="preset-buttons">
          <button
            :class="['preset-btn', { active: currentPreset === 'veryLow' }]"
            @click="applyPreset('veryLow')"
          >
            极低
          </button>
          <button
            :class="['preset-btn', { active: currentPreset === 'low' }]"
            @click="applyPreset('low')"
          >
            低
          </button>
          <button
            :class="['preset-btn', { active: currentPreset === 'medium' }]"
            @click="applyPreset('medium')"
          >
            中
          </button>
          <button
            :class="['preset-btn', { active: currentPreset === 'high' }]"
            @click="applyPreset('high')"
          >
            高
          </button>
        </div>
        
        <!-- 滚轮灵敏度 -->
        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">鼠标滚轮灵敏度</label>
            <span class="setting-value">{{ wheelSensitivityLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="wheelSensitivity"
            min="0.1"
            max="1.2"
            step="0.01"
            class="range-slider"
          />
          <div class="range-labels">
            <span>极慢</span>
            <span>极快</span>
          </div>
          <p class="setting-desc">控制PC端鼠标滚轮滚动的速度</p>
        </div>
        
        <!-- 触摸灵敏度 -->
        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">触摸划动灵敏度</label>
            <span class="setting-value">{{ touchSensitivityLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="touchSensitivity"
            min="1"
            max="15"
            step="0.1"
            class="range-slider"
          />
          <div class="range-labels">
            <span>极慢</span>
            <span>极快</span>
          </div>
          <p class="setting-desc">控制移动端触摸划动的速度</p>
        </div>
        
        <!-- 触摸摩擦系数 -->
        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">触摸惯性时长</label>
            <span class="setting-value">{{ Math.round((1 - touchFriction) * 100) }}%</span>
          </div>
          <input
            type="range"
            v-model.number="touchFriction"
            min="0.8"
            max="0.98"
            step="0.01"
            class="range-slider"
          />
          <div class="range-labels">
            <span>极短</span>
            <span>极长</span>
          </div>
          <p class="setting-desc">控制触摸划动后惯性滚动的持续时间</p>
        </div>
        
        <!-- 触摸最小速度阈值 -->
        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">触摸停止阈值</label>
            <span class="setting-value">{{ Math.round(touchMinVelocity * 100) / 100 }}</span>
          </div>
          <input
            type="range"
            v-model.number="touchMinVelocity"
            min="0.1"
            max="1.0"
            step="0.05"
            class="range-slider"
          />
          <div class="range-labels">
            <span>极快停</span>
            <span>极慢停</span>
          </div>
          <p class="setting-desc">控制触摸划动何时停止惯性滚动</p>
        </div>
        
        <!-- 重置按钮 -->
        <div class="setting-item">
          <button class="btn-secondary" @click="resetHeatmapSettings">
            重置为默认值
          </button>
        </div>
      </div>

      <!-- 年份书签设置 -->
      <div class="settings-section">
        <h2 class="section-title">📑 年份书签</h2>
        <p class="section-desc">配置热力图顶部书签标签的显示范围</p>

        <div class="bookmark-range-options">
          <button
            v-for="opt in bookmarkRangeOptions"
            :key="opt.value"
            :class="['range-btn', { active: bookmarkRange === opt.value }]"
            @click="setBookmarkRange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">热力图起始年份</label>
            <span class="setting-value">{{ startYear }}年</span>
          </div>
          <input
            type="number"
            class="year-input"
            :min="minStartYear"
            :max="currentYear"
            :value="startYear"
            @input="onStartYearInput"
            @change="onStartYearCommit"
          />
          <p class="setting-desc">
            最早显示的年份（范围 {{ minStartYear }} ~ {{ currentYear }}），输入后失焦或回车即可保存
          </p>
          <div v-if="showPerfWarning" class="setting-warning">
            ⚠️ 起始年份 {{ startYear }} 到 {{ currentYear }} 跨度为 {{ startYearSpan }} 年，
            渲染列数过多可能导致浏览器卡顿，建议设置不超过 15 年。
            <button class="warning-action" @click="resetStartYearToSafe">恢复推荐值</button>
          </div>
        </div>
      </div>

      <!-- 其他阅读设置 -->
      <div class="settings-section">
        <h2 class="section-title">其他设置</h2>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="autoSaveReadingProgress" />
            <span>自动保存阅读进度</span>
          </label>
          <p class="setting-desc">结束阅读时自动保存阅读记录</p>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="showReadingStatsInList" />
            <span>在列表中显示阅读统计</span>
          </label>
          <p class="setting-desc">在书籍列表中显示总阅读时长和阅读次数</p>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="enableReadingReminder" />
            <span>启用阅读提醒</span>
          </label>
          <p class="setting-desc">每日提醒阅读目标</p>
        </div>
      </div>

      <!-- 书源设置 -->
      <div class="settings-section">
        <h2 class="section-title">📚 书源设置</h2>
        <p class="section-desc">配置 ISBN 查询等书源 API Key，用于获取图书元数据</p>

        <div v-if="bookSourceLoading" class="book-source-loading">
          <div class="loading-spinner"></div>
          <span>正在加载书源配置...</span>
        </div>

        <div v-else-if="bookSourceError" class="book-source-error">
          ⚠️ {{ bookSourceError }}
        </div>

        <div v-else class="book-source-list">
          <div
            v-for="source in bookSources"
            :key="source.sourceKey"
            class="book-source-item"
          >
            <div class="book-source-header">
              <span class="book-source-name">{{ source.sourceName }}</span>
              <span v-if="source.isRequired" class="book-source-required">必填</span>
            </div>
            <p class="book-source-desc">{{ source.description }}</p>
            <div class="book-source-input-wrapper">
              <input
                :type="source.showKey ? 'text' : 'password'"
                v-model="source.apiKey"
                class="book-source-input"
                :placeholder="`请输入 ${source.sourceName} API Key`"
              />
              <button
                class="book-source-toggle"
                @click="source.showKey = !source.showKey"
                :title="source.showKey ? '隐藏' : '显示'"
              >
                <svg v-if="source.showKey" viewBox="0 0 24 24" width="18" height="18">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.24 2.24c.57-.23 1.18-.36 1.83-.36zM2 4.27l2.11 2.11C3.56 7.56 2.56 9.18 2 12c1.73 4.39 6 7.5 11 7.5 1.67 0 3.24-.33 4.69-.93l2.89 2.89L21 20.23 3.77 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.31-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.22-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="book-source-hint">
            <span>💡 配置保存后立即生效，会覆盖环境变量中的同名配置</span>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="action-section">
        <button class="btn-primary" @click="saveSettings">
          保存设置
        </button>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useHeatmapSettingsStore } from '@/stores/heatmapSettings';
import { getBookSourceSettings, saveBookSourceSettings } from '@/api/bookSourceSettings';

const router = useRouter();
const heatmapSettingsStore = useHeatmapSettingsStore();

const autoSaveReadingProgress = ref(true);
const showReadingStatsInList = ref(false);
const enableReadingReminder = ref(false);
const showSuccessToast = ref(false);

// 书源设置
interface BookSourceUiItem {
  id: number;
  sourceKey: string;
  sourceName: string;
  apiKey: string;
  isRequired: boolean;
  description: string;
  sortOrder: number;
  showKey: boolean;
}

const bookSources = ref<BookSourceUiItem[]>([]);
const bookSourceLoading = ref(false);
const bookSourceError = ref('');

const loadBookSourceSettings = async () => {
  bookSourceLoading.value = true;
  bookSourceError.value = '';
  try {
    const data = await getBookSourceSettings();
    bookSources.value = data.map(item => ({
      ...item,
      showKey: false
    }));
  } catch (error: any) {
    bookSourceError.value = error.message || '加载书源配置失败';
    console.error('加载书源配置失败:', error);
  } finally {
    bookSourceLoading.value = false;
  }
};

// 初始化为null,在loadSettings中根据实际值设置
const currentPreset = ref<'veryLow' | 'low' | 'medium' | 'high' | null>(null);

const wheelSensitivity = computed({
  get: () => heatmapSettingsStore.wheelSensitivity,
  set: (value) => {
    heatmapSettingsStore.setWheelSensitivity(value);
    updateCurrentPreset();
  }
});

const touchSensitivity = computed({
  get: () => heatmapSettingsStore.touchSensitivity,
  set: (value) => {
    heatmapSettingsStore.setTouchSensitivity(value);
    updateCurrentPreset();
  }
});

const touchFriction = computed({
  get: () => heatmapSettingsStore.touchFriction,
  set: (value) => {
    heatmapSettingsStore.setTouchFriction(value);
    updateCurrentPreset();
  }
});

const touchMinVelocity = computed({
  get: () => heatmapSettingsStore.touchMinVelocity,
  set: (value) => {
    heatmapSettingsStore.setTouchMinVelocity(value);
    updateCurrentPreset();
  }
});

const wheelSensitivityLabel = computed(() => heatmapSettingsStore.wheelSensitivityLabel);
const touchSensitivityLabel = computed(() => heatmapSettingsStore.touchSensitivityLabel);

const updateCurrentPreset = () => {
  const ws = heatmapSettingsStore.wheelSensitivity;
  const ts = heatmapSettingsStore.touchSensitivity;
  const tf = heatmapSettingsStore.touchFriction;
  const tmv = heatmapSettingsStore.touchMinVelocity;
  
  // 检查是否匹配任何预设（更新后的值）
  const isVeryLowPreset = ws === 0.1 && ts === 1.0 && tf === 0.82 && tmv === 1.0;
  const isLowPreset = ws === 0.2 && ts === 2.0 && tf === 0.85 && tmv === 0.8;
  const isMediumPreset = ws === 0.35 && ts === 3.5 && tf === 0.88 && tmv === 0.6;
  const isHighPreset = ws === 0.53 && ts === 7.11 && tf === 0.92 && tmv === 0.45;
  
  if (isVeryLowPreset) {
    currentPreset.value = 'veryLow';
  } else if (isLowPreset) {
    currentPreset.value = 'low';
  } else if (isMediumPreset) {
    currentPreset.value = 'medium';
  } else if (isHighPreset) {
    currentPreset.value = 'high';
  } else {
    currentPreset.value = null; // 自定义值时显示为null
  }
};

const applyPreset = (preset: 'veryLow' | 'low' | 'medium' | 'high') => {
  currentPreset.value = preset;
  heatmapSettingsStore.setPreset(preset);
};

const resetHeatmapSettings = () => {
  heatmapSettingsStore.resetToDefaults();
  currentPreset.value = 'medium';
};

// ==================== 年份书签 ====================
const bookmarkRangeOptions = [
  { value: '3y', label: '近3年' },
  { value: '5y', label: '近5年' },
  { value: '10y', label: '近10年' },
  { value: 'all', label: '全部' }
] as const;

const bookmarkRange = computed({
  get: () => heatmapSettingsStore.bookmarkRange,
  set: (v: '3y' | '5y' | '10y' | 'all') => {
    heatmapSettingsStore.setBookmarkRange(v);
  }
});

const setBookmarkRange = (v: '3y' | '5y' | '10y' | 'all') => {
  heatmapSettingsStore.setBookmarkRange(v);
};

// 起始年份：受 store 双向控制
const startYear = computed({
  get: () => heatmapSettingsStore.startYear,
  set: (v: number) => {
    heatmapSettingsStore.setStartYear(v);
  }
});
const currentYear = new Date().getFullYear();
const minStartYear = computed(() => heatmapSettingsStore.minStartYear);
const startYearSpan = computed(() => heatmapSettingsStore.startYearSpan);
const showPerfWarning = computed(() => heatmapSettingsStore.shouldWarnPerformance);

/**
 * input 阶段：只暂存用户原始输入到 dataset.pendingValue，
 * 不直接修改 store，避免 NaN 触发 Vue 警告 / 渲染错误。
 * 真正提交在 onStartYearCommit（change 事件：失焦 / 回车 / 滚轮 / 上下箭头）。
 */
const onStartYearInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  target.dataset.pendingValue = target.value; // 保留原始字符串（含空、负数、小数等）
};

/**
 * 提交：校验 + 持久化
 * - 空 / NaN / 越界 → 自动 clamp 到 [minStartYear, currentYear]
 * - 合法 → 立即写入 store（saveToStorage 内部完成持久化）
 */
const onStartYearCommit = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const raw = target.dataset.pendingValue ?? target.value;
  const parsed = parseInt(raw, 10);
  const safe = isNaN(parsed)
    ? heatmapSettingsStore.startYear
    : Math.max(minStartYear.value, Math.min(parsed, currentYear));
  // 同步 UI 数值（若用户输入非法，强制恢复成合法值）
  target.value = String(safe);
  target.dataset.pendingValue = '';
  startYear.value = safe;
};

/**
 * 恢复推荐起始年份：当前年 - 5 年（保证 < 15 年安全跨度）
 */
const resetStartYearToSafe = () => {
  const safe = Math.max(minStartYear.value, currentYear - 5);
  startYear.value = safe;
};

const saveSettings = async () => {
  localStorage.setItem('readingSettings', JSON.stringify({
    autoSaveReadingProgress: autoSaveReadingProgress.value,
    showReadingStatsInList: showReadingStatsInList.value,
    enableReadingReminder: enableReadingReminder.value
  }));

  // 保存书源设置
  try {
    const sources = bookSources.value.map(item => ({
      sourceKey: item.sourceKey,
      apiKey: item.apiKey
    }));
    await saveBookSourceSettings(sources);
  } catch (error: any) {
    console.error('保存书源设置失败:', error);
    alert(`保存书源设置失败：${error.message || '未知错误'}`);
    return;
  }

  showSuccessToast.value = true;
  setTimeout(() => {
    showSuccessToast.value = false;
  }, 2000);
};

const loadSettings = async () => {
  const savedSettings = localStorage.getItem('readingSettings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      autoSaveReadingProgress.value = settings.autoSaveReadingProgress !== false;
      showReadingStatsInList.value = settings.showReadingStatsInList || false;
      enableReadingReminder.value = settings.enableReadingReminder || false;
    } catch (e) {
      console.error('加载阅读设置失败:', e);
    }
  }

  // 加载书源设置
  await loadBookSourceSettings();

  // 加载热力图设置
  const savedHeatmapSettings = localStorage.getItem('heatmapSettings');
  if (savedHeatmapSettings) {
    try {
      const heatmapSettings = JSON.parse(savedHeatmapSettings);
      wheelSensitivity.value = heatmapSettings.wheelSensitivity || 0.35;
      touchSensitivity.value = heatmapSettings.touchSensitivity || 3.5;
      touchFriction.value = heatmapSettings.touchFriction || 0.88;
      touchMinVelocity.value = heatmapSettings.touchMinVelocity || 0.6;
      
      // 根据加载的值确定预设
      if (wheelSensitivity.value <= 0.1) {
        currentPreset.value = 'veryLow';
      } else if (wheelSensitivity.value <= 0.2) {
        currentPreset.value = 'low';
      } else if (wheelSensitivity.value <= 0.35) {
        currentPreset.value = 'medium';
      } else {
        currentPreset.value = 'high';
      }

    } catch (e) {
      console.error('加载热力图设置失败:', e);
    }
  }
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.reading-settings-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  color: #333;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.header-spacer {
  width: 2rem;
}

.content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.section-desc {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 1rem 0;
}

.option-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.option-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.option-card:hover {
  border-color: #ff6b35;
  background-color: #fff8f5;
}

.option-card.active {
  border-color: #ff6b35;
  background-color: #fff3e0;
}

.option-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.option-desc {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

.option-preview {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.preview-label {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.5rem;
}

.preview-label--unread {
  background-color: #f5f5f5;
  color: #999;
}

.preview-label--reading {
  background-color: #fff3e0;
  color: #ff6b35;
}

.preview-label--read {
  background-color: #e8f5e9;
  color: #4caf50;
}

.preview-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preview-text {
  font-size: 0.75rem;
  color: #ff6b35;
  font-weight: 500;
}

.preview-bar {
  width: 100%;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.preview-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff8c5a 0%, #ff6b35 100%);
  border-radius: 3px;
}

.check-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  color: #4caf50;
}

.setting-item {
  padding: 1rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.setting-item:last-child {
  border-bottom: none;
}

.preset-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.preset-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #333;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: #ff6b35;
  background-color: #fff8f5;
}

.preset-btn.active {
  border-color: #ff6b35;
  background-color: #ff6b35;
  color: #fff;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.setting-value {
  font-size: 0.85rem;
  color: #ff6b35;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  background-color: #fff3e0;
  border-radius: 4px;
}

.range-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff6b35;
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff6b35;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.range-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #999;
}

.btn-secondary {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: #999;
  background-color: #f5f5f5;
  color: #333;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  cursor: pointer;
}

.setting-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-desc {
  font-size: 0.85rem;
  color: #999;
  margin-top: 0.25rem;
  margin-left: 2.25rem;
}

.action-section {
  padding: 1rem 0 0 0;
}

.bookmark-range-options {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.range-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-btn:hover {
  border-color: #8FA4B8;
  background-color: #f5f8fb;
}

.range-btn.active {
  border-color: #6B8E7A;
  background-color: #6B8E7A;
  color: #F5F0E1;
}

.year-input {
  width: 100%;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  background-color: #fff;
  transition: border-color 0.2s ease;
  -moz-appearance: textfield;
}

.year-input::-webkit-outer-spin-button,
.year-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.year-input:focus {
  outline: none;
  border-color: #6B8E7A;
}

/* 性能警告提示框 */
.setting-warning {
  margin-top: 12px;
  padding: 12px 16px;
  background-color: #fff7e6;
  border: 1px solid #ffd591;
  border-left: 4px solid #ff8800;
  border-radius: 6px;
  color: #874d00;
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.warning-action {
  margin-left: auto;
  padding: 4px 12px;
  background-color: #ff8800;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.warning-action:hover {
  background-color: #e67700;
}

.btn-primary {
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  background-color: #ff6b35;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: #e55a2b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slide-in 0.3s ease;
  z-index: 100;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
  color: #2e7d32;
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-message {
  font-size: 0.95rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .option-cards {
    grid-template-columns: 1fr;
  }
}

/* 书源设置 */
.book-source-loading,
.book-source-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.book-source-error {
  color: #ff6b35;
}

.book-source-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.book-source-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.book-source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.book-source-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.book-source-required {
  font-size: 0.75rem;
  color: #ff6b35;
  background-color: #fff3e0;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.book-source-desc {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

.book-source-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.book-source-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #333;
  background-color: #fff;
  transition: border-color 0.2s ease;
}

.book-source-input:focus {
  outline: none;
  border-color: #ff6b35;
}

.book-source-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.book-source-toggle:hover {
  border-color: #ff6b35;
  color: #ff6b35;
}

.book-source-hint {
  font-size: 0.85rem;
  color: #999;
  padding: 0.5rem 0;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e0e0e0;
  border-top-color: #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
