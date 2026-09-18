<template>
  <Teleport to="body">
    <Transition name="task-float">
      <div
        v-if="taskStore.visibleTasks.length > 0"
        class="task-float-window"
        :class="{ expanded: isExpanded, dragging: isDragging }"
        :style="{ right: position.right + 'px', top: position.top + 'px' }"
        @mousedown="startDrag"
        @click="handleClick"
      >
        <!-- 收起态：主任务摘要 + 进度条，多任务时显示徽标 -->
        <div v-if="!isExpanded" class="compact-body">
          <div class="compact-main" :class="statusClass(primaryTask)">
            <div class="compact-header">
              <span class="task-icon" :class="statusClass(primaryTask)">
                <svg v-if="isActive(primaryTask)" class="spin" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z" fill="currentColor"/>
                </svg>
                <svg v-else-if="primaryTask.status === 'done'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5L2.99 21H21L11.99 2zM6 19l6-10.36L18 19H6z" fill="currentColor"/>
                </svg>
              </span>
              <span class="compact-title">{{ primaryTask.title }}</span>
              <span v-if="taskStore.activeTasks.length > 1" class="badge">{{ taskStore.activeTasks.length }}</span>
            </div>
            <div class="compact-progress">
              <div class="progress-track thin">
                <div class="progress-fill" :class="{ failed: primaryTask.status === 'failed' }" :style="{ width: percentOf(primaryTask) + '%' }"></div>
              </div>
              <span class="compact-count">{{ countText(primaryTask) }}</span>
            </div>
          </div>
        </div>

        <!-- 展开态：任务列表 -->
        <div v-else class="expanded-body" @click.stop>
          <div class="expanded-header">
            <span class="expanded-title">任务中心</span>
            <button class="collapse-btn" title="收起" @click.stop="toggleExpand">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/></svg>
            </button>
          </div>

          <div class="task-list">
            <div
              v-for="task in taskStore.visibleTasks"
              :key="task.id"
              class="task-row"
              :class="statusClass(task)"
              @click.stop="handleTaskClick(task)"
            >
              <div class="task-row-top">
                <span class="row-title">{{ task.title }}</span>
                <span class="row-percent">{{ percentOf(task) }}%</span>
              </div>
              <div class="row-phase">{{ phaseText(task) }}</div>
              <div v-if="task.message" class="row-message">{{ task.message }}</div>
              <div class="progress-track">
                <div class="progress-fill" :class="{ failed: task.status === 'failed' }" :style="{ width: percentOf(task) + '%' }"></div>
              </div>
              <div v-if="task.status === 'failed' && task.errors.length" class="row-errors">
                <div v-for="(err, i) in task.errors" :key="i" class="row-error">{{ err }}</div>
              </div>
              <div class="row-actions">
                <button
                  v-if="task.status === 'interrupted' && canRestart(task)"
                  class="action-link"
                  @click.stop="restartTask(task)"
                >重新开始</button>
                <button
                  v-if="isActive(task) && task.canCancel"
                  class="action-link danger"
                  @click.stop="taskStore.cancelTask(task.id)"
                >取消</button>
                <button
                  v-if="task.status === 'done' || task.status === 'failed' || task.status === 'cancelled' || task.status === 'interrupted'"
                  class="action-link"
                  @click.stop="taskStore.dismissTask(task.id)"
                >关闭</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '@/stores/task';
import type { TaskRecord } from '@/stores/task';

const router = useRouter();
const taskStore = useTaskStore();

const isExpanded = ref(false);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const initialBoxRect = ref({ left: 0, top: 0, width: 0, height: 0 });
// 拖动位移阈值：超过 5px 视为拖动，mouseup 后的 click 不触发展开/收起
const DRAG_THRESHOLD = 5;
let dragStartX = 0;
let dragStartY = 0;
let dragDistance = 0;

// 位置状态（localStorage 持久化，key: taskWindowPosition）- 默认 top:20，与阅读浮球（top:100）错开
const position = ref({ right: 20, top: 20 });

const loadPosition = () => {
  try {
    const saved = localStorage.getItem('taskWindowPosition');
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.right === 'number' && typeof pos.top === 'number') {
        position.value = {
          right: Math.max(0, pos.right),
          top: Math.min(Math.max(0, pos.top), window.innerHeight - 100)
        };
      }
    }
  } catch (e) {
    console.error('Failed to load task window position:', e);
  }
};

