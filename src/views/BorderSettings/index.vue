<template>
  <div class="border-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书籍边框设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <div class="preview-section">
        <h2 class="section-title">实时预览</h2>
        <div class="preview-cards">
          <div class="preview-card">
            <div class="preview-card__label">普通书籍</div>
            <div class="preview-card__wrapper" :style="getPreviewStyle('normal')">
              <div class="preview-card__cover">
                <span>普通</span>
              </div>
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-card__label">待读书籍</div>
            <div class="preview-card__wrapper" :style="getPreviewStyle('pending')">
              <div class="preview-card__cover preview-card__cover--pending">
                <span>待读</span>
              </div>
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-card__label">喜欢书籍</div>
            <div class="preview-card__wrapper" :style="getPreviewStyle('favorite')">
              <div class="preview-card__cover preview-card__cover--favorite">
                <span>喜欢</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-selection-section">
        <h2 class="section-title">边框选择</h2>
        
        <div class="status-tabs">
          <button 
            v-for="tab in statusTabs" 
            :key="tab.value"
            :class="['status-tab', { active: activeStatus === tab.value }]"
            @click="activeStatus = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="border-grid">
          <BorderPreview
            v-for="border in currentBorders"
            :key="border.id"
            :border-id="border.id"
            :name="border.name"
            :selected="borderStore.getSelectedBorderId(activeStatus) === border.id"
            @select="selectBorder(border.id)"
          />
        </div>
      </div>

      <div class="params-section">
        <h2 class="section-title">参数配置</h2>
        
        <div class="params-card">
          <div class="param-group">
            <h3 class="param-group__title">基础参数</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">线条粗细</label>
                <span class="param-value">{{ currentParams.lineWidth }}px</span>
              </div>
              <input
                type="range"
                :value="currentParams.lineWidth"
                min="0.5"
                max="10"
                step="0.5"
                class="slider"
                @input="updateParam('lineWidth', parseFloat(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>细</span>
                <span>粗</span>
              </div>
            </div>

            <div class="param-item">
              <div class="param-header">
                <label class="param-label">圆角半径</label>
                <span class="param-value">{{ currentParams.borderRadius }}px</span>
              </div>
              <input
                type="range"
                :value="currentParams.borderRadius"
                min="0"
                max="20"
                step="1"
                class="slider"
                @input="updateParam('borderRadius', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>直角</span>
                <span>圆润</span>
              </div>
            </div>

            <div class="param-item">
              <div class="param-header">
                <label class="param-label">线条颜色</label>
              </div>
              <div class="color-picker-wrapper">
                <input
                  type="color"
                  :value="currentParams.color"
                  class="color-picker"
                  @input="updateParam('color', ($event.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ currentParams.color }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsDash" class="param-group">
            <h3 class="param-group__title">虚线设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">虚实比例</label>
                <span class="param-value">{{ (currentParams as any).dashRatio || 1 }}:1</span>
              </div>
              <input
                type="range"
                :value="(currentParams as any).dashRatio || 1"
                min="0.5"
                max="3"
                step="0.5"
                class="slider"
                @input="updateParam('dashRatio', parseFloat(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>密集</span>
                <span>稀疏</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsGap" class="param-group">
            <h3 class="param-group__title">缺口设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">缺口位置</label>
              </div>
              <select 
                :value="(currentParams as any).gapPosition || 'top'"
                class="param-select"
                @change="updateParam('gapPosition', ($event.target as HTMLSelectElement).value)"
              >
                <option value="top">顶部</option>
                <option value="bottom">底部</option>
                <option value="left">左侧</option>
                <option value="right">右侧</option>
              </select>
            </div>

            <div class="param-item">
              <div class="param-header">
                <label class="param-label">缺口长度</label>
                <span class="param-value">{{ (currentParams as any).gapLength || 15 }}%</span>
              </div>
              <input
                type="range"
                :value="(currentParams as any).gapLength || 15"
                min="5"
                max="40"
                step="5"
                class="slider"
                @input="updateParam('gapLength', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>小</span>
                <span>大</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsDoubleLine" class="param-group">
            <h3 class="param-group__title">双线设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">线条间距</label>
                <span class="param-value">{{ (currentParams as any).doubleLineGap || 4 }}px</span>
              </div>
              <input
                type="range"
                :value="(currentParams as any).doubleLineGap || 4"
                min="2"
                max="12"
                step="1"
                class="slider"
                @input="updateParam('doubleLineGap', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsPattern" class="param-group">
            <h3 class="param-group__title">回纹设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">回纹大小</label>
                <span class="param-value">{{ (currentParams as any).patternSize || 8 }}px</span>
              </div>
              <input
                type="range"
                :value="(currentParams as any).patternSize || 8"
                min="4"
                max="16"
                step="2"
                class="slider"
                @input="updateParam('patternSize', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>小</span>
                <span>大</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsStrokeVariation" class="param-group">
            <h3 class="param-group__title">笔触设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">顿笔幅度</label>
                <span class="param-value">{{ Math.round(((currentParams as any).strokeVariation || 0.3) * 100) }}%</span>
              </div>
              <input
                type="range"
                :value="(currentParams as any).strokeVariation || 0.3"
                min="0.1"
                max="0.8"
                step="0.1"
                class="slider"
                @input="updateParam('strokeVariation', parseFloat(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>轻微</span>
                <span>明显</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsGradient" class="param-group">
            <h3 class="param-group__title">渐变设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">起始颜色</label>
              </div>
              <div class="color-picker-wrapper">
                <input
                  type="color"
                  :value="(currentParams as any).gradientStartColor || currentParams.color"
                  class="color-picker"
                  @input="updateParam('gradientStartColor', ($event.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ (currentParams as any).gradientStartColor || currentParams.color }}</span>
              </div>
            </div>

            <div class="param-item">
              <div class="param-header">
                <label class="param-label">结束颜色</label>
              </div>
              <div class="color-picker-wrapper">
                <input
                  type="color"
                  :value="(currentParams as any).gradientEndColor || currentParams.color"
                  class="color-picker"
                  @input="updateParam('gradientEndColor', ($event.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ (currentParams as any).gradientEndColor || currentParams.color }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentDefinition?.supportsHover" class="param-group">
            <h3 class="param-group__title">交互设置</h3>
            
            <div class="param-item param-item--toggle">
              <label class="param-label">Hover显示边框</label>
              <label class="switch">
                <input 
                  type="checkbox" 
                  :checked="(currentParams as any).hoverEnabled"
                  @change="updateParam('hoverEnabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>
          </div>

          <div class="param-group">
            <h3 class="param-group__title">外发光设置</h3>
            
            <div class="param-item param-item--toggle">
              <label class="param-label">启用外发光</label>
              <label class="switch">
                <input 
                  type="checkbox" 
                  v-model="glowEnabled"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <template v-if="currentParams.glow.enabled">
              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">发光颜色</label>
                </div>
                <div class="color-picker-wrapper">
                  <input
                    type="color"
                    :value="currentParams.glow.color"
                    class="color-picker"
                    @input="updateGlow('color', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="color-value">{{ currentParams.glow.color }}</span>
                </div>
              </div>

              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">扩散半径</label>
                  <span class="param-value">{{ currentParams.glow.spread }}px</span>
                </div>
                <input
                  type="range"
                  :value="currentParams.glow.spread"
                  min="0"
                  max="15"
                  step="1"
                  class="slider"
                  @input="updateGlow('spread', parseInt(($event.target as HTMLInputElement).value))"
                />
                <div class="slider-labels">
                  <span>紧凑</span>
                  <span>扩散</span>
                </div>
              </div>

              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">不透明度</label>
                  <span class="param-value">{{ currentParams.glow.opacity }}%</span>
                </div>
                <input
                  type="range"
                  :value="currentParams.glow.opacity"
                  min="0"
                  max="100"
                  step="5"
                  class="slider"
                  @input="updateGlow('opacity', parseInt(($event.target as HTMLInputElement).value))"
                />
                <div class="slider-labels">
                  <span>透明</span>
                  <span>不透明</span>
                </div>
              </div>

              <div v-if="currentDefinition?.supportsPulse" class="param-item param-item--toggle">
                <label class="param-label">脉冲动画</label>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    v-model="pulseEnabled"
                  />
                  <span class="slider-toggle"></span>
                </label>
              </div>

              <div v-if="currentParams.glow.pulseEnabled && currentDefinition?.supportsPulse" class="param-item">
                <div class="param-header">
                  <label class="param-label">脉冲频率</label>
                  <span class="param-value">{{ (currentParams as any).pulseFrequency || 2 }}次/秒</span>
                </div>
                <input
                  type="range"
                  :value="(currentParams as any).pulseFrequency || 2"
                  min="0.5"
                  max="5"
                  step="0.5"
                  class="slider"
                  @input="updateParam('pulseFrequency', parseFloat(($event.target as HTMLInputElement).value))"
                />
                <div class="slider-labels">
                  <span>缓慢</span>
                  <span>快速</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn-primary" @click="saveSettings">
          💾 保存设置
        </button>
        <button class="btn-secondary" @click="resetCurrentStatus">
          重置当前状态
        </button>
        <button class="btn-secondary" @click="applyGlowToAll">
          一键套用发光颜色
        </button>
        <button class="btn-danger" @click="resetAll">
          一键重置全局
        </button>
      </div>
    </div>

    <div v-if="showToast" class="toast" :class="toastType">
      <span class="toast-icon">{{ toastType === 'success' ? '✅' : 'ℹ️' }}</span>
      <span class="toast-message">{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBookBorderStore } from '@/store/bookBorder';
