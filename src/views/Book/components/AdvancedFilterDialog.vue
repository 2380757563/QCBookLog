<!--
  高级筛选弹窗组件 (AdvancedFilterDialog)
  ========================================
  包含 8 个筛选维度：阅读状态、喜欢/待读、书籍载体、装帧、纸张、刷边、出版社、作者、标签

  Props:
    - show:    是否显示
    - conditions: 筛选条件对象（双向绑定）
    - availableTags: 标签候选列表
    - totalBooks: 总书籍数
    - filteredCount: 已筛选书籍数

  Emits:
    - update:show: 关闭弹窗
    - update:conditions: 筛选条件变化
    - reset: 重置全部条件
-->
<template>
  <div v-if="show" class="filter-overlay" @click="emit('update:show', false)">
    <div class="filter-dialog" @click.stop>
      <div class="filter-header">
        <h3 class="filter-title">高级筛选</h3>
        <span class="filter-count">
          已筛选 {{ filteredCount }} / {{ totalBooks }} 本
        </span>
        <span class="dialog-close" @click="emit('update:show', false)">×</span>
      </div>

      <div class="filter-body">
        <!-- 阅读状态 -->
        <div class="filter-section">
          <label class="filter-label">阅读状态</label>
          <div class="filter-options">
            <button
              v-for="opt in READ_STATUS_OPTIONS"
              :key="opt.value || 'all'"
              :class="['filter-option-btn', { 'filter-option-btn--active': local.readStatus === opt.value }]"
              @click="setReadStatus(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- 喜欢/待读 -->
        <div class="filter-section">
          <label class="filter-label">喜欢/待读</label>
          <div class="filter-options">
            <button
              :class="['filter-option-btn', { 'filter-option-btn--active': local.favorite === null && local.wants === null }]"
              @click="setFavorite(null); setWants(null)"
            >全部</button>
            <button
              :class="['filter-option-btn', { 'filter-option-btn--active': local.favorite === 1 }]"
              @click="setFavorite(local.favorite === 1 ? null : 1)"
            >❤️ 喜欢</button>
            <button
              :class="['filter-option-btn', { 'filter-option-btn--active': local.wants === 1 }]"
              @click="setWants(local.wants === 1 ? null : 1)"
            >📚 待读</button>
          </div>
        </div>

        <!-- 书籍载体 -->
        <div class="filter-section">
          <label class="filter-label">书籍载体</label>
          <div class="filter-options">
            <button
              v-for="opt in BOOK_TYPE_OPTIONS"
              :key="opt.value ?? 'all'"
              :class="['filter-option-btn', { 'filter-option-btn--active': local.book_type === opt.value }]"
              @click="setBookType(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- 装帧类型 -->
        <div class="filter-section">
          <label class="filter-label">装帧类型</label>
          <select v-model="local.binding2" @change="emitChange" class="filter-select">
            <option :value="null">全部</option>
            <option v-for="n in BINDING2_VALUES" :key="n" :value="n">{{ getBinding2Name(n) }}</option>
          </select>
        </div>

        <!-- 纸张类型 -->
        <div class="filter-section">
          <label class="filter-label">纸张类型</label>
          <select v-model="local.paper1" @change="emitChange" class="filter-select">
            <option :value="null">全部</option>
            <option v-for="opt in PAPER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- 刷边位置 -->
        <div class="filter-section">
          <label class="filter-label">刷边位置</label>
          <select v-model="local.edge1" @change="emitChange" class="filter-select">
            <option :value="null">全部</option>
            <option v-for="opt in EDGE1_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- 刷边工艺 -->
        <div class="filter-section">
          <label class="filter-label">刷边工艺</label>
          <select v-model="local.edge2" @change="emitChange" class="filter-select">
            <option :value="null">全部</option>
            <option v-for="opt in EDGE2_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- 出版社 -->
        <div class="filter-section">
          <label class="filter-label">出版社（模糊搜索）</label>
          <div class="filter-search">
            <svg class="search-icon-small" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              v-model="local.publisher"
              @input="emitChange"
              class="filter-input"
              placeholder="输入出版社名称..."
            />
            <button
              v-if="local.publisher"
              class="clear-input-btn"
              @click="local.publisher = ''; emitChange()"
            >×</button>
          </div>
        </div>

        <!-- 作者 -->
        <div class="filter-section">
          <label class="filter-label">作者（模糊搜索）</label>
          <div class="filter-search">
            <svg class="search-icon-small" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              v-model="local.author"
              @input="emitChange"
              class="filter-input"
              placeholder="输入作者名称..."
            />
            <button
              v-if="local.author"
              class="clear-input-btn"
              @click="local.author = ''; emitChange()"
            >×</button>
          </div>
        </div>

        <!-- 标签筛选 -->
        <div class="filter-section">
          <label class="filter-label">标签（多选）</label>
          <div class="tags-filter-search">
            <svg class="tags-filter-search-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              v-model="tagSearch"
              class="tags-filter-search-input"
              placeholder="搜索标签..."
            />
            <button
              v-if="tagSearch"
              class="tags-filter-search-clear"
              @click="tagSearch = ''"
              title="清空"
            >×</button>
          </div>
          <div class="tags-filter">
            <span
              v-for="tag in filteredAdvancedTags"
              :key="tag"
              :class="['filter-tag', { 'filter-tag--active': local.tags.includes(tag) }]"
              @click="toggleTag(tag)"
            >{{ tag }}</span>
            <span v-if="filteredAdvancedTags.length === 0" class="no-tags">
              {{ tagSearch ? `没有匹配「${tagSearch}」的标签` : '暂无标签' }}
            </span>
          </div>
        </div>
      </div>

      <div class="filter-footer">
        <button class="btn btn-default" @click="emit('reset')">重置筛选</button>
        <button class="btn btn-primary" @click="emit('update:show', false)">应用</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { BookFilterConditions } from '../composables/useBookFilters';

