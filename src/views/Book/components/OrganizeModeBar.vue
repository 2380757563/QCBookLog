<template>
  <div class="organize-mode-overlay">
    <!-- 顶部操作栏 -->
    <div class="organize-top-bar">
      <div class="organize-top-left">
        <button class="organize-action-btn" @click="$emit('select-all-books')">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H6v-2h3v2zm0-3H6v-2h3v2zm0-3H6V8h3v2zm7 6h-5v-2h5v2zm0-3h-5v-2h5v2zm0-3h-5V8h5v2z"/>
          </svg>
          全选书籍
        </button>
        <button class="organize-action-btn" @click="$emit('select-all-groups')">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 1.99 2H16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          全选分组
        </button>
        <button class="organize-action-btn" @click="$emit('invert-selection')">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          反选
        </button>
      </div>
      <div class="organize-top-right">
        <span class="selected-count">
          已选 {{ selectedGroupCount }} 个分组、{{ selectedBookCount }} 本书
        </span>
      </div>
    </div>

    <!-- 底部功能栏 -->
    <div class="organize-bottom-bar">
      <button class="organize-tool-btn" @click="$emit('scroll-to-top')" title="回顶部">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
        </svg>
      </button>
      <button class="organize-tool-btn" @click="$emit('pin-to-top')" title="置顶">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
      <button class="organize-tool-btn" @click="$emit('move-to-start')" title="移到开头">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <button class="organize-tool-btn" @click="$emit('move-to-end')" title="移到末尾">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </button>
      <button class="organize-tool-btn" @click="$emit('move-to-group')" title="移至分组">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      </button>
      <button class="organize-tool-btn" @click="$emit('change-status')" title="修改状态">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </button>
      <button class="organize-tool-btn organize-btn-delete" @click="$emit('delete-selected')" title="删除">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
      <button class="organize-tool-btn organize-btn-exit" @click="$emit('exit-organize-mode')" title="退出">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedBookCount: number;
  selectedGroupCount: number;
}>();

defineEmits<{
  'select-all-books': [];
  'select-all-groups': [];
  'invert-selection': [];
  'scroll-to-top': [];
  'pin-to-top': [];
  'move-to-start': [];
  'move-to-end': [];
  'move-to-group': [];
  'change-status': [];
  'delete-selected': [];
  'exit-organize-mode': [];
}>();
</script>

<style scoped>
.organize-mode-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}

.organize-top-bar,
.organize-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-elevated, #fff);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
}

.organize-top-bar {
  top: 0;
  justify-content: space-between;
}

.organize-bottom-bar {
  bottom: 0;
  justify-content: center;
  flex-wrap: wrap;
}

.organize-top-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.selected-count {
  color: var(--text-secondary, #666);
  font-size: 14px;
}

.organize-action-btn,
.organize-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.organize-action-btn:hover,
.organize-tool-btn:hover {
  background: var(--bg-hover, #f5f5f5);
}

.organize-action-btn svg,
.organize-tool-btn svg {
  width: 18px;
  height: 18px;
}

.organize-btn-delete:hover {
  color: #f44336;
  border-color: #f44336;
}

.organize-btn-exit:hover {
  color: #2196f3;
  border-color: #2196f3;
}
</style>
