<template>
  <div class="doulist-import">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">豆瓣豆列导入</h1>
      <div class="header-right"></div>
    </div>

    <div class="content">
      <!-- 步骤指示 -->
      <div class="steps">
        <div :class="['step', { active: step >= 1 }]"><span class="step-num">1</span>输入链接</div>
        <div :class="['step', { active: step >= 2 }]"><span class="step-num">2</span>抓取预览</div>
        <div :class="['step', { active: step >= 3 }]"><span class="step-num">3</span>导入</div>
      </div>

      <!-- 步骤1：输入 -->
      <div v-if="step === 1" class="panel">
        <div class="form-field">
          <label class="field-label">豆列链接或数字 ID</label>
          <input
            v-model="doulistInput"
            type="text"
            class="form-input"
            placeholder="如 https://www.douban.com/doulist/163262035/ 或 163262035"
            :disabled="crawling"
            @keyup.enter="startCrawl"
          />
          <p class="field-hint">仅支持<b>公开豆列</b>；抓取速度较慢（每页 25 本，约 5 秒/页），请耐心等待。</p>
        </div>

        <div v-if="enrichMode !== 'none'" class="enrich-notice">
          当前补全模式：<b>{{ enrichModeLabel }}</b>，导入前会对每本书多请求 1 次豆瓣详情页，明显变慢。
        </div>

        <button class="primary-btn" :disabled="!doulistInput.trim() || crawling" @click="startCrawl">
          {{ crawling ? '抓取中...' : '开始抓取' }}
        </button>
        <div v-if="step1Error" class="error-text">{{ step1Error }}</div>
      </div>

      <!-- 断点续跑确认弹窗 -->
      <div v-if="showResumeDialog" class="dialog-overlay" @click.self="showResumeDialog = false">
        <div class="dialog">
          <div class="dialog-header">
            <span>发现未完成的抓取</span>
            <span class="dialog-close" @click="showResumeDialog = false">×</span>
          </div>
          <div class="dialog-body">
            <p class="resume-hint">
              上次已抓取到第 <b>{{ resumeSavedPage }}</b> 页（共 <b>{{ resumeSaved?.fetched_items ?? 0 }}</b> 本），
              可以从中断位置继续抓取，无需重新开始。
            </p>
          </div>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="restartCrawl">重新抓取</button>
            <button class="primary-btn" @click="resumeCrawl">继续抓取</button>
          </div>
        </div>
      </div>

      <!-- 步骤2：抓取进度 + 预览勾选 -->
      <div v-if="step === 2" class="panel">
        <div v-if="meta" class="meta-card">
          <label class="meta-title-label">豆列名称（可修改，导入后显示在书单页）</label>
          <input
            v-model="doulistTitleInput"
            type="text"
            class="meta-title-input"
            :placeholder="meta.title || '未命名豆列'"
            :disabled="importing"
          />
          <div class="meta-sub">
            <span v-if="meta.owner">创建者：{{ meta.owner }}</span>
            <span v-if="meta.totalPages">共 {{ meta.totalPages }} 页</span>
          </div>
        </div>

        <!-- 抓取进度 -->
        <div v-if="crawling" class="progress-block">
          <div class="progress-text">
            正在抓取第 {{ fetchedPages }} 页... 已获取 {{ books.length }} 本
            <span v-if="meta && meta.totalPages">/ 约 {{ estimatedTotal }} 本</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <button class="secondary-btn" @click="cancelCrawl">停止抓取</button>
        </div>

        <!-- 预览列表 -->
        <div v-if="!crawling && books.length" class="preview-block">
          <div class="preview-toolbar">
            <label class="check-all">
              <input type="checkbox" :checked="allChecked" @change="toggleCheckAll" />
              全选（{{ selectedCount }}/{{ books.length }}）
            </label>
            <span v-if="blocked" class="blocked-text">⚠️ 豆瓣暂时限制了访问，已抓到 {{ books.length }} 本，可稍后重试</span>
            <span v-else-if="pageLimitReached" class="blocked-text">⚠️ 已达设置的单次最多 {{ fetchedPages }} 页上限，可在第三方设置中调整</span>
            <span v-else-if="reachedEnd" class="done-text">✅ 抓取完成，共 {{ books.length }} 本</span>
          </div>

          <div class="book-list">
            <div v-for="book in books" :key="book.doubanId" class="book-item" @click="toggleSelect(book.doubanId)">
              <input type="checkbox" :checked="selected.has(book.doubanId)" @click.stop @change="toggleSelect(book.doubanId)" />
              <img v-if="book.coverUrl" :src="doubanCoverProxy(book.coverUrl)" class="book-cover" loading="lazy" />
              <div v-else class="book-cover book-cover--empty">无封面</div>
              <div class="book-info">
                <div class="book-title">{{ book.title }}</div>
                <div class="book-meta">
                  <span v-if="book.author">{{ book.author }}</span>
                  <span v-if="book.publisher">{{ book.publisher }}</span>
                  <span v-if="book.publishYear">{{ book.publishYear }}</span>
                </div>
              </div>
              <div v-if="book.rating" class="book-rating">
                {{ book.rating.toFixed(1) }}
                <span class="rating-count">{{ book.ratingCount }}人</span>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="secondary-btn" @click="restart">重新输入</button>
            <button class="primary-btn" :disabled="!selectedCount || importing" @click="startImport">
              {{ importing ? busyText : `导入选中 ${selectedCount} 本` }}
            </button>
          </div>
          <div v-if="importError" class="error-text">{{ importError }}</div>
        </div>
      </div>

      <!-- 步骤3：导入结果 -->
      <div v-if="step === 3 && importResult" class="panel">
        <div class="result-card">
          <div class="result-icon">🎉</div>
          <div class="result-text">
            导入成功 <b>{{ importResult.imported }}</b> 本
            <template v-if="importResult.duplicates">，跳过重复 <b>{{ importResult.duplicates }}</b> 本</template>
          </div>
          <div class="result-actions">
            <router-link to="/book/doulist-books" class="primary-btn link-btn">查看书单</router-link>
            <button class="secondary-btn" @click="restart">继续导入</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  doulistApi,
  doubanCoverProxy,
  type DoulistPreviewBook,
  type DoulistSettings,
  type DoulistImportRecord
} from '@/api/doulistService';
import {
  crawlState,
  startCrawlTask,
  extractDoulistId,
  loadPreviewCache,
  removePreviewCache,
  type DoulistPreviewCache
} from '@/composables/doulistCrawlTask';
import { useTaskStore } from '@/stores/task';