interface Props {
  show: boolean;
  conditions: BookFilterConditions;
  availableTags: string[];
  totalBooks: number;
  filteredCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'update:conditions': [value: BookFilterConditions];
  'reset': [];
}>();

// 内部条件副本（避免直接修改 props）
const local = ref<BookFilterConditions>({ ...props.conditions, tags: [...props.conditions.tags] });

// 同步外部 conditions -> local
watch(
  () => props.conditions,
  (next) => {
    local.value = { ...next, tags: [...next.tags] };
  },
  { deep: true }
);

// 弹窗内独立的标签搜索
const tagSearch = ref('');

const filteredAdvancedTags = computed(() => {
  const q = tagSearch.value.trim().toLowerCase();
  if (!q) return props.availableTags;
  return props.availableTags.filter(t => t.toLowerCase().includes(q));
});

// 选项常量
const READ_STATUS_OPTIONS: { label: string; value: '' | '未读' | '在读' | '已读' }[] = [
  { label: '全部', value: '' },
  { label: '未读', value: '未读' },
  { label: '在读', value: '在读' },
  { label: '已读', value: '已读' },
];

const BOOK_TYPE_OPTIONS: { label: string; value: number | null }[] = [
  { label: '全部', value: null },
  { label: '实体书', value: 1 },
  { label: '电子书', value: 0 },
];

const PAPER_OPTIONS: { label: string; value: number }[] = [
  { label: '未指定', value: 0 },
  { label: '胶版纸（双胶纸）', value: 1 },
  { label: '轻型纸', value: 2 },
  { label: '道林纸', value: 3 },
  { label: '铜版纸', value: 4 },
  { label: '牛皮纸', value: 5 },
  { label: '宣纸', value: 6 },
  { label: '进口特种纸', value: 7 },
];

const EDGE1_OPTIONS: { label: string; value: number }[] = [
  { label: '无刷边', value: 0 },
  { label: '书口单侧', value: 1 },
  { label: '多侧（书口+天头/地脚）', value: 2 },
  { label: '全三边', value: 3 },
];

const EDGE2_OPTIONS: { label: string; value: number }[] = [
  { label: '无细分', value: 0 },
  { label: '基础单色', value: 1 },
  { label: '烫边（烫金/银）', value: 2 },
  { label: '磨边（毛边）', value: 3 },
  { label: '彩绘艺术刷边', value: 4 },
  { label: '鎏金高端刷边', value: 5 },
];

