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
      <!-- 阅读状态显示方式 -->
      <div class="settings-section">
        <h2 class="section-title">阅读状态显示方式</h2>
        <p class="section-desc">选择在书籍列表中显示阅读状态的方式</p>
        
        <div class="option-cards">
          <div
            :class="['option-card', { active: progressDisplayMode === 'label' }]"
            @click="setProgressDisplayMode('label')"
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
            @click="setProgressDisplayMode('progress')"
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
import { useReadingStore } from '@/store/reading';
import { useHeatmapSettingsStore } from '@/store/heatmapSettings';

const router = useRouter();
const readingStore = useReadingStore();
const heatmapSettingsStore = useHeatmapSettingsStore();

const progressDisplayMode = ref<'label' | 'progress'>('label');
const autoSaveReadingProgress = ref(true);
const showReadingStatsInList = ref(false);
const enableReadingReminder = ref(false);
const showSuccessToast = ref(false);

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
    currentPreset.value = 'very-low';
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

const setProgressDisplayMode = (mode: 'label' | 'progress') => {
  progressDisplayMode.value = mode;
  readingStore.setProgressDisplayMode(mode);
};

const applyPreset = (preset: 'veryLow' | 'low' | 'medium' | 'high') => {
  currentPreset.value = preset;
  heatmapSettingsStore.setPreset(preset);
};

const resetHeatmapSettings = () => {
  heatmapSettingsStore.resetToDefaults();
  currentPreset.value = 'medium';
};

const saveSettings = () => {
  localStorage.setItem('readingSettings', JSON.stringify({
    progressDisplayMode: progressDisplayMode.value,
    autoSaveReadingProgress: autoSaveReadingProgress.value,
    showReadingStatsInList: showReadingStatsInList.value,
    enableReadingReminder: enableReadingReminder.value
  }));
  
  showSuccessToast.value = true;
  setTimeout(() => {
    showSuccessToast.value = false;
  }, 2000);
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem('readingSettings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      progressDisplayMode.value = settings.progressDisplayMode || 'label';
      autoSaveReadingProgress.value = settings.autoSaveReadingProgress !== false;
      showReadingStatsInList.value = settings.showReadingStatsInList || false;
      enableReadingReminder.value = settings.enableReadingReminder || false;
      
      readingStore.setProgressDisplayMode(progressDisplayMode.value);
    } catch (e) {
      console.error('加载阅读设置失败:', e);
    }
  }
  
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
        currentPreset.value = 'very-low';
      } else if (wheelSensitivity.value <= 0.2) {
        currentPreset.value = 'low';
      } else if (wheelSensitivity.value <= 0.35) {
        currentPreset.value = 'medium';
      } else {
        currentPreset.value = 'high';
      }
      
      console.log('✅ 已加载热力图设置:', heatmapSettings);
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
</style>