const router = useRouter();
const taskStore = useTaskStore();

const step = ref(1);
const doulistInput = ref('');
const step1Error = ref('');

// 抓取状态：托管在 doulistCrawlTask 模块（切页不中断），此处仅作视图别名
const st = crawlState;
const crawling = computed(() => !!st.value && !st.value.finished);
const books = computed(() => st.value?.books ?? []);
const meta = computed(() => st.value?.meta ?? null);
const fetchedPages = computed(() => st.value?.fetchedPages ?? 0);
const blocked = computed(() => st.value?.blocked ?? false);
const reachedEnd = computed(() => st.value?.reachedEnd ?? false);
const pageLimitReached = computed(() => st.value?.pageLimitReached ?? false);

// 补全设置
const enrichMode = ref<DoulistSettings['doulistEnrichMode']>('none');
const enrichSource = ref<DoulistSettings['doulistEnrichSource']>('dbr');
// 单次最多抓取页数（读自豆列设置，0 = 不限）
const maxPagesLimit = ref(0);
const enrichModeLabel = computed(() =>
  ({ none: '不补全', smart: '智能补全', full: '完整补全' })[enrichMode.value] || '不补全'
);

// 勾选（组件本地 UI 状态）
const selected = ref<Set<string>>(new Set());
const allChecked = computed(() => books.value.length > 0 && selected.value.size === books.value.length);
const selectedCount = computed(() => selected.value.size);

// 导入（单次 API 调用，保留在组件内）
const importing = ref(false);
const busyText = ref('导入中...');
const importError = ref('');
const importResult = ref<{ imported: number; duplicates: number } | null>(null);
// 豆列名称（可编辑，默认取原豆列名，导入时以此为准）
const doulistTitleInput = ref('');

// 断点续跑：导入记录列表（用于检测未完成的抓取进度）
const imports = ref<DoulistImportRecord[]>([]);
const showResumeDialog = ref(false);
const resumeSaved = ref<DoulistImportRecord | null>(null);

const fetchImports = async () => {
  try {
    const res = await doulistApi.imports();
    imports.value = res.data || [];
  } catch { /* 忽略 */ }
};

// 续传弹窗显示的页码（每页 25 本）
const resumeSavedPage = computed(() => Math.floor(Number(resumeSaved.value?.last_start || 0) / 25) + 1);

const estimatedTotal = computed(() =>
  meta.value && meta.value.totalPages ? meta.value.totalPages * 25 : books.value.length
);

// 抓到豆列元信息后，名称输入框默认填入原豆列名（用户可改）；immediate 兼容切页返回时 meta 已存在
watch(meta, (m) => {
  if (m && doulistTitleInput.value === '') {
    doulistTitleInput.value = m.title || '';
  }
}, { immediate: true });

