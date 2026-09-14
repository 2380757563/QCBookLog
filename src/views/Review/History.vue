<template>
  <div class="history-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <span class="nav-title">书评历史版本</span>
      <button
        v-if="history.length > 0"
        class="nav-clear-btn"
        :disabled="deleting"
        @click="clearAllHistory"
      >清空历史</button>
      <span v-else class="nav-spacer"></span>
    </div>

    <div class="page-body">
      <!-- 加载中 -->
      <div v-if="loading" class="state-tip">加载中...</div>

      <!-- 未同步提示 -->
      <div v-else-if="emptyReason" class="state-tip">{{ emptyReason }}</div>

      <!-- 左右两栏 -->
      <template v-else>
        <!-- 左侧：历史版本列表 -->
        <div class="history-list">
          <div
            v-for="(item, idx) in history"
            :key="item.hash"
            class="history-item"
            :class="{ active: selectedHash === item.hash }"
            @click="selectVersion(item, idx)"
          >
            <div class="item-top">
              <span class="item-hash">{{ item.hash.slice(0, 7) }}</span>
              <span class="item-badge" v-if="idx === 0">最新</span>
            </div>
            <div class="item-message">{{ item.message }}</div>
            <div class="item-meta">
              <span class="item-date">{{ formatTime(item.date) }}</span>
              <span class="item-author">{{ item.author }}</span>
            </div>

            <!-- 操作按钮 -->
            <div v-if="selectedHash === item.hash" class="item-actions" @click.stop>
              <button class="btn restore-btn" :disabled="restoring" @click="restoreVersion(item.hash)">恢复此版本</button>
              <button
                v-if="history.length > 1"
                class="btn delete-btn"
                :disabled="deleting"
                @click="deleteVersion(item.hash)"
              >删除此版本</button>
            </div>
          </div>
        </div>

        <!-- 右侧：版本内容预览 / diff 对比（固定展示） -->
        <div class="preview-section">
          <div class="preview-header">
            <span>{{ diffTitle || '版本内容' }}</span>
            <button
              v-if="diffTokens.length > 0"
              class="btn small-btn"
              @click="togglePreview"
            >{{ previewing ? '查看改动' : '查看内容' }}</button>
          </div>
          <div v-if="!selectedContent" class="preview-loading">加载中...</div>
          <!-- 纯内容预览 -->
          <pre v-else-if="previewing || diffTokens.length === 0" class="preview-content">{{ selectedContent }}</pre>
          <!-- 词级 diff（按字着色标注新增/删除） -->
          <div v-else class="diff-content">
            <template v-for="(tok, ti) in diffTokens" :key="ti">
              <span
                class="diff-word"
                :class="{
                  'add': tok.type === 'add',
                  'del': tok.type === 'del'
                }"
              >{{ tok.text }}</span>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gitSyncService, type GitCommitEntry } from '@/api/gitSync';

const route = useRoute();
const router = useRouter();

const reviewId = String(route.params.id);
const history = ref<GitCommitEntry[]>([]);
const selectedHash = ref<string>('');
const selectedContent = ref<string | null>(null);
const previewing = ref(false);
const diffTitle = ref('');
const loading = ref(true);
const restoring = ref(false);
const deleting = ref(false);
const emptyReason = ref('');

// 词级 diff token：type = add(新增) / del(删除) / same(相同)
type DiffToken = { text: string; type: 'add' | 'del' | 'same' };
const diffTokens = ref<DiffToken[]>([]);

const goBack = () => router.back();

