<template>
  <!-- 弹窗形态受 visible 控制显隐；整页形态任务匹配即渲染 -->
  <div v-if="st && (isPage || visible)" :class="isPage ? 'ds-page' : 'ds-overlay'" @click.self="onOverlayClick">
    <div :class="['ds-dialog', { 'ds-dialog--page': isPage }]">
      <div class="ds-header">
        <span class="ds-title">{{ headerText }}</span>
        <span v-if="!isPage" class="ds-close" @click="requestClose">×</span>
      </div>

      <div class="ds-body">
        <!-- 顶部进度：搜索中 / 导入中显示 -->
        <div v-if="phase !== 'done'" class="ds-progress">
          <div class="ds-progress__head">
            <span class="ds-progress__label">{{ progressLabel }}</span>
            <span class="ds-progress__pct">{{ progressDone }} / {{ items.length }}</span>
          </div>
          <div class="ds-progress__bar">
            <div class="ds-progress__fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <div v-if="progressDetail" class="ds-progress__detail">{{ progressDetail }}</div>
        </div>

        <!-- 结果汇总 -->
        <div v-if="phase === 'done'" :class="['ds-result', resultClass]">
          <div class="ds-result__icon">{{ resultIcon }}</div>
          <div class="ds-result__content">
            <div class="ds-result__title">{{ resultTitle }}</div>
            <div class="ds-result__message">{{ resultMessage }}</div>
          </div>
        </div>

        <!-- 预览工具条 -->
        <div v-if="phase === 'preview'" class="ds-tools">
          <span class="ds-tools__count">已选 {{ selectedCount }} / {{ items.length }} 本</span>
          <span class="ds-tools__spacer"></span>
          <button class="ds-mini" @click="selectAll(true)">全选</button>
          <button class="ds-mini" @click="selectAll(false)">全不选</button>
          <button class="ds-mini" @click="invert">反选</button>
        </div>

        <!-- 书籍列表：搜索阶段逐条点亮状态，预览阶段可勾选 -->
        <div class="ds-list">
          <div
            v-for="item in items"
            :key="item.book.douban_id"
            :class="['ds-item', `ds-item--${item.status}`, {
              'ds-item--off': phase === 'preview' && !item.selected,
              'ds-item--clickable': item.status === 'ok'
            }]"
            @click="openPreview(item)"
          >
            <label v-if="phase === 'preview'" class="ds-check" @click.stop>
              <input type="checkbox" :checked="item.selected" @change="toggleItem(item)" />
            </label>

            <img
              v-if="item.coverUrl"
              :src="doubanCoverProxy(item.coverUrl)"
              class="ds-cover"
              loading="lazy"
            />
            <div v-else class="ds-cover ds-cover--empty">无封面</div>

            <div class="ds-info">
              <div class="ds-info__title">{{ item.data?.title || item.book.title || `豆瓣 ${item.book.douban_id}` }}</div>
              <div class="ds-info__meta">
                <span v-if="item.data?.author">{{ item.data.author }}</span>
                <span v-if="item.data?.publisher">{{ item.data.publisher }}</span>
                <span v-if="item.data?.publishYear">{{ item.data.publishYear }}</span>
              </div>
              <div class="ds-info__extra">
                <span v-if="item.data?.isbn" class="ds-isbn">ISBN {{ item.data.isbn }}</span>
                <span v-if="item.data?.pages">{{ item.data.pages }}页</span>
                <span v-if="item.data?.rating" class="ds-rating">{{ Number(item.data.rating).toFixed(1) }}</span>
              </div>
            </div>

            <!-- 状态标记 -->
            <span v-if="item.status === 'pending'" class="ds-badge ds-badge--pending">待处理</span>
            <span v-else-if="item.status === 'searching'" class="ds-badge ds-badge--searching">获取中</span>
            <span v-else-if="item.status === 'fail'" class="ds-badge ds-badge--fail" :title="item.error">失败</span>
            <span v-else-if="item.importStatus === 'importing'" class="ds-badge ds-badge--searching">入库中</span>
            <span v-else-if="item.importStatus === 'success'" class="ds-badge ds-badge--ok">已入库</span>
            <span v-else-if="item.importStatus === 'fail'" class="ds-badge ds-badge--fail" :title="item.error">入库失败</span>
            <span v-else-if="item.source === 'dbr'" class="ds-badge ds-badge--ok">豆瓣元数据</span>
            <span v-else class="ds-badge ds-badge--fallback">豆列字段</span>
          </div>
        </div>
      </div>

      <div class="ds-footer">
        <span class="ds-footer__hint">{{ footerHint }}</span>
        <span class="ds-tools__spacer"></span>
        <template v-if="phase === 'searching'">
          <button class="tool-btn" @click="cancelAndBack">取消</button>
        </template>
        <template v-else-if="phase === 'preview'">
          <button class="tool-btn" @click="cancelAndBack">取消</button>
          <button v-if="!isPage" class="tool-btn" @click="expandToPage">展开为整页</button>
          <button class="tool-btn tool-btn--primary" :disabled="!selectedCount" @click="confirmImport">
            加入书架（{{ selectedCount }}）
          </button>
        </template>
        <template v-else-if="phase === 'importing'">
          <button v-if="!isPage" class="tool-btn" @click="requestClose">后台继续</button>
          <button v-if="!isPage" class="tool-btn" @click="expandToPage">展开为整页</button>
          <button v-else class="tool-btn" @click="goBack">返回书单</button>
        </template>
        <template v-else>
          <button class="tool-btn tool-btn--primary" @click="finish">{{ isPage ? '返回书单' : '完成' }}</button>
        </template>
      </div>

      <!-- 书籍信息预览窗：点击条目查看主要信息 -->
      <div v-if="previewItem" class="ds-preview-overlay" @click.self="closePreview">
        <div class="ds-preview">
          <div class="ds-preview__header">
            <span class="ds-preview__title">{{ previewTitle }}</span>
            <span class="ds-close" @click="closePreview">×</span>
          </div>

          <div class="ds-preview__body">
            <div class="ds-preview__cover">
              <img v-if="previewCover" :src="doubanCoverProxy(previewCover)" class="ds-preview__img" />
              <div v-else class="ds-preview__img ds-preview__img--empty">无封面</div>
              <span class="ds-preview__source">{{ previewSourceText }}</span>
            </div>

            <div class="ds-preview__main">
              <table class="ds-preview__table">
                <tbody>
                  <tr v-for="row in previewRows" :key="row.label">
                    <th>{{ row.label }}</th>
                    <td>{{ row.value }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="previewTags.length" class="ds-preview__tags">
                <span v-for="t in previewTags" :key="t" class="ds-preview__tag">{{ t }}</span>
              </div>
            </div>
          </div>

          <div v-if="previewSummary" class="ds-preview__section">
            <div class="ds-preview__section-title">内容简介</div>
            <div class="ds-preview__summary">{{ previewSummary }}</div>
          </div>

          <div class="ds-preview__footer">
            <a
              v-if="previewItem.book.douban_url"
              class="ds-link"
              :href="previewItem.book.douban_url"
              target="_blank"
              rel="noopener"
            >在豆瓣查看</a>
            <span class="ds-tools__spacer"></span>
            <button class="tool-btn" @click="closePreview">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 豆列入库视图组件（弹窗 / 整页双形态）：
 * 任务状态与执行循环托管在 src/composables/doulistShelveTask.ts，本组件仅作视图。
 * - dialog 形态：书单面板内覆盖层弹窗（startShelveTask 由面板调用）
 * - page 形态：/book/doulist-shelve 整页（小窗「展开为整页」/ 点击任务行跳入）
 *
 * 关闭语义（修复原「静默丢书」bug）：
 * - 搜索/预览阶段关闭 = 用户取消 → 终止任务并移除小窗记录
 * - 入库阶段关闭 = 后台继续 → 任务在模块侧继续跑，小窗可见进度
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { doubanCoverProxy } from '@/api/doulistService';
import { shelveState, confirmShelveImport, stopShelveTask, type ShelveItem } from '@/composables/doulistShelveTask';

const props = withDefaults(
  defineProps<{
    /** 弹窗形态的显隐（v-model:visible）；整页形态恒显 */
    visible?: boolean;
    /** 任务 ID：仅当与托管状态匹配时渲染内容 */
    taskId: string;
    /** dialog=覆盖层弹窗（默认）；page=整页内容 */
    mode?: 'dialog' | 'page';
  }>(),
  { visible: false, mode: 'dialog' }
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const router = useRouter();

const isPage = computed(() => props.mode === 'page');

/** 当前任务托管状态（taskId 匹配才视图绑定，防止旧任务串台） */
const st = computed(() => (shelveState.value && shelveState.value.taskId === props.taskId ? shelveState.value : null));

/* ---------- 视图派生状态（读托管状态） ---------- */
const items = computed<ShelveItem[]>(() => st.value?.items ?? []);
const phase = computed(() => st.value?.phase ?? 'searching');

const headerText = computed(() => {
  const n = items.value.length;
  if (phase.value === 'searching') return `正在获取书籍元数据（${n} 本）`;
  if (phase.value === 'preview') return `确认入库信息（${n} 本）`;
  if (phase.value === 'importing') return `正在加入书架（${n} 本）`;
  return '加入书架完成';
});

const progressLabel = computed(() => {
  if (phase.value === 'searching') return '正在搜索书籍元数据';
  if (phase.value === 'preview') return '元数据获取完成';
  if (phase.value === 'importing') return '正在写入书库';
  return '已完成';
});

const progressDone = computed(() => {
  if (phase.value === 'importing' || phase.value === 'done') return st.value?.importDone ?? 0;
  return st.value?.searchDone ?? 0;
});

const progressPct = computed(() => {
  const total = items.value.length || 1;
  return Math.round((progressDone.value / total) * 100);
});

const progressDetail = computed(() => {
  const title = st.value?.currentTitle ?? '';
  if (phase.value === 'searching') return title ? `正在处理：${title}` : '';
  if (phase.value === 'importing') return title ? `正在入库：${title}` : '';
  return '';
});

const selectedCount = computed(() => items.value.filter((i) => i.selected).length);

const footerHint = computed(() => {
  if (phase.value === 'searching') return '正在逐个获取元数据，请稍候';
  if (phase.value === 'preview') return '取消勾选可跳过不想入库的书';
  if (phase.value === 'importing') return isPage.value ? '可离开此页，任务会在右上角小窗继续' : '可关闭弹窗，入库会在后台继续';
  return '';
});

const addedIds = computed(() => items.value.filter((i) => i.importStatus === 'success').map((i) => i.book.douban_id));
const failedIds = computed(() => items.value.filter((i) => i.importStatus === 'fail').map((i) => i.book.douban_id));

const resultClass = computed(() => {
  if (failedIds.value.length === 0) return 'ds-result--success';
  if (addedIds.value.length === 0) return 'ds-result--error';
  return 'ds-result--partial';
});

const resultIcon = computed(() => {
  if (failedIds.value.length === 0) return '✓';
  return '!';
});

const resultTitle = computed(() => {
  if (failedIds.value.length === 0) return '全部入库成功';
  if (addedIds.value.length === 0) return '入库失败';
  return '部分入库成功';
});

const resultMessage = computed(() => {
  const parts: string[] = [`成功 ${addedIds.value.length} 本`];
  if (failedIds.value.length) parts.push(`失败 ${failedIds.value.length} 本`);
  const failedTitles = items.value
    .filter((i) => i.importStatus === 'fail')
    .map((i) => i.data?.title || i.book.title || i.book.douban_id);
  if (failedTitles.length) parts.push(`失败书目：${failedTitles.join('、')}`);
  return parts.join('，');
});

/* ---------- 交互动作 ---------- */
const close = () => {
  emit('update:visible', false);
};

const goBack = () => {
  router.push(st.value?.returnTo || '/book');
};

/** 取消（搜索/预览阶段）：终止任务并移除小窗记录，弹窗关闭 / 整页返回书单 */
const cancelAndBack = () => {
  stopShelveTask(true);
  if (isPage.value) goBack();
  else close();
};

/** 入库中关闭弹窗 = 后台继续（任务在模块侧继续跑，不中断） */
const requestClose = () => {
  const s = st.value;
  if (!s) return;
  if (s.phase === 'searching' || s.phase === 'preview') stopShelveTask(true);
  close();
};

const onOverlayClick = () => {
  if (isPage.value) return;
  if (phase.value === 'importing') return; // 进度中避免误触关闭
  requestClose();
};

/** 预览/入库中「展开为整页」：跳整页接管视图，任务不中断 */
const expandToPage = () => {
  const s = st.value;
  if (!s) return;
  close();
  router.push({ path: '/book/doulist-shelve', query: { task: s.taskId, returnTo: s.returnTo } });
};

/** 完成：弹窗关闭；整页返回书单（面板通过监听任务状态同步列表） */
const finish = () => {
  if (isPage.value) goBack();
  else close();
};

const confirmImport = () => {
  confirmShelveImport();
};

const toggleItem = (item: ShelveItem) => {
  item.selected = !item.selected;
};

const selectAll = (value: boolean) => {
  items.value.forEach((i) => {
    if (i.status === 'ok') i.selected = value;
  });
};

const invert = () => {
  items.value.forEach((i) => {
    if (i.status === 'ok') i.selected = !i.selected;
  });
};

/* ---------- 书籍信息预览窗 ---------- */
const previewItem = ref<ShelveItem | null>(null);

const openPreview = (item: ShelveItem) => {
  if (item.status !== 'ok') return;
  previewItem.value = item;
};

const closePreview = () => {
  previewItem.value = null;
};

/** 预览窗字段：入库终值优先，缺失处回退豆列原始记录 */
const previewTitle = computed(() => {
  const it = previewItem.value;
  return it ? String(it.data?.title || it.book.title || `豆瓣 ${it.book.douban_id}`) : '';
});

const previewRows = computed<Array<{ label: string; value: string }>>(() => {
  const it = previewItem.value;
  if (!it) return [];
  const d = it.data || {};
  const b = it.book;
  const bindingText =
    d.binding1 === 2 ? '精装' : d.binding1 === 1 ? '平装' : d.binding1 === 4 ? '套装' : b.binding || '';
  const bkType = d.book_type === 0 ? '电子书' : '实体书';
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: unknown) => {
    const s = value === null || value === undefined ? '' : String(value).trim();
    if (s) rows.push({ label, value: s });
  };
  push('作者', d.author || b.author);
  push('译者', b.translator);
  push('出版社', d.publisher || b.publisher);
  push('出版年', d.publishYear || b.publish_year);
  push('ISBN', d.isbn || b.isbn13 || b.isbn10);
  push('页数', d.pages || b.pages);
  push('定价', b.price ? `¥${b.price}` : '');
  push('装帧', bindingText);
  push('类型', bkType);
  push('丛书', d.series || b.series);
  push('出品方', it.raw?.producer || b.producer);
  push('评分', d.rating ? `${Number(d.rating).toFixed(1)}${b.rating_count ? `（${b.rating_count} 人评价）` : ''}` : b.rating);
  return rows;
});

const previewTags = computed<string[]>(() => {
  const it = previewItem.value;
  if (!it) return [];
  const fromData = Array.isArray(it.data?.tags) ? it.data!.tags : [];
  if (fromData.length) return fromData.map((t: any) => String(t));
  const raw = it.raw?.tags;
  if (Array.isArray(raw)) return raw.map((t: any) => (typeof t === 'string' ? t : t?.title)).filter(Boolean);
  if (typeof raw === 'string') return raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  return [];
});

const previewSummary = computed(() => {
  const it = previewItem.value;
  return it ? String(it.data?.description || it.raw?.summary || it.book.summary || '') : '';
});

const previewCover = computed(() => (previewItem.value ? previewItem.value.coverUrl : ''));

const previewSourceText = computed(() => {
  const it = previewItem.value;
  if (!it) return '';
  if (it.source === 'dbr') return '豆瓣元数据（内置 DBR）';
  if (it.source === 'booksource') return '书源 API';
  return '豆列列表页字段';
});
</script>

<style scoped>
.ds-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10500;
  padding: 16px;
}