const progressPercent = computed(() =>
  meta.value && meta.value.totalPages
    ? Math.min(100, Math.round((fetchedPages.value / meta.value.totalPages) * 100))
    : 0
);

const goBack = () => router.back();

const restart = () => {
  step.value = 1;
  doulistTitleInput.value = '';
  selected.value = new Set();
  importResult.value = null;
  importError.value = '';
  step1Error.value = '';
};

const toggleSelect = (doubanId: string) => {
  const next = new Set(selected.value);
  if (next.has(doubanId)) next.delete(doubanId);
  else next.add(doubanId);
  selected.value = next;
};

const toggleCheckAll = () => {
  selected.value = allChecked.value ? new Set() : new Set(books.value.map(b => b.doubanId));
};

const startCrawl = async () => {
  const input = doulistInput.value.trim();
  if (!input || crawling.value) return;

  // 断点续跑：该豆列有上次未完成的抓取进度（last_start > 0）时弹窗确认
  const doulistId = extractDoulistId(input);
  if (doulistId) {
    const saved = imports.value.find(imp => imp.doulist_id === doulistId && Number(imp.last_start) > 0);
    if (saved) {
      resumeSaved.value = saved;
      showResumeDialog.value = true;
      return;
    }
  }
  beginCrawl();
};

/** 重新开始全新抓取（抓取循环托管在 doulistCrawlTask 模块） */
const beginCrawl = () => {
  restart();
  step.value = 2;
  startCrawlTask({ input: doulistInput.value, startOffset: 0, maxPages: maxPagesLimit.value });
};

/** 继续上次中断的抓取（恢复缓存 + 从 last_start 继续） */
const resumeCrawl = () => {
  const saved = resumeSaved.value;
  if (!saved) return;
  showResumeDialog.value = false;

  const raw = loadPreviewCache(saved.doulist_id);
  const cached: Partial<DoulistPreviewCache> = raw
    ? {
        meta: raw.meta ?? null,
        books: raw.books ?? [],
        fetchedPages: raw.fetchedPages ?? 0,
        blocked: !!raw.blocked,
        reachedEnd: !!raw.reachedEnd
      }
    : // 无本地缓存（如换浏览器/清了 localStorage）：页码从续传位置起算
      { fetchedPages: Math.floor(Number(saved.last_start || 0) / 25) };

  restart();
  step.value = 2;
  startCrawlTask({
    input: doulistInput.value,
    startOffset: Number(saved.last_start) || 0,
    cached,
    maxPages: maxPagesLimit.value
  });
};

/** 放弃续传，重新抓取 */
const restartCrawl = async () => {
  const id = resumeSaved.value?.doulist_id;
  showResumeDialog.value = false;
  resumeSaved.value = null;
  if (id) {
    removePreviewCache(id);
    try { await doulistApi.saveProgress(id, { lastStart: 0, fetchedItems: 0 }); } catch { /* 忽略 */ }
  }
  beginCrawl();
};

const cancelCrawl = () => {
  if (st.value) taskStore.cancelTask(st.value.taskId);
};

// 抓取循环结束后全选已抓书籍（原 crawlLoop finally 的行为，托管后由 watch 触发）
watch(() => st.value?.finished, (f) => {
  if (f && st.value) selected.value = new Set(st.value.books.map((b) => b.doubanId));
});