const savePosition = () => {
  try {
    localStorage.setItem('taskWindowPosition', JSON.stringify(position.value));
  } catch (e) {
    console.error('Failed to save task window position:', e);
  }
};

/** 收起态展示的主任务：优先进行中的，否则取第一个可见任务（完成/失败结果） */
const primaryTask = computed<TaskRecord>(() => {
  const list = taskStore.visibleTasks;
  return (
    list.find((t) => t.status === 'running' || t.status === 'queued') ??
    list.find((t) => t.status === 'interrupted') ??
    list[0]
  );
});

const isActive = (task: TaskRecord) => task.status === 'running' || task.status === 'queued';

const statusClass = (task: TaskRecord) => ({
  running: task.status === 'running',
  queued: task.status === 'queued',
  done: task.status === 'done',
  failed: task.status === 'failed',
  cancelled: task.status === 'cancelled',
  interrupted: task.status === 'interrupted'
});

const percentOf = (task: TaskRecord) => {
  if (task.status === 'done') return 100;
  if (task.total <= 0) return 0;
  return Math.min(100, Math.round((task.completed / task.total) * 100));
};

const countText = (task: TaskRecord) => {
  if (task.status === 'done') return '已完成';
  return `${task.completed}/${task.total}`;
};

const phaseText = (task: TaskRecord) => {
  if (task.status === 'queued') {
    // 按入队数组顺序取位置（同毫秒 startedAt 无法用时间戳区分）
    const ahead = taskStore.tasks.filter((t) => t.status === 'queued').findIndex((t) => t.id === task.id);
    return ahead > 0 ? `排队中（前面还有 ${ahead} 个）` : '排队中';
  }
  if (task.status === 'interrupted') return `任务已中断（${task.completed}/${task.total}）`;
  if (task.status === 'done') {
    const s = task.summary;
    if (s) return `成功 ${s.success} 本，跳过 ${s.skipped} 本，失败 ${s.failed} 本`;
    return '已完成';
  }
  if (task.status === 'failed') return '任务失败';
  if (task.status === 'cancelled') return '已取消';
  return task.phase;
};

/** 支持中断续跑的任务类型（doc 计划 4.7：仅 payload 能自洽恢复的任务开放，动态加载对应模块） */
const canRestart = (task: TaskRecord) =>
  (task.type === 'doulist-shelve' || task.type === 'scan-import') && !!task.payload;

const restartTask = async (task: TaskRecord) => {
  if (task.type === 'doulist-shelve') {
    const m = await import('@/composables/doulistShelveTask');
    m.restartShelveTask(task);
  } else if (task.type === 'scan-import') {
    const m = await import('@/composables/batchScannerTask');
    m.restartScannerImportTask(task);
  }
  // 无论是否成功重启，中断记录都已完成使命，移除避免残留
  taskStore.dismissTask(task.id);
};

// 点击窗口（收起态）：切换展开/收起；拖动后（位移超过阈值）不触发
const handleClick = () => {
  if (dragDistance > DRAG_THRESHOLD) {
    dragDistance = 0;
    return;
  }
  if (!isExpanded.value) {
    toggleExpand();
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  // 用户在本页主动展开过 → 本页内不再自动隐藏
  if (isExpanded.value) taskStore.markManuallyShown();
};

// 点击任务行 → 跳回任务页
const handleTaskClick = (task: TaskRecord) => {
  isExpanded.value = false;
  router.push({ path: task.target.path, query: task.target.query });
};

// 开始拖动（收起态与展开态头部均可拖动）
const startDrag = (e: MouseEvent) => {
  if (isExpanded.value) return;

  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragDistance = 0;
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  initialBoxRect.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  dragDistance = Math.max(dragDistance, Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY));

  const newLeft = e.clientX - dragOffset.value.x;
  const newTop = e.clientY - dragOffset.value.y;
  const boxWidth = initialBoxRect.value.width;
  const boxHeight = initialBoxRect.value.height;

  // 边界夹取：限制在屏幕内
  const clampedLeft = Math.min(Math.max(0, newLeft), window.innerWidth - boxWidth);
  const clampedTop = Math.min(Math.max(0, newTop), window.innerHeight - boxHeight);

  position.value = {
    right: Math.max(0, window.innerWidth - clampedLeft - boxWidth),
    top: clampedTop
  };
};

const endDrag = () => {
  isDragging.value = false;
  savePosition();
  // 用户主动拖动过 → 本页内不再自动隐藏
  if (dragDistance > DRAG_THRESHOLD) taskStore.markManuallyShown();

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
};