/* 整页形态：无遮罩，卡片居中 */
.ds-page {
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.ds-dialog {
  width: 100%;
  max-width: 640px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ds-dialog--page {
  max-width: 720px;
  max-height: calc(100vh - 32px);
  border: 1px solid var(--border-light);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.ds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}

.ds-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.ds-close {
  font-size: 22px;
  line-height: 1;
  color: var(--text-hint);
  cursor: pointer;
}

.ds-close:hover {
  color: var(--text-primary);
}

.ds-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 进度 */
.ds-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.ds-progress__bar {
  height: 6px;
  border-radius: 3px;
  background-color: var(--bg-secondary);
  overflow: hidden;
}

.ds-progress__fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 3px;
  transition: width 0.2s;
}

.ds-progress__detail {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-hint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 预览工具条 */
.ds-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ds-tools__count {
  font-size: 13px;
  color: var(--text-secondary);
}

.ds-tools__spacer {
  flex: 1;
}

.ds-mini {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.ds-mini:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* 书籍行 */
.ds-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ds-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background-color: #fff;
}

.ds-item--searching {
  border-color: var(--primary-color);
  background-color: rgba(255, 107, 53, 0.04);
}

.ds-item--fail {
  background-color: #fdecea;
  border-color: #f5c2c0;
}

.ds-item--off {
  opacity: 0.5;
}

.ds-check {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.ds-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color);
  cursor: pointer;
  padding: 0;
}

.ds-cover {
  width: 38px;
  height: 52px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.ds-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-hint);
}

