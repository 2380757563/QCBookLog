<template>
  <div class="profile-container">
    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="avatar">
        <span>📚</span>
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
            <div class="item-icon">🎨</div>
            <div class="item-info">
              <span class="item-title">界面布局</span>
            </div>
            <select v-model="settings.layout" class="item-select">
              <option value="grid">网格</option>
              <option value="list">列表</option>
            </select>
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

      <div class="section">
        <h3 class="section-title">数据管理</h3>
        <div class="settings-list">
          <div class="list-item" @click="handleExport">
            <div class="item-icon">📤</div>
            <div class="item-info">
              <span class="item-title">导出数据</span>
              <span class="item-desc">导出所有书籍和书摘数据</span>
            </div>
            <svg class="item-arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
          <div class="list-item" @click="handleImport">
            <div class="item-icon">📥</div>
            <div class="item-info">
              <span class="item-title">导入数据</span>
              <span class="item-desc">从备份文件恢复数据</span>
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

      <div class="version-info">
        <p>青橙读书记录 v1.0.0</p>
        <p>Made with ❤️ for readers</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/store/book';
import { useBookmarkStore } from '@/store/bookmark';
import { useReaderStore } from '@/store/reader';
import { bookService } from '@/services/book';
import { bookmarkService } from '@/services/bookmark';

const router = useRouter();
const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();
const readerStore = useReaderStore();

const settings = reactive({
  layout: 'grid',
  backupStrategy: 'manual',
  reminder: false
});

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

const handleExport = () => {
  const data = {
    books: bookStore.allBooks,
    bookmarks: bookmarkStore.allBookmarks,
    exportTime: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `青橙读书记录_备份_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleImport = () => {
  alert('导入数据功能开发中...');
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

// 保存设置
watch(settings, (newSettings) => {
  localStorage.setItem('appSettings', JSON.stringify(newSettings));
  bookStore.setLayout(newSettings.layout as 'grid' | 'list');
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
</style>