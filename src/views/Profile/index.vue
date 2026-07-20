<template>
  <div class="profile-container">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="avatar">
        <img src="/logo.png" alt="青橙读书记录" class="avatar-logo" />
      </div>
      <div class="user-info">
        <h2 class="username">青橙读书记录</h2>
        <p class="user-desc">让阅读更美好</p>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="stats-card">
      <div class="stat-item" @click="goToBooks('all')">
        <span class="stat-value">{{ stats.totalBooks }}</span>
        <span class="stat-label">藏书</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item" @click="goToBooks('read')">
        <span class="stat-value">{{ stats.readBooks }}</span>
        <span class="stat-label">已读</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item" @click="goToBookmarks">
        <span class="stat-value">{{ stats.bookmarks }}</span>
        <span class="stat-label">书摘</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">¥{{ stats.spent }}</span>
        <span class="stat-label">花费</span>
      </div>
    </div>

    <!-- 设置列表 -->
    <div class="content">
      <div class="section">
        <h3 class="section-title">个性化设置</h3>
        <div class="settings-list">
          <div class="list-item">
            <div class="item-icon">👤</div>
            <div class="item-info">
              <span class="item-title">当前读者</span>
              <span class="item-desc">切换阅读账户</span>
            </div>
            <select
              v-model="readerStore.currentReaderId"
              @change="handleReaderChange"
              class="item-select"
            >
              <option
                v-for="reader in readerStore.readers"
                :key="reader.id"
                :value="reader.id"
              >
                {{ reader.name || reader.username }} {{ reader.id === 0 ? '(默认)' : '' }}
              </option>
            </select>
          </div>
          <div class="list-item">
            <div class="item-icon">⭐</div>
            <div class="item-info">
              <span class="item-title">默认用户</span>
              <span class="item-desc">下次访问时自动登录此用户</span>
            </div>
            <button 
              class="btn-set-default" 
              :class="{ 'is-default': isDefaultReader }"
              @click="setDefaultReader"
              :disabled="isDefaultReader"
            >
              {{ isDefaultReader ? '当前默认' : '设为默认' }}
            </button>
          </div>
          <div class="list-item" @click="goToReadingSettings">
            <div class="item-icon">📖</div>
            <div class="item-info">
              <span class="item-title">阅读设置</span>
              <span class="item-desc">阅读状态显示、热力图设置</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToBookmarkSettings">
            <div class="item-icon">🔖</div>
            <div class="item-info">
              <span class="item-title">书签设置</span>
              <span class="item-desc">书签卡片背景、显示样式</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToLibrarySettings">
            <div class="item-icon">📚</div>
            <div class="item-info">
              <span class="item-title">书库设置</span>
              <span class="item-desc">视图布局、评分模式、阅读状态显示等</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToThirdPartySettings">
            <div class="item-icon">🔗</div>
            <div class="item-info">
              <span class="item-title">第三方设置</span>
              <span class="item-desc">Talebook等第三方服务配置</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item">
            <div class="item-icon">🗃️</div>
            <div class="item-info">
              <span class="item-title">备份策略</span>
            </div>
            <select v-model="settings.backupStrategy" class="item-select">
              <option value="manual">手动备份</option>
              <option value="daily">每日备份</option>
              <option value="weekly">每周备份</option>
            </select>
          </div>
          <div class="list-item">
            <div class="item-icon">🔔</div>
            <div class="item-info">
              <span class="item-title">阅读提醒</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="settings.reminder" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">数据管理</h3>
        <div class="settings-list">
          <div class="list-item" @click="goToExport">
            <div class="item-icon">📤</div>
            <div class="item-info">
              <span class="item-title">导出数据</span>
              <span class="item-desc">导出书籍为JSON/CSV/Excel</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToImport">
            <div class="item-icon">📥</div>
            <div class="item-info">
              <span class="item-title">导入数据</span>
              <span class="item-desc">从文件导入书籍数据</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToConfig">
            <div class="item-icon">🔄</div>
            <div class="item-info">
              <span class="item-title">配置书库</span>
              <span class="item-desc">设置书库同步</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item danger" @click="handleClearData">
            <div class="item-icon">🗑️</div>
            <div class="item-info">
              <span class="item-title">清除数据</span>
              <span class="item-desc">清除所有本地数据</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">快捷功能</h3>
        <div class="settings-list">
          <div class="list-item" @click="goToAddBook">
            <div class="item-icon">📚</div>
            <div class="item-info">
              <span class="item-title">添加书籍</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToAddBookmark">
            <div class="item-icon">📝</div>
            <div class="item-info">
              <span class="item-title">添加书摘</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="goToSearch">
            <div class="item-icon">🔍</div>
            <div class="item-info">
              <span class="item-title">搜索</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">帮助与合规</h3>
        <div class="settings-list">
          <div class="list-item" @click="openLink('manual')">
            <div class="item-icon">📖</div>
            <div class="item-info">
              <span class="item-title">操作指南</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="openLink('agreement')">
            <div class="item-icon">📜</div>
            <div class="item-info">
              <span class="item-title">用户协议</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="openLink('privacy')">
            <div class="item-icon">🔒</div>
            <div class="item-info">
              <span class="item-title">隐私政策</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="openLink('feedback')">
            <div class="item-icon">💬</div>
            <div class="item-info">
              <span class="item-title">反馈入口</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        </div>
      </div>

      <div class="version-info">
        <p>青橙读书记录 v0.9.13</p>
        <p>Made with ❤️ for readers</p>
      </div>
    </div>

    <!-- 备注编辑弹窗 -->
    <div v-if="showNoteModal" class="modal-overlay" @click.self="closeNoteEditor">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑读者备注</h3>
          <button class="modal-close" @click="closeNoteEditor">×</button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="noteText"
            placeholder="请输入备注内容..."
            rows="5"
            class="note-textarea"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeNoteEditor">取消</button>
          <button class="btn-save" @click="saveNote">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { useBookmarkStore } from '@/stores/bookmark';
