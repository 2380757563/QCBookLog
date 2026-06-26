<!--
  标签快速筛选组件 (TagQuickFilter)
  ==================================
  始终可见的 inline 标签筛选器，支持：
  - 已选标签 chips（点击 × 移除）
  - 输入框边输入边过滤候选
  - 关键字高亮显示
  - 键盘快捷键（Enter/Backspace/Esc）
  - 实时显示匹配数量

  Props:
    - selectedTags: 已选中的标签数组
    - availableTags: 全部可用标签数组
    - matchCount: 匹配到的书籍数（用于右侧显示）

  Emits:
    - update:selectedTags: 当已选标签变化时触发，payload 为新数组
    - clear: 清空所有标签时触发（可选）
-->
<template>
  <div class="tag-quick-filter" ref="tagQuickFilterRef">
    <div class="tag-quick-row">
      <!-- 已选标签 chips -->
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="tag-quick-chip"
        :title="`移除 ${tag}`"
        @click="removeTag(tag)"
      >
        {{ tag }} ×
      </span>

      <!-- 输入框 -->
      <div
        class="tag-quick-input-wrap"
        :class="{ 'tag-quick-input-wrap--focus': inputFocused }"
      >
        <input
          ref="tagQuickInputRef"
          v-model="searchText"
          class="tag-quick-input"
          :placeholder="selectedTags.length === 0 ? '输入标签筛选...' : '继续输入添加标签...'"
          @focus="onFocus"
          @blur="onBlur"
          @keydown.enter.prevent="confirmInput"
          @keydown.escape="closeSuggestions"
          @keydown.backspace="handleBackspace"
        />
        <button
          v-if="selectedTags.length > 0"
          class="tag-quick-clear-all"
          :title="'清空全部标签'"
          @mousedown.prevent="clearAll"
        >清空</button>
      </div>

      <!-- 匹配数显示 -->
      <span v-if="selectedTags.length > 0" class="tag-quick-result">
        匹配 {{ matchCount }} 本
      </span>
    </div>

    <!-- 候选下拉 -->
    <div
      v-if="showSuggestions && filteredCandidates.length > 0"
      class="tag-quick-dropdown"
    >
      <span
        v-for="tag in filteredCandidates"
        :key="tag"
        class="tag-quick-candidate"
        @mousedown.prevent="selectTag(tag)"
      >
        <span class="tag-quick-candidate-icon">+</span>
        <span v-html="highlightMatch(tag)"></span>
      </span>
      <span class="tag-quick-meta">
        {{ searchText
          ? `${filteredCandidates.length} 个匹配`
          : `共 ${availableTags.length - selectedTags.length} 个可选` }}
      </span>
    </div>
    <div
      v-else-if="showSuggestions && searchText"
      class="tag-quick-dropdown tag-quick-dropdown--empty"
    >
      没有匹配「{{ searchText }}」的标签
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  selectedTags: string[];
  availableTags: string[];
  matchCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedTags': [tags: string[]];
}>();

// 内部状态
const searchText = ref('');
const inputFocused = ref(false);
const showSuggestions = ref(false);
const tagQuickFilterRef = ref<HTMLElement | null>(null);
const tagQuickInputRef = ref<HTMLInputElement | null>(null);

// 过滤后的候选标签
const filteredCandidates = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  return props.availableTags
    .filter(t => !props.selectedTags.includes(t))
    .filter(t => !q || t.toLowerCase().includes(q))
    .slice(0, 20);
});

// 同步已选标签到父组件
function syncSelected(next: string[]) {
  emit('update:selectedTags', [...next]);
}

// 选中一个标签
function selectTag(tag: string) {
  if (!props.selectedTags.includes(tag)) {
    syncSelected([...props.selectedTags, tag]);
  }
  searchText.value = '';
  tagQuickInputRef.value?.focus();
}

// 移除一个标签
function removeTag(tag: string) {
  syncSelected(props.selectedTags.filter(t => t !== tag));
}

// 清空所有
function clearAll() {
  syncSelected([]);
  searchText.value = '';
}

// Enter 确认输入
function confirmInput() {
  const q = searchText.value.trim();
  if (!q) return;
  const exact = filteredCandidates.value.find(t => t === q);
  if (exact) {
    selectTag(exact);
    return;
  }
  const first = filteredCandidates.value[0];
  if (first) selectTag(first);
}

// 退格键空输入时移除最后一个
function handleBackspace() {
  if (searchText.value === '' && props.selectedTags.length > 0) {
    const next = [...props.selectedTags];
    next.pop();
    syncSelected(next);
  }
}

// 焦点管理
function onFocus() {
  inputFocused.value = true;
  showSuggestions.value = true;
}

function onBlur() {
  inputFocused.value = false;
  // 延迟关闭让 mousedown 先触发
  setTimeout(() => {
    showSuggestions.value = false;
  }, 180);
}

function closeSuggestions() {
  showSuggestions.value = false;
  searchText.value = '';
  tagQuickInputRef.value?.blur();
}

// HTML 转义与关键字高亮
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightMatch(tag: string): string {
  const q = searchText.value.trim();
  if (!q) return escapeHtml(tag);
  const idx = tag.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(tag);
  return (
    escapeHtml(tag.substring(0, idx)) +
    '<mark>' + escapeHtml(tag.substring(idx, idx + q.length)) + '</mark>' +
    escapeHtml(tag.substring(idx + q.length))
  );
}
</script>

<style scoped>
/* 标签快速筛选 - 始终可见输入框 */
.tag-quick-filter {
  position: relative;
  margin: 8px 16px 0 16px;
  z-index: 50;
}

.tag-quick-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  min-height: 40px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.tag-quick-row:focus-within {
  border-color: #ff6b35;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.08);
}

.tag-quick-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
  flex-shrink: 0;
  user-select: none;
}

.tag-quick-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  background: #ff6b35;
  color: #fff;
  border-radius: 11px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
}

.tag-quick-chip:hover {
  background: #e55a2b;
  transform: translateY(-1px);
}

.tag-quick-input-wrap {
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 120px;
  position: relative;
}

.tag-quick-input {
  border: none;
  outline: none;
  padding: 4px 6px;
  font-size: 13px;
  color: #333;
  background: transparent;
  flex: 1;
  min-width: 80px;
}

.tag-quick-input::placeholder {
  color: #aaa;
}

.tag-quick-clear-all {
  background: #f0f0f0;
  border: none;
  color: #999;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.tag-quick-clear-all:hover {
  background: #ffe8df;
  color: #ff6b35;
}

.tag-quick-result {
  font-size: 11px;
  color: #ff6b35;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
  padding-left: 6px;
}

.tag-quick-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05);
  z-index: 100;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.tag-quick-dropdown--empty {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 12px;
}

.tag-quick-candidate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f5f5f5;
  color: #555;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.tag-quick-candidate:hover {
  background: #ff6b35;
  color: #fff;
  transform: translateY(-1px);
}

.tag-quick-candidate:hover .tag-quick-candidate-icon {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.tag-quick-candidate-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: #fff;
  color: #ff6b35;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.tag-quick-candidate :deep(mark) {
  background: #fff3e0;
  color: #ff6b35;
  padding: 0 1px;
  border-radius: 2px;
  font-weight: 600;
}

.tag-quick-meta {
  font-size: 11px;
  color: #999;
  align-self: center;
  margin-left: auto;
  padding: 0 4px;
}

@media (max-width: 600px) {
  .tag-quick-filter {
    margin: 8px 12px 0 12px;
  }
  .tag-quick-row {
    padding: 6px 8px;
  }
  .tag-quick-input {
    min-width: 60px;
  }
}
</style>
