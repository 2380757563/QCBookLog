import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/reading'
  },
  {
    path: '/reading',
    name: 'Reading',
    component: () => import('@/views/Reading/index.vue'),
    meta: {
      title: '总览'
    }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/CalendarPage/index.vue'),
    meta: {
      title: '阅读日历'
    }
  },
  {
    path: '/daily-stats',
    name: 'DailyStats',
    component: () => import('@/views/DailyStats/index.vue'),
    meta: {
      title: '每日阅读统计'
    }
  },
  {
    path: '/reading-settings',
    name: 'ReadingSettings',
    component: () => import('@/views/ReadingSettings/index.vue'),
    meta: {
      title: '阅读设置'
    }
  },
  {
    path: '/book',
    name: 'Book',
    component: () => import('@/views/Book/index.vue'),
    meta: {
      title: '书籍'
    }
  },
  {
    path: '/bookmark',
    name: 'Bookmark',
    component: () => import('@/views/Bookmark/index.vue'),
    meta: {
      title: '书摘'
    }
  },
  {
    path: '/function',
    name: 'Function',
    component: () => import('@/views/Function/index.vue'),
    meta: {
      title: '功能中心'
    }
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('@/views/Export/index.vue'),
    meta: {
      title: '数据导出'
    }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('@/views/Import/index.vue'),
    meta: {
      title: '数据导入'
    }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/views/Config/index.vue'),
    meta: {
      title: '配置书库'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile/index.vue'),
    meta: {
      title: '个人中心'
    }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/Search/index.vue'),
    meta: {
      title: '搜索'
    }
  },
  {
    path: '/test-isbn',
    name: 'TestISBNSearch',
    component: () => import('@/views/TestISBNSearch.vue'),
    meta: {
      title: 'ISBN搜索测试'
    }
  },
  { path: '/book/isbn-search', name: 'ISBNBookSearch', component: () => import('@/views/Book/ISBNSearch.vue'), meta: { title: 'ISBN搜索' } },
  { path: '/book/isbn-scanner', name: 'ISBNScanner', component: () => import('@/views/Book/ISBNScanner.vue'), meta: { title: 'ISBN扫描' } },
  { path: '/book/batch-scanner', name: 'BatchScanner', component: () => import('@/views/Book/BatchScanner.vue'), meta: { title: '批量扫描' } },
  // 书籍相关路由
  {
    path: '/book/detail/:id',
    name: 'BookDetail',
    component: () => import('@/views/Book/Detail.vue'),
    meta: {
      title: '书籍详情'
    }
  },
  {
    path: '/book/reading/:id',
    name: 'BookReading',
    component: () => import('@/views/Book/Reading.vue'),
    meta: {
      title: '正在阅读'
    }
  },
  {
    path: '/book/edit/:id?',
    name: 'BookEdit',
    component: () => import('@/views/Book/Edit.vue'),
    meta: {
      title: '编辑书籍'
    }
  },
  // 书摘相关路由
  {
    path: '/bookmark/detail/:id',
    name: 'BookmarkDetail',
    component: () => import('@/views/Bookmark/Detail.vue'),
    meta: {
      title: '书摘详情'
    }
  },
  {
    path: '/bookmark/edit/:id?',
    name: 'BookmarkEdit',
    component: () => import('@/views/Bookmark/Edit.vue'),
    meta: {
      title: '编辑书摘'
    }
  },
  // 404路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到'
    }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// 路由守卫：设置页面标题
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 青橙读书记录`;
  }
  next();
});

export default router;
