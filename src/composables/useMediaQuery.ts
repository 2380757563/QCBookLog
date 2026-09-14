import { ref, onUnmounted, type Ref } from 'vue';

/**
 * 响应式媒体查询
 * 封装 window.matchMedia，返回响应式布尔值，自动监听变化
 * 纯 SPA 无 SSR，同步初始化避免首帧闪烁
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false);
  let mql: MediaQueryList | null = null;

  const onChange = (e: MediaQueryListEvent) => {
    matches.value = e.matches;
  };

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mql = window.matchMedia(query);
    matches.value = mql.matches;
    mql.addEventListener('change', onChange);
  }

  onUnmounted(() => {
    if (mql) {
      mql.removeEventListener('change', onChange);
      mql = null;
    }
  });

  return matches;
}

/** 桌面端断点：≥1024px 显示侧边栏 */
export function useIsDesktop(): Ref<boolean> {
  return useMediaQuery('(min-width: 1024px)');
}

export default useMediaQuery;
