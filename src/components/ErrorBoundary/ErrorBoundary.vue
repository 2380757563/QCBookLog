/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误
 */

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary-content">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">出错了</h2>
      <p class="error-message">{{ errorMessage }}</p>

      <div v-if="errorDetails" class="error-details">
        <details>
          <summary @click="toggleDetails">
            {{ showDetails ? '隐藏错误详情' : '显示错误详情' }}
          </summary>
          <pre v-if="showDetails" class="error-stack">{{ errorDetails }}</pre>
        </details>
      </div>

      <div class="error-actions">
        <button class="btn btn-primary" @click="reloadPage">
          刷新页面
        </button>
        <button class="btn btn-default" @click="goHome">
          返回首页
        </button>
        <button class="btn btn-link" @click="copyError">
          复制错误信息
        </button>
      </div>

      <button class="close-button" @click="dismissError" v-if="allowDismiss">
        ×
      </button>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  /**
   * 是否允许忽略错误
   */
  allowDismiss?: boolean;

  /**
   * 是否显示详细的错误信息
   */
  showDetailedError?: boolean;

  /**
   * 自定义错误消息
   */
  fallbackMessage?: string;

  /**
   * 是否记录错误到控制台
   */
  logError?: boolean;

  /**
   * 错误回调函数
   */
  onError?: (error: Error, instance: any, info: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  allowDismiss: true,
  showDetailedError: true,
  fallbackMessage: '抱歉，页面加载时发生了错误',
  logError: true
});

const emit = defineEmits<{
  (e: 'error-captured', error: Error, instance: any, info: string): void;
  (e: 'error-dismissed'): void;
}>();

const router = useRouter();

const error = ref<Error | null>(null);
const errorInfo = ref<string>('');
const showDetails = ref(false);

/**
 * 错误消息
 */
const errorMessage = computed(() => {
  if (props.fallbackMessage) {
    return props.fallbackMessage;
  }
  return error.value?.message || '发生了未知错误';
});

/**
 * 错误详情
 */
const errorDetails = computed(() => {
  if (!props.showDetailedError || !error.value) {
    return '';
  }

  let details = '';

  // 添加错误名称和消息
  details += `Error: ${error.value.name}\n`;
  details += `Message: ${error.value.message}\n`;

  // 添加错误堆栈
  if (error.value.stack) {
    details += `\nStack Trace:\n${error.value.stack}`;
  }

  // 添加组件信息
  if (errorInfo.value) {
    details += `\nComponent Info: ${errorInfo.value}`;
  }

  return details;
});

/**
 * 捕获子组件错误
 */
onErrorCaptured((err: Error, instance: any, info: string) => {
  error.value = err;
  errorInfo.value = info;

  // 记录错误到控制台
  if (props.logError) {
    console.error('❌ [ErrorBoundary] 捕获到错误:', err);
    console.error('组件实例:', instance);
    console.error('错误信息:', info);
  }

  // 调用错误回调
  if (props.onError) {
    props.onError(err, instance, info);
  }

  // 触发错误事件
  emit('error-captured', err, instance, info);

  // 阻止错误继续向上传播
  return false;
});

/**
 * 切换显示错误详情
 */
function toggleDetails() {
  showDetails.value = !showDetails.value;
}

/**
 * 刷新页面
 */
function reloadPage() {
  window.location.reload();
}

/**
 * 返回首页
 */
function goHome() {
  router.push('/');
}

/**
 * 复制错误信息
 */
async function copyError() {
  try {
    await navigator.clipboard.writeText(errorDetails.value);
    alert('错误信息已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  }
}

/**
 * 忽略错误
 */
function dismissError() {
  error.value = null;
  errorInfo.value = '';
  showDetails.value = false;

  emit('error-dismissed');
}
</script>

<style scoped>
.error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.error-boundary-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
  position: relative;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.error-message {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
  line-height: 1.6;
}

.error-details {
  margin-bottom: 24px;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-weight: 500;
  color: #666;
  user-select: none;
  transition: background 0.2s ease;
}

.error-details summary:hover {
  background: #e8e8e8;
}

.error-stack {
  margin-top: 10px;
  padding: 12px;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: #1a90ff;
  color: white;
}

.btn-primary:hover {
  background: #0d7be8;
}

.btn-default {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
}

.btn-default:hover {
  background: #e8e8e8;
  border-color: #d0d0d0;
}

.btn-link {
  background: transparent;
  color: #1a90ff;
  border: none;
  padding: 8px 16px;
  min-width: auto;
}

.btn-link:hover {
  color: #0d7be8;
  text-decoration: underline;
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #f5f5f5;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-boundary {
    padding: 16px;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-title {
    font-size: 24px;
    margin-bottom: 12px;
  }

  .error-message {
    font-size: 14px;
    margin-bottom: 20px;
  }
}
</style>
