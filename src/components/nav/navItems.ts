import type { Component } from 'vue';

/** 导航项配置 */
export interface NavItem {
  path: string;
  text: string;
  icon: string;
}

/** 底部导航/侧边栏共用的导航配置 */
export const navItems: NavItem[] = [
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
    text: '记录',
    icon: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>'
  },
  {
    path: '/profile',
    text: '我的',
    icon: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
  }
];

/** 路由组件预加载缓存 */
const preloadedRoutes = new Set<string>();

/** 预加载路由组件（悬停时调用） */
export const preloadRoute = async (path: string) => {
  if (preloadedRoutes.has(path)) return;

  preloadedRoutes.add(path);

  const loaders: Record<string, () => Promise<Component>> = {
    '/reading': () => import('@/views/Reading/index.vue'),
    '/book': () => import('@/views/Book/index.vue'),
    '/bookmark': () => import('@/views/Bookmark/index.vue'),
    '/profile': () => import('@/views/Profile/index.vue')
  };

  try {
    await loaders[path]?.();
  } catch (error) {
    console.error(`预加载路由组件失败 (${path}):`, error);
    preloadedRoutes.delete(path);
  }
};

/**
 * 根据当前路由路径计算激活的导航项
 * 按路径长度降序匹配，优先匹配更长的路径
 */
export const getActiveRoute = (path: string): string => {
  if (path === '/' || path.startsWith('/reading')) {
    return '/reading';
  }
  const match = navItems
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find(item => path.startsWith(item.path));
  return match?.path || '';
};
