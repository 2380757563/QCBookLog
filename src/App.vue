<template>
  <div class="app-container">
    <!-- 顶部状态栏占位 -->
    <div class="status-bar"></div>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Reading', 'Book', 'Bookmark', 'Function', 'Profile']">
          <transition name="fade" mode="in-out">
            <component :is="Component" :key="route.path" />
          </transition>
        </keep-alive>
      </router-view>
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <router-link
        v-for="navItem in navItems"
        :key="navItem.path"
        :to="navItem.path"
        class="nav-item"
        :class="{ active: activeRoute === navItem.path }"
        @mouseenter="preloadRoute(navItem.path)"
      >
        <div class="nav-icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" v-html="navItem.icon"></svg>
        </div>
        <span class="nav-text">{{ navItem.text }}</span>
      </router-link>
    </nav>

    <!-- 阅读计时器悬浮窗 -->
    <ReadingFloatingBall />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, onMounted, onUnmounted } from 'vue';
import { useReaderStore } from '@/store/reader';
import { useReadingStore } from '@/store/reading';
import ReadingFloatingBall from '@/components/ReadingFloatingBall/ReadingFloatingBall.vue';

const route = useRoute();
const readerStore = useReaderStore();
const readingStore = useReadingStore();

const navItems = [
  {
    path: '/reading',
    text: '总览',
    icon: '<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>'
  },
  {
    path: '/book',
    text: '书库',
    icon: '<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>'
  },
  {
    path: '/bookmark',
    text: '书摘',
    icon: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>'
  },
  {
    path: '/function',
    text: '设置',
    icon: '<path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>'
  },
  {
    path: '/profile',
    text: '我的',
    icon: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
  }
];

// 路由组件预加载缓存
const preloadedRoutes = new Set<string>();

// 预加载路由组件
const preloadRoute = async (path: string) => {
  if (preloadedRoutes.has(path)) return;

  preloadedRoutes.add(path);

  // 预加载对应的路由组件
  try {
    switch (path) {
      case '/reading':
        await import('@/views/Reading/index.vue');
        break;
      case '/book':
        await import('@/views/Book/index.vue');
        break;
      case '/bookmark':
        await import('@/views/Bookmark/index.vue');
        break;
      case '/function':
        await import('@/views/Function/index.vue');
        break;
      case '/profile':
        await import('@/views/Profile/index.vue');
        break;
    }
  } catch (error) {
    console.error(`预加载路由组件失败 (${path}):`, error);
    preloadedRoutes.delete(path);
  }
};

// 使用 computed 缓存当前激活的路由，避免重复计算
const activeRoute = computed(() => {
  if (route.path === '/' || route.path.startsWith('/reading')) {
    return '/reading';
  }
  // 按路径长度降序排序，优先匹配更长的路径
  const match = navItems
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find(item => route.path.startsWith(item.path));
  return match?.path || '';
});

// 预加载所有路由组件（可选，如果希望页面加载后立即预加载所有组件）
onMounted(async () => {
  // 初始化Reader Store
  await readerStore.init();

  // 添加页面关闭检测
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 预加载当前路由之外的组件
  navItems.forEach(item => {
    if (item.path !== activeRoute.value) {
      // 延迟 1 秒预加载，不影响首屏渲染
      setTimeout(() => preloadRoute(item.path), 1000);
    }
  });
});

// 页面关闭检测
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (readingStore.isReading && !readingStore.isInReadingPage) {
    event.preventDefault();
    event.returnValue = '当前阅读未结束，是否确认退出？';
    return '当前阅读未结束，是否确认退出？';
  }
};

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.status-bar {
  height: env(safe-area-inset-top, 0);
  background-color: var(--bg-secondary);
}

.main-content {
  flex: 1;
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0));
  overflow-x: hidden;
  overflow-y: auto;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 56px;
  text-decoration: none;
  color: var(--text-hint);
  transition: color 0.15s ease;
  position: relative;
  will-change: color;
}

.nav-item.active {
  color: var(--primary-color);
}

.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}

.nav-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.nav-text {
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 页面过渡动画 - 优化为更快的过渡 */
.fade-enter-active {
  transition: opacity 0.1s ease;
}

.fade-leave-active {
  transition: opacity 0.08s ease;
}

.fade-enter-from {
  opacity: 0;
}

.fade-leave-to {
  opacity: 0;
}
</style>
