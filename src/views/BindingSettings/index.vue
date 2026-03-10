<template>
  <div class="binding-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">装帧包边设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <div class="preview-section">
        <h2 class="section-title">实时预览</h2>
        <div class="preview-cards">
          <div class="preview-card">
            <div class="preview-card__label">电子书</div>
            <div class="preview-card__wrapper">
              <div class="preview-card__cover preview-card__cover--ebook">
                <span>电子书</span>
              </div>
              <BindingBorder
                :binding1="0"
                :binding2="0"
                :params="bindingStore.settings.ebook"
              />
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-card__label">平装</div>
            <div class="preview-card__wrapper">
              <div class="preview-card__cover preview-card__cover--paperback">
                <span>平装</span>
              </div>
              <BindingBorder
                :binding1="1"
                :binding2="0"
                :params="bindingStore.settings.paperback"
              />
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-card__label">精装</div>
            <div class="preview-card__wrapper">
              <div class="preview-card__cover preview-card__cover--hardcover">
                <span>精装</span>
              </div>
              <BindingBorder
                :binding1="2"
                :binding2="0"
                :params="hardcoverPreviewParams"
              />
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-card__label">特殊装帧</div>
            <div class="preview-card__wrapper">
              <div class="preview-card__cover preview-card__cover--special">
                <span>特殊</span>
              </div>
              <BindingBorder
                :binding1="3"
                :binding2="1"
                :params="bindingStore.settings.special"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="binding-tabs">
        <button 
          v-for="tab in bindingTabs" 
          :key="tab.value"
          :class="['binding-tab', { active: activeBinding === tab.value }]"
          @click="activeBinding = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="params-section">
        <div class="params-card">
          <div class="param-group">
            <h3 class="param-group__title">基础参数</h3>

            <div class="param-item param-item--toggle">
              <label class="param-label">开启包边</label>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="currentParams.enabled"
                  @change="updateParam('enabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <template v-if="currentParams.enabled">
              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">包边尺寸</label>
                  <span class="param-value">{{ currentParams.size }}px</span>
                </div>
                <input
                  type="range"
                  :value="currentParams.size"
                  min="1"
                  max="40"
                  step="1"
                  class="slider"
                  @input="updateParam('size', parseInt(($event.target as HTMLInputElement).value))"
                />
                <div class="slider-labels">
                  <span>小</span>
                  <span>大</span>
                </div>
              </div>

            <div class="param-item">
              <div class="param-header">
                <label class="param-label">透明度</label>
                <span class="param-value">{{ currentParams.opacity }}%</span>
              </div>
              <input
                type="range"
                :value="currentParams.opacity"
                min="10"
                max="100"
                step="5"
                class="slider"
                @input="updateParam('opacity', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>透明</span>
                <span>不透明</span>
              </div>
            </div>

            <div class="param-item param-item--toggle">
              <label class="param-label">自定义颜色</label>
              <label class="switch">
                <input 
                  type="checkbox" 
                  :checked="currentParams.customColorEnabled"
                  @change="updateParam('customColorEnabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <div v-if="currentParams.customColorEnabled" class="param-item">
              <div class="param-header">
                <label class="param-label">包边颜色</label>
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
            </template>
          </div>

          <div v-if="activeBinding === 'ebook'" class="param-group">
            <h3 class="param-group__title">电子书设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">纹理类型</label>
              </div>
              <select 
                :value="ebookParams.texture"
                class="param-select"
                @change="updateEbookParam('texture', ($event.target as HTMLSelectElement).value)"
              >
                <option value="screen">普通屏幕倒角</option>
                <option value="matrix">绿色数字边角</option>
              </select>
            </div>

            <div class="param-item param-item--toggle">
              <label class="param-label">外发光效果</label>
              <label class="switch">
                <input 
                  type="checkbox" 
                  :checked="ebookParams.glowEnabled"
                  @change="updateEbookParam('glowEnabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <template v-if="ebookParams.glowEnabled">
              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">发光颜色</label>
                </div>
                <div class="color-picker-wrapper">
                  <input
                    type="color"
                    :value="ebookParams.glowColor"
                    class="color-picker"
                    @input="updateEbookParam('glowColor', ($event.target as HTMLInputElement).value)"
                  />
                  <span class="color-value">{{ ebookParams.glowColor }}</span>
                </div>
              </div>

              <div class="param-item">
                <div class="param-header">
                  <label class="param-label">发光扩散</label>
                  <span class="param-value">{{ ebookParams.glowSpread }}px</span>
                </div>
                <input
                  type="range"
                  :value="ebookParams.glowSpread"
                  min="2"
                  max="15"
                  step="1"
                  class="slider"
                  @input="updateEbookParam('glowSpread', parseInt(($event.target as HTMLInputElement).value))"
                />
                <div class="slider-labels">
                  <span>紧凑</span>
                  <span>扩散</span>
                </div>
              </div>
            </template>
          </div>

          <div v-if="activeBinding === 'paperback'" class="param-group">
            <h3 class="param-group__title">平装设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">纹理类型</label>
              </div>
              <select 
                :value="paperbackParams.texture"
                class="param-select"
                @change="updatePaperbackParam('texture', ($event.target as HTMLSelectElement).value)"
              >
                <option value="paper">普通纸张边角</option>
                <option value="torn">撕碎纸张边角</option>
              </select>
            </div>

            <div v-if="paperbackParams.texture === 'torn'" class="param-item">
              <div class="param-header">
                <label class="param-label">撕裂强度</label>
                <span class="param-value">{{ paperbackParams.tornIntensity }}%</span>
              </div>
              <input
                type="range"
                :value="paperbackParams.tornIntensity"
                min="10"
                max="60"
                step="5"
                class="slider"
                @input="updatePaperbackParam('tornIntensity', parseInt(($event.target as HTMLInputElement).value))"
              />
              <div class="slider-labels">
                <span>轻微</span>
                <span>强烈</span>
              </div>
            </div>
          </div>

          <div v-if="activeBinding === 'hardcover'" class="param-group">
            <h3 class="param-group__title">精装设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">纹理类型</label>
              </div>
              <select 
                :value="hardcoverParams.texture"
                class="param-select"
                @change="updateHardcoverParam('texture', ($event.target as HTMLSelectElement).value)"
              >
                <option value="matte">哑光质感</option>
                <option value="cloth">布面织物</option>
                <option value="pu-leather">PU皮革</option>
                <option value="real-leather">真皮纹理(牛皮)</option>
                <option value="sheepskin">真皮纹理(羊皮)</option>
                <option value="faux-leather">仿皮纹理</option>
              </select>
            </div>

            <div class="param-item param-item--toggle">
              <label class="param-label">油边高光</label>
              <label class="switch">
                <input 
                  type="checkbox" 
                  :checked="hardcoverParams.oilEdgeEnabled"
                  @change="updateHardcoverParam('oilEdgeEnabled', ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <div v-if="hardcoverParams.oilEdgeEnabled" class="param-item">
              <div class="param-header">
                <label class="param-label">油边颜色</label>
              </div>
              <div class="color-picker-wrapper">
                <input
                  type="color"
                  :value="hardcoverParams.oilEdgeColor"
                  class="color-picker"
                  @input="updateHardcoverParam('oilEdgeColor', ($event.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ hardcoverParams.oilEdgeColor }}</span>
              </div>
            </div>
          </div>

          <div v-if="activeBinding === 'special'" class="param-group">
            <h3 class="param-group__title">特殊装帧设置</h3>
            
            <div class="param-item">
              <div class="param-header">
                <label class="param-label">纹理类型</label>
              </div>
              <select 
                :value="specialParams.texture"
                class="param-select"
                @change="updateSpecialParam('texture', ($event.target as HTMLSelectElement).value)"
              >
                <option value="thread">线装缝线</option>
                <option value="accordion">经折装折痕</option>
                <option value="classic">古典纹样</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn-primary" @click="saveSettings">
          💾 保存设置
        </button>
        <button class="btn-secondary" @click="resetCurrentBinding">
          重置当前类型
        </button>
        <button class="btn-danger" @click="resetAll">
          重置所有设置
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBindingBorderStore } from '@/store/bindingBorder';
import { 
  EbookBorderParams, 
  PaperbackBorderParams, 
  HardcoverBorderParams, 
  SpecialBorderParams,
  BindingBorderParams
} from '@/store/bindingBorder/types';
import BindingBorder from '@/components/business/BindingBorder/BindingBorder.vue';