import { BookStatus, BorderParams, getBordersByStatus, getBorderDefinition, BorderDefinition } from '@/store/bookBorder/types';
import BorderPreview from '@/components/business/BookBorder/BorderPreview.vue';

const router = useRouter();
const borderStore = useBookBorderStore();

const activeStatus = ref<BookStatus>('normal');
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'info'>('success');

const statusTabs = [
  { value: 'normal' as BookStatus, label: '普通书籍' },
  { value: 'pending' as BookStatus, label: '待读书籍' },
  { value: 'favorite' as BookStatus, label: '喜欢书籍' }
];

const currentBorders = computed(() => getBordersByStatus(activeStatus.value));

const currentParams = computed(() => borderStore.getBorderParams(activeStatus.value));

const currentDefinition = computed(() => {
  const borderId = borderStore.getSelectedBorderId(activeStatus.value);
  return getBorderDefinition(borderId);
});

const glowEnabled = computed({
  get: () => currentParams.value.glow.enabled,
  set: (value: boolean) => borderStore.updateGlowSettings(activeStatus.value, { enabled: value })
});

const pulseEnabled = computed({
  get: () => currentParams.value.glow.pulseEnabled || false,
  set: (value: boolean) => borderStore.updateGlowSettings(activeStatus.value, { pulseEnabled: value })
});

