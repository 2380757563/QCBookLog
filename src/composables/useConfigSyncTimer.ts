/**
 * useConfigSyncTimer - 配置同步定时器 Composable
 *
 * 定期调用 fetchCurrentConfig，仅在页面可见时执行。
 * 监听 visibilitychange 事件以暂停/恢复定时器。
 */

import { onBeforeUnmount, onMounted, ref } from 'vue';

const SYNC_INTERVAL = 30_000; // 30 秒

export function useConfigSyncTimer(task: () => void | Promise<void>) {
  const timer = ref<ReturnType<typeof setInterval> | null>(null);
  const visibilityHandler = ref<(() => void) | null>(null);

  function start() {
    stop();
    timer.value = setInterval(() => {
      if (document.visibilityState === 'visible') {
        try {
          task();
        } catch (err) {
          console.error('ConfigSyncTimer task error:', err);
        }
      }
    }, SYNC_INTERVAL);
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  }

  onMounted(() => {
    visibilityHandler.value = () => {
      if (document.visibilityState === 'visible') {
        try {
          task();
        } catch (err) {
          console.error(err);
        }
        start();
      } else {
        stop();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler.value);
  });

  onBeforeUnmount(() => {
    stop();
    if (visibilityHandler.value) {
      document.removeEventListener('visibilitychange', visibilityHandler.value);
      visibilityHandler.value = null;
    }
  });

  return {
    start,
    stop
  };
}