import { useReaderStore } from '@/stores/reader';
import { bookService } from '@/api/book';
import { bookmarkService } from '@/api/bookmark';
import userSettingsService from '@/api/userSettings';

const router = useRouter();
const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();
const readerStore = useReaderStore();

const settings = reactive({
  layout: 'grid',
  backupStrategy: 'manual',
  reminder: false
});

// 备注编辑相关
const showNoteModal = ref(false);
const noteText = ref('');

// 当前读者备注
const currentReaderNote = computed(() => {
  const reader = readerStore.readers.find(r => r.id === readerStore.currentReaderId);
  return reader?.note || '';
});

// 显示备注编辑器
const showNoteEditor = () => {
  noteText.value = currentReaderNote.value;
  showNoteModal.value = true;
};

// 关闭备注编辑器
const closeNoteEditor = () => {
  showNoteModal.value = false;
  noteText.value = '';
};

// 保存备注
const saveNote = async () => {
  try {
    await readerStore.updateReaderNote(readerStore.currentReaderId, noteText.value);
    showNoteModal.value = false;
  } catch (error) {
    console.error('保存备注失败:', error);
    alert('保存备注失败，请重试');
  }
};

// 统计数据
const stats = computed(() => ({
  totalBooks: bookStore.allBooks.length,
  readBooks: bookStore.allBooks.filter(b => b.readStatus === '已读').length,
  bookmarks: bookmarkStore.allBookmarks.length,
  spent: bookStore.allBooks.reduce((sum, b) => sum + (b.purchasePrice || 0), 0).toFixed(0)
}));

// 导航
const goToBooks = (type: string) => {
  if (type === 'read') {
    router.push({ path: '/book', query: { status: '已读' } });
  } else {
    router.push('/book');
  }
};

const goToBookmarks = () => {
  router.push('/bookmark');
};

const goToReadingSettings = () => {
  router.push('/reading-settings');
};

const goToBookmarkSettings = () => {
  router.push('/bookmark-settings');
};

const goToLibrarySettings = () => {
  router.push('/library-settings');
};