function goBack() {
  router.back();
}

function selectBorder(borderId: string) {
  borderStore.selectBorder(activeStatus.value, borderId);
  showSuccessToast('边框已切换');
}

function updateParam(key: string, value: any) {
  borderStore.updateParams(activeStatus.value, { [key]: value } as Partial<BorderParams>);
}

function updateGlow(key: string, value: any) {
  borderStore.updateGlowSettings(activeStatus.value, { [key]: value });
}

function resetCurrentStatus() {
  borderStore.resetStatus(activeStatus.value);
  showSuccessToast('已重置当前状态');
}

function resetAll() {
  if (confirm('确定要重置所有边框设置吗？此操作不可撤销。')) {
    borderStore.resetAll();
    showSuccessToast('已重置所有设置');
  }
}

function applyGlowToAll() {
  const currentGlowColor = currentParams.value.glow.color;
  borderStore.applyGlowColorToAll(currentGlowColor);
  showSuccessToast('发光颜色已应用到所有边框');
}

function saveSettings() {
  borderStore.saveSettings();
  showSuccessToast('设置已保存');
}

function showSuccessToast(message: string) {
  toastMessage.value = message;
  toastType.value = 'success';
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2000);
}

function getPreviewStyle(status: BookStatus): Record<string, string> {
  const params = borderStore.getBorderParams(status);
  const style: Record<string, string> = {
    borderRadius: `${params.borderRadius}px`
  };

  if (params.glow.enabled) {
    style.boxShadow = `0 0 ${params.glow.spread}px ${params.glow.color}`;
  }

  switch (params.type) {
    case 'normal-1':
    case 'normal-2':
    case 'normal-3':
    case 'normal-4':
    case 'normal-5':
    case 'pending-2':
    case 'favorite-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
    case 'pending-1':
      style.border = `${params.lineWidth}px dashed ${params.color}`;
      break;
    case 'pending-3':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
    case 'pending-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
    case 'pending-5':
    case 'favorite-2':
    case 'favorite-5':
      if ('gradientStartColor' in params && 'gradientEndColor' in params) {
        style.border = `${params.lineWidth}px solid transparent`;
        style.backgroundImage = `linear-gradient(#fff, #fff), linear-gradient(135deg, ${params.gradientStartColor}, ${params.gradientEndColor})`;
        style.backgroundOrigin = 'border-box';
        style.backgroundClip = 'padding-box, border-box';
      }
      break;
    case 'favorite-1':
      const gap = 'doubleLineGap' in params ? params.doubleLineGap : 4;
      style.border = `${params.lineWidth}px solid ${params.color}`;
      style.boxShadow = `inset 0 0 0 ${gap}px #fff, inset 0 0 0 ${gap + params.lineWidth}px ${params.color}`;
      break;
    case 'favorite-3':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
  }

  return style;
}
</script>

<style scoped>
.border-settings-container {
  min-height: 100vh;
  background-color: var(--bg-primary, #f5f5f5);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: var(--bg-secondary, #fff);
  border-bottom: 1px solid var(--border-color, #eee);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: var(--bg-hover, #f0f0f0);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary, #333);
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.header-spacer {
  width: 40px;
}

.content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0 0 16px 0;
}

.preview-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.preview-cards {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-card__label {
  font-size: 12px;
  color: var(--text-hint, #999);
}

.preview-card__wrapper {
  width: 80px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #faf8f5;
  transition: all 0.3s ease;
}

.preview-card__cover {
  width: 60px;
  height: 80px;
  background: linear-gradient(135deg, #e0d5c5 0%, #c9bfb0 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
}

.preview-card__cover--pending {
  background: linear-gradient(135deg, #b8d4e8 0%, #9fc5db 100%);
}

.preview-card__cover--favorite {
  background: linear-gradient(135deg, #f5c6a0 0%, #e8a87c 100%);
}

.border-selection-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.status-tab {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid var(--border-color, #eee);
  border-radius: 8px;
  background: none;
  font-size: 14px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.status-tab:hover {
  border-color: var(--primary-color, #ff6b35);
}

.status-tab.active {
  border-color: var(--primary-color, #ff6b35);
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color, #ff6b35);
}

.border-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.params-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.params-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.param-group {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.param-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.param-group__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  margin: 0 0 12px 0;
}

.param-item {
  margin-bottom: 16px;
}

.param-item:last-child {
  margin-bottom: 0;
}

.param-item--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.param-label {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.param-value {
  font-size: 14px;
  color: var(--primary-color, #ff6b35);
  font-weight: 500;
}

.param-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary, #333);
  background-color: #fff;
  cursor: pointer;
}

.param-select:focus {
  outline: none;
  border-color: var(--primary-color, #ff6b35);
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-hover, #e0e0e0);
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-color, #ff6b35);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-hint, #999);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 48px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
}

.color-value {
  font-size: 13px;
  color: var(--text-secondary, #666);
  font-family: monospace;
}

.switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider-toggle {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider-toggle:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider-toggle {
  background-color: var(--primary-color, #ff6b35);
}

input:checked + .slider-toggle:before {
  transform: translateX(20px);
}

.actions-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary-color, #ff6b35) 0%, #ff8f5a 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.btn-secondary {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--bg-secondary, #fff);
  color: var(--text-primary, #333);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--primary-color, #ff6b35);
  color: var(--primary-color, #ff6b35);
}

.btn-danger {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  border: 1px solid #f44336;
  border-radius: 8px;
  background: #fff;
  color: #f44336;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #ffebee;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  animation: fadeInUp 0.3s ease;
}

.toast.success {
  background-color: rgba(76, 175, 80, 0.9);
}

.toast.info {
  background-color: rgba(33, 150, 243, 0.9);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
}
</style>
