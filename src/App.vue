<template>
  <div class="app-container">
    <!-- 顶部状态栏占位 -->
    <div class="status-bar"></div>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Reading', 'Book', 'Bookmark', 'Profile']">
          <transition name="fade" mode="in-out">
            <component :is="Component" :key="route.path" />
          </transition>
        </keep-alive>
      </router-view>
    </main>

    <!-- 导航栏：桌面端侧边栏 / 移动端底部导航 -->
    <SidebarNav v-if="uiStore.isDesktop" />
    <BottomNav v-else />

    <!-- 阅读计时器悬浮窗 -->
    <ReadingFloatingBall />

    <!-- 批量任务小窗 -->
    <TaskFloatWindow />

    <!-- 数据库配置弹窗 -->
    <DatabaseConfigModal 
      :visible="showDatabaseModal" 
      @close="showDatabaseModal = false"
      @config-complete="handleConfigComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { useReaderStore } from '@/stores/reader';
import { useReadingStore } from '@/stores/reading';
import { useUIStore } from '@/stores/ui';
import { navItems, preloadRoute } from '@/components/nav/navItems';
import SidebarNav from '@/components/nav/SidebarNav.vue';
import BottomNav from '@/components/nav/BottomNav.vue';
import ReadingFloatingBall from '@/components/ReadingFloatingBall/ReadingFloatingBall.vue';
import TaskFloatWindow from '@/components/TaskFloatWindow/TaskFloatWindow.vue';
import DatabaseConfigModal from '@/components/DatabaseConfigModal.vue';

const route = useRoute();
const readerStore = useReaderStore();
const readingStore = useReadingStore();
const uiStore = useUIStore();

// 数据库配置弹窗
const showDatabaseModal = ref(false);
const databaseChecked = ref(false);

// body 的 is-collapsed 类驱动 CSS 变量（--sidebar-width 收起态）
// watchEffect 立即执行，覆盖：初始加载 / 折叠切换 / 桌面↔移动切换
watchEffect(() => {
  document.body.classList.toggle('is-collapsed', uiStore.isDesktop && uiStore.sidebarCollapsed);
});

// 预加载所有路由组件（可选，如果希望页面加载后立即预加载所有组件）
onMounted(async () => {
  // 初始化Reader Store
  await readerStore.init();

  // 检测数据库状态
  await checkDatabaseStatus();

  // 添加页面关闭检测
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 预加载当前路由之外的组件
  navItems.forEach(item => {
    if (item.path !== route.path) {
      // 延迟 1 秒预加载，不影响首屏渲染
      setTimeout(() => preloadRoute(item.path), 1000);
    }
  });
});

// 检测数据库状态
const checkDatabaseStatus = async () => {
  try {
    const currentPath = window.location.pathname;
    if (currentPath === '/config' || currentPath.startsWith('/config')) {
      databaseChecked.value = true;
      return;
    }

    const response = await fetch('/api/config/check-databases');
    const result = await response.json();
    
    if (result.success) {
      const { calibre, talebook } = result.data;
      
      if (!calibre.valid || !talebook.valid) {
        showDatabaseModal.value = true;
      }
    }
    
    databaseChecked.value = true;
  } catch (error) {
    console.error('检测数据库状态失败:', error);
    databaseChecked.value = true;
  }
};

// 处理配置完成
const handleConfigComplete = () => {
  showDatabaseModal.value = false;
  // 刷新页面以重新加载数据
  window.location.reload();
};

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
  margin-left: var(--sidebar-width);
  overflow-x: hidden;
  overflow-y: auto;
  transition: margin-left 0.2s ease;
}

/* 桌面端：无底部导航栏，去掉底部让位 */
@media (min-width: 1024px) {
  .main-content {
    padding-bottom: 0;
  }
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
