<template>
  <nav class="sidebar-nav" :class="{ collapsed: uiStore.sidebarCollapsed }">
    <div class="sidebar-header">
      <button class="collapse-btn" @click="uiStore.toggleSidebar()" :title="uiStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
        <svg viewBox="0 0 24 24" class="collapse-icon">
          <path :d="uiStore.sidebarCollapsed ? iconExpand : iconCollapse" />
        </svg>
      </button>
    </div>

    <div class="sidebar-items">
      <router-link
        v-for="navItem in navItems"
        :key="navItem.path"
        :to="navItem.path"
        class="nav-item"
        :class="{ active: activeRoute === navItem.path }"
        :title="uiStore.sidebarCollapsed ? navItem.text : ''"
        @mouseenter="preloadRoute(navItem.path)"
      >
        <div class="nav-icon-wrapper">
          <svg class="nav-icon" viewBox="0 0 24 24" v-html="navItem.icon"></svg>
        </div>
        <span v-show="!uiStore.sidebarCollapsed" class="nav-text">{{ navItem.text }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { navItems, getActiveRoute, preloadRoute } from './navItems';
import { useUIStore } from '@/stores/ui';

const route = useRoute();
const uiStore = useUIStore();

const activeRoute = computed(() => getActiveRoute(route.path));

const iconCollapse = 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z';
const iconExpand = 'M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z';
</script>

<style scoped>
.sidebar-nav {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--sidebar-width);
  z-index: 900;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 56px;
  padding: 0 10px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-hint);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.collapse-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
}

.collapse-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.sidebar-items {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 20px;
  margin: 2px 8px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-hint);
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--primary-color);
  background-color: rgba(255, 107, 53, 0.08);
}

.sidebar-nav.collapsed .nav-item {
  padding: 0 12px;
  justify-content: center;
}

.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.nav-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.nav-text {
  font-size: 14px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
