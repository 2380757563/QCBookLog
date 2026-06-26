<template>
  <div class="dialog-overlay" @click="$emit('update:show', false)">
    <div class="dialog dialog-group-selector" @click.stop>
      <div class="dialog-header">
        <span>选择分组</span>
        <span class="dialog-close" @click="$emit('update:show', false)">×</span>
      </div>
      <div class="dialog-body dialog-body--group-selector">
        <p class="group-selector-hint">
          勾选要加入的分组，取消勾选可从对应分组移除
        </p>
        <div class="group-selector-list">
          <div
            v-for="group in groups"
            :key="group.id"
            :class="['group-selector-item', { 'group-selector-item--selected': checkedGroupIds.has(group.id) }]"
            @click="toggleGroup(group.id)"
          >
            <div class="group-item-content">
              <!-- 多选复选框 -->
              <span
                :class="['group-checkbox', { 'group-checkbox--checked': checkedGroupIds.has(group.id) }]"
                @click.stop="toggleGroup(group.id)"
              >
                <svg v-if="checkedGroupIds.has(group.id)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </span>
              <span class="folder-icon">📁</span>
              <div class="group-item-details">
                <template v-if="editingGroupId === group.id">
                  <input
                    v-model="localEditName"
                    class="group-name-input"
                    placeholder="输入分组名称"
                    @click.stop
                    @keydown.enter="$emit('save-name', group.id, localEditName)"
                    @keydown.escape="$emit('cancel-edit')"
                    @blur="$emit('save-name', group.id, localEditName)"
                    ref="editInputRef"
                    autofocus
                  />
                </template>
                <template v-else>
                  <span
                    class="group-name-text"
                    @dblclick.stop="$emit('start-edit', group.id, group.name)"
                    title="双击编辑名称"
                  >
                    {{ group.name }}
                  </span>
                </template>
                <span class="group-count-text">{{ group.bookCount }} 本</span>
              </div>

              <!-- 所选书籍在该分组中的数量徽章（圆形橙色底 + 白色数字） -->
              <span
                v-if="getSelectedCountInGroup(group.id) > 0"
                class="selected-badge"
                :title="`已选书籍中在此分组的有 ${getSelectedCountInGroup(group.id)} 本`"
              >
                {{ getSelectedCountInGroup(group.id) }}
              </span>

              <!-- 管理 / 删除 按钮 -->
              <div class="group-item-actions">
                <button
                  class="action-mini-btn"
                  title="管理此分组"
                  @click.stop="$emit('manage-group', group.id)"
                >
                  管理
                </button>
                <button
                  class="action-mini-btn action-mini-btn--danger"
                  title="删除此分组"
                  @click.stop="$emit('delete-group', group.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
          <div class="group-selector-item group-selector-item--create" @click="$emit('create-new')">
            <div class="group-item-content">
              <span class="folder-icon folder-icon--create">+</span>
              <div class="group-item-details">
                <span class="group-name-text">创建新分组</span>
                <span v-if="groups.length === 0" class="group-count-text">还没有分组，点击创建</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-default" @click="$emit('update:show', false)">取消</button>
        <button
          class="btn btn-primary"
          :disabled="checkedGroupIds.size === 0"
          @click="confirmSelection"
        >确定 ({{ checkedGroupIds.size }})</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { BookGroup } from '@/services/book/types';

const props = defineProps<{
  show: boolean;
  groups: BookGroup[];
  selectedGroupId: string;
  editingGroupId: string | null;
  editingGroupName: string;
  /**
   * 已选书籍的"共同所在分组"集合，用于初始化勾选状态。
   * - 若所有已选书籍都在某分组 A 内，则 A 被默认勾选
   * - 若只有部分书籍在分组 A 内，则 A 不被勾选
   * 该字段由父组件（书库）从已选书籍的 groups 字段聚合而来
   */
  initialCheckedGroupIds?: string[];
  /**
   * 已选书籍在每个分组中的数量映射（key: groupId, value: 该分组包含的所选书籍数量）
   * 用于显示"分组文件夹旁显示该分组中包含的所选书籍数量"
   */
  selectedCountInGroup?: Record<string, number>;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'select': [groupId: string];
  'start-edit': [groupId: string, currentName: string];
  'save-name': [groupId: string, newName: string];
  'cancel-edit': [];
  'create-new': [];
  /**
   * 多选确认事件，payload 为当前勾选的分组 ID 数组
   * 父组件应根据这个数组与原 groups 字段做差量更新（添加/移除）
   */
  'confirm-multi': [groupIds: string[]];
  /**
   * 管理分组事件，父组件据此打开 GroupManageDialog
   */
  'manage-group': [groupId: string];
  /**
   * 删除分组事件，父组件执行删除逻辑
   */
  'delete-group': [groupId: string];
}>();

// 本地草稿：v-model 不能直接绑定到 prop，用本地 ref
const localEditName = ref(props.editingGroupName);
watch(
  () => [props.editingGroupId, props.editingGroupName] as const,
  ([id, name]) => {
    if (id) localEditName.value = name;
  }
);

// 多选勾选状态 - 使用 Set 以便高效查找/添加/删除
const checkedGroupIds = ref<Set<string>>(new Set(props.initialCheckedGroupIds || []));

// 当弹窗打开/初始勾选列表变化时，重置勾选状态
watch(
  () => [props.show, props.initialCheckedGroupIds] as const,
  ([show, init]) => {
    if (show) {
      checkedGroupIds.value = new Set(init || []);
    }
  },
  { deep: true, immediate: true }
);

function toggleGroup(groupId: string) {
  if (checkedGroupIds.value.has(groupId)) {
    checkedGroupIds.value.delete(groupId);
  } else {
    checkedGroupIds.value.add(groupId);
  }
  // 触发响应式更新（Set 内部变更需重新赋值才会被 watch 捕捉到）
  checkedGroupIds.value = new Set(checkedGroupIds.value);
}

function confirmSelection() {
  emit('confirm-multi', Array.from(checkedGroupIds.value));
}

function getSelectedCountInGroup(groupId: string): number {
  if (!props.selectedCountInGroup) return 0;
  return props.selectedCountInGroup[groupId] || 0;
}
</script>

<style scoped>
.group-selector-hint {
  font-size: 12px;
  color: #888;
  margin: 0 0 8px 0;
  padding: 0 4px;
}

/* 多选复选框样式 */
.group-checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid #d0d0d0;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--primary-color, #ff6b35);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.group-checkbox:hover {
  border-color: var(--primary-color, #ff6b35);
}

.group-checkbox--checked {
  background: var(--primary-color, #ff6b35);
  border-color: var(--primary-color, #ff6b35);
}

.group-checkbox svg {
  width: 14px;
  height: 14px;
  fill: #fff;
}

/* 分组项操作按钮 */
.group-item-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.action-mini-btn {
  font-size: 12px;
  padding: 3px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.action-mini-btn:hover {
  border-color: var(--primary-color, #ff6b35);
  color: var(--primary-color, #ff6b35);
  background: rgba(255, 107, 53, 0.05);
}

.action-mini-btn--danger:hover {
  border-color: #e74c3c;
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.05);
}

/* 选中数量徽章（圆形橙色底 + 白色数字） */
.selected-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  background: var(--primary-color, #ff6b35);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 6px;
  box-shadow: 0 1px 3px rgba(255, 107, 53, 0.4);
}

.dialog-body--group-selector {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