.ds-info {
  flex: 1;
  min-width: 0;
}

.ds-info__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-info__meta,
.ds-info__extra {
  display: flex;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-hint);
  white-space: nowrap;
  overflow: hidden;
  margin-top: 2px;
}

.ds-isbn {
  color: var(--text-secondary);
}

.ds-rating {
  color: var(--primary-color);
  font-weight: 600;
}

/* 状态标记 */
.ds-badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 9px;
  white-space: nowrap;
}

.ds-badge--pending {
  color: var(--text-hint);
  background-color: #f0f0f0;
}

.ds-badge--searching {
  color: var(--primary-color);
  background-color: #fff3e0;
}

.ds-badge--ok {
  color: #2e7d32;
  background-color: #e8f5e9;
}

.ds-badge--fallback {
  color: #ef6c00;
  background-color: #fff3e0;
}

.ds-badge--fail {
  color: #c62828;
  background-color: #fdecea;
}

/* 结果汇总 */
.ds-result {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
}

.ds-result--success {
  background-color: #e8f5e9;
}

.ds-result--partial {
  background-color: #fff3e0;
}

.ds-result--error {
  background-color: #fdecea;
}

.ds-result__icon {
  font-size: 18px;
  line-height: 1.2;
}

.ds-result__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.ds-result__message {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-secondary);
  word-break: break-all;
}

