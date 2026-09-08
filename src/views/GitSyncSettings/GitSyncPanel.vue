<template>
  <div class="git-sync-panel">
    <!-- 状态卡片 -->
    <div class="status-card" v-if="gitSyncStore.status">
      <div class="status-row">
        <span class="status-label">同步状态</span>
        <span
          class="status-badge"
          :class="{
            ok: gitSyncStore.configured && gitSyncStore.ready,
            warn: !gitSyncStore.configured,
            fail: gitSyncStore.configured && !gitSyncStore.ready
          }"
        >
          {{
            !gitSyncStore.configured ? '未配置云端备份'
            : gitSyncStore.ready ? '已就绪'
            : '未就绪'
          }}
        </span>
      </div>
      <div class="local-history-tip">
        <span class="tip-icon">📖</span>
        <span class="tip-text">
          书评历史版本默认保存在本地（仓库目录 <code>{{ gitSyncStore.status.repoDir }}</code>），
          即使未配置云端备份，历史、diff、恢复功能均可正常使用。
          配置 GitHub 后，历史会额外同步到云端作为异地备份。
        </span>
      </div>
      <div v-if="gitSyncStore.status.lastSyncAt" class="status-row">
        <span class="status-label">上次同步</span>
        <span class="status-value">{{ formatTime(gitSyncStore.status.lastSyncAt) }}</span>
      </div>
      <div v-if="gitSyncStore.status.lastError" class="status-row status-row--error">
        <span class="status-label">最近错误</span>
        <span class="status-value error-text">{{ gitSyncStore.status.lastError }}</span>
      </div>
      <div v-if="gitSyncStore.status.repoUrl" class="status-row">
        <span class="status-label">仓库地址</span>
        <span class="status-value">{{ gitSyncStore.status.repoUrl }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">自动推送</span>
        <span class="status-value">{{ gitSyncStore.status.autoPush ? '开启' : '关闭' }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">仓库目录</span>
        <span class="status-value path">{{ gitSyncStore.status.repoDir }}</span>
      </div>
    </div>

    <!-- 待推送预览 -->
    <div class="pending-section">
      <div class="pending-header">
        <h3 class="section-title">待推送预览</h3>
        <button class="refresh-btn" :disabled="pendingLoading" @click="loadPending">
          <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-8 8s3.57 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          {{ pendingLoading ? '加载中...' : '刷新' }}
        </button>
      </div>

      <div v-if="pendingCount > 0" class="pending-list">
        <div class="pending-group-label">待提交的书评（保存后自动 commit）</div>
        <div v-for="r in gitSyncStore.pendingReviews" :key="r.id" class="pending-item">
          <div class="pending-main">
            <span class="pending-title">{{ r.title || '（无标题）' }}</span>
            <span class="pending-book">《{{ r.book_title || '未知书籍' }}》</span>
          </div>
          <div class="pending-meta">
            <span class="pending-time">{{ formatTime(r.updated_at) }}</span>
            <span class="pending-status" :class="statusClass(r.sync_status)">{{ statusText(r.sync_status) }}</span>
          </div>
        </div>
      </div>

      <div v-if="unpushed && unpushed.count > 0" class="pending-list">
        <div class="pending-group-label">已提交、待推送到 GitHub 的记录</div>
        <div v-for="c in unpushed.commits" :key="c.hash" class="pending-item">
          <div class="pending-main">
            <span class="pending-title">{{ c.message }}</span>
          </div>
          <div class="pending-meta">
            <span class="pending-time">{{ formatTime(c.date) }}</span>
            <span class="pending-hash">{{ c.hash }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="!pendingLoading && pendingCount === 0 && unpushed && unpushed.known && unpushed.count === 0"
        class="pending-empty"
      >
        ✅ 没有待推送的内容，本地与 GitHub 已同步
      </div>
      <div v-if="unpushed && !unpushed.known" class="pending-error">
        ⚠️ 无法确认远端状态（{{ unpushed.error || '网络不可用' }}），请点击「立即同步」尝试推送
      </div>
      <div v-if="unpushed && unpushed.speedTest && unpushed.speedTest.length" class="speed-test">
        <div class="speed-test-label">远端测速{{ unpushed.via ? `（本次使用：${shortHost(unpushed.via)}）` : '' }}</div>
        <div v-for="(r, i) in unpushed.speedTest" :key="i" class="speed-test-item">
          <span class="speed-test-url">{{ shortHost(r.url) }}</span>
          <span v-if="r.ok" class="speed-test-ms ok">{{ r.ms }}ms</span>
          <span v-else class="speed-test-ms fail" :title="r.error || '不可达'">不可达</span>
        </div>
      </div>
      <div v-if="pendingError" class="pending-error">{{ pendingError }}</div>
    </div>

    <!-- 配置表单 -->
    <div class="config-section">
      <h3 class="section-title">同步配置</h3>
      <div class="settings-form">
        <div class="form-group">
          <label class="form-label">仓库地址</label>
          <input
            type="text"
            v-model="form.repoUrl"
            placeholder="例如: https://github.com/username/repo.git"
            class="form-input"
          />
          <span class="form-hint">支持 HTTPS 仓库地址（需 GitHub Token）</span>
        </div>

        <div class="form-group">
          <label class="form-label">镜像地址（可选）</label>
          <textarea
            v-model="form.mirrors"
            placeholder="一行一个，例如:&#10;https://ghfast.top/https://github.com/username/repo.git&#10;https://gh-proxy.com/https://github.com/username/repo.git"
            class="form-input form-textarea"
            rows="3"
          ></textarea>
          <span class="form-hint">
            每次同步或刷新待推送预览时，会对原始地址和所有镜像并行测速，自动使用最快的地址；
            镜像仅用于加速读取，推送失败时自动回退原始地址。
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">HTTP 代理（可选）</label>
          <input
            type="text"
            v-model="form.proxy"
            placeholder="例如: http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
            class="form-input"
          />
          <span class="form-hint">
            配置后所有 git 网络操作（clone、push、pull、测速）都会走该代理。
            留空则不使用代理。
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">GitHub Token</label>
          <div class="token-input-wrap">
            <input
              :type="showToken ? 'text' : 'password'"
              v-model="form.token"
              :placeholder="gitSyncStore.status?.tokenConfigured ? '已配置（留空则不修改）' : 'ghp_xxx'"
              class="form-input"
              autocomplete="off"
            />
            <button class="token-toggle" @click="showToken = !showToken" type="button">
              {{ showToken ? '隐藏' : '显示' }}
            </button>
          </div>
          <span class="form-hint">
            Token 仅用于推送时的临时认证，不会写入 .git/config，日志中也会脱敏。
            <a href="https://github.com/settings/tokens" target="_blank" class="link">去生成 Token</a>
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">分支</label>
          <input
            type="text"
            v-model="form.branch"
            placeholder="main"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">作者名</label>
          <input
            type="text"
            v-model="form.userName"
            placeholder="GitHub 用户名"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">作者邮箱</label>
          <input
            type="text"
            v-model="form.userEmail"
            placeholder="提交时使用的邮箱"
            class="form-input"
          />
        </div>

        <div class="form-row--toggle">
          <div class="toggle-wrapper">
            <span class="toggle-label">保存书评后自动推送</span>
            <label class="switch">
              <input type="checkbox" v-model="form.autoPush" />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-primary" :disabled="gitSyncStore.loading || gitSyncStore.syncing" @click="handleSave">
            {{ gitSyncStore.loading ? '保存中...' : '保存配置' }}
          </button>
          <button
            class="btn-secondary"
            :disabled="!gitSyncStore.configured || gitSyncStore.syncing"
            @click="handleSyncNow"
          >
            {{ gitSyncStore.syncing ? '同步中...' : '立即同步' }}
          </button>
          <button
            class="btn-secondary btn-pull"
            :disabled="!gitSyncStore.configured || gitSyncStore.pulling || gitSyncStore.syncing"
            @click="handlePull"
          >
            {{ gitSyncStore.pulling ? '拉取中...' : '从 GitHub 拉取' }}
          </button>
          <button class="btn-secondary btn-export" :disabled="exporting" @click="handleExport">
            {{ exporting ? '打包中...' : '导出历史备份' }}
          </button>
        </div>
        <div class="export-hint">
          导出为 zip（含全部历史版本），可拷贝到网盘/硬盘备份，迁移时把 zip 解压到仓库目录即可。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useGitSyncStore } from '@/stores/gitSync';

const gitSyncStore = useGitSyncStore();

const showToken = ref(false);
const exporting = ref(false);

// ===== 导出历史备份 =====
const handleExport = async () => {
  try {
    exporting.value = true;
    const resp = await fetch('/api/git/export');
    if (!resp.ok) {
      let msg = `导出失败（${resp.status}）`;
      try {
        const data = await resp.json();
        if (data.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }
    const blob = await resp.blob();
    const disposition = resp.headers.get('Content-Disposition') || '';
    const m = disposition.match(/filename="?([^";]+)"?/);
    const filename = m ? m[1] : `qcbooklog-history-${Date.now()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    alert('导出失败：' + (err?.message || '未知错误'));
  } finally {
    exporting.value = false;
  }
};

// ===== 待推送预览 =====
const pendingLoading = ref(false);
const pendingError = ref('');
const pendingCount = computed(() => gitSyncStore.pendingReviews.length);
const unpushed = computed(() => gitSyncStore.unpushedInfo);

const loadPending = async () => {
  pendingLoading.value = true;
  pendingError.value = '';
  try {
    await gitSyncStore.fetchPending();
  } catch (e: any) {
    pendingError.value = e?.message || '获取待推送列表失败';
  } finally {
    pendingLoading.value = false;
  }
};

const statusText = (s: string | null): string =>
  s === 'failed' ? '同步失败' : s === 'synced' ? '内容有更新' : '未同步';

const statusClass = (s: string | null): string =>
  s === 'failed' ? 'fail' : s === 'synced' ? 'update' : 'pending';

const form = reactive({
  repoUrl: '',
  mirrors: '',
  branch: 'main',
  token: '',
  userName: '',
  userEmail: '',
  autoPush: false,
  proxy: '',
});

const shortHost = (url: string): string => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\.git$/, '');
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url;
  }
};

const formatTime = (t: string): string => {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString();
};

const loadStatus = async () => {
  try {
    await gitSyncStore.fetchStatus();
    const s = gitSyncStore.status;
    if (s) {
      form.repoUrl = s.repoUrl;
      form.mirrors = (s.mirrors || []).join('\n');
      form.branch = s.branch || 'main';
      form.userName = s.userName;
      form.userEmail = s.userEmail;
      form.autoPush = s.autoPush;
      form.proxy = s.proxy || '';
    }
  } catch (e) {
    console.error('加载同步状态失败:', e);
  }
};

const handleSave = async () => {
  try {
    await gitSyncStore.configure({
      repoUrl: form.repoUrl,
      mirrors: form.mirrors,
      branch: form.branch || 'main',
      token: form.token || undefined,
      userName: form.userName,
      userEmail: form.userEmail,
      autoPush: form.autoPush,
      proxy: form.proxy,
    });
    alert('配置已保存');
    if (form.token) form.token = '';
    await loadStatus();
  } catch (err: any) {
    alert('保存失败：' + (err?.message || '未知错误'));
  }
};

const handleSyncNow = async () => {
  try {
    const result = await gitSyncStore.syncAll();
    if (result.pushed) {
      alert('推送成功！已同步到 GitHub');
    } else if (result.committed) {
      alert('已提交到本地仓库（自动推送未开启，可再次点击同步推送）');
    } else {
      alert(result.note || '没有需要同步的内容');
    }
  } catch (err: any) {
    alert('同步失败：' + (err?.message || '未知错误'));
  }
};

const handlePull = async () => {
  if (!confirm('从 GitHub 拉取远端变更，使用合并模式（保留本地未推送的修改，自动 rebase）。开始拉取？')) return;
  try {
    const result = await gitSyncStore.pull(false);
    const imp = result.import;
    if (imp) {
      alert(
        `拉取完成！${result.rebased ? '已 rebase 合并' : result.reset ? '已用远端覆盖' : result.fastForwarded ? '已快进合并' : '已是最新'}\n` +
        `导入：更新 ${imp.updated} 篇，新建 ${imp.created} 篇，跳过 ${imp.skipped} 篇`
      );
    } else {
      alert('拉取完成，本地已是最新');
    }
    await loadPending();
  } catch (err: any) {
    if (err?.message && err.message.includes('分叉')) {
      if (confirm('本地与远端存在分叉，是否用远端覆盖本地？（覆盖会丢失本地未推送的修改）')) {
        try {
          const result = await gitSyncStore.pull(true);
          const imp = result.import;
          alert(
            `已用远端覆盖本地。\n` +
            (imp ? `导入：更新 ${imp.updated} 篇，新建 ${imp.created} 篇，跳过 ${imp.skipped} 篇` : '')
          );
          await loadPending();
        } catch (err2: any) {
          alert('覆盖拉取失败：' + (err2?.message || '未知错误'));
        }
      }
    } else {
      alert('拉取失败：' + (err?.message || '未知错误'));
    }
  }
};

onMounted(() => {
  loadStatus();
  loadPending();
});
</script>

<style scoped>
.git-sync-panel {
  padding: 4px 0;
}

.status-card {
  background-color: #fafafa;
  border-radius: var(--radius-md, 8px);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.status-row--error {
  align-items: flex-start;
  gap: 8px;
}

.status-label {
  color: var(--text-hint, #999);
}

.status-value {
  color: var(--text-primary, #333);
  text-align: right;
  word-break: break-all;
}

.status-value.path {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.error-text {
  color: #f44336;
}

.status-badge {
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.ok {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-badge.warn {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-badge.fail {
  background-color: #ffebee;
  color: #f44336;
}

.config-section {
  background-color: #fafafa;
  border-radius: var(--radius-md, 8px);
  padding: 14px;
}

/* ===== 待推送预览 ===== */
.pending-section {
  background-color: #fafafa;
  border-radius: var(--radius-md, 8px);
  padding: 14px;
}

.pending-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pending-header .section-title {
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-light, #e0e0e0);
  background: #fff;
  color: var(--text-secondary, #555);
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--primary-color, #FF6B35);
  color: var(--primary-color, #FF6B35);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.pending-group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #666);
  padding-bottom: 2px;
}

.pending-hash {
  font-size: 11px;
  font-family: monospace;
  color: var(--primary-color, #FF6B35);
}

.pending-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--border-light, #eee);
}

.pending-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pending-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-book {
  font-size: 12px;
  color: var(--text-hint, #999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.pending-time {
  font-size: 11px;
  color: var(--text-hint, #999);
}

.pending-status {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
}

.pending-status.pending {
  background: #fff3e0;
  color: #ff9800;
}

.pending-status.update {
  background: #e3f2fd;
  color: #2196f3;
}

.pending-status.fail {
  background: #ffebee;
  color: #f44336;
}

.pending-empty {
  font-size: 13px;
  color: #4caf50;
  padding: 10px 0;
}

.pending-error {
  font-size: 12px;
  color: #f44336;
  margin-top: 8px;
}

/* ===== 远端测速 ===== */
.speed-test {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid var(--border-light, #eee);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.speed-test-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #666);
}

.speed-test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.speed-test-url {
  color: var(--text-secondary, #555);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.speed-test-ms.ok {
  color: #4caf50;
}

.speed-test-ms.fail {
  color: #f44336;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px 0;
  color: var(--text-primary, #333);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #555);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary, #333);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background-color: #fff;
}

.form-input:focus {
  border-color: var(--primary-color, #FF6B35);
}

.form-textarea {
  resize: vertical;
  min-height: 64px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
}

.token-input-wrap {
  position: relative;
}

.token-input-wrap .form-input {
  padding-right: 56px;
}

.token-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--primary-color, #FF6B35);
  font-size: 12px;
  cursor: pointer;
  padding: 6px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-hint, #999);
  line-height: 1.5;
}

.link {
  color: var(--primary-color, #FF6B35);
  text-decoration: none;
}

.form-row--toggle {
  display: flex;
  align-items: center;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 24px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.switch input:checked + .slider {
  background-color: var(--primary-color, #FF6B35);
}

.switch input:checked + .slider:before {
  transform: translateX(20px);
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}

.btn-primary {
  flex: 1;
  padding: 11px 16px;
  border: none;
  border-radius: 8px;
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  padding: 11px 16px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 8px;
  background-color: #fff;
  color: var(--text-secondary, #555);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-pull {
  flex: 1.2;
}

.btn-export {
  flex: 1.2;
}

.export-hint {
  font-size: 12px;
  color: var(--text-hint, #999);
  margin-top: 8px;
  line-height: 1.5;
}

.local-history-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #eef6ff;
  border: 1px solid #d6e9ff;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, #555);
}

.local-history-tip .tip-icon {
  flex-shrink: 0;
}

.local-history-tip code {
  background: #fff;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 11px;
}
</style>
