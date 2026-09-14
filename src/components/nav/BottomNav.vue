<template>
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { navItems, getActiveRoute, preloadRoute } from './navItems';

const route = useRoute();

// 使用 computed 缓存当前激活的路由，避免重复计算
const activeRoute = computed(() => getActiveRoute(route.path));
</script>

<style scoped>
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
</style>
