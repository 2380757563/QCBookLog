/**
 * 书籍工具栏组件
 * 包含搜索、扫码、设置等功能
 */

<template>
  <div class="toolbar">
    <!-- 搜索栏 -->
    <div class="search-bar" @click="$emit('go-to-search')">
      <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <span>搜索书籍...</span>
    </div>

    <div class="toolbar-actions">
      <!-- 扫码按钮（带下拉菜单） -->
      <div class="dropdown-container" ref="scanDropdownRef">
        <button class="action-btn" @click="toggleScanMenu" title="扫码">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M3 3v6h2V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm-7 13h2v-2h-2v2zm0 4h2v-2h-2v2zm-4-4h2v-2H8v2zm4-4h2v-2h-2v2zm-4 0h2v-2H8v2zm-2 2h2v-2H6v2zm4-4h2V9h-2v2zm4 0h2V9h-2v2zm-2 4h2v-2h-2v2zm0 4h2v-2h-2v2z"/>
          </svg>
        </button>
        <div v-if="showScanMenu" class="dropdown-menu">
          <div class="dropdown-item" @click="$emit('go-to-isbn')">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14l-8-5V6l8 5v7z"/>
            </svg>
            ISBN搜索
          </div>
          <div class="dropdown-item" @click="$emit('go-to-batch-scanner')">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M21 5c-1.11-.14-2 .9-2 2v14c0 1.1.89 2 2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.89-2 2-2h14zM9 4H7V2h2v2zm8 0h-2V2h2v2zM5 20h14V7H5v13z"/>
            </svg>
            批量扫描
          </div>
        </div>
      </div>

      <!-- 设置按钮（带下拉菜单） -->
      <div class="dropdown-container" ref="settingsDropdownRef">
        <button class="action-btn settings-btn" @click="toggleSettingsMenu" title="设置">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
        <div v-if="showSettingsMenu" class="dropdown-menu settings-menu">
          <div class="dropdown-item" @click="$emit('toggle-layout')">
            <svg v-if="layout === 'grid'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M3 13h8v-2H3v2zm0 8h8v-2H3v2zm10-8h8v-2h-8v2zm0 8h8v-2h-8v2z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
            </svg>
            {{ layout === 'grid' ? '列表视图' : '网格视图' }}
          </div>
          <div class="menu-divider"></div>
          <div class="dropdown-item" @click="$emit('start-organize-mode')">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
            整理书籍
          </div>
          <div class="menu-divider"></div>
          <div class="dropdown-item-sub">
            <div class="menu-label">分组缩略图数</div>
            <div class="row-count-buttons">
              <button
                :class="['row-btn', { active: groupThumbnailMax === 4 }]"
                @click="$emit('set-group-thumbnail-max', 4)"
              >
                4本
              </button>
              <button
                :class="['row-btn', { active: groupThumbnailMax === 9 }]"
                @click="$emit('set-group-thumbnail-max', 9)"
              >
                9本
              </button>
            </div>
          </div>
          <div class="menu-divider"></div>
          <div class="dropdown-item-sub">
            <div class="menu-label">每行书籍数</div>
            <div class="row-count-buttons">
              <button
                :class="['row-btn', { active: gridColumns === 'auto' }]"
                @click="$emit('use-auto-columns')"
              >
                自动
              </button>
              <button
                :class="['row-btn', { active: gridColumns !== 'auto' }]"
                @click="$emit('use-manual-columns')"
              >
                手动
              </button>
            </div>
            <div v-if="gridColumns !== 'auto'" class="manual-columns-select">
              <select
                :value="manualColumnCount"
                @change="$emit('update-manual-columns', Number(($event.target as HTMLSelectElement).value))"
                class="column-select"
              >
                <option v-for="n in 20" :key="n" :value="n">{{ n }}列</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 手动录入按钮 -->
      <button class="action-btn add-btn" @click="$emit('add-book')" title="手动录入">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  layout: 'grid' | 'list';
  groupThumbnailMax: number;
  gridColumns: string;
  manualColumnCount: number;
}

const props = defineProps<Props>();

defineEmits<{
  'go-to-search': [];
  'go-to-isbn': [];
  'go-to-batch-scanner': [];
  'toggle-layout': [];
  'start-organize-mode': [];
  'set-group-thumbnail-max': [value: number];
  'set-grid-columns': [value: string | number];
  'use-auto-columns': [];
  'use-manual-columns': [];
  'update-manual-columns': [value: number];
  'add-book': [];
}>();

const showScanMenu = ref(false);
const showSettingsMenu = ref(false);
const scanDropdownRef = ref<HTMLElement | null>(null);
const settingsDropdownRef = ref<HTMLElement | null>(null);

function toggleScanMenu() {
  showScanMenu.value = !showScanMenu.value;
  if (showScanMenu.value) {
    showSettingsMenu.value = false;
  }
}

function toggleSettingsMenu() {
  showSettingsMenu.value = !showSettingsMenu.value;
  if (showSettingsMenu.value) {
    showScanMenu.value = false;
  }
}

function handleClickOutside(event: MouseEvent) {
  if (scanDropdownRef.value && !scanDropdownRef.value.contains(event.target as Node)) {
    showScanMenu.value = false;
  }
  if (settingsDropdownRef.value && !settingsDropdownRef.value.contains(event.target as Node)) {
    showSettingsMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* 保持原有样式 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  flex: 1;
  /* 占满剩余宽度，铺成一条长条状；只保留极小最小宽度避免在窄屏挤掉按钮 */
  min-width: 0;
  width: 100%;
  max-width: none;
  transition: background 0.2s ease;
}

.search-bar:hover {
  background: #ebebeb;
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  margin-right: 8px;
  transition: all 0.2s ease;
  color: #999;
}

.search-bar span {
  color: #999;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-container {
  position: relative;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f5f5f5;
}

.action-btn svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.add-btn {
  background: var(--primary-color, #FF6B35);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.15);
}

.settings-btn svg {
  color: var(--primary-color, #FF6B35);
  fill: var(--primary-color, #FF6B35);
}

.settings-btn:hover svg {
  color: #e65a2f;
  fill: #e65a2f;
}

.add-btn svg {
  color: #ffffff;
  fill: #ffffff;
  stroke: #ffffff;
}

.add-btn:hover {
  background: #e65a2f;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
  transform: translateY(-1px);
}

.add-btn:active {
  background: #cc5629;
  box-shadow: 0 1px 4px rgba(255, 107, 53, 0.2);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 160px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 14px;
  color: #333;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  color: #666;
}

.menu-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 8px 0;
}

.dropdown-item-sub {
  padding: 8px 16px;
}

.menu-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.row-count-buttons {
  display: flex;
  gap: 4px;
}

.row-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
}

.row-btn:hover {
  background: #f5f5f5;
}

.row-btn.active {
  background: var(--primary-color, #FF6B35);
  border-color: var(--primary-color, #FF6B35);
  color: white;
}

/* 手动列数下拉框 */
.manual-columns-select {
  margin-top: 8px;
}

.column-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: #fff;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.column-select:hover {
  border-color: var(--primary-color, #FF6B35);
}

.column-select:focus {
  border-color: var(--primary-color, #FF6B35);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}
</style>
