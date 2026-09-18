<template>
  <div class="shelve-page">
    <!-- 有匹配中的任务：整页渲染入库三态（复用弹窗组件的 page 形态） -->
    <DoulistShelveDialog v-if="hasTask" mode="page" :task-id="taskId" :visible="true" />

    <!-- 空态：无 task 参数 / 任务已结束被替换 -->
    <div v-else class="shelve-empty">
      <div class="shelve-empty__icon">📚</div>
      <p class="shelve-empty__text">没有进行中的豆列入库任务</p>
      <p class="shelve-empty__hint">可在「书籍 → 书单」面板中选择书籍加入书架</p>
      <button class="tool-btn" @click="goBack">返回书单</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 豆列入库整页（/book/doulist-shelve?task=<taskId>&returnTo=<路由>）
 * 见 doc/批量任务小窗与任务中心计划.md 4.4：
 * - 任务状态与执行体在 doulistShelveTask 模块侧，切页/跳转不中断
 * - 小窗点击任务行 / 弹窗「展开为整页」均落到本页
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DoulistShelveDialog from './components/DoulistShelveDialog.vue';
import { shelveState } from '@/composables/doulistShelveTask';

const route = useRoute();
const router = useRouter();

const taskId = computed(() => String(route.query.task || ''));

const hasTask = computed(
  () => !!taskId.value && shelveState.value?.taskId === taskId.value
);

const goBack = () => {
  router.push(String(route.query.returnTo || '/book'));
};
</script>

<style scoped>
.shelve-page {
  padding: 0;
}

.shelve-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 16px;
  text-align: center;
}

.shelve-empty__icon {
  font-size: 40px;
}

.shelve-empty__text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.shelve-empty__hint {
  font-size: 13px;
  color: var(--text-hint);
  margin: 0 0 12px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: #fff;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
</style>
