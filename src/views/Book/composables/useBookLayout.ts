/**
 * 书库视图布局 Composable（视图层集成）
 *
 * 职责:
 * - 组合 useBookViewSettings 与 bookStore
 * - 切换布局/列数时同步 bookStore 状态
 * - 切换手动列数工具方法
 *
 * 依赖:
 * - useBookViewSettings - 共享的视图设置 composable
 * - bookStore (Pinia) - layout 状态
 */
import { useBookViewSettings } from '@/composables/useBookViewSettings';
import { useBookStore } from '@/store/book';

export function useBookLayout() {
  const bookStore = useBookStore();
  const {
    layout,
    gridColumns,
    manualColumnCount,
    setLayout: setViewLayout,
    toggleLayout: toggleViewLayout,
    setGridColumns: setViewGridColumns,
    applyManualColumns: applyViewManualColumns,
    useAutoColumns: useViewAutoColumns
  } = useBookViewSettings();

  /** 切换布局（grid/list）并同步到 bookStore */
  const toggleLayout = () => {
    setViewLayout(layout.value === 'grid' ? 'list' : 'grid');
    bookStore.setLayout(layout.value);
  };

  /** 设置列数（兼容旧 API） */
  const setGridColumns = (columns: 'auto' | '2' | '3' | '4' | '5') => {
    setViewGridColumns(columns as any);
    if (layout.value === 'list') {
      setViewLayout('grid');
      bookStore.setLayout('grid');
    }
  };

  /** 切换手动/自动列数 */
  const toggleManualColumns = () => {
    if (gridColumns.value === 'auto') {
      applyViewManualColumns();
    }
  };

  /** 应用手动列数 */
  const applyManualColumns = () => {
    applyViewManualColumns();
    if (layout.value === 'list') {
      setViewLayout('grid');
      bookStore.setLayout('grid');
    }
  };

  /** 同步 bookStore 的 layout（用于初始化时） */
  const syncToStore = () => {
    bookStore.setLayout(layout.value);
  };

  return {
    layout,
    gridColumns,
    manualColumnCount,
    toggleLayout,
    setGridColumns,
    toggleManualColumns,
    applyManualColumns,
    useAutoColumns: useViewAutoColumns,
    syncToStore
  };
}
