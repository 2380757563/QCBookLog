import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useIsDesktop } from '@/composables/useMediaQuery';

const STORAGE_KEY = 'qcbooklog:sidebar-collapsed';

/** UI 状态：侧边栏折叠 + 桌面端标记 */
export const useUIStore = defineStore('ui', () => {
  // 桌面端（≥1024px）标记
  const isDesktop = useIsDesktop();

  // 侧边栏折叠状态（setup 时同步读 localStorage，避免首帧闪烁）
  const sidebarCollapsed = ref((() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  })());

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    try {
      localStorage.setItem(STORAGE_KEY, sidebarCollapsed.value ? '1' : '0');
    } catch {
      // 忽略 localStorage 不可用的情况
    }
  };

  return {
    isDesktop,
    sidebarCollapsed,
    toggleSidebar
  };
});
