/**
 * useBookViewSettings - 书库视图设置 Composable
 *
 * 集中管理书库页面的视图相关状态（布局模式、列数、手动列数），
 * 持久化到 localStorage，并提供多组件间共享的单例状态。
 *
 * 状态键：
 *   - bookLayout            : 'grid' | 'list'  视图布局
 *   - bookGridColumns       : 'auto' | '1'..'20'  网格列数（'auto' 表示自动）
 *   - bookGridManualColumns : '1'..'20' 手动列数（用户上一次选定的具体数字）
 */

import { ref, type Ref } from 'vue';

export type BookLayout = 'grid' | 'list';
export type GridColumnValue = 'auto' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20';
export type ManualColumnValue = Exclude<GridColumnValue, 'auto'>;
export const MANUAL_COLUMN_MIN = 1;
export const MANUAL_COLUMN_MAX = 20;

const KEY_LAYOUT = 'bookLayout';
const KEY_COLUMNS = 'bookGridColumns';
const KEY_MANUAL = 'bookGridManualColumns';

const DEFAULT_LAYOUT: BookLayout = 'grid';
const DEFAULT_COLUMNS: GridColumnValue = 'auto';
const DEFAULT_MANUAL: ManualColumnValue = '3';

function isLayout(v: unknown): v is BookLayout {
  return v === 'grid' || v === 'list';
}

function isColumnValue(v: unknown): v is GridColumnValue {
  if (v === 'auto') return true;
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= MANUAL_COLUMN_MIN && n <= MANUAL_COLUMN_MAX;
}

function isManualValue(v: unknown): v is ManualColumnValue {
  if (typeof v !== 'string' && typeof v !== 'number') return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= MANUAL_COLUMN_MIN && n <= MANUAL_COLUMN_MAX;
}

// 单例 ref（跨组件共享）
const layout = ref<BookLayout>(DEFAULT_LAYOUT);
const gridColumns = ref<GridColumnValue>(DEFAULT_COLUMNS);
const manualColumnCount = ref<number>(Number(DEFAULT_MANUAL));
let initialized = false;

function loadFromStorage() {
  try {
    const l = localStorage.getItem(KEY_LAYOUT);
    if (isLayout(l)) layout.value = l;

    const c = localStorage.getItem(KEY_COLUMNS);
    if (isColumnValue(c)) gridColumns.value = c;

    const m = localStorage.getItem(KEY_MANUAL);
    if (isManualValue(m)) {
      manualColumnCount.value = Number(m);
    } else {
      manualColumnCount.value = Number(DEFAULT_MANUAL);
    }
  } catch (err) {
    console.warn('[useBookViewSettings] 读取 localStorage 失败:', err);
  }
}

/**
 * 同步列模式 → 列数 ref
 */
function syncColumnsFromMode() {
  if (gridColumns.value === 'auto') {
    // 自动模式保留 manualColumnCount 给用户下次切换
    return;
  }
  const n = Number(gridColumns.value);
  if (Number.isInteger(n) && n >= MANUAL_COLUMN_MIN && n <= MANUAL_COLUMN_MAX) {
    manualColumnCount.value = n;
  }
}

export function useBookViewSettings() {
  if (!initialized) {
    loadFromStorage();
    syncColumnsFromMode();
    initialized = true;
  }

  /** 切换布局 */
  function setLayout(next: BookLayout) {
    if (!isLayout(next) || layout.value === next) return;
    layout.value = next;
    try {
      localStorage.setItem(KEY_LAYOUT, next);
    } catch (err) {
      console.warn('[useBookViewSettings] 保存布局失败:', err);
    }
  }

  function toggleLayout() {
    setLayout(layout.value === 'grid' ? 'list' : 'grid');
  }

  /** 设置网格列数（'auto' 或具体数字字符串） */
  function setGridColumns(columns: GridColumnValue) {
    if (!isColumnValue(columns)) return;
    if (gridColumns.value === columns) return;
    gridColumns.value = columns;
    try {
      localStorage.setItem(KEY_COLUMNS, columns);
    } catch (err) {
      console.warn('[useBookViewSettings] 保存列数失败:', err);
    }
    syncColumnsFromMode();
  }

  /** 应用手动列数（切到具体数字模式） */
  function applyManualColumns() {
    const n = Math.max(
      MANUAL_COLUMN_MIN,
      Math.min(MANUAL_COLUMN_MAX, Math.floor(Number(manualColumnCount.value) || MANUAL_COLUMN_MIN))
    );
    manualColumnCount.value = n;
    const next = String(n) as GridColumnValue;
    gridColumns.value = next;
    try {
      localStorage.setItem(KEY_MANUAL, String(n));
      localStorage.setItem(KEY_COLUMNS, next);
    } catch (err) {
      console.warn('[useBookViewSettings] 保存手动列数失败:', err);
    }
  }

  /** 切到自动模式 */
  function useAutoColumns() {
    setGridColumns('auto');
  }

  /** 进入手动模式（使用当前 manualColumnCount） */
  function useManualColumns() {
    applyManualColumns();
  }

  return {
    layout: layout as Ref<BookLayout>,
    gridColumns: gridColumns as Ref<GridColumnValue>,
    manualColumnCount: manualColumnCount as Ref<number>,
    setLayout,
    toggleLayout,
    setGridColumns,
    applyManualColumns,
    useAutoColumns,
    useManualColumns,
    manualColumnRange: { min: MANUAL_COLUMN_MIN, max: MANUAL_COLUMN_MAX } as const
  };
}
