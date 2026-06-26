/**
 * 书籍页面滚动监听 Composable
 *
 * 职责:
 * - 返回顶部按钮显示/隐藏（handleScroll/scrollToTop）
 * - 无限滚动 fallback（handleInfiniteScroll）
 * - IntersectionObserver 哨兵（setupIntersectionObserver）
 * - 折叠状态（isGroupsCollapsed/isBooksCollapsed）
 *
 * 依赖: 无外部 store，调用方通过 options 注入回调
 */
import { ref, onMounted, onUnmounted } from 'vue';

export interface UseBookScrollOptions {
  /** 滚动到底部时的回调（用于无限滚动加载） */
  onReachBottom: () => void;
  /** 是否启用无限滚动 */
  isEnabled: () => boolean;
}

const SCROLL_THRESHOLD = 300;

export function useBookScroll(options: UseBookScrollOptions) {
  const { onReachBottom, isEnabled } = options;

  // 返回顶部按钮
  const showBackToTop = ref(false);
  const handleScroll = () => {
    showBackToTop.value = window.scrollY > SCROLL_THRESHOLD;
  };
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 折叠状态
  const isGroupsCollapsed = ref(false);
  const isBooksCollapsed = ref(false);
  const toggleGroupsCollapse = () => {
    isGroupsCollapsed.value = !isGroupsCollapsed.value;
  };
  const toggleBooksCollapse = () => {
    isBooksCollapsed.value = !isBooksCollapsed.value;
  };

  // 无限滚动 fallback（scroll 事件）
  const handleInfiniteScroll = () => {
    if (!isEnabled()) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    // 距底部 200px 触发
    if (scrollTop + windowHeight >= documentHeight - 200) {
      onReachBottom();
    }
  };

  // IntersectionObserver 哨兵
  const loadMoreSentinelRef = ref<HTMLElement | null>(null);
  let intersectionObserver: IntersectionObserver | null = null;

  const setupIntersectionObserver = () => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    if (!loadMoreSentinelRef.value) return;
    intersectionObserver = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) onReachBottom();
      },
      { rootMargin: '0px 0px 200px 0px', threshold: 0 }
    );
    intersectionObserver.observe(loadMoreSentinelRef.value);
  };

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleInfiniteScroll, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('scroll', handleInfiniteScroll);
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  });

  return {
    // 状态
    showBackToTop,
    isGroupsCollapsed,
    isBooksCollapsed,
    loadMoreSentinelRef,
    // 方法
    handleScroll,
    scrollToTop,
    toggleGroupsCollapse,
    toggleBooksCollapse,
    handleInfiniteScroll,
    setupIntersectionObserver
  };
}