const startImport = async () => {
  if (!meta.value || !selected.value.size) return;
  importing.value = true;
  importError.value = '';

  try {
    const selectedBooks = books.value.filter(b => selected.value.has(b.doubanId)).map(b => ({ ...b }));

    // 可选补全：默认不补全，开启后每本约 1 次请求（走后端限速）
    // 注意：必须在写入数据库之前把补全结果合并进导入数据，否则首次导入时补全会丢失
    if (enrichMode.value !== 'none') {
      busyText.value = '补齐元数据中...';
      const ids = selectedBooks.map(b => b.doubanId);
      const fieldMap: Record<string, DoulistPreviewBook> = {};
      // 分批补全，避免单请求时间过长（后端单次上限 50 本）
      for (let i = 0; i < ids.length; i += 20) {
        const res = await doulistApi.enrich(ids.slice(i, i + 20), enrichMode.value, enrichSource.value);
        for (const item of res.items || []) {
          if (item.ok && item.fields) fieldMap[item.doubanId] = item.fields;
        }
      }
      for (const b of selectedBooks) {
        const f = fieldMap[b.doubanId];
        if (!f) continue;
        b.subtitle = f.subtitle ?? b.subtitle;
        b.translator = f.translator ?? null;
        b.publisher = f.publisher ?? b.publisher;
        b.publishYear = f.publishYear ?? b.publishYear;
        b.isbn13 = f.isbn13 ?? null;
        b.isbn10 = f.isbn10 ?? null;
        b.pages = f.pages ?? null;
        b.price = f.price ?? null;
        b.binding = f.binding ?? null;
        b.producer = f.producer ?? null;
        b.series = f.series ?? null;
        b.tags = f.tags ?? null;
        b.summary = f.summary ?? null;
        b.enrichStatus = 'done';
      }
    }

    busyText.value = '导入中...';
    // 豆列命名以用户输入为准（默认原名）
    const result = await doulistApi.import(selectedBooks, {
      ...meta.value,
      title: doulistTitleInput.value.trim() || meta.value.title || null
    });
    importResult.value = { imported: result.imported, duplicates: result.duplicates };
    step.value = 3;
    // 导入完成：清理续传缓存与进度标记
    const doulistId = extractDoulistId(doulistInput.value.trim());
    if (doulistId) {
      removePreviewCache(doulistId);
      try { await doulistApi.saveProgress(doulistId, { lastStart: 0 }); } catch { /* 忽略 */ }
    }
    // 结果页替换预览列表，滚回顶部让用户立刻看到导入结果
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err: any) {
    importError.value = err?.message || '导入失败';
  } finally {
    importing.value = false;
    busyText.value = '导入中...';
  }
};

onMounted(async () => {
  // 拉取导入记录（断点续跑检测用）
  fetchImports();
  // 恢复托管中的抓取视图：有任务状态时回到对应步骤（切页返回场景）
  if (st.value) {
    if (st.value.finished && st.value.error && st.value.books.length === 0) {
      step1Error.value = st.value.error;
      step.value = 1;
    } else {
      step.value = 2;
      if (st.value.finished) selected.value = new Set(st.value.books.map((b) => b.doubanId));
    }
  }
  try {
    const res = await doulistApi.getSettings();
    if (res?.data) {
      enrichMode.value = res.data.doulistEnrichMode;
      enrichSource.value = res.data.doulistEnrichSource;
      maxPagesLimit.value = res.data.doulistMaxPages || 0;
    }
  } catch { /* 设置读取失败时用默认值 */ }
});
</script>

<style scoped>
.doulist-import {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-primary);
  padding: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.header-right {
  width: 36px;
}

.content {
  padding: 16px;
}

/* 步骤指示 */
.steps {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.step {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  font-size: 13px;
  color: var(--text-hint);
}

.step.active {
  color: var(--primary-color);
  background-color: rgba(255, 107, 53, 0.08);
  font-weight: 600;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--border-color);
  color: #fff;
  font-size: 12px;
}

.step.active .step-num {
  background-color: var(--primary-color);
}

/* 面板 */
.panel {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary-color);
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-hint);
  line-height: 1.6;
}

.enrich-notice {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #fff8f0;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: #bf360c;
  line-height: 1.6;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  margin-top: 12px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

.link-btn {
  text-decoration: none;
  margin-top: 0;
}

.error-text {
  margin-top: 10px;
  font-size: 13px;
  color: #f44336;
}

/* 元信息卡 */
.meta-card {
  margin-bottom: 12px;
}

.meta-title-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 6px;
}

.meta-title-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
}

.meta-title-input:focus {
  border-color: var(--primary-color);
}

.meta-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.meta-sub {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}

/* 进度 */
.progress-block {
  margin-bottom: 12px;
}

.progress-text {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b35, #ff8c5a);
  transition: width 0.4s ease;
}

/* 预览 */
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-primary);
}

.check-all {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.blocked-text {
  color: #e65100;
  font-size: 12px;
  text-align: right;
}

.done-text {
  color: #2e7d32;
  font-size: 12px;
}

.book-list {
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.book-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
}

.book-item:last-child {
  border-bottom: none;
}

.book-item:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.02));
}

.book-cover {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
}

.book-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-hint);
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-rating {
  flex-shrink: 0;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #ff9800;
}

.rating-count {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--text-hint);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.actions .primary-btn,
.actions .secondary-btn {
  flex: 1;
  margin-top: 0;
}

/* 结果 */
.result-card {
  text-align: center;
  padding: 24px 0;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.result-text {
  font-size: 15px;
  color: var(--text-primary);
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

/* 续传确认弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: var(--text-hint);
}

.dialog-body {
  padding: 16px;
}

.resume-hint {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.dialog-footer .secondary-btn {
  margin-top: 0;
}

.dialog-footer .primary-btn {
  width: auto;
  margin-top: 0;
  padding: 10px 20px;
}
</style>
