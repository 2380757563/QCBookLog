<template>
  <div
    ref="rootRef"
    :class="['qc-select', `qc-select--${size}`, {
      'qc-select--open': open,
      'qc-select--up': dropUp,
      'qc-select--disabled': disabled
    }]"
  >
    <button
      type="button"
      class="qc-select__trigger"
      :disabled="disabled"
      @click="toggle"
      @keydown.down.prevent="moveHover(1)"
      @keydown.up.prevent="moveHover(-1)"
      @keydown.enter.prevent="confirmHover"
      @keydown.esc="close"
    >
      <span :class="['qc-select__label', { 'qc-select__label--placeholder': !selectedLabel }]">
        {{ selectedLabel || placeholder || '请选择' }}
      </span>
      <svg
        :class="['qc-select__arrow', { 'qc-select__arrow--up': open }]"
        viewBox="0 0 24 24" width="16" height="16" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="qc-select-drop">
        <div
          v-if="open"
          ref="popperRef"
          :class="['qc-select__popper', { 'qc-select__popper--up': dropUp }]"
          :style="popperStyle"
          role="listbox"
        >
          <div
            v-for="(opt, i) in options"
            :key="String(opt.value)"
            :class="['qc-select__option', {
              'qc-select__option--selected': isSelected(opt),
              'qc-select__option--hover': i === hoverIndex,
              'qc-select__option--disabled': opt.disabled
            }]"
            role="option"
            :aria-selected="isSelected(opt)"
            @mouseenter="hoverIndex = i"
            @click="pick(opt)"
          >
            <span class="qc-select__option-label">{{ opt.label }}</span>
            <svg
              v-if="isSelected(opt)"
              class="qc-select__check" viewBox="0 0 24 24" width="15" height="15" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div v-if="!options.length" class="qc-select__empty">无选项</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 全局自定义下拉组件：替代原生 <select>
 * 用法：
 *   <QcSelect v-model="sortBy" :options="[{ value: 'title', label: '书名' }]" />
 *   size: 'sm'（工具栏小尺寸）| 'md'（表单默认），宽度由外部 class/style 控制
 * 样式：触发器与项目输入框一致；展开面板紧贴触发器下沿（同级衔接），
 *       展开时输入框保留下方直角、面板只保留底部圆角，视觉上连成一体
 */
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue';

export interface QcSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  modelValue?: string | number;
  options: QcSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}>(), { size: 'md' });

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();

const rootRef = ref<HTMLElement | null>(null);
const popperRef = ref<HTMLElement | null>(null);
const open = ref(false);
const dropUp = ref(false);
const hoverIndex = ref(-1);
const popperStyle = ref<Record<string, string>>({});

const selectedLabel = computed(() => {
  const hit = props.options.find((o) => String(o.value) === String(props.modelValue));
  return hit ? hit.label : '';
});

const isSelected = (opt: QcSelectOption) => String(opt.value) === String(props.modelValue);

const toggle = () => {
  if (props.disabled) return;
  open.value ? close() : show();
};

const show = async () => {
  open.value = true;
  const idx = props.options.findIndex((o) => isSelected(o));
  hoverIndex.value = idx >= 0 ? idx : 0;
  await nextTick();
  positionPopper();
};

const close = () => {
  open.value = false;
};

/** 面板紧贴触发器上/下沿，宽度与触发器对齐（无间隙，形成一体） */
const positionPopper = () => {
  const trigger = rootRef.value?.querySelector('.qc-select__trigger') as HTMLElement | null;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const popH = popperRef.value?.offsetHeight || 0;
  const spaceBelow = window.innerHeight - rect.bottom;
  dropUp.value = spaceBelow < popH + 8 && rect.top > popH + 8;
  popperStyle.value = {
    left: `${Math.round(rect.left)}px`,
    top: dropUp.value ? `${Math.round(rect.top - popH)}px` : `${Math.round(rect.bottom)}px`,
    minWidth: `${Math.round(rect.width)}px`
  };
};

const pick = (opt: QcSelectOption) => {
  if (opt.disabled) return;
  emit('update:modelValue', opt.value);
  close();
};

