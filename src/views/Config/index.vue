<template>
  <div class="config-page">
    <div class="config-page__header">
      <h1 class="config-page__title">配置书库</h1>
      <p class="config-page__subtitle">
        配置后，应用将与所选书库实现实时同步。
      </p>
    </div>

    <!-- 书库类型选择标签页 -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: selectedType === 'sync-status' }"
          @click="selectType('sync-status')"
        >
          书库同步状态
        </button>
        <button
          class="tab-button"
          :class="{ active: selectedType === 'calibre' }"
          @click="selectType('calibre')"
        >
          同步 Calibre
        </button>
        <button
          class="tab-button"
          :class="{ active: selectedType === 'talebook' }"
          @click="selectType('talebook')"
        >
          同步 Talebook
        </button>
      </div>
    </div>

    <!-- 仅在非同步状态页面显示步骤指示器和配置内容 -->
    <template v-if="selectedType !== 'sync-status'">
    <!-- 步骤指示器 -->
    <div class="steps-container">
      <div class="steps">
        <div class="step" :class="{ active: currentStep >= 0, completed: currentStep > 0 }">
          <div class="step-number">1</div>
          <div class="step-label">选择书库</div>
        </div>
        <div class="step-line" :class="{ active: currentStep > 0 }"></div>
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <div class="step-number">2</div>
          <div class="step-label">验证</div>
        </div>
        <div class="step-line" :class="{ active: currentStep > 1 }"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <div class="step-number">3</div>
          <div class="step-label">完成</div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="alert alert--error">
      <span class="alert__icon">⚠️</span>
      <span class="alert__message">{{ error }}</span>
      <button class="alert__close" @click="error = null">✕</button>
    </div>

    <!-- 步骤 0: 选择书库 -->
    <div v-if="currentStep === 0" class="step-content">
      <h2 class="step-title">步骤 1: 选择 {{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 书库目录</h2>
      <p class="step-description">
        {{ selectedType === 'calibre' ? '请输入包含 <code>metadata.db</code> 的 Calibre 书库目录路径。' : '请输入包含 <code>calibre-webserver.db</code> 的 Talebook 书库目录路径。' }}
      </p>

      <!-- 选择模式 -->
      <div class="mode-selection">
        <button
          class="mode-button"
          :class="{ active: configMode === 'existing' }"
          @click="configMode = 'existing'"
        >
          📁 使用现有数据库
        </button>
        <button
          class="mode-button"
          :class="{ active: configMode === 'new' }"
          @click="configMode = 'new'"
        >
          ➕ 创建新数据库
        </button>
      </div>

      <!-- 现有数据库路径选择 -->
      <div v-if="configMode === 'existing'" class="input-group">
        <label class="input-label">{{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 书库路径</label>
        <div class="input-with-button">
          <input
            v-if="selectedType === 'calibre'"
            v-model="calibrePath"
            type="text"
            class="input-field"
            placeholder="例如: D:\MyBooks\Calibre Library"
            @keypress.enter="validateDb"
          />
          <input
            v-else
            v-model="talebookPath"
            type="text"
            class="input-field"
            placeholder="例如: D:\MyBooks\Talebook"
            @keypress.enter="validateDb"
          />
          <button
            class="button button--secondary"
            @click="selectFolder"
          >
            📁 选择文件夹
          </button>
          <!-- 隐藏的文件夹选择输入 -->
          <input
            ref="folderInput"
            type="file"
            webkitdirectory
            directory
            multiple="false"
            class="folder-input"
            @change="handleFolderSelect"
          />
        </div>
        <p class="input-hint">
          💡 由于浏览器安全限制，可能无法直接获取完整路径。您可以手动输入完整路径，或使用选择按钮获取文件夹名称后补充完整路径。
        </p>
      </div>

      <!-- 创建新数据库 -->
      <div v-else class="input-group">
        <label class="input-label">新数据库存储路径</label>
        <div class="input-with-button">
          <input
            v-if="selectedType === 'calibre'"
            v-model="newCalibrePath"
            type="text"
            class="input-field"
            placeholder="例如: D:\MyBooks\Calibre Library"
            @keypress.enter="createNewDatabase"
          />
          <input
            v-else
            v-model="newTalebookPath"
            type="text"
            class="input-field"
            placeholder="例如: D:\MyBooks\Talebook"
            @keypress.enter="createNewDatabase"
          />
          <button
            class="button button--secondary"
            @click="selectFolderForNewDb"
          >
            📁 选择文件夹
          </button>
        </div>
        <div class="default-path-option">
          <button
            class="default-path-button"
            @click="useDefaultPath"
          >
            ⚡ 使用默认路径
          </button>
          <span class="default-path-text">
            默认路径：{{ selectedType === 'calibre' ? './data/calibre' : './data/talebook' }}
          </span>
        </div>
        <p class="input-hint">
          💡 请输入新数据库的存储路径。系统将在该路径下创建 {{ selectedType === 'calibre' ? 'metadata.db' : 'calibre-webserver.db' }} 文件。
        </p>
      </div>

      <button
        v-if="configMode === 'existing'"
        class="button button--primary"
        :disabled="(selectedType === 'calibre' ? !calibrePath : !talebookPath) || loading"
        @click="validateDb"
      >
        {{ loading ? '验证中...' : '验证书库' }}
      </button>
      <button
        v-else
        class="button button--primary"
        :disabled="(selectedType === 'calibre' ? !newCalibrePath : !newTalebookPath) || loading"
        @click="createNewDatabase"
      >
        {{ loading ? '创建中...' : '创建数据库' }}
      </button>
    </div>

    <!-- 步骤 1: 验证结果 -->
    <div v-if="currentStep === 1 && validation" class="step-content">
      <h2 class="step-title">步骤 2: 验证结果</h2>

      <div class="alert alert--success">
        <span class="alert__icon">✅</span>
        <span class="alert__message">验证通过！找到有效的 {{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库</span>
      </div>

      <div class="info-card">
        <div class="info-item">
          <span class="info-label">书籍数量:</span>
          <span class="info-value">{{ validation.stats?.bookCount }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">书库 UUID:</span>
          <span class="info-value">{{ validation.stats?.libraryUuid }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">数据库路径:</span>
          <span class="info-value">{{ validation.stats?.dbPath }}</span>
        </div>
      </div>

      <div class="button-group">
        <button
          class="button button--primary"
          :disabled="loading"
          @click="saveConfig"
        >
          {{ loading ? '保存中...' : '保存配置' }}
        </button>
        <button class="button button--secondary" @click="currentStep = 0">
          返回修改
        </button>
      </div>
    </div>

    <!-- 步骤 1: 验证界面（未验证时显示） -->
    <div v-if="currentStep === 1 && !validation" class="step-content">
      <h2 class="step-title">步骤 2: 验证 {{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 书库</h2>

      <div class="info-card">
        <div class="info-item">
          <span class="info-label">当前配置路径:</span>
          <span class="info-value">{{ currentPath || '未配置' }}</span>
        </div>
      </div>

      <div class="button-group">
        <button
          class="button button--primary"
          :disabled="loading || !currentPath"
          @click="validateDb"
        >
          {{ loading ? '验证中...' : '验证数据库' }}
        </button>
        <button class="button button--secondary" @click="currentStep = 0">
          返回修改
        </button>
      </div>
    </div>

    <!-- 步骤 2: 完成 -->
    <div v-if="currentStep === 2" class="step-content">
      <h2 class="step-title">
        {{ (selectedType === 'calibre' ? calibreValid : talebookValid) ? '配置成功！' : '配置异常' }}
      </h2>

      <div v-if="(selectedType === 'calibre' ? calibreValid : talebookValid)" class="alert alert--success">
        <span class="alert__icon">✅</span>
        <span class="alert__message">应用和 {{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 现在共享同一个数据库</span>
      </div>

      <div v-else class="alert alert--error">
        <span class="alert__icon">⚠️</span>
        <span class="alert__message">
          {{ selectedType === 'calibre' ? calibreError : talebookError || '数据库验证失败' }}
        </span>
      </div>

      <div class="info-card">
        <div class="info-item">
          <span class="info-label">{{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库:</span>
          <span class="info-value">{{ currentPath }}</span>
        </div>
        <div v-if="(selectedType === 'calibre' ? calibreStats : talebookStats)" class="info-item">
          <span class="info-label">书籍数量:</span>
          <span class="info-value">{{ (selectedType === 'calibre' ? calibreStats?.bookCount : talebookStats?.bookCount) || 0 }} 本</span>
        </div>
        <div v-if="selectedType === 'calibre' && calibreStats?.libraryUuid" class="info-item">
          <span class="info-label">书库 UUID:</span>
          <span class="info-value">{{ calibreStats.libraryUuid }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">同步说明:</span>
          <span class="info-value">{{ selectedType === 'calibre' ? '应用添加的书籍会立即出现在 Calibre 中，Calibre 的修改也会立即反映在应用中。' : '应用添加的书籍会立即出现在 Talebook 中，Talebook 的修改也会立即反映在应用中。' }}</span>
        </div>
        <div class="info-item info-item--default">
          <span class="info-label">默认书库:</span>
          <div class="default-toggle">
            <span class="default-status" :class="{ active: isDefault }">
              {{ isDefault ? '⭐ 是' : '否' }}
            </span>
            <button
              class="button button--small"
              :class="isDefault ? 'button--secondary' : 'button--primary'"
              @click="toggleDefault"
            >
              {{ isDefault ? '取消默认' : '设为默认' }}
            </button>
          </div>
        </div>
      </div>

      <div class="button-group" style="justify-content: center; margin-bottom: 16px;">
        <button class="button button--primary" @click="goHome">
          开始使用
        </button>
      </div>

      <button class="button button--secondary" style="width: 100%;" @click="reconfigure">
        🔁 切换到其他数据库
      </button>
    </div>
    </template>

    <!-- 同步状态页面 -->
    <div v-if="selectedType === 'sync-status'" class="sync-status-page">
      <div class="sync-status-page__header">
        <h2 class="sync-status-page__title">书库同步状态</h2>
        <p class="sync-status-page__subtitle">
          实时显示 Calibre 书库与 Talebook 书库的同步情况
        </p>
      </div>

      <!-- 同步状态卡片 -->
      <div class="sync-cards">
        <!-- 总体同步状态 -->
        <div class="sync-card sync-card--overall">
          <div class="sync-card__header">
            <h3 class="sync-card__title">总体同步状态</h3>
            <div class="sync-status-badge" :class="overallSyncStatus">
              {{ overallSyncStatusText }}
            </div>
          </div>
          <div class="sync-card__content">
            <div class="sync-info-item">
              <span class="sync-info-label">最后同步时间:</span>
              <span class="sync-info-value">{{ lastSyncTime }}</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">上次同步结果:</span>
              <span class="sync-info-value">{{ lastSyncResult }}</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">同步模式:</span>
              <span class="sync-info-value">{{ syncMode }}</span>
            </div>
            <div class="sync-actions">
              <button 
                class="button button--primary" 
                :disabled="syncing" 
                @click="executeSync"
              >
                {{ syncing ? '同步中...' : '🔄 执行同步' }}
              </button>
              <button 
                class="button button--secondary" 
                :disabled="syncing"
                @click="refreshSyncStatus"
              >
                🔄 刷新状态
              </button>
            </div>
          </div>
        </div>

        <!-- Calibre 到 Talebook 同步状态 -->
        <div class="sync-card">
          <div class="sync-card__header">
            <h3 class="sync-card__title">Calibre → Talebook</h3>
            <div class="sync-status-badge" :class="calibreToTalebookStatus">
              {{ calibreToTalebookStatusText }}
            </div>
          </div>
          <div class="sync-card__content">
            <div class="sync-info-item">
              <span class="sync-info-label">同步进度:</span>
              <div class="progress-bar">
                <div class="progress-bar__fill" :style="{ width: calibreToTalebookProgress + '%' }"></div>
              </div>
              <span class="sync-info-value">{{ calibreToTalebookProgress }}%</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">已同步书籍:</span>
              <span class="sync-info-value">{{ calibreToTalebookSyncedBooks }} / {{ calibreToTalebookTotalBooks }}</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">同步时长:</span>
              <span class="sync-info-value">{{ calibreToTalebookDuration }}</span>
            </div>
          </div>
        </div>

        <!-- Talebook 到 Calibre 同步状态 -->
        <div class="sync-card">
          <div class="sync-card__header">
            <h3 class="sync-card__title">Talebook → Calibre</h3>
            <div class="sync-status-badge" :class="talebookToCalibreStatus">
              {{ talebookToCalibreStatusText }}
            </div>
          </div>
          <div class="sync-card__content">
            <div class="sync-info-item">
              <span class="sync-info-label">同步进度:</span>
              <div class="progress-bar">
                <div class="progress-bar__fill" :style="{ width: talebookToCalibreProgress + '%' }"></div>
              </div>
              <span class="sync-info-value">{{ talebookToCalibreProgress }}%</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">已同步书籍:</span>
              <span class="sync-info-value">{{ talebookToCalibreSyncedBooks }} / {{ talebookToCalibreTotalBooks }}</span>
            </div>
            <div class="sync-info-item">
              <span class="sync-info-label">同步时长:</span>
              <span class="sync-info-value">{{ talebookToCalibreDuration }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 同步详情日志 -->
      <div class="sync-details">
        <div class="sync-details__header">
          <h3 class="sync-details__title">同步详情日志</h3>
        </div>
        <div class="sync-logs">
          <div v-for="(log, index) in syncLogs" :key="index" class="sync-log-item">
            <span class="sync-log-time">{{ log.time }}</span>
            <span class="sync-log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 初始加载 -->
    <div v-if="initialLoading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/store/book';

const router = useRouter();
const bookStore = useBookStore();

const currentStep = ref(0);
const selectedType = ref<'sync-status' | 'calibre' | 'talebook'>('sync-status');
const configMode = ref<'existing' | 'new'>('existing');
const calibrePath = ref('');
const talebookPath = ref('');
const newCalibrePath = ref('');
const newTalebookPath = ref('');
const validation = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const currentPath = ref('');
const initialLoading = ref(true);
const isDefault = ref(false);

// 数据库统计信息
const calibreStats = ref<any>(null);
const talebookStats = ref<any>(null);
const calibreValid = ref(false);
const talebookValid = ref(false);
const calibreError = ref<string | null>(null);
const talebookError = ref<string | null>(null);
const calibreNeedsReconfig = ref(false);
const talebookNeedsReconfig = ref(false);

// 文件夹选择相关
const folderInput = ref<HTMLInputElement | null>(null);

// 数据库状态
const databaseStatus = ref({
  calibre: {
    exists: false,
    valid: false,
    error: null
  },
  talebook: {
    exists: false,
    valid: false,
    error: null
  }
});

// 同步状态相关变量
const overallSyncStatus = ref('synced'); // synced, syncing, failed
const overallSyncStatusText = ref('已同步');
const lastSyncTime = ref('');
const lastSyncResult = ref('');
const syncMode = ref('双向同步');

// Calibre 到 Talebook 同步状态
const calibreToTalebookStatus = ref('synced');
const calibreToTalebookStatusText = ref('已同步');
const calibreToTalebookProgress = ref(0);
const calibreToTalebookSyncedBooks = ref(0);
const calibreToTalebookTotalBooks = ref(0);
const calibreToTalebookDuration = ref('00:00:00');

// Talebook 到 Calibre 同步状态
const talebookToCalibreStatus = ref('synced');
const talebookToCalibreStatusText = ref('已同步');
const talebookToCalibreProgress = ref(0);
const talebookToCalibreSyncedBooks = ref(0);
const talebookToCalibreTotalBooks = ref(0);
const talebookToCalibreDuration = ref('00:00:00');

// 同步日志
const syncLogs = ref([
  { time: new Date().toLocaleString(), message: '系统初始化，正在获取同步状态...' }
]);

// 同步状态数据
const syncStatusData = ref(null);

// 从API获取同步状态
const fetchSyncStatus = async () => {
  try {
    const response = await fetch('/api/config/sync-status');
    const result = await response.json();
    
    if (result.success && result.data) {
      const syncData = result.data;
      syncStatusData.value = syncData;
      
      // 更新总体同步状态
      if (syncData.conflicted > 0) {
        overallSyncStatus.value = 'conflicted';
        overallSyncStatusText.value = '存在冲突';
      } else if (syncData.onlyInCalibre.length > 0 || syncData.onlyInTalebook.length > 0) {
        overallSyncStatus.value = 'pending';
        overallSyncStatusText.value = '需要同步';
      } else {
        overallSyncStatus.value = 'synced';
        overallSyncStatusText.value = '已同步';
      }
      
      // 更新同步时间和结果
      lastSyncTime.value = new Date().toLocaleString();
      lastSyncResult.value = result.status === 'success' ? '成功' : '失败';
      
      // 更新Calibre到Talebook同步状态
      calibreToTalebookSyncedBooks.value = syncData.calibre?.inBoth || 0;
      calibreToTalebookTotalBooks.value = syncData.calibre?.total || 0;
      calibreToTalebookProgress.value = syncData.calibre?.total > 0 ? Math.round((syncData.calibre.inBoth / syncData.calibre.total) * 100) : 100;
      
      // 更新Talebook到Calibre同步状态
      talebookToCalibreSyncedBooks.value = syncData.talebook?.inBoth || 0;
      talebookToCalibreTotalBooks.value = syncData.talebook?.total || 0;
      talebookToCalibreProgress.value = syncData.talebook?.total > 0 ? Math.round((syncData.talebook.inBoth / syncData.talebook.total) * 100) : 100;
      
      // 更新同步日志
      syncLogs.value.unshift({
        time: new Date().toLocaleString(),
        message: `同步状态更新: Calibre ${syncData.calibre?.total || 0} 本，Talebook ${syncData.talebook?.total || 0} 本，冲突 ${syncData.conflicted || 0} 本`
      });
      
      // 限制日志数量
      if (syncLogs.value.length > 20) {
        syncLogs.value = syncLogs.value.slice(0, 20);
      }
    } else {
      // API返回失败或数据为空
      syncLogs.value.unshift({
        time: new Date().toLocaleString(),
        message: `获取同步状态失败: ${result.message || '未知错误'}`
      });
    }
  } catch (error) {
    console.error('获取同步状态失败:', error);
    syncLogs.value.unshift({
      time: new Date().toLocaleString(),
      message: `获取同步状态失败: ${(error as any).message}`
    });
  }
};

// 刷新同步状态
const refreshSyncStatus = async () => {
  await fetchSyncStatus();
};

// 执行同步
const syncing = ref(false);
const executeSync = async () => {
  if (syncing.value) return;
  
  syncing.value = true;
  syncLogs.value.unshift({
    time: new Date().toLocaleString(),
    message: '开始执行同步...'
  });
  
  try {
    const response = await fetch('/api/sync/calibre-to-talebook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.status === 'success' || result.status === 'SUCCESS') {
      syncLogs.value.unshift({
        time: new Date().toLocaleString(),
        message: `同步完成: ${result.message}`
      });
      lastSyncResult.value = '成功';
      lastSyncTime.value = new Date().toLocaleString();
    } else {
      syncLogs.value.unshift({
        time: new Date().toLocaleString(),
        message: `同步失败: ${result.message}`
      });
      lastSyncResult.value = '失败';
    }
    
    // 刷新同步状态
    await fetchSyncStatus();
  } catch (error) {
    console.error('执行同步失败:', error);
    syncLogs.value.unshift({
      time: new Date().toLocaleString(),
      message: `同步失败: ${(error as any).message}`
    });
    lastSyncResult.value = '失败';
  } finally {
    syncing.value = false;
  }
};

// 定时器引用
let configSyncTimer = null;

// 定期同步配置状态
const startConfigSync = () => {
  if (configSyncTimer) {
    clearInterval(configSyncTimer);
  }
  
  // 每30秒同步一次配置状态
  configSyncTimer = setInterval(() => {
    if (document.visibilityState === 'visible') { // 仅在页面可见时同步
      fetchCurrentConfig();
    }
  }, 30000); // 30秒
};

// 停止同步
const stopConfigSync = () => {
  if (configSyncTimer) {
    clearInterval(configSyncTimer);
    configSyncTimer = null;
  }
};

// 组件挂载时获取同步状态
onMounted(() => {
  if (selectedType.value === 'sync-status') {
    fetchSyncStatus();
  }
  
  // 启动配置同步
  startConfigSync();
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 页面变为可见时立即同步一次
      fetchCurrentConfig();
      startConfigSync(); // 重启定时器
    } else {
      stopConfigSync(); // 页面隐藏时停止定时器节省资源
    }
  });
});

// 组件激活时获取同步状态
onActivated(() => {
  if (selectedType.value === 'sync-status') {
    fetchSyncStatus();
  }
  
  // 重新启动配置同步
  startConfigSync();
});

// 组件卸载时清理定时器
onBeforeUnmount(() => {
  stopConfigSync();
  document.removeEventListener('visibilitychange', () => {});
});

// 检测数据库状态 - 简化版本，仅更新数据库状态，不自动触发弹窗
const checkDatabaseStatus = async (type?: 'calibre' | 'talebook') => {
  try {
    const response = await fetch('/api/config/check-databases');
    const result = await response.json();
    
    if (result.success) {
      databaseStatus.value = result.data;
      
      // 如果两个数据库都有效，显示完成步骤
      if (databaseStatus.value.calibre.valid && databaseStatus.value.talebook.valid) {
        // 检查当前配置的数据库类型
        if (currentPath.value.includes('metadata.db')) {
          selectedType.value = 'calibre';
        } else if (currentPath.value.includes('calibre-webserver.db')) {
          selectedType.value = 'talebook';
        }
        currentStep.value = 2;
      }
    }
  } catch (error) {
    console.error('检测数据库状态失败:', error);
  }
};

// 检查数据库状态并自动跳转到同步状态页面
const checkDatabaseStatusAndRedirect = async () => {
  try {
    const response = await fetch('/api/config/check-databases');
    const result = await response.json();
    
    if (result.success) {
      databaseStatus.value = result.data;
      
      // 如果 Calibre 或 Talebook 数据库无效，自动切换到同步状态页面
      if (!databaseStatus.value.calibre.valid || !databaseStatus.value.talebook.valid) {
        selectedType.value = 'sync-status';
        currentStep.value = 0;
      }
    }
  } catch (error) {
    console.error('检测数据库状态失败:', error);
  }
};

onMounted(() => {
  // 检查 URL 中的 tab 参数，如果有则设置 selectedType
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam === 'sync-status' || tabParam === 'calibre' || tabParam === 'talebook') {
    selectedType.value = tabParam;
  }

  fetchCurrentConfig();
});

onActivated(() => {
  // 每次进入页面时重新获取配置，确保路径变量正确初始化
  fetchCurrentConfig();
});

const selectType = (type: 'sync-status' | 'calibre' | 'talebook') => {
  selectedType.value = type;
  validation.value = null;
  error.value = '';

  // 如果是同步状态页面，直接返回
  if (type === 'sync-status') {
    return;
  }

  // 更新当前路径为对应数据库的路径
  if (type === 'calibre') {
    currentPath.value = calibrePath.value ? `${calibrePath.value.replace(/[/\\]$/, '')}${calibrePath.value.includes('\\') ? '\\' : '/'}metadata.db` : '';
    console.log('📋 切换到 Calibre 标签:', {
      calibrePath: calibrePath.value,
      currentPath: currentPath.value,
      calibreValid: calibreValid.value,
      calibreError: calibreError.value,
      calibreNeedsReconfig: calibreNeedsReconfig.value
    });
  } else {
    currentPath.value = talebookPath.value ? `${talebookPath.value.replace(/[/\\]$/, '')}${talebookPath.value.includes('\\') ? '\\' : '/'}calibre-webserver.db` : '';
    console.log('📋 切换到 Talebook 标签:', {
      talebookPath: talebookPath.value,
      currentPath: currentPath.value,
      talebookValid: talebookValid.value,
      talebookError: talebookError.value,
      talebookNeedsReconfig: talebookNeedsReconfig.value
    });
  }

  // 检查当前类型的数据库是否已经配置
  const isConfigured = type === 'calibre' ? calibrePath.value : talebookPath.value;
  const isValid = type === 'calibre' ? calibreValid.value : talebookValid.value;
  const needsReconfig = type === 'calibre' ? calibreNeedsReconfig.value : talebookNeedsReconfig.value;

  if (isConfigured) {
    // 如果已经配置
    if (isValid) {
      // 如果数据库有效，直接显示完成步骤
      currentStep.value = 2;
      console.log('📋 已配置且有效，显示完成步骤');
    } else {
      // 如果数据库无效，显示完成步骤但显示错误
      currentStep.value = 2;
      const errorMsg = type === 'calibre' ? calibreError.value : talebookError.value;
      if (errorMsg) {
        error.value = errorMsg;
      }
      console.log('📋 已配置但无效，显示完成步骤和错误信息');
    }
  } else {
    // 未配置时，直接显示选择书库步骤
    currentStep.value = 0;
    console.log('📋 未配置，显示选择书库步骤');
  }
};

const fetchCurrentConfig = async () => {
  try {
    initialLoading.value = true;

    // 同时获取calibre和talebook的配置
    const [calibreResponse, talebookResponse] = await Promise.all([
      fetch('/api/config/calibre-path'),
      fetch('/api/config/talebook-path')
    ]);

    const calibreData = await calibreResponse.json();
    const talebookData = await talebookResponse.json();

    console.log('📋 获取到的配置数据:', {
      calibreData,
      talebookData
    });
    
    console.log('📋 Calibre 详细信息:', {
      calibreDbPath: calibreData.calibreDbPath,
      exists: calibreData.exists,
      valid: calibreData.valid,
      error: calibreData.error,
      needsReconfig: calibreData.needsReconfig,
      stats: calibreData.stats
    });
    
    console.log('📋 Talebook 详细信息:', {
      talebookDbPath: talebookData.talebookDbPath,
      exists: talebookData.exists,
      valid: talebookData.valid,
      error: talebookData.error,
      needsReconfig: talebookData.needsReconfig,
      stats: talebookData.stats
    });

    // 检查API是否返回成功
    if (!calibreData.success) {
      console.error('❌ 获取Calibre配置失败:', calibreData.error);
      error.value = `获取Calibre配置失败: ${calibreData.error}`;
    }
    if (!talebookData.success) {
      console.error('❌ 获取Talebook配置失败:', talebookData.error);
      error.value = error.value ? `${error.value}; 获取Talebook配置失败: ${talebookData.error}` : `获取Talebook配置失败: ${talebookData.error}`;
    }

    // 总是初始化所有路径变量，无论数据库文件是否存在
    // 这样即使数据库文件被删除，配置信息也会保留
    if (calibreData.success && calibreData.calibreDbPath) {
      calibrePath.value = calibreData.calibreDbPath.replace(/\\metadata.db|\/metadata.db/g, '');
      console.log('✅ 设置 calibrePath:', calibrePath.value);
    } else {
      calibrePath.value = '';
      console.log('⚠️ calibrePath 未设置');
    }
    if (talebookData.success && talebookData.talebookDbPath) {
      talebookPath.value = talebookData.talebookDbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
      console.log('✅ 设置 talebookPath:', talebookPath.value);
    } else {
      talebookPath.value = '';
      console.log('⚠️ talebookPath 未设置');
    }

    // 更新数据库有效性状态和统计信息
    calibreValid.value = calibreData.valid || false;
    talebookValid.value = talebookData.valid || false;
    calibreError.value = calibreData.error || null;
    talebookError.value = talebookData.error || null;
    calibreStats.value = calibreData.stats || null;
    talebookStats.value = talebookData.stats || null;
    calibreNeedsReconfig.value = calibreData.needsReconfig || false;
    talebookNeedsReconfig.value = talebookData.needsReconfig || false;

    // 检查是否需要重新配置
    if (calibreNeedsReconfig.value || talebookNeedsReconfig.value) {
      console.log('⚠️ 检测到数据库需要重新配置:', {
        calibreNeedsReconfig: calibreNeedsReconfig.value,
        talebookNeedsReconfig: talebookNeedsReconfig.value
      });
      
      // 如果当前不是同步状态页面，显示错误信息并切换到配置向导
      if (selectedType.value !== 'sync-status') {
        const errorMsg = calibreNeedsReconfig.value 
          ? calibreError.value 
          : talebookError.value;
        if (errorMsg) {
          error.value = errorMsg;
        }
        
        // 自动切换到配置向导页面
        if (calibreNeedsReconfig.value && !talebookNeedsReconfig.value) {
          selectedType.value = 'calibre';
          currentStep.value = 0; // 直接跳转到配置向导第一步
        } else if (!calibreNeedsReconfig.value && talebookNeedsReconfig.value) {
          selectedType.value = 'talebook';
          currentStep.value = 0; // 直接跳转到配置向导第一步
        } else {
          // 如果两个都需要重新配置，优先选择calibre
          selectedType.value = 'calibre';
          currentStep.value = 0; // 直接跳转到配置向导第一步
        }
      } else {
        // 在同步状态页面，也标记需要重新配置的数据库
        console.log('📋 在同步状态页面，检测到需要重新配置的数据库');
      }
    } else {
      // 如果不需要重新配置，根据当前配置自动设置页面状态
      // 如果当前还没有选定类型，或者需要根据配置自动选择
      if (selectedType.value === 'sync-status') {
        // 保持当前选择，不自动切换
        console.log('📋 当前是 sync-status 页面，不自动切换');
      } else if (!currentPath.value) {
        // 如果还没有设置当前路径，根据配置自动设置
        const config = {
          calibre: (calibreData.success && calibreData.calibreDbPath) ? {
            path: calibreData.calibreDbPath,
            exists: calibreData.exists,
            valid: calibreData.valid,
            isDefault: calibreData.isDefault,
            needsReconfig: calibreData.needsReconfig
          } : null,
          talebook: (talebookData.success && talebookData.talebookDbPath) ? {
            path: talebookData.talebookDbPath,
            exists: talebookData.exists,
            valid: talebookData.valid,
            isDefault: talebookData.isDefault,
            needsReconfig: talebookData.needsReconfig
          } : null
        };

        if (config.calibre && !config.talebook) {
          // 只有calibre配置
          currentPath.value = config.calibre.path;
          isDefault.value = config.calibre.isDefault || false;
          selectedType.value = 'calibre';
          // 如果数据库有效，显示完成步骤；否则根据情况显示验证步骤或选择步骤
          if (config.calibre.valid) {
            currentStep.value = 2;
          } else if (config.calibre.exists) {
            // 数据库存在但无效，显示错误并允许重新配置
            currentStep.value = 2;
            error.value = calibreData.error || '数据库验证失败';
          } else {
            // 数据库不存在，显示选择步骤
            currentStep.value = 0;
          }
        } else if (!config.calibre && config.talebook) {
          // 只有talebook配置
          currentPath.value = config.talebook.path;
          isDefault.value = config.talebook.isDefault || false;
          selectedType.value = 'talebook';
          // 如果数据库有效，显示完成步骤；否则根据情况显示验证步骤或选择步骤
          if (config.talebook.valid) {
            currentStep.value = 2;
          } else if (config.talebook.exists) {
            // 数据库存在但无效，显示错误并允许重新配置
            currentStep.value = 2;
            error.value = talebookData.error || '数据库验证失败';
          } else {
            // 数据库不存在，显示选择步骤
            currentStep.value = 0;
          }
        } else if (config.calibre && config.talebook) {
          // 两个数据库都已配置，根据 isDefault 或默认选择 calibre
          if (config.talebook.isDefault) {
            currentPath.value = config.talebook.path;
            isDefault.value = true;
            selectedType.value = 'talebook';
            currentStep.value = config.talebook.valid ? 2 : (config.talebook.exists ? 2 : 0);
            if (!config.talebook.valid && config.talebook.exists) {
              error.value = talebookData.error || '数据库验证失败';
            }
          } else {
            // 默认使用 calibre
            currentPath.value = config.calibre.path;
            isDefault.value = config.calibre.isDefault || false;
            selectedType.value = 'calibre';
            currentStep.value = config.calibre.valid ? 2 : (config.calibre.exists ? 2 : 0);
            if (!config.calibre.valid && config.calibre.exists) {
              error.value = calibreData.error || '数据库验证失败';
            }
          }
        } else {
          // 两个数据库都未配置
          currentStep.value = 0;
        }

        console.log('📋 自动设置当前配置:', {
          selectedType: selectedType.value,
          currentPath: currentPath.value,
          currentStep: currentStep.value,
          calibreValid: calibreValid.value,
          talebookValid: talebookValid.value
        });
      }
    }
  } catch (err) {
    console.error('❌ 获取配置失败:', err);
    error.value = `获取配置失败: ${(err as Error).message}`;
  } finally {
    initialLoading.value = false;
  }
};

const validateDb = async () => {
  loading.value = true;
  error.value = null;
  validation.value = null;

  try {
    // 验证路径是否为空
    const currentPath = selectedType.value === 'calibre' ? calibrePath.value : talebookPath.value;
    if (!currentPath.trim()) {
      error.value = `请输入或选择 ${selectedType.value === 'calibre' ? 'Calibre' : 'Talebook'} 书库路径`;
      loading.value = false;
      return;
    }

    let endpoint = selectedType.value === 'calibre' ? '/api/config/validate-calibre' : '/api/config/validate-talebook';
    let body = selectedType.value === 'calibre' ? { calibreDir: currentPath } : { talebookDir: currentPath };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`验证失败: ${errorText || `HTTP error! status: ${response.status}`}`);
    }

    const data = await response.json();
    validation.value = data;

    if (data.success) {
      // 更新统计信息
      if (selectedType.value === 'calibre') {
        calibreStats.value = data.stats || null;
        calibreValid.value = true;
        calibreError.value = null;
        calibreNeedsReconfig.value = false;
      } else {
        talebookStats.value = data.stats || null;
        talebookValid.value = true;
        talebookError.value = null;
        talebookNeedsReconfig.value = false;
      }
      currentStep.value = 1;
    } else {
      const errorMsg = data.errors && data.errors.length > 0
        ? data.errors.join(', ')
        : (data.error || '未知错误');
      error.value = `验证失败: ${errorMsg}`;
      // 设置需要重新配置的标志
      if (selectedType.value === 'calibre') {
        calibreNeedsReconfig.value = true;
      } else {
        talebookNeedsReconfig.value = true;
      }
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('验证数据库失败:', err);
    error.value = `验证失败: ${errorMessage}`;
    // 设置需要重新配置的标志
    if (selectedType.value === 'calibre') {
      calibreNeedsReconfig.value = true;
    } else {
      talebookNeedsReconfig.value = true;
    }
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  loading.value = true;
  error.value = null;

  try {
    let endpoint = '/api/config/calibre-path';
    let body = {};
    const selectedPath = selectedType.value === 'calibre' ? calibrePath.value : talebookPath.value;

    if (selectedType.value === 'calibre') {
      body = { calibrePath: selectedPath, isDefault: isDefault.value };
    } else {
      endpoint = '/api/config/talebook-path';
      body = { talebookPath: selectedPath, isDefault: isDefault.value };
    }

    console.log('📋 保存配置请求:', { endpoint, body });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`保存配置失败: ${errorText || `HTTP error! status: ${response.status}`}`);
    }

    const data = await response.json();
    console.log('📋 保存配置响应:', data);

    if (data.success) {
      // 立即清空书籍缓存，确保新数据库的数据能够正确加载
      bookStore.setBooks([]);

      // 更新本地路径变量，实现持久化存储
      const dbPath = data.calibreDbPath || data.talebookDbPath;
      if (selectedType.value === 'calibre') {
        calibrePath.value = dbPath.replace(/\\metadata.db|\/metadata.db/g, '');
        console.log('✅ 更新 calibrePath:', calibrePath.value);
      } else {
        talebookPath.value = dbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
        console.log('✅ 更新 talebookPath:', talebookPath.value);
      }

      // 更新当前路径和默认状态
      currentPath.value = dbPath;
      isDefault.value = data.isDefault || false;

      // 更新数据库统计信息
      if (selectedType.value === 'calibre') {
        calibreValid.value = true;
        calibreError.value = null;
        calibreNeedsReconfig.value = false;
        calibreStats.value = data.stats || null;
      } else {
        talebookValid.value = true;
        talebookError.value = null;
        talebookNeedsReconfig.value = false;
        talebookStats.value = data.stats || null;
      }

      // 跳转到完成步骤
      currentStep.value = 2;

      console.log('✅ 配置保存成功:', {
        currentPath: currentPath.value,
        isDefault: isDefault.value,
        selectedType: selectedType.value,
        stats: data.stats
      });
    } else {
      console.error('❌ 配置保存失败:', data.error);
      error.value = `保存失败: ${data.error || '未知错误'}`;
      // 设置需要重新配置的标志
      if (selectedType.value === 'calibre') {
        calibreNeedsReconfig.value = true;
      } else {
        talebookNeedsReconfig.value = true;
      }
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('❌ 保存配置异常:', err);
    error.value = `保存失败: ${errorMessage}`;
    // 设置需要重新配置的标志
    if (selectedType.value === 'calibre') {
      calibreNeedsReconfig.value = true;
    } else {
      talebookNeedsReconfig.value = true;
    }
  } finally {
    loading.value = false;
  }
};

const goHome = () => {
  // 清空书籍缓存，强制重新加载
  bookStore.setBooks([]);

  // 使用 window.location.href 强制刷新页面，确保 onMounted 重新执行
  // 这会绕过 keep-alive 缓存，重新加载所有数据
  window.location.href = '/';
};

const reconfigure = () => {
  currentStep.value = 0;
  calibrePath.value = '';
  talebookPath.value = '';
  validation.value = null;
  error.value = null;
};

// 创建新数据库
const createNewDatabase = async () => {
  loading.value = true;
  error.value = null;

  try {
    const newDbPath = selectedType.value === 'calibre' ? newCalibrePath.value : newTalebookPath.value;

    if (!newDbPath.trim()) {
      error.value = `请输入 ${selectedType.value === 'calibre' ? 'Calibre' : 'Talebook'} 数据库存储路径`;
      loading.value = false;
      return;
    }
    const response = await fetch('/api/config/create-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dbType: selectedType.value,
        dbPath: newDbPath
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建数据库失败: ${errorText || `HTTP error! status: ${response.status}`}`);
    }

    const data = await response.json();
    if (data.success) {
      // 创建成功，更新路径并保存配置
      if (selectedType.value === 'calibre') {
        calibrePath.value = data.dbPath.replace(/\\metadata.db|\/metadata.db/g, '');
      } else {
        talebookPath.value = data.dbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
      }

      // 保存配置
      await saveConfig();
    } else {
      console.error('❌ 创建数据库失败:', data.error);
      error.value = `创建失败: ${data.error || '未知错误'}`;
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('❌ 创建数据库异常:', err);
    error.value = `创建失败: ${errorMessage}`;
  } finally {
    loading.value = false;
  }
};

// 为新数据库选择文件夹
const selectFolderForNewDb = async () => {
  if ('showDirectoryPicker' in window) {
    try {
      const directoryHandle = await (window as any).showDirectoryPicker();
      const folderName = directoryHandle.name;

      let currentPath = selectedType.value === 'calibre' ? newCalibrePath.value : newTalebookPath.value;
      let newPath = '';

      if (currentPath) {
        if (currentPath.includes('\\')) {
          const pathParts = currentPath.split('\\');
          pathParts[pathParts.length - 1] = folderName;
          newPath = pathParts.join('\\');
        } else {
          const pathParts = currentPath.split('/');
          pathParts[pathParts.length - 1] = folderName;
          newPath = pathParts.join('/');
        }
      } else {
        newPath = folderName;
      }
      if (selectedType.value === 'calibre') {
        newCalibrePath.value = newPath;
      } else {
        newTalebookPath.value = newPath;
      }

      return;
    } catch (error) {
      console.error('📁 使用 showDirectoryPicker 失败:', error);
    }
  }

  if (folderInput.value) {
    folderInput.value.click();
  }
};

// 使用默认路径
const useDefaultPath = () => {
  const defaultPath = selectedType.value === 'calibre' ? './data/calibre' : './data/talebook';
  
  if (selectedType.value === 'calibre') {
    newCalibrePath.value = defaultPath;
  } else {
    newTalebookPath.value = defaultPath;
  }
};

const toggleDefault = async () => {
  try {
    const newValue = !isDefault.value;
    const response = await fetch('/api/config/set-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calibreDbPath: currentPath.value,
        isDefault: newValue
      })
    });

    const data = await response.json();
    if (data.success) {
      isDefault.value = newValue;
    } else {
      console.error('❌ 设置默认书库失败:', data.error);
      error.value = data.error;
    }
  } catch (err) {
    console.error('❌ 设置默认书库异常:', err);
    error.value = (err as Error).message;
  }
};

// 文件夹选择功能
const selectFolder = async () => {
  // 尝试使用现代浏览器的 showDirectoryPicker API
  if ('showDirectoryPicker' in window) {
    try {
      const directoryHandle = await (window as any).showDirectoryPicker();
      // 注意：showDirectoryPicker 只返回文件夹名称，不返回完整路径
      // 我们可以使用文件夹名称作为路径的一部分，或者让用户手动确认
      // 这里我们将文件夹名称显示在输入框中，用户可以根据需要修改
      const folderName = directoryHandle.name;
      
      // 对于已配置的路径，我们保留原有路径的目录结构，只替换文件夹名称
      let currentPath = selectedType.value === 'calibre' ? calibrePath.value : talebookPath.value;
      let newPath = '';
      
      if (currentPath) {
        // 如果已有路径，替换最后一个目录为新选择的文件夹
        if (currentPath.includes('\\')) {
          // Windows 格式路径
          const pathParts = currentPath.split('\\');
          pathParts[pathParts.length - 1] = folderName;
          newPath = pathParts.join('\\');
        } else {
          // Unix 格式路径
          const pathParts = currentPath.split('/');
          pathParts[pathParts.length - 1] = folderName;
          newPath = pathParts.join('/');
        }
      } else {
        // 如果没有已有路径，直接使用文件夹名称
        newPath = folderName;
      }
      // 更新对应书库类型的路径
      if (selectedType.value === 'calibre') {
        calibrePath.value = newPath;
      } else {
        talebookPath.value = newPath;
      }
      
      return;
    } catch (error) {
      console.error('📁 使用 showDirectoryPicker 失败:', error);
      // 继续使用传统的 input file 方式
    }
  }
  
  // 传统的 input file 方式作为 fallback
  if (folderInput.value) {
    folderInput.value.click();
  }
};

// 处理文件夹选择结果（传统方式）
const handleFolderSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // 从文件路径中提取文件夹路径
    const file = target.files[0];
    let folderPath = '';
    
    try {
      // 对于 webkitdirectory，我们可以通过 webkitRelativePath 获取相对路径
      // 然后结合文件名推断文件夹结构
      if (file.webkitRelativePath) {
        // webkitRelativePath 格式为 "文件夹名/文件名"
        // 提取文件夹名
        const folderName = file.webkitRelativePath.split('/')[0];
        
        // 注意：由于浏览器安全限制，我们无法获取完整的绝对路径
        // 这里我们将文件夹名显示在输入框中，用户可以根据需要补充完整路径
        folderPath = folderName;
      } else {
        // 其他情况，显示一个提示，让用户手动输入路径
        error.value = '无法获取完整文件夹路径，请手动输入';
      }
      // 更新对应书库类型的路径
      if (selectedType.value === 'calibre') {
        calibrePath.value = folderPath;
      } else {
        talebookPath.value = folderPath;
      }
    } catch (err) {
      console.error('📁 提取文件夹路径失败:', err);
      error.value = '提取文件夹路径失败，请手动输入路径';
    }
    
    // 清空文件选择，以便下次可以选择相同的文件夹
    if (folderInput.value) {
      folderInput.value.value = '';
    }
  }
};
</script>

<style scoped>
.config-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 16px;
  padding-bottom: 80px;

  /* 标签页 */
  .tabs-container {
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border-color);
  }

  .tabs {
    display: flex;
    gap: 0;
  }

  .tab-button {
    padding: 12px 24px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;
  }

  .tab-button:hover {
    color: var(--primary-color);
    background-color: var(--bg-secondary);
  }

  .tab-button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    background-color: var(--bg-secondary);
  }
}

.config-page__header {
  padding: 16px 0;
  margin-bottom: 24px;
}

.config-page__title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-page__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 模式选择按钮 */
.mode-selection {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.mode-button {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mode-button:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.mode-button.active {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

/* 默认路径选项 */
.default-path-option {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.default-path-button {
  padding: 8px 16px;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.default-path-button:hover {
  background-color: var(--primary-color);
  color: white;
}

.default-path-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 步骤指示器 */
.steps-container {
  margin-bottom: 32px;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.step.active .step-number {
  background-color: var(--primary-color);
  color: white;
}

.step.completed .step-number {
  background-color: var(--success-color);
  color: white;
}

.step-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.step.active .step-label {
  color: var(--primary-color);
  font-weight: 600;
}

.step-line {
  flex: 1;
  height: 2px;
  background-color: var(--border-color);
  margin: 0 8px;
  transition: background-color 0.3s ease;
}

.step-line.active {
  background-color: var(--success-color);
}

/* 步骤内容 */
.step-content {
  max-width: 600px;
  margin: 0 auto;
}

.step-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.step-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.step-description code {
  padding: 2px 6px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

/* 输入框 */
.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.input-with-button {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 0;
}

.input-field {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* 隐藏的文件夹选择输入 */
.folder-input {
  display: none;
}

/* 按钮 */
.button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button--primary {
  background-color: var(--primary-color);
  color: white;
}

.button--primary:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.button--secondary:hover {
  background-color: var(--bg-tertiary);
}

.button-group {
  display: flex;
  gap: 12px;
}

/* 警告框 */
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert--success {
  background-color: var(--success-color-light);
  color: var(--success-color);
}

.alert--error {
  background-color: var(--error-color-light);
  color: var(--error-color);
}

.alert__icon {
  font-size: 20px;
}

.alert__message {
  flex: 1;
  font-size: 14px;
}

.alert__close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
}

/* 信息卡片 */
.info-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  margin-right: 16px;
}

.info-value {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: right;
  word-break: break-all;
}

/* 加载动画 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 默认书库设置样式 */
.info-item--default {
  align-items: center;
}

.default-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.default-status {
  padding: 4px 12px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  font-size: 13px;
  color: var(--text-secondary);
}

.default-status.active {
  background-color: var(--warning-color-light);
  color: var(--warning-color);
  font-weight: 600;
}

.button--small {
  padding: 6px 12px;
  font-size: 13px;
}

/* 同步状态页面样式 */
.sync-status-page {
  background-color: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  margin: 0 auto;
  max-width: 1000px;
}

.sync-status-page__header {
  margin-bottom: 32px;
  text-align: center;
}

.sync-status-page__title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-status-page__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 同步卡片容器 */
.sync-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .sync-cards {
    grid-template-columns: 1fr 1fr;
  }
  
  .sync-card--overall {
    grid-column: 1 / -1;
  }
}

/* 同步卡片 */
.sync-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sync-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.sync-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sync-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 同步状态徽章 */
.sync-status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sync-status-badge.synced {
  background-color: var(--success-color-light);
  color: var(--success-color);
}

.sync-status-badge.syncing {
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  animation: pulse 1.5s infinite;
}

.sync-status-badge.failed {
  background-color: var(--error-color-light);
  color: var(--error-color);
}

.sync-status-badge.conflicted {
  background-color: var(--warning-color-light);
  color: var(--warning-color);
  animation: pulse 1.5s infinite;
}

.sync-status-badge.pending {
  background-color: var(--info-color-light);
  color: var(--info-color);
}

/* 同步信息项 */
.sync-card__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sync-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.sync-actions .button {
  flex: 1;
}

.sync-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sync-info-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-info-value {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 进度条 */
.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar__fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* 同步详情 */
.sync-details {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sync-details__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sync-details__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 同步日志 */
.sync-logs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 滚动条样式 */
.sync-logs::-webkit-scrollbar {
  width: 6px;
}

.sync-logs::-webkit-scrollbar-track {
  background-color: var(--bg-tertiary);
  border-radius: 3px;
}

.sync-logs::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.sync-logs::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}

/* 同步日志项 */
.sync-log-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  font-size: 14px;
}

.sync-log-time {
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.sync-log-message {
  color: var(--text-primary);
  flex: 1;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 767px) {
  .sync-status-page {
    padding: 12px;
  }
  
  .sync-card {
    padding: 16px;
  }
  
  .sync-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .sync-details__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .sync-log-item {
    flex-direction: column;
    gap: 4px;
  }
  
  .sync-log-time {
    font-size: 12px;
  }
}
</style>