const formatTime = (t: string | number) => {
  const d = new Date(t);
  if (isNaN(d.getTime())) return t || '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 字符级 diff：返回字符粒度的 token 序列（精确到字）
function charDiff(a: string, b: string): DiffToken[] {
  const arrA = Array.from(a); // 按 Unicode 码点拆分，含中文
  const arrB = Array.from(b);
  // 长度过大时退化：整段删 + 整段增，避免卡顿
  if (arrA.length * arrB.length > 2_500_000) {
    if (!arrA.length) return arrB.map(text => ({ text, type: 'add' as const }));
    if (!arrB.length) return arrA.map(text => ({ text, type: 'del' as const }));
    return [
      ...arrA.map(text => ({ text, type: 'del' as const })),
      ...arrB.map(text => ({ text, type: 'add' as const })),
    ];
  }
  const n = arrA.length, m = arrB.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = arrA[i] === arrB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (arrA[i] === arrB[j]) { result.push({ text: arrA[i], type: 'same' }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { result.push({ text: arrA[i], type: 'del' }); i++; }
    else { result.push({ text: arrB[j], type: 'add' }); j++; }
  }
  while (i < n) { result.push({ text: arrA[i], type: 'del' }); i++; }
  while (j < m) { result.push({ text: arrB[j], type: 'add' }); j++; }
  return result;
}

// 两级 diff：先按行找变化块，变化块内再做字符级 diff（兼容中文无空格）
function diffText(oldText: string, newText: string): DiffToken[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const n = oldLines.length, m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffToken[] = [];
  let i = 0, j = 0, delBuf: string[] = [], addBuf: string[] = [];
  const flush = () => {
    // 变化块 → 字符级 diff，并补回换行分隔
    if (delBuf.length || addBuf.length) {
      result.push(...charDiff(delBuf.join('\n'), addBuf.join('\n')), { text: '\n', type: 'same' });
    }
    delBuf = []; addBuf = [];
  };
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      flush(); // 相同行前若有变化块，先处理
      result.push({ text: oldLines[i] + '\n', type: 'same' });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      delBuf.push(oldLines[i]); i++;
    } else {
      addBuf.push(newLines[j]); j++;
    }
  }
  while (i < n) { delBuf.push(oldLines[i]); i++; }
  while (j < m) { addBuf.push(newLines[j]); j++; }
  flush();
  return result;
}

const selectVersion = async (item: GitCommitEntry, idx: number) => {
  selectedHash.value = item.hash;
  previewing.value = false; // 默认展示带色的 diff，无 diff 时模板自动回退到内容预览
  diffTokens.value = [];
  diffTitle.value = '';
  selectedContent.value = null;
  try {
    const data = await gitSyncService.getVersion(reviewId, item.hash);
    selectedContent.value = `${(data.data && (data.data as any).title) || '(无标题)'}\n\n${data.content}`;
    // 与上一个（更旧的）版本做词级 diff
    if (idx + 1 < history.value.length) {
      const older = history.value[idx + 1];
      try {
        const oldData = await gitSyncService.getVersion(reviewId, older.hash);
        diffTokens.value = diffText(oldData.content, data.content);
        diffTitle.value = `${older.hash.slice(0, 7)} → ${item.hash.slice(0, 7)} 的改动`;
      } catch {
        diffTokens.value = [];
        diffTitle.value = '';
      }
    } else {
      diffTokens.value = []; // 最新版本没有更旧版可比，默认预览内容
      diffTitle.value = '';
    }
  } catch (e) {
    selectedContent.value = '加载版本内容失败';
    diffTokens.value = [];
    diffTitle.value = '';
  }
};

// 切换 带色 diff / 纯内容预览
const togglePreview = () => {
  previewing.value = !previewing.value;
};

const restoreVersion = async (hash: string) => {
  if (!confirm(`恢复后当前书评将被该版本覆盖，并提交一个新版本，确定吗？`)) return;
  restoring.value = true;
  try {
    await gitSyncService.restore(reviewId, hash);
    alert('恢复成功，已生成新的提交');
    load();
  } catch (e: any) {
    alert('恢复失败：' + (e?.message || '未知错误'));
  } finally {
    restoring.value = false;
  }
};