// 完成态任务 3 秒后自动收起（移除记录）；失败/取消保留，需手动关闭
const scheduledDismissIds = new Set<string>();
const autoDismissTimers = new Set<ReturnType<typeof setTimeout>>();
watch(
  () => taskStore.visibleTasks.map((t) => `${t.id}:${t.status}`).join(','),
  () => {
    taskStore.visibleTasks.forEach((task) => {
      if (task.status === 'done' && !scheduledDismissIds.has(task.id)) {
        scheduledDismissIds.add(task.id);
        const timer = setTimeout(() => {
          autoDismissTimers.delete(timer);
          taskStore.dismissTask(task.id);
        }, 3000);
        autoDismissTimers.add(timer);
      }
    });
  },
  { immediate: true }
);

// 监听窗口大小变化，防止小窗留在屏幕外
const handleResize = () => {
  position.value = {
    right: Math.max(0, position.value.right),
    top: Math.min(Math.max(0, position.value.top), window.innerHeight - 100)
  };
};

onMounted(() => {
  loadPosition();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  autoDismissTimers.forEach((timer) => clearTimeout(timer));
  autoDismissTimers.clear();
});
</script>

<style scoped>
.task-float-window {
  position: fixed;
  /* 高于所有弹窗/下拉（最高 11000），保证任意界面可点回任务页 */
  z-index: 12000;
  background: white;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: move;
  user-select: none;
  transition: box-shadow 0.3s ease;
}

.task-float-window:hover {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.task-float-window.dragging {
  cursor: move;
  transition: none;
}

/* ===== 收起态 ===== */
.compact-body {
  width: 280px;
}

.compact-main {
  padding: 10px 14px;
}

.compact-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.task-icon {
  display: flex;
  align-items: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.task-icon svg {
  width: 16px;
  height: 16px;
}

.task-icon.done {
  color: #34c759;
}

.task-icon.failed,
.task-icon.cancelled {
  color: #ff3b30;
}

.task-icon .spin {
  animation: task-spin 1s linear infinite;
}

@keyframes task-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.compact-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--primary-color);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.compact-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compact-progress .progress-track {
  flex: 1;
}

.compact-count {
  font-size: 12px;
  color: #8e8e93;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ===== 进度条 ===== */
.progress-track {
  height: 8px;
  border-radius: 4px;
  background: #f0f0f0;
  overflow: hidden;
}

.progress-track.thin {
  height: 5px;
  border-radius: 3px;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-fill.failed {
  background: #ff3b30;
}

.task-row.queued .progress-fill {
  background: #c7c7cc;
}

/* ===== 展开态 ===== */
.expanded-body {
  width: 320px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
  cursor: default;
}

.expanded-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8e8e93;
  cursor: pointer;
}

.collapse-btn:hover {
  background: #f2f2f7;
  color: #1a1a1a;
}

.collapse-btn svg {
  width: 18px;
  height: 18px;
}

.task-list {
  overflow-y: auto;
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8f8f8;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.task-row:hover {
  background: rgba(255, 107, 53, 0.08);
  border-color: rgba(255, 107, 53, 0.35);
}

.task-row.failed {
  border-color: rgba(255, 59, 48, 0.4);
  background: rgba(255, 59, 48, 0.05);
}

.task-row.failed:hover {
  background: rgba(255, 59, 48, 0.1);
}

.task-row.done {
  border-color: rgba(52, 199, 89, 0.4);
  background: rgba(52, 199, 89, 0.05);
}

.task-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.row-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-percent {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.row-phase {
  font-size: 12px;
  color: #6e6e73;
  margin-bottom: 4px;
}

.task-row.done .row-phase {
  color: #34c759;
}

.task-row.failed .row-phase {
  color: #ff3b30;
}

.task-row.cancelled .row-phase {
  color: #8e8e93;
}

.row-message {
  font-size: 12px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.task-row .progress-track {
  height: 6px;
}

.row-errors {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 59, 48, 0.08);
  max-height: 80px;
  overflow-y: auto;
}

.row-error {
  font-size: 11px;
  color: #ff3b30;
  line-height: 1.5;
  word-break: break-all;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.action-link {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  cursor: pointer;
}

.action-link.danger {
  color: #ff3b30;
}

.action-link:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* ===== 过渡动画 ===== */
.task-float-enter-active,
.task-float-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.task-float-enter-from,
.task-float-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
