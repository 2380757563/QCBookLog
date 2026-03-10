<template>
  <div class="bookmark-settings-container">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书签设置</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <div class="settings-section">
        <h2 class="section-title">回顾卡片背景</h2>
        <p class="section-desc">自定义书签回顾页面的卡片背景样式</p>
        
        <div class="option-cards">
          <div
            :class="['option-card', { active: backgroundMode === 'color' }]"
            @click="setBackgroundMode('color')"
          >
            <div class="option-icon">🎨</div>
            <div class="option-content">
              <h3 class="option-title">预设颜色</h3>
              <p class="option-desc">选择预设的渐变色背景</p>
              <div class="option-preview">
                <div class="preview-color" :style="{ background: selectedGradient }"></div>
              </div>
            </div>
            <div v-if="backgroundMode === 'color'" class="check-icon">✓</div>
          </div>
          
          <div
            :class="['option-card', { active: backgroundMode === 'cover' }]"
            @click="setBackgroundMode('cover')"
          >
            <div class="option-icon">📚</div>
            <div class="option-content">
              <h3 class="option-title">书籍封面</h3>
              <p class="option-desc">使用对应书籍封面作为背景</p>
              <div class="option-preview">
                <div class="preview-cover">
                  <span>封面</span>
                </div>
              </div>
            </div>
            <div v-if="backgroundMode === 'cover'" class="check-icon">✓</div>
          </div>
          
          <div
            :class="['option-card', { active: backgroundMode === 'custom' }]"
            @click="setBackgroundMode('custom')"
          >
            <div class="option-icon">🖼️</div>
            <div class="option-content">
              <h3 class="option-title">自定义图片</h3>
              <p class="option-desc">上传自定义图片作为背景（最多6张）</p>
              <div class="option-preview">
                <div v-if="loadingImages" class="preview-loading">
                  <div class="loading-spinner"></div>
                  <span>加载中...</span>
                </div>
                <div class="preview-images-grid" v-else-if="customBackgrounds.length > 0">
                  <div
                    v-for="(image, index) in customBackgrounds"
                    :key="image.id"
                    :class="['preview-image-item', { active: selectedImageIndex === index }]"
                    @click.stop="selectImage(index)"
                  >
                    <img :src="image.imageData" alt="自定义背景" />
                    <div v-if="selectedImageIndex === index" class="preview-image-check">✓</div>
                  </div>
                </div>
                <div class="preview-custom preview-custom--empty" v-else>
                  <span>+</span>
                </div>
                <span class="preview-count">{{ customBackgrounds.length }}/6</span>
              </div>
            </div>
            <div v-if="backgroundMode === 'custom'" class="check-icon">✓</div>
          </div>
        </div>
      </div>

      <div v-if="backgroundMode === 'color'" class="settings-section">
        <h2 class="section-title">选择颜色</h2>
        <p class="section-desc">选择一个预设的渐变色背景</p>
        
        <div class="color-grid">
          <div
            v-for="(gradient, index) in gradients"
            :key="index"
            :class="['color-item', { active: selectedColorIndex === index }]"
            :style="{ background: gradient.value }"
            @click="selectColor(index)"
          >
            <div v-if="selectedColorIndex === index" class="color-check">✓</div>
          </div>
        </div>
      </div>

      <div v-if="backgroundMode === 'cover'" class="settings-section">
        <h2 class="section-title">封面透明度</h2>
        <p class="section-desc">调整书籍封面背景的透明度</p>
        
        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">透明度</label>
            <span class="setting-value">{{ coverOpacityLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="coverOpacity"
            min="0.1"
            max="1"
            step="0.1"
            class="slider"
          />
          <div class="slider-labels">
            <span>透明</span>
            <span>不透明</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">模糊程度</label>
            <span class="setting-value">{{ coverBlurLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="coverBlur"
            min="0"
            max="20"
            step="1"
            class="slider"
          />
          <div class="slider-labels">
            <span>清晰</span>
            <span>模糊</span>
          </div>
        </div>
      </div>

      <div v-if="backgroundMode === 'custom'" class="settings-section">
        <h2 class="section-title">自定义背景</h2>
        <p class="section-desc">上传图片作为卡片背景（最多6张）</p>
        
        <div class="image-upload-container">
          <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              style="display: none"
              :disabled="customBackgrounds.length >= 6"
            />
            <div class="upload-placeholder">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              <span>{{ customBackgrounds.length >= 6 ? '已达到上限' : '点击或拖拽上传图片' }}</span>
              <span class="upload-count">{{ customBackgrounds.length }}/6</span>
            </div>
          </div>

          <div class="images-grid">
            <div
              v-for="(image, index) in customBackgrounds"
              :key="image.id"
              class="image-item"
              :class="{ active: selectedImageIndex === index }"
              @click="selectImage(index)"
            >
              <img :src="image.imageData" alt="自定义背景" />
              <div class="image-actions">
                <button class="action-btn move-left" @click.stop="moveImage(index, -1)" :disabled="index === 0">
                  ←
                </button>
                <button class="action-btn move-right" @click.stop="moveImage(index, 1)" :disabled="index === customBackgrounds.length - 1">
                  →
                </button>
                <button class="action-btn delete-btn" @click.stop="deleteImage(index)">
                  ✕
                </button>
              </div>
              <div v-if="selectedImageIndex === index" class="image-check">✓</div>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">透明度</label>
            <span class="setting-value">{{ customOpacityLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="customOpacity"
            min="0.1"
            max="1"
            step="0.1"
            class="slider"
          />
          <div class="slider-labels">
            <span>透明</span>
            <span>不透明</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <label class="setting-label">模糊程度</label>
            <span class="setting-value">{{ customBlurLabel }}</span>
          </div>
          <input
            type="range"
            v-model.number="customBlur"
            min="0"
            max="20"
            step="1"
            class="slider"
          />
          <div class="slider-labels">
            <span>清晰</span>
            <span>模糊</span>
          </div>
        </div>
      </div>

      <div class="preview-section">
        <h2 class="section-title">效果预览</h2>
        <div class="preview-card" :style="previewStyle">
          <div class="preview-overlay" :style="previewOverlayStyle"></div>
          <div class="preview-content">
            <p class="preview-text">这是一条书摘内容，展示了卡片背景的实际效果。书摘内容可以很长，这样可以更好地预览背景效果。</p>
            <p class="preview-note">💭 这是阅读时的感想和笔记</p>
          </div>
          <div class="preview-meta">
            <span class="preview-book">《示例书籍》</span>
            <div class="preview-info">
              <span class="preview-time">2025-12-19 11:59:09</span>
              <span class="preview-page">—— 引自第132页</span>
            </div>
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
import userImagesService from '../../services/userImages';
import userSettingsService from '../../services/userSettings';

const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

interface GradientOption {
  name: string;
  value: string;
}

interface CustomBackground {
  id: number;
  imageData: string;
  sortOrder: number;
}

const gradients: GradientOption[] = [
  { name: '日落橙', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: '海洋蓝', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: '森林绿', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: '玫瑰红', value: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
  { name: '紫罗兰', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { name: '金色黄昏', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: '深邃夜空', value: 'linear-gradient(135deg, #0c0c0c 0%, #434343 100%)' },
  { name: '清新薄荷', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: '暖阳橙', value: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' },
  { name: '静谧蓝', value: 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)' },
  { name: '樱花粉', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: '极光', value: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' },
];

const backgroundMode = ref<'color' | 'cover' | 'custom'>('color');
const selectedColorIndex = ref(0);
const coverOpacity = ref(0.3);
const coverBlur = ref(8);
const customBackgrounds = ref<CustomBackground[]>([]);
const selectedImageIndex = ref(0);
const customOpacity = ref(0.5);
const customBlur = ref(5);
const showSuccessToast = ref(false);
const loadingImages = ref(true);

const selectedGradient = computed(() => gradients[selectedColorIndex.value]?.value || gradients[0].value);

const coverOpacityLabel = computed(() => `${Math.round(coverOpacity.value * 100)}%`);
const coverBlurLabel = computed(() => `${coverBlur.value}px`);
const customOpacityLabel = computed(() => `${Math.round(customOpacity.value * 100)}%`);
const customBlurLabel = computed(() => `${customBlur.value}px`);

const previewStyle = computed(() => {
  if (backgroundMode.value === 'color') {
    return { background: selectedGradient.value };
  } else if (backgroundMode.value === 'cover') {
    return {
      background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
    };
  } else if (backgroundMode.value === 'custom' && customBackgrounds.value.length > 0) {
    const selectedImage = customBackgrounds.value[selectedImageIndex.value];
    return {
      backgroundImage: `url(${selectedImage.imageData})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return {};
});

const previewOverlayStyle = computed(() => {
  if (backgroundMode.value === 'cover') {
    return {
      background: `rgba(0, 0, 0, ${coverOpacity.value})`,
      backdropFilter: `blur(${coverBlur.value}px)`,
    };
  } else if (backgroundMode.value === 'custom' && customBackgrounds.value.length > 0) {
    return {
      background: `rgba(0, 0, 0, ${customOpacity.value})`,
      backdropFilter: `blur(${customBlur.value}px)`,
    };
  }
  return { background: 'transparent' };
});

const goBack = () => {
  router.back();
};

const setBackgroundMode = (mode: 'color' | 'cover' | 'custom') => {
  backgroundMode.value = mode;
  saveSettings();
};

const selectColor = (index: number) => {
  selectedColorIndex.value = index;
  saveSettings();
};

const selectImage = (index: number) => {
  selectedImageIndex.value = index;
  saveSettings();
};

const triggerUpload = async () => {
  if (customBackgrounds.value.length >= 6) {
    return;
  }
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && customBackgrounds.value.length < 6) {
    await processFile(file);
  }
  target.value = '';
};

const handleDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/') && customBackgrounds.value.length < 6) {
    await processFile(file);
  }
};

const processFile = async (file: File) => {
  try {
    const result = await userImagesService.uploadImage(file, 'bookmark_background');
    customBackgrounds.value.push({
      id: result.id,
      imageData: result.imageData,
      sortOrder: result.sortOrder
    });
    saveSettings();
  } catch (error) {
    console.error('上传图片失败:', error);
  }
};

const moveImage = async (index: number, direction: number) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= customBackgrounds.value.length) {
    return;
  }

  const temp = customBackgrounds.value[index];
  customBackgrounds.value[index] = customBackgrounds.value[newIndex];
  customBackgrounds.value[newIndex] = temp;

  const imageIds = customBackgrounds.value.map(img => img.id);
  await userImagesService.reorderImages(imageIds, 'bookmark_background');

  saveSettings();
};

const deleteImage = async (index: number) => {
  const image = customBackgrounds.value[index];
  try {
    await userImagesService.deleteImage(image.id, 'bookmark_background');
    customBackgrounds.value.splice(index, 1);
    
    if (selectedImageIndex.value >= customBackgrounds.value.length) {
      selectedImageIndex.value = Math.max(0, customBackgrounds.value.length - 1);
    }
    
    saveSettings();
  } catch (error) {
    console.error('删除图片失败:', error);
  }
};

const saveSettings = async () => {
  const selectedImage = customBackgrounds.value[selectedImageIndex.value];
  const settings = {
    backgroundMode: backgroundMode.value,
    selectedColorIndex: selectedColorIndex.value,
    coverOpacity: coverOpacity.value,
    coverBlur: coverBlur.value,
    selectedImageIndex: selectedImageIndex.value,
    customBackground: selectedImage?.imageData || '',
    customOpacity: customOpacity.value,
    customBlur: customBlur.value,
  };
  
  try {
    await userSettingsService.saveSettings(settings, 'high');
    localStorage.setItem('bookmarkSettings', JSON.stringify(settings));
    
    showSuccessToast.value = true;
    setTimeout(() => {
      showSuccessToast.value = false;
    }, 2000);
  } catch (error) {
    console.error('保存设置失败:', error);
    localStorage.setItem('bookmarkSettings', JSON.stringify(settings));
  }
};

const loadSettings = async () => {
  loadingImages.value = true;
  try {
    const images = await userImagesService.getImages('bookmark_background');
    customBackgrounds.value = images.map(img => ({
      id: img.id,
      imageData: img.imageData,
      sortOrder: img.sortOrder
    }));
  } catch (error) {
    console.error('加载图片失败:', error);
  } finally {
    loadingImages.value = false;
  }

  const saved = localStorage.getItem('bookmarkSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      backgroundMode.value = settings.backgroundMode || 'color';
      selectedColorIndex.value = settings.selectedColorIndex || 0;
      coverOpacity.value = settings.coverOpacity ?? 0.3;
      coverBlur.value = settings.coverBlur ?? 8;
      selectedImageIndex.value = settings.selectedImageIndex || 0;
      customOpacity.value = settings.customOpacity ?? 0.5;
      customBlur.value = settings.customBlur ?? 5;
    } catch (error) {
      console.error('加载书签设置失败:', error);
    }
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.bookmark-settings-container {
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
  max-width: 600px;
  margin: 0 auto;
}

.settings-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 0 0 16px 0;
}

.option-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--border-color, #eee);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: var(--primary-color, #ff6b35);
}

.option-card.active {
  border-color: var(--primary-color, #ff6b35);
  background-color: rgba(255, 107, 53, 0.05);
}

.option-icon {
  font-size: 24px;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0 0 4px 0;
}

.option-desc {
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin: 0 0 8px 0;
}

.option-preview {
  display: flex;
  gap: 8px;
}

.preview-color {
  width: 60px;
  height: 30px;
  border-radius: 6px;
}

.preview-cover {
  width: 40px;
  height: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
}

.preview-custom {
  width: 40px;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--bg-hover, #f0f0f0);
}

.preview-images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
}

@media (min-width: 480px) {
  .preview-images-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.preview-image-item {
  position: relative;
  width: 40px;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.preview-image-item:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-image-item.active {
  border-color: var(--primary-color, #ff6b35);
}

.preview-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-image-check {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: var(--primary-color, #ff6b35);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.preview-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 30px;
  background-color: var(--bg-hover, #f0f0f0);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-hint, #999);
  font-weight: 500;
}

.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  color: var(--text-hint, #999);
  font-size: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color, #ddd);
  border-top-color: var(--primary-color, #ff6b35);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-custom img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-custom--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color, #ddd);
  color: var(--text-hint, #999);
  font-size: 18px;
}

.check-icon {
  width: 24px;
  height: 24px;
  background-color: var(--primary-color, #ff6b35);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.color-item {
  aspect-ratio: 1;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.color-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-item.active {
  box-shadow: 0 0 0 3px var(--primary-color, #ff6b35);
}

.color-check {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background-color: white;
  color: var(--text-primary, #333);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-label {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.setting-value {
  font-size: 14px;
  color: var(--primary-color, #ff6b35);
  font-weight: 500;
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

.upload-area {
  border: 2px dashed var(--border-color, #ddd);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  margin-bottom: 20px;
}

.upload-area:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-area:hover:not(:disabled) {
  border-color: var(--primary-color, #ff6b35);
  background-color: rgba(255, 107, 53, 0.02);
}

.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.image-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-item.active {
  border-color: var(--primary-color, #ff6b35);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.3);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-item:hover .image-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--primary-color, #ff6b35);
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn {
  background-color: rgba(244, 67, 54, 0.9);
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.image-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  background-color: var(--primary-color, #ff6b35);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.upload-count {
  font-size: 12px;
  color: var(--text-hint, #999);
  margin-top: 4px;
}

.preview-count {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

@media (max-width: 480px) {
  .images-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .image-item {
    aspect-ratio: 1;
  }
}

.upload-preview {
  position: relative;
}

.upload-preview img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-hint, #999);
}

.upload-placeholder svg {
  width: 40px;
  height: 40px;
  fill: var(--text-hint, #999);
}

.preview-section {
  background-color: var(--bg-secondary, #fff);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.preview-card {
  border-radius: 16px;
  padding: 24px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
  position: relative;
  overflow: hidden;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.preview-card > *:not(.preview-overlay) {
  position: relative;
  z-index: 1;
}

.preview-content {
  flex: 1;
}

.preview-text {
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.preview-note {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  font-style: italic;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.preview-book {
  font-size: 18px;
  font-weight: 500;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  opacity: 0.85;
}

.preview-page {
  font-style: italic;
}

.action-section {
  padding: 0;
  margin-top: 20px;
}

.btn-primary {
  width: 100%;
  padding: 16px 2rem;
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
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  animation: fadeInUp 0.3s ease;
}

.toast-success {
  background-color: #4caf50;
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-message {
  font-size: 0.95rem;
  font-weight: 500;
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
</style>