const deleteVersion = async (hash: string) => {
  if (!confirm('删除此历史版本将重写 Git 历史并强推到 GitHub，此操作不可撤销，确定吗？')) return;
  deleting.value = true;
  try {
    await gitSyncService.deleteHistory(reviewId, hash);
    alert('已删除该历史版本并同步到 GitHub');
    load();
  } catch (e: any) {
    alert('删除失败：' + (e?.message || '未知错误'));
  } finally {
    deleting.value = false;
  }
};

const clearAllHistory = async () => {
  if (!confirm('清空历史将删除该书评的全部历史版本（仅保留当前版本），并重写 Git 历史强推到 GitHub，此操作不可撤销，确定吗？')) return;
  deleting.value = true;
  try {
    await gitSyncService.clearHistory(reviewId);
    alert('已清空全部历史版本并同步到 GitHub');
    load();
  } catch (e: any) {
    alert('清空失败：' + (e?.message || '未知错误'));
  } finally {
    deleting.value = false;
  }
};

const load = async () => {
  loading.value = true;
  emptyReason.value = '';
  try {
    const { history: h, note } = await gitSyncService.getHistory(reviewId);
    history.value = h || [];
    if (h && h.length > 0) {
      await selectVersion(h[0], 0);
    } else {
      emptyReason.value = note || '该书评暂无历史版本';
    }
  } catch (e: any) {
    emptyReason.value = e?.message || '加载历史版本失败';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.history-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-main, #fff);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
  background: var(--bg-main, #fff);
  z-index: 10;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: #333;
}
.back-btn svg { width: 24px; height: 24px; fill: currentColor; }
.nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 600; }
.nav-spacer { width: 32px; }

.state-tip { text-align: center; color: #999; padding: 60px 0; }

/* 左右两栏布局 */
.page-body {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 桌面端：放宽 max-width，利用侧栏外的空间 */
@media (min-width: 1024px) {
  .page-body {
    max-width: 100%;
  }
}

/* 左侧列表：可滚动 */
.history-list {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}
.history-item {
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-card, #fff);
}
.history-item.active {
  border-color: var(--primary-color, #ff6b35);
  box-shadow: 0 0 0 1px var(--primary-color, #ff6b35);
}
.item-top { display: flex; align-items: center; gap: 8px; }
.item-hash { font-family: monospace; font-size: 12px; color: var(--primary-color, #ff6b35); font-weight: 600; }
.item-badge { font-size: 11px; color: #fff; background: var(--primary-color, #ff6b35); border-radius: 4px; padding: 1px 6px; }
.item-message { font-size: 14px; color: #333; margin: 6px 0 4px; word-break: break-word; }
.item-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.item-actions { margin-top: 10px; }

.btn { padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; }
.restore-btn { background: var(--primary-color, #ff6b35); color: #fff; }
.restore-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.delete-btn { background: #fff; color: #f44336; border: 1px solid #f44336; margin-left: 8px; }
.delete-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.small-btn { background: #eee; color: #333; }
.nav-clear-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid #f44336;
  background: #fff;
  color: #f44336;
  font-size: 12px;
  cursor: pointer;
}
.nav-clear-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* 右侧预览区：固定高度，占满剩余空间 */
.preview-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 10px;
  background: var(--bg-card, #fff);
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  flex-shrink: 0;
  font-size: 14px;
}
.preview-loading {
  padding: 40px;
  text-align: center;
  color: #999;
}
.preview-content {
  flex: 1;
  margin: 0;
  padding: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  overflow-y: auto;
  background: #fff;
}
.diff-content {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.9;
  font-family: ui-monospace, 'Fira Code', Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
}
.diff-word { padding: 1px 0; border-radius: 3px; }
.diff-word.add { background: #d7f5dd; color: #1a7f37; }
.diff-word.del { background: #ffe0e0; color: #cf222e; }

/* 窄屏自适应：上下布局 */
@media (max-width: 768px) {
  .page-body {
    flex-direction: column;
  }
  .history-list {
    width: 100%;
    max-height: 40vh;
  }
  .preview-section {
    width: 100%;
    min-height: 40vh;
  }
}
</style>
