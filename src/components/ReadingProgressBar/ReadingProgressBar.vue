<template>
  <div class="reading-progress-bar">
    <div class="progress-header">
      <div class="progress-label">{{ label }}</div>
      <div class="progress-percentage">{{ progressPercentage }}%</div>
    </div>

    <!-- 进度条 -->
    <div class="progress-track" ref="trackRef">
      <div 
        class="progress-fill" 
        :style="{ width: progressPercentage + '%' }"
      ></div>
      <div 
        class="progress-handle"
        :style="{ left: progressPercentage + '%' }"
        @mousedown="startDrag"
        @touchstart="startDrag"
      ></div>
    </div>

    <!-- 进度信息 -->
    <div class="progress-info">
      <div class="progress-pages">
        已读 <span class="page-number">{{ currentValue }}</span> / <span class="total-pages">{{ totalPages }}</span> 页
      </div>
    </div>

    <!-- 手动输入 -->
    <div class="progress-input" v-if="showInput">
      <label>跳转到:</label>
      <input
        type="number"
        :min="0"
        :max="totalPages"
        v-model="inputValue"
        @input="handleInputChange"
        @blur="handleInputBlur"
        @keypress.enter="handleInputEnter"
      />
      <span>页</span>
      <button class="confirm-btn" @click="handleInputConfirm">确认</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  value: number;           // 当前页码
  totalPages: number;     // 总页数
  label?: string;          // 标签
  showInput?: boolean;     // 是否显示输入框
  disabled?: boolean;      // 是否禁用
}

const props = withDefaults(defineProps<Props>(), {
  label: '阅读进度',
  showInput: false,
  disabled: false
});

const emit = defineEmits<{
  (e: 'update:value', value: number): void;
  (e: 'change', value: number): void;
}>();

// 组件状态
const currentValue = ref(props.value);
const inputValue = ref('');
const trackRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

// 计算进度百分比
const progressPercentage = computed(() => {
  if (props.totalPages === 0) return 0;
  return Math.round((currentValue.value / props.totalPages) * 100);
});

// 监听外部value变化
watch(() => props.value, (newValue) => {
  currentValue.value = newValue;
});

// 拖动相关
const startDrag = (e: MouseEvent | TouchEvent) => {
  if (props.disabled) return;
  
  isDragging.value = true;
  
  const event = e as MouseEvent;
  handleDrag(event);
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', handleDrag);
  document.addEventListener('touchend', stopDrag);
};

const handleDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !trackRef.value) return;
  
  const event = e as MouseEvent;
  const trackRect = trackRef.value.getBoundingClientRect();
  
  let clientX: number;
  if (event.touches) {
    clientX = event.touches[0].clientX;
  } else {
    clientX = event.clientX;
  }
  
  // 计算相对位置
  const relativeX = clientX - trackRect.left;
  const percentage = Math.max(0, Math.min(100, (relativeX / trackRect.width) * 100));
  
  // 计算对应的页码
  const newPage = Math.round((percentage / 100) * props.totalPages);
  currentValue.value = newPage;
  
  // 触发事件
  emit('update:value', newPage);
};

const stopDrag = () => {
  isDragging.value = false;
  
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', handleDrag);
  document.removeEventListener('touchend', stopDrag);
  
  // 拖动结束后触发change事件
  emit('change', currentValue.value);
};

// 输入相关
const handleInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  inputValue.value = target.value;
};

const handleInputBlur = () => {
  handleInputConfirm();
};

const handleInputEnter = () => {
  handleInputConfirm();
};

const handleInputConfirm = () => {
  let page = parseInt(inputValue.value);
  
  // 验证输入
  if (isNaN(page)) {
    page = currentValue.value;
  } else {
    page = Math.max(0, Math.min(page, props.totalPages));
  }
  
  currentValue.value = page;
  inputValue.value = '';
  
  emit('update:value', page);
  emit('change', page);
};

// 暴露方法
defineExpose({
  reset: () => {
    currentValue.value = 0;
  },
  setValue: (value: number) => {
    currentValue.value = value;
  }
});
</script>

<style scoped>
.reading-progress-bar {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 700;
  color: #ff6b35;
}

.progress-track {
  position: relative;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
}

.progress-track.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #ff8c5a 0%, #ff6b35 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: white;
  border: 3px solid #ff6b35;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
  transition: all 0.2s ease;
  z-index: 2;
}

.progress-handle:hover {
  width: 24px;
  height: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.progress-handle:active {
  cursor: grabbing;
}

.progress-track.disabled .progress-handle {
  cursor: not-allowed;
}

.progress-info {
  margin-top: 8px;
  text-align: center;
}

.progress-pages {
  font-size: 13px;
  color: #666;
}

.page-number {
  font-weight: 600;
  color: #ff6b35;
}

.total-pages {
  font-weight: 500;
  color: #333;
}

.progress-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.progress-input label {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.progress-input input {
  flex: 1;
  max-width: 100px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.progress-input input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.progress-input span {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.confirm-btn {
  padding: 6px 16px;
  height: 32px;
  border: none;
  background: #ff6b35;
  color: white;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.confirm-btn:hover {
  background: #e55a2b;
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
