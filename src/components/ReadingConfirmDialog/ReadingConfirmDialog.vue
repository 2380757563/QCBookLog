<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <h3 class="dialog-title">本次阅读摘要</h3>
          </div>

          <div class="dialog-content">
            <!-- 书籍信息 -->
            <div class="info-section">
              <div class="info-label">书籍</div>
              <div class="info-value book-title">{{ book?.title }}</div>
            </div>

            <!-- 本次阅读时长 -->
            <div class="info-section">
              <div class="info-label">本次阅读</div>
              <div class="info-value highlight">{{ formattedDuration }}</div>
            </div>

            <!-- 本次阅读页数 -->
            <div class="info-section" v-if="startPage !== undefined && endPage !== undefined">
              <div class="info-label">阅读页数</div>
              <div class="info-value">
                {{ pagesRead }} 页
                <span class="page-range">(从第 {{ startPage }} 页读到第 {{ endPage }} 页)</span>
              </div>
            </div>

            <!-- 今日累计 -->
            <div class="info-section" v-if="todayStats">
              <div class="info-label">今日累计</div>
              <div class="info-value">
                {{ formatDuration(todayStats.totalTime) }}
                <span class="stats-detail">· {{ todayStats.totalBooks }} 本书 · {{ todayStats.totalPages }} 页</span>
              </div>
            </div>

            <!-- 提示信息 -->
            <div class="info-tip">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <span>点击"确定结束阅读"后，本次阅读时长和进度将被保存</span>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="handleCancel">取消</button>
            <button class="btn btn-primary" @click="handleContinue">继续阅读</button>
            <button class="btn btn-success" @click="handleConfirm">确定结束阅读</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Book } from '@/services/book/types';

interface Props {
  book: Book | null;
  duration: number;      // 阅读时长（秒）
  startPage?: number;   // 开始页码
  endPage?: number;     // 结束页码
  todayStats?: {         // 今日统计
    totalTime: number;
    totalBooks: number;
    totalPages: number;
  };
  visible?: boolean;     // 是否显示
}

const props = withDefaults(defineProps<Props>(), {
  visible: true
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', data: any): void;
  (e: 'continue'): void;
  (e: 'cancel'): void;
}>();

// 计算本次阅读的页数
const pagesRead = computed(() => {
  if (props.startPage !== undefined && props.endPage !== undefined) {
    return props.endPage - props.startPage;
  }
  return 0;
});

// 格式化本次阅读时长
const formattedDuration = computed(() => {
  const minutes = Math.floor(props.duration / 60);
  const seconds = props.duration % 60;
  
  if (minutes === 0) {
    return `${seconds}秒`;
  } else if (minutes < 60) {
    return `${minutes}分${seconds > 0 ? seconds + '秒' : ''}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins > 0 ? mins + '分' : ''}`;
  }
});

// 格式化今日累计时长
const formatDuration = (totalTime: number): string => {
  if (!totalTime) return '0分钟';
  
  const hours = Math.floor(totalTime / 60);
  const mins = totalTime % 60;
  
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分' : ''}`;
  }
  return `${mins}分钟`;
};

// 处理确认
const handleConfirm = () => {
  const data = {
    startPage: props.startPage || 0,
    endPage: props.endPage || 0,
    pagesRead: pagesRead.value,
    duration: Math.floor(props.duration / 60) // 转换为分钟
  };
  emit('confirm', data);
  emit('update:visible', false);
};

// 处理继续阅读
const handleContinue = () => {
  emit('continue');
  emit('update:visible', false);
};

// 处理取消
const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};

// 处理遮罩点击
const handleOverlayClick = () => {
  // 点击遮罩不关闭，必须点击取消按钮
  // 如果需要点击遮罩关闭，可以改为调用 handleCancel()
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.dialog-container {
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  padding: 24px 24px 16px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #ff8c5a 0%, #ff6b35 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.dialog-icon svg {
  width: 32px;
  height: 32px;
  fill: white;
}

.dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.dialog-content {
  padding: 24px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section:last-of-type {
  margin-bottom: 24px;
}

.info-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.6;
}

.info-value.highlight {
  font-size: 24px;
  font-weight: 700;
  color: #ff6b35;
}

.info-value.book-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.page-range,
.stats-detail {
  font-size: 14px;
  color: #999;
  font-weight: 400;
  margin-left: 8px;
}

.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fff5f0;
  border-radius: 8px;
  border-left: 3px solid #ff6b35;
}

.info-tip svg {
  width: 20px;
  height: 20px;
  fill: #ff6b35;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-tip span {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #ff6b35;
  color: white;
}

.btn-primary:hover {
  background: #e55a2b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover {
  background: #45a612;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.btn-success:active {
  transform: translateY(0);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.dialog-container::-webkit-scrollbar {
  width: 6px;
}

.dialog-container::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.dialog-container::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}

.dialog-container::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
}
</style>