const router = useRouter();
const bindingStore = useBindingBorderStore();

type BindingType = 'ebook' | 'paperback' | 'hardcover' | 'special';

const activeBinding = ref<BindingType>('ebook');
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'info'>('success');

const bindingTabs = [
  { value: 'ebook' as BindingType, label: '电子书' },
  { value: 'paperback' as BindingType, label: '平装' },
  { value: 'hardcover' as BindingType, label: '精装' },
  { value: 'special' as BindingType, label: '特殊装帧' }
];

const currentParams = computed((): BindingBorderParams => {
  switch (activeBinding.value) {
    case 'ebook': return bindingStore.settings.ebook;
    case 'paperback': return bindingStore.settings.paperback;
    case 'hardcover': return bindingStore.settings.hardcover;
    case 'special': return bindingStore.settings.special;
  }
});

const ebookParams = computed(() => bindingStore.settings.ebook);
const paperbackParams = computed(() => bindingStore.settings.paperback);
const hardcoverParams = computed(() => bindingStore.settings.hardcover);
const specialParams = computed(() => bindingStore.settings.special);

const hardcoverPreviewParams = computed((): HardcoverBorderParams => ({
  ...bindingStore.settings.hardcover,
  texture: bindingStore.settings.hardcover.texture,
  oilEdgeEnabled: bindingStore.settings.hardcover.oilEdgeEnabled
}));