const BINDING2_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// 装帧类型名称映射
const BINDING2_NAME_MAP: Record<number, string> = {
  0: '无装帧',
  1: '无线胶装',
  2: '骑马钉装订',
  3: '活页装订',
  4: '锁线胶装',
  5: '硬壳精装（圆脊）',
  6: '硬壳精装（方脊）',
  7: '布面精装',
  8: 'PU皮面精装',
  9: '真皮精装（头层牛皮）',
  10: '真皮精装（羊皮）',
  11: '仿皮（人造革）精装',
  12: '线装',
  13: '经折装',
};

function getBinding2Name(v: number) {
  return BINDING2_NAME_MAP[v] || '未知';
}

// 修改器
function setReadStatus(v: '' | '未读' | '在读' | '已读') {
  local.value.readStatus = v;
  emitChange();
}

function setFavorite(v: number | null) {
  local.value.favorite = v;
  emitChange();
}

function setWants(v: number | null) {
  local.value.wants = v;
  emitChange();
}

function setBookType(v: number | null) {
  local.value.book_type = v;
  emitChange();
}

function toggleTag(tag: string) {
  const idx = local.value.tags.indexOf(tag);
  if (idx === -1) {
    local.value.tags.push(tag);
  } else {
    local.value.tags.splice(idx, 1);
  }
  emitChange();
}

function emitChange() {
  emit('update:conditions', { ...local.value, tags: [...local.value.tags] });
}
</script>

<style scoped>
.filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-dialog {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.filter-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.filter-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.filter-count {
  margin-left: 12px;
  font-size: 12px;
  color: #999;
}

.dialog-close {
  margin-left: auto;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  border-radius: 4px;
}

.dialog-close:hover {
  background: #f5f5f5;
  color: #333;
}

.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.filter-section {
  margin-bottom: 18px;
}

.filter-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-option-btn {
  padding: 5px 12px;
  border: 1px solid #e0e0e0;
  background: #fff;
  color: #555;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option-btn:hover {
  border-color: #ff6b35;
  color: #ff6b35;
}

.filter-option-btn--active {
  background: #ff6b35;
  color: #fff;
  border-color: #ff6b35;
}

.filter-select,
.filter-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  color: #333;
  outline: none;
  transition: border-color 0.2s ease;
}

.filter-select:focus,
.filter-input:focus {
  border-color: #ff6b35;
}

.filter-search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-small {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: #999;
  pointer-events: none;
}

.filter-search .filter-input {
  padding-left: 30px;
  padding-right: 28px;
}

.clear-input-btn {
  position: absolute;
  right: 6px;
  width: 18px;
  height: 18px;
  border: none;
  background: #e0e0e0;
  color: #999;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-input-btn:hover {
  background: #ff6b35;
  color: #fff;
}

.tags-filter-search {
  position: relative;
  display: flex;
  align-items: center;
  margin: 4px 0 8px 0;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.tags-filter-search:focus-within {
  border-color: #ff6b35;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.08);
}

.tags-filter-search-icon {
  width: 14px;
  height: 14px;
  color: #999;
  flex-shrink: 0;
}

.tags-filter-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0 8px;
  font-size: 13px;
  color: #333;
  background: transparent;
}

.tags-filter-search-input::placeholder {
  color: #aaa;
}

.tags-filter-search-clear {
  width: 18px;
  height: 18px;
  border: none;
  background: #e0e0e0;
  color: #999;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tags-filter-search-clear:hover {
  background: #ff6b35;
  color: #fff;
}

.tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding: 2px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f5f5f5;
  color: #555;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.filter-tag:hover {
  background: #fff5f0;
  color: #ff6b35;
}

.filter-tag--active {
  background: #ff6b35;
  color: #fff;
}

.no-tags {
  font-size: 12px;
  color: #bbb;
  padding: 8px;
}

.filter-footer {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-default {
  color: #555;
}

.btn-default:hover {
  border-color: #ff6b35;
  color: #ff6b35;
}

.btn-primary {
  background: #ff6b35;
  color: #fff;
  border-color: #ff6b35;
}

.btn-primary:hover {
  background: #e55a2b;
  border-color: #e55a2b;
}
</style>