const moveHover = (dir: number) => {
  if (!open.value) { show(); return; }
  if (!props.options.length) return;
  let i = hoverIndex.value;
  for (let step = 0; step < props.options.length; step++) {
    i = (i + dir + props.options.length) % props.options.length;
    if (!props.options[i].disabled) break;
  }
  hoverIndex.value = i;
};

const confirmHover = () => {
  if (!open.value) return;
  const opt = props.options[hoverIndex.value];
  if (opt && !opt.disabled) pick(opt);
};

const onGlobalClick = (e: MouseEvent) => {
  const t = e.target as Node;
  if (rootRef.value?.contains(t)) return;
  if (popperRef.value?.contains(t)) return;
  close();
};

// 滚动/缩放时重新定位（面板与触发器联动，而非直接关闭）
const onReposition = () => { if (open.value) positionPopper(); };

watch(() => props.options, () => { if (open.value) positionPopper(); });

window.addEventListener('click', onGlobalClick, true);
window.addEventListener('scroll', onReposition, true);
window.addEventListener('resize', onReposition);
onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick, true);
  window.removeEventListener('scroll', onReposition, true);
  window.removeEventListener('resize', onReposition);
});
</script>

<style>
/* 非 scoped：Teleport 到 body 的浮层也需要样式；类名以 qc-select 前缀隔离 */

.qc-select {
  position: relative;
  display: inline-block;
  width: 100%;
}

/* 触发器：与项目 input 完全一致的外观（关闭态四角圆角） */
.qc-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 36px 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  background-color: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.15s;
  text-align: left;
  line-height: 1.5;
}

.qc-select--sm .qc-select__trigger {
  padding: 6px 30px 6px 10px;
  font-size: 13px;
}

.qc-select__trigger:hover {
  border-color: #cfcfcf;
}

/* 按下反馈：同一主题色系，但更明显 */
.qc-select__trigger:active {
  background-color: rgba(255, 107, 53, 0.06);
  border-color: var(--primary-color);
}

.qc-select__trigger:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.qc-select--disabled .qc-select__trigger {
  color: var(--text-disabled);
  background-color: var(--bg-primary);
  cursor: not-allowed;
}

.qc-select__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qc-select__label--placeholder {
  color: var(--text-hint);
}

.qc-select__arrow {
  flex-shrink: 0;
  color: #999999;
  transition: transform 0.2s, color 0.2s;
}

.qc-select--open .qc-select__arrow {
  color: var(--primary-color);
}

.qc-select__arrow--up {
  transform: rotate(180deg);
}

/* 展开态：输入框与面板连成一体 —— 上方圆角保留、下沿直角且边框让位给面板 */
.qc-select--open .qc-select__trigger {
  border-color: var(--primary-color);
  border-bottom-color: transparent;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: none;
}

.qc-select--open.qc-select--up .qc-select__trigger {
  border-top-color: transparent;
  border-bottom-color: var(--primary-color);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

/* 浮动选项面板：延续输入框的边框/圆角/字号，紧贴触发器 */
.qc-select__popper {
  position: fixed;
  z-index: 11000;
  max-height: 264px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid var(--primary-color);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 4px;
  overscroll-behavior: contain;
}

.qc-select__popper--up {
  border-top: 1px solid var(--primary-color);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.qc-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.qc-select--sm .qc-select__option {
  padding: 7px 9px;
  font-size: 13px;
}

/* 悬停/按下：同主题色系，选中项提示更明显 */
.qc-select__option--hover {
  background-color: rgba(255, 107, 53, 0.08);
  color: var(--primary-color);
}

.qc-select__option--selected {
  color: var(--primary-color);
  font-weight: 600;
}

.qc-select__option--selected.qc-select__option--hover {
  background-color: rgba(255, 107, 53, 0.14);
}

.qc-select__option--disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.qc-select__check {
  flex-shrink: 0;
  color: var(--primary-color);
}

.qc-select__empty {
  padding: 14px 10px;
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
}

/* 展开动画：轻微淡入，避免出现缝隙 */
.qc-select-drop-enter-active {
  transition: opacity 0.14s ease;
}

.qc-select-drop-leave-active {
  transition: opacity 0.1s ease;
}

.qc-select-drop-enter-from,
.qc-select-drop-leave-to {
  opacity: 0;
}
</style>