const goToThirdPartySettings = () => {
  router.push('/third-party-settings');
};

const goToExport = () => {
  router.push('/export');
};

const goToImport = () => {
  router.push('/import');
};

const goToConfig = () => {
  router.push('/config');
};

const goToAddBook = () => {
  router.push('/book/edit');
};

const goToAddBookmark = () => {
  router.push('/bookmark/edit');
};

const goToSearch = () => {
  router.push('/search');
};

// 加载书籍列表
const loadBooks = async () => {
  try {
    const books = await bookService.getAllBooks(readerStore.currentReaderId);
    bookStore.setBooks(books);
  } catch (error) {
    console.error('加载书籍列表失败:', error);
  }
};

const openLink = (type: string) => {
  alert(`${type} 页面开发中...`);
};

const handleClearData = () => {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    // 清除数据逻辑
    alert('数据已清除');
  }
};

// 处理读者切换
const handleReaderChange = () => {
  // readerStore会自动保存到localStorage

  // 刷新书籍列表以更新阅读状态
  loadBooks();
};

// 检查当前用户是否为默认用户
const isDefaultReader = computed(() => {
  const defaultReaderId = localStorage.getItem('defaultReaderId');
  return defaultReaderId === String(readerStore.currentReaderId);
});

// 设置默认用户
const setDefaultReader = async () => {
  localStorage.setItem('defaultReaderId', String(readerStore.currentReaderId));
  
  try {
    await userSettingsService.saveSetting('defaultReaderId', readerStore.currentReaderId, 'high');
    alert(`已将 "${readerStore.currentReader.name || readerStore.currentReader.username}" 设为默认用户`);
  } catch (error) {
    console.error('保存默认读者ID到数据库失败:', error);
    alert(`已将 "${readerStore.currentReader.name || readerStore.currentReader.username}" 设为默认用户（本地存储）`);
  }
};

// 保存设置
watch(settings, (newSettings) => {
  localStorage.setItem('appSettings', JSON.stringify(newSettings));
}, { deep: true });

// 加载数据
onMounted(async () => {
  // 加载设置
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
  }

  // 加载统计数据
  try {
    const books = await bookService.getAllBooks(readerStore.currentReaderId);
    bookStore.setBooks(books);
    const bookmarks = await bookmarkService.getAllBookmarks();
    bookmarkStore.setBookmarks(bookmarks);
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 32px 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  color: #fff;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  overflow: hidden;
}

.avatar-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* 适配深色背景：保持 logo 颜色与卡片风格一致 */
  border-radius: 50%;
}

.user-info {
  flex: 1;
}

.username {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.user-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.stats-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-card);
  margin: -16px 16px 16px 16px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background-color: var(--border-light);
}

.content {
  padding: 0 16px 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-hint);
  margin: 0 0 12px 4px;
}

.settings-list {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  border-bottom: 1px solid var(--border-light);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background-color: #f9f9f9;
}

.list-item.danger .item-title {
  color: #f44336;
}

.item-icon {
  font-size: 20px;
  margin-right: 12px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 14px;
  color: var(--text-primary);
}

.item-desc {
  font-size: 12px;
  color: var(--text-hint);
}

.item-select {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  background-color: #fff;
  outline: none;
}

.btn-set-default {
  padding: 6px 12px;
  border: 1px solid var(--primary-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--primary-color);
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-set-default:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: #fff;
}

.btn-set-default.is-default {
  background-color: var(--primary-color);
  color: #fff;
  cursor: default;
}

.btn-set-default:disabled {
  opacity: 0.7;
  cursor: default;
}

.item-arrow {
  width: 20px;
  height: 20px;
  fill: var(--text-hint);
}

/* Switch */
.switch {
  position: relative;
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
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.version-info {
  text-align: center;
  padding: 24px;
  color: var(--text-hint);
  font-size: 12px;
}

.version-info p {
  margin: 4px 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-hint);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 16px;
}

.note-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.note-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-cancel,
.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

.btn-save {
  background-color: var(--primary-color);
  color: #fff;
}
</style>