function goBack() {
  router.back();
}

function updateParam(key: string, value: any) {
  switch (activeBinding.value) {
    case 'ebook':
      bindingStore.updateEbookParams({ [key]: value } as Partial<EbookBorderParams>);
      break;
    case 'paperback':
      bindingStore.updatePaperbackParams({ [key]: value } as Partial<PaperbackBorderParams>);
      break;
    case 'hardcover':
      bindingStore.updateHardcoverParams({ [key]: value } as Partial<HardcoverBorderParams>);
      break;
    case 'special':
      bindingStore.updateSpecialParams({ [key]: value } as Partial<SpecialBorderParams>);
      break;
  }
}

function updateEbookParam(key: string, value: any) {
  bindingStore.updateEbookParams({ [key]: value });
}

function updatePaperbackParam(key: string, value: any) {
  bindingStore.updatePaperbackParams({ [key]: value });
}

function updateHardcoverParam(key: string, value: any) {
  bindingStore.updateHardcoverParams({ [key]: value });
}

function updateSpecialParam(key: string, value: any) {
  bindingStore.updateSpecialParams({ [key]: value });
}

function resetCurrentBinding() {
  switch (activeBinding.value) {
    case 'ebook':
      bindingStore.resetEbook();
      break;
    case 'paperback':
      bindingStore.resetPaperback();
      break;
    case 'hardcover':
      bindingStore.resetHardcover();
      break;
    case 'special':
      bindingStore.resetSpecial();
      break;
  }
  showSuccessToast('已重置当前类型设置');
}

function resetAll() {
  if (confirm('确定要重置所有装帧包边设置吗？此操作不可撤销。')) {
    bindingStore.resetAll();
    showSuccessToast('已重置所有设置');
  }
}

function saveSettings() {
  bindingStore.saveSettings();
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
</script>

<style scoped>
.binding-settings-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.back-btn:hover {
  background-color: var(--bg-hover);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-spacer {
  width: 40px;
}

.content {
  padding: 16px;
}

.preview-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-hint);
  margin: 0 0 12px 4px;
}

.preview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 600px) {
  .preview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-card__label {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-card__wrapper {
  position: relative;
  width: 80px;
  height: 107px;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
}

.preview-card__cover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.preview-card__cover--ebook {
  background: linear-gradient(135deg, #4a9eff, #00d4aa);
}

.preview-card__cover--paperback {
  background: linear-gradient(135deg, #8b7355, #a08060);
}

.preview-card__cover--hardcover {
  background: linear-gradient(135deg, #5d4e37, #7a6548);
}

.preview-card__cover--special {
  background: linear-gradient(135deg, #8b4513, #a0522d);
}

.binding-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.binding-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.binding-tab:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.binding-tab.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.params-section {
  margin-bottom: 24px;
}

.params-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.param-group {
  margin-bottom: 24px;
}

.param-group:last-child {
  margin-bottom: 0;
}

.param-group__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.param-label {
  font-size: 14px;
  color: var(--text-primary);
}

.param-value {
  font-size: 12px;
  color: var(--text-hint);
}

.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-hint);
}

.param-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-card);
  cursor: pointer;
  outline: none;
}

.param-select:focus {
  border-color: var(--primary-color);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 0;
  background: none;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border-radius: 4px;
  border: none;
}

.color-value {
  font-size: 12px;
  color: var(--text-hint);
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
  background-color: var(--border-color);
  transition: 0.4s;
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
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider-toggle {
  background-color: var(--primary-color);
}

input:checked + .slider-toggle:before {
  transform: translateX(20px);
}

.actions-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-primary {
  flex: 1;
  min-width: 140px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--primary-color);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-secondary {
  flex: 1;
  min-width: 140px;
  padding: 12px 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-danger {
  flex: 1;
  min-width: 140px;
  padding: 12px 24px;
  border: 1px solid var(--danger-color);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--danger-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-danger:hover {
  background-color: var(--danger-color);
  color: #fff;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.toast.success {
  background-color: #4caf50;
  color: #fff;
}

.toast.info {
  background-color: #2196f3;
  color: #fff;
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
