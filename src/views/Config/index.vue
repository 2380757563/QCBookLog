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

      <div class="input-group">
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

      <button
        class="button button--primary"
        :disabled="(selectedType === 'calibre' ? !calibrePath : !talebookPath) || loading"
        @click="validateDb"
      >
        {{ loading ? '验证中...' : '验证书库' }}
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

    <!-- 步骤 2: 完成 -->
    <div v-if="currentStep === 2" class="step-content">
      <h2 class="step-title">配置成功！</h2>

      <div class="alert alert--success">
        <span class="alert__icon">✅</span>
        <span class="alert__message">应用和 {{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 现在共享同一个数据库</span>
      </div>

      <div class="info-card">
        <div class="info-item">
          <span class="info-label">{{ selectedType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库:</span>
          <span class="info-value">{{ currentPath }}</span>
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
          <button class="button button--secondary" @click="refreshSyncStatus">
            🔄 刷新状态
          </button>
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

    <!-- 二次询问弹窗：是否存在数据库 -->
    <div v-if="showDatabaseQuery" class="dialog-overlay">
      <div class="dialog dialog--query" @click.stop>
        <div class="dialog-header">
          <h3>配置 {{ databaseQueryType === 'calibre' ? 'Calibre' : 'Talebook' }} 书库</h3>
          <button class="dialog-close" @click="showDatabaseQuery = false">✕</button>
        </div>
        <div class="dialog-body">
          <div class="query-content">
            <div class="query-icon">❓</div>
            <h4>您是否已存在 {{ databaseQueryType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库？</h4>
            <p>请选择您的情况，系统将根据您的选择引导您完成配置。</p>
          </div>
          
          <div class="query-buttons">
            <button
              class="button button--primary"
              @click="handleDatabaseQueryResult(true)"
            >
              ✅ 已存在数据库
            </button>
            <button
              class="button button--secondary"
              @click="handleDatabaseQueryResult(false)"
            >
              ❌ 不存在数据库
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建数据库选项弹窗 -->
    <div v-if="showCreateDatabaseOptions" class="dialog-overlay">
      <div class="dialog dialog--create" @click.stop>
        <div class="dialog-header">
          <h3>创建新数据库</h3>
          <button class="dialog-close" @click="showCreateDatabaseOptions = false">✕</button>
        </div>
        <div class="dialog-body">
          <div class="create-content">
            <div class="create-icon">📦</div>
            <h4>{{ databaseQueryType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库不存在</h4>
            <p>应用未检测到有效的 {{ databaseQueryType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库。</p>
            <p>您可以选择让应用自动创建一个新的 {{ databaseQueryType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库，或者手动配置现有数据库路径。</p>
          </div>

          <div class="option-buttons">
            <button
              class="button button--primary option-button"
              :disabled="creatingDatabase"
              @click="createNewDatabase"
            >
              <span v-if="creatingDatabase" class="spinner-small"></span>
              <span v-else>📁 自动创建新数据库</span>
              <span v-if="!creatingDatabase" class="option-description">应用将在指定位置创建新的数据库文件</span>
            </button>
            <button
              class="button button--secondary option-button"
              @click="manualConfigDatabase"
            >
              ⚙️ 手动配置数据库路径
              <span class="option-description">输入或选择包含现有数据库的目录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/store/book';

const router = useRouter();
const bookStore = useBookStore();

const currentStep = ref(0);
const selectedType = ref<'sync-status' | 'calibre' | 'talebook'>('sync-status');
const calibrePath = ref('');
const talebookPath = ref('');
const validation = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const currentPath = ref('');
const initialLoading = ref(true);
const isDefault = ref(false);

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
      
      // 检查syncData.data是否存在
      if (syncData.data) {
        const detailedData = syncData.data;
        
        // 更新总体同步状态
        if (detailedData.conflicted > 0) {
          overallSyncStatus.value = 'conflicted';
          overallSyncStatusText.value = '存在冲突';
        } else if (detailedData.onlyInCalibre.length > 0 || detailedData.onlyInTalebook.length > 0) {
          overallSyncStatus.value = 'pending';
          overallSyncStatusText.value = '需要同步';
        } else {
          overallSyncStatus.value = 'synced';
          overallSyncStatusText.value = '已同步';
        }
        
        // 更新同步时间和结果
        lastSyncTime.value = new Date().toLocaleString();
        lastSyncResult.value = syncData.status === 'success' ? '成功' : '失败';
        
        // 更新Calibre到Talebook同步状态
        calibreToTalebookSyncedBooks.value = detailedData.calibre?.inBoth || 0;
        calibreToTalebookTotalBooks.value = detailedData.calibre?.total || 0;
        calibreToTalebookProgress.value = detailedData.calibre?.total > 0 ? Math.round((detailedData.calibre.inBoth / detailedData.calibre.total) * 100) : 100;
        
        // 更新Talebook到Calibre同步状态
        talebookToCalibreSyncedBooks.value = detailedData.talebook?.inBoth || 0;
        talebookToCalibreTotalBooks.value = detailedData.talebook?.total || 0;
        talebookToCalibreProgress.value = detailedData.talebook?.total > 0 ? Math.round((detailedData.talebook.inBoth / detailedData.talebook.total) * 100) : 100;
        
        // 更新同步日志
        syncLogs.value.unshift({
          time: new Date().toLocaleString(),
          message: `同步状态更新: Calibre ${detailedData.calibre?.total || 0} 本，Talebook ${detailedData.talebook?.total || 0} 本，冲突 ${detailedData.conflicted || 0} 本`
        });
        
        // 限制日志数量
        if (syncLogs.value.length > 20) {
          syncLogs.value = syncLogs.value.slice(0, 20);
        }
      } else {
        // 没有详细数据，记录日志
        syncLogs.value.unshift({
          time: new Date().toLocaleString(),
          message: '获取到的同步状态数据不完整' + JSON.stringify(syncData)
        });
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
  console.log('刷新同步状态...');
  await fetchSyncStatus();
};

// 组件挂载时获取同步状态
onMounted(() => {
  if (selectedType.value === 'sync-status') {
    fetchSyncStatus();
  }
});

// 组件激活时获取同步状态
onActivated(() => {
  if (selectedType.value === 'sync-status') {
    fetchSyncStatus();
  }
});

// 二次询问相关状态
const showDatabaseQuery = ref(false);
const showCreateDatabaseOptions = ref(false);
const databaseQueryType = ref<'calibre' | 'talebook'>('talebook');
const creatingDatabase = ref(false);

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

onMounted(() => {
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
  
  // 隐藏二次询问和创建选项
  showDatabaseQuery.value = false;
  showCreateDatabaseOptions.value = false;
  
  // 如果是同步状态页面，直接返回
  if (type === 'sync-status') {
    return;
  }
  
  // 检查当前类型的数据库是否已经配置
  const isConfigured = type === 'calibre' ? calibrePath.value : talebookPath.value;
  
  if (type === 'calibre') {
    if (isConfigured) {
      // 如果calibre已经配置，直接显示完成步骤
      currentStep.value = 2;
    } else {
      // 否则显示选择书库步骤
      console.log('🔄 切换到 Calibre 配置，显示选择书库步骤');
      currentStep.value = 0;
    }
  } else {
    if (isConfigured) {
      // 如果talebook已经配置，直接显示完成步骤
      console.log('🔄 Talebook 已配置，直接显示完成步骤');
      currentStep.value = 2;
    } else {
      // 未配置时，显示询问提示
      console.log('🔄 切换到 Talebook 配置，显示询问提示');
      databaseQueryType.value = 'talebook';
      showDatabaseQuery.value = true;
      // 不设置currentStep，让询问流程决定后续步骤
    }
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
    
    console.log('📋 获取到的Calibre配置数据:', calibreData);
    console.log('📋 获取到的Talebook配置数据:', talebookData);
    
    // 总是初始化所有路径变量，无论哪个数据库存在
    if (calibreData.exists) {
      calibrePath.value = calibreData.calibreDbPath.replace(/\\metadata.db|\/metadata.db/g, '');
    }
    if (talebookData.exists) {
      talebookPath.value = talebookData.talebookDbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
    }
    
    // 设置当前数据库路径和类型
    if (calibreData.exists && !talebookData.exists) {
      // 只有calibre存在
      currentPath.value = calibreData.calibreDbPath;
      isDefault.value = calibreData.isDefault || false;
      selectedType.value = 'calibre';
      currentStep.value = 2;
    } else if (talebookData.exists) {
      // 只有talebook存在或两者都存在，优先使用talebook
      currentPath.value = talebookData.talebookDbPath;
      isDefault.value = talebookData.isDefault || false;
      selectedType.value = 'talebook';
      currentStep.value = 2;
    } else {
      // 两个数据库都未配置
      currentStep.value = 0;
    }
    
    // 检测数据库状态
    await checkDatabaseStatus();
  } catch (err) {
    console.error('获取配置失败:', err);
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
      currentStep.value = 1;
    } else {
      error.value = `验证失败: ${data.error || '未知错误'}`;
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('验证数据库失败:', err);
    error.value = `验证失败: ${errorMessage}`;
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  loading.value = true;
  error.value = null;

  try {
    console.log('💾 保存配置...');
    console.log('💾 选中的书库类型:', selectedType.value);
    console.log('💾 是否设为默认:', isDefault.value);

    let endpoint = '/api/config/calibre-path';
    let body = {};
    const selectedPath = selectedType.value === 'calibre' ? calibrePath.value : talebookPath.value;

    if (selectedType.value === 'calibre') {
      console.log('💾 Calibre 书库路径:', selectedPath);
      body = { calibreDir: selectedPath, isDefault: isDefault.value };
    } else {
      console.log('💾 Talebook 书库路径:', selectedPath);
      endpoint = '/api/config/talebook-path';
      body = { talebookDir: selectedPath, isDefault: isDefault.value };
    }

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
    console.log('💾 保存配置响应:', data);

    if (data.success) {
      // 立即清空书籍缓存，确保新数据库的数据能够正确加载
      console.log('🔄 清空书籍缓存...');
      bookStore.setBooks([]);

      currentStep.value = 2;
      currentPath.value = data.calibreDbPath || data.talebookDbPath;
      isDefault.value = data.isDefault || false;
      
      // 更新本地路径变量，实现持久化存储
      if (selectedType.value === 'calibre') {
        calibrePath.value = data.calibreDbPath.replace(/\\metadata.db|\/metadata.db/g, '');
      } else {
        talebookPath.value = data.talebookDbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
      }
      
      console.log('✅ 配置保存成功，数据库路径:', currentPath.value);
      console.log('✅ 书籍数量:', data.stats?.bookCount);
      console.log('✅ 是否为默认书库:', data.isDefault);
      console.log('✅ 书籍缓存已清空');
      console.log('✅ 本地路径变量已更新，实现持久化存储');
    } else {
      console.error('❌ 配置保存失败:', data.error);
      error.value = `保存失败: ${data.error || '未知错误'}`;
    }
  } catch (err) {
    const errorMessage = (err as Error).message;
    console.error('❌ 保存配置异常:', err);
    error.value = `保存失败: ${errorMessage}`;
  } finally {
    loading.value = false;
  }
};

const goHome = () => {
  console.log('🏠 返回首页...');
  console.log('🏠 当前配置的数据库:', currentPath.value);

  // 清空书籍缓存，强制重新加载
  console.log('🔄 清空书籍缓存...');
  bookStore.setBooks([]);

  // 使用 window.location.href 强制刷新页面，确保 onMounted 重新执行
  // 这会绕过 keep-alive 缓存，重新加载所有数据
  console.log('🔄 强制刷新页面...');
  window.location.href = '/';
};

const reconfigure = () => {
  console.log('🔄 重新配置数据库...');
  currentStep.value = 0;
  calibrePath.value = '';
  talebookPath.value = '';
  validation.value = null;
  error.value = null;
};

const toggleDefault = async () => {
  try {
    const newValue = !isDefault.value;
    console.log('🔄 切换默认书库状态:', newValue);

    const response = await fetch('/api/config/set-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calibreDbPath: currentPath.value,
        isDefault: newValue
      })
    });

    const data = await response.json();
    console.log('🔄 切换默认书库响应:', data);

    if (data.success) {
      isDefault.value = newValue;
      console.log(`✅ ${data.message}`);
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
  console.log('📁 打开文件夹选择对话框');
  
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
      
      console.log('📁 选择的文件夹名称:', folderName);
      console.log('📁 建议的文件夹路径:', newPath);
      
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
      
      console.log('📁 选择的文件夹名称:', folderPath);
      
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

// 处理数据库询问结果
const handleDatabaseQueryResult = (hasDatabase: boolean) => {
  showDatabaseQuery.value = false;
  
  if (hasDatabase) {
    // 用户确认已存在数据库，跳转到文件夹选择界面
    console.log('👤 用户确认已存在Talebook数据库，跳转到文件夹选择界面');
    selectedType.value = databaseQueryType.value;
    currentStep.value = 0;
  } else {
    // 用户确认不存在数据库，引导进入新建数据库流程
    console.log('👤 用户确认不存在Talebook数据库，引导进入新建数据库流程');
    showCreateDatabaseOptions.value = true;
  }
};

// 自动创建新数据库
const createNewDatabase = async () => {
  try {
    creatingDatabase.value = true;
    console.log('📦 开始创建新数据库...');
    
    // 发送创建数据库请求
    const endpoint = `/api/config/create-database`;
    const body = {
      type: databaseQueryType.value,
      path: selectedType.value === 'calibre' ? calibrePath.value : talebookPath.value
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 数据库创建成功:', data.message);
      // 隐藏创建选项
      showCreateDatabaseOptions.value = false;
      // 显示成功提示
      currentStep.value = 0;
      // 更新当前路径
      if (databaseQueryType.value === 'calibre') {
        calibrePath.value = data.path;
      } else {
        talebookPath.value = data.path;
      }
    } else {
      console.error('❌ 数据库创建失败:', data.error);
      error.value = data.error;
    }
  } catch (err) {
    console.error('❌ 创建数据库异常:', err);
    error.value = (err as Error).message;
  } finally {
    creatingDatabase.value = false;
  }
};

// 手动配置数据库
const manualConfigDatabase = () => {
  showCreateDatabaseOptions.value = false;
  // 显示配置页面
  currentStep.value = 0;
  selectedType.value = databaseQueryType.value;
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

/* 弹窗样式 */
.dialog-overlay {
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

.dialog {
  background-color: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  padding: 0;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.dialog-body {
  padding: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* 询问弹窗样式 */
.dialog--query .dialog-body {
  text-align: center;
}

.query-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.query-icon {
  font-size: 48px;
  animation: pulse 1.5s infinite;
}

.query-content h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.query-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.query-status {
  font-size: 16px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  margin-top: 8px;
}

/* 查询按钮样式 */
.query-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 300px;
  margin: 0 auto;
}

.query-buttons .button {
  padding: 14px 24px;
  font-size: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.query-buttons .button--primary {
  background-color: var(--primary-color);
  color: white;
}

.query-buttons .button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

/* 创建数据库弹窗样式 */
.create-content {
  text-align: center;
  margin-bottom: 32px;
}

.create-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.create-content h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.create-content p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.option-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  text-align: left;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.option-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.option-description {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
  margin-top: 4px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
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