/* 底栏 */
.ds-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.ds-footer__hint {
  font-size: 12px;
  color: var(--text-hint);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 按钮（与书单面板 tool-btn 一致） */
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
  white-space: nowrap;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-btn--primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.tool-btn--primary:hover:not(:disabled) {
  color: #fff;
  opacity: 0.92;
}

/* 可点击条目（查看信息预览） */
.ds-item--clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ds-item--clickable:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
}

/* ---------- 书籍信息预览窗 ---------- */
.ds-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 10600;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.ds-preview {
  width: 100%;
  max-width: 520px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ds-preview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}

.ds-preview__title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.ds-preview__body {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  overflow-y: auto;
}

.ds-preview__cover {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 96px;
}

.ds-preview__img {
  width: 96px;
  height: 132px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background-color: #f5f5f5;
}

.ds-preview__img--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-hint);
}

.ds-preview__source {
  font-size: 10.5px;
  color: var(--text-hint);
  text-align: center;
}

.ds-preview__main {
  flex: 1;
  min-width: 0;
}

.ds-preview__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.ds-preview__table th {
  width: 58px;
  padding: 3px 8px 3px 0;
  text-align: left;
  font-weight: 400;
  color: var(--text-hint);
  vertical-align: top;
  white-space: nowrap;
}

.ds-preview__table td {
  padding: 3px 0;
  color: var(--text-primary);
  word-break: break-all;
}

.ds-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.ds-preview__tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9px;
  color: var(--text-secondary);
  background-color: #f2f2f2;
}

.ds-preview__section {
  padding: 0 16px 14px;
}

.ds-preview__section-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.ds-preview__summary {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-secondary);
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.ds-preview__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.ds-link {
  font-size: 13px;
  color: var(--primary-color);
  text-decoration: none;
}

.ds-link:hover {
  text-decoration: underline;
}
</style>
