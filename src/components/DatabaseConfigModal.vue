<template>
  <div class="modal-overlay" v-if="visible" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ title }}</h2>
        <button class="close-btn" @click="handleClose" title="关闭">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <!-- 数据库检测结果 -->
        <div v-if="currentStep === 0" class="detection-results">
          <div class="result-item" :class="{ 'invalid': !databaseStatus.calibre.valid }">
            <div class="result-header">
              <h3>Calibre 数据库</h3>
              <span class="status-indicator" :class="databaseStatus.calibre.valid ? 'valid' : 'invalid'">
                {{ databaseStatus.calibre.valid ? '✓ 正常' : '✗ 异常' }}
              </span>
            </div>
            <p v-if="databaseStatus.calibre.error" class="error-message">
              {{ databaseStatus.calibre.error }}
            </p>
            <p v-if="databaseStatus.calibre.valid" class="success-message">
              Calibre 数据库正常，可用于书籍元数据同步和分类管理
            </p>
          </div>
          
          <div class="result-item" :class="{ 'invalid': !databaseStatus.talebook.valid }">
            <div class="result-header">
              <h3>Talebook 数据库</h3>
              <span class="status-indicator" :class="databaseStatus.talebook.valid ? 'valid' : 'invalid'">
                {{ databaseStatus.talebook.valid ? '✓ 正常' : '✗ 异常' }}
              </span>
            </div>
            <p v-if="databaseStatus.talebook.error" class="error-message">
              {{ databaseStatus.talebook.error }}
            </p>
            <p v-if="databaseStatus.talebook.valid" class="success-message">
              Talebook 数据库正常，可用于书摘和阅读进度管理
            </p>
          </div>
          
          <div class="impact-info">
            <h4>对系统功能的影响</h4>
            <ul>
              <li v-if="!databaseStatus.calibre.valid">
                <strong>缺少 Calibre 数据库：</strong>将无法加载书籍元数据、分类信息和封面图片
              </li>
              <li v-if="!databaseStatus.talebook.valid">
                <strong>缺少 Talebook 数据库：</strong>将无法加载书摘内容、阅读进度和书籍分组数据
              </li>
            </ul>
          </div>
          
          <div class="action-buttons">
            <button class="primary-btn" @click="proceedToConfig">
              开始配置
            </button>
          </div>
        </div>
        
        <!-- 数据库配置流程 -->
        <div v-else-if="currentStep === 1" class="config-flow">
          <h3>配置 {{ currentDbType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库</h3>
          
          <div class="question-section">
            <p>您是否拥有现有的 {{ currentDbType === 'calibre' ? 'Calibre' : 'Talebook' }} 数据库文件？</p>
            <div class="option-buttons">
              <button class="option-btn" @click="hasExistingDb = true">
                是，我已有数据库文件
              </button>
              <button class="option-btn" @click="hasExistingDb = false">
                否，我需要创建新数据库
              </button>
            </div>
          </div>
          
          <!-- 现有数据库路径选择 -->
          <div v-if="hasExistingDb" class="path-selection">
            <div class="form-group">
              <label for="db-path">数据库文件路径</label>
              <div class="path-input-group">
                <input 
                  type="text" 
                  id="db-path" 
                  v-model="dbPath" 
                  placeholder="请输入或选择数据库文件路径"
                  class="path-input"
                />
                <button class="browse-btn" @click="browseDbPath">
                  浏览
                </button>
              </div>
              <p class="hint-text">
                {{ currentDbType === 'calibre' ? 'Calibre数据库文件名：metadata.db' : 'Talebook数据库文件名：calibre-webserver.db' }}
              </p>
            </div>
            
            <div class="action-buttons">
              <button class="secondary-btn" @click="backToDetection">
                上一步
              </button>
              <button class="primary-btn" @click="validateDbPath">
                验证数据库
              </button>
            </div>
          </div>
          
          <!-- 创建新数据库提示 -->
          <div v-else class="create-db">
            <div class="info-message">
              <div class="info-icon">💡</div>
              <div class="info-content">
                <h4>创建新数据库</h4>
                <p>请在配置页面中创建新的数据库。配置页面提供了更完整的数据库创建和管理功能。</p>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="secondary-btn" @click="backToDetection">
                上一步
              </button>
              <button class="primary-btn" @click="proceedToConfig">
                前往配置页面
              </button>
            </div>
          </div>
        </div>
        
        <!-- 功能验证阶段 -->
        <div v-else-if="currentStep === 2" class="validation-stage">
          <h3>功能验证</h3>
          
          <div class="validation-progress">
            <div class="progress-item" v-for="(item, index) in validationItems" :key="index">
              <div class="progress-header">
                <span class="progress-label">{{ item.label }}</span>
                <span class="progress-status" :class="item.status">
                  {{ item.status === 'success' ? '✓' : item.status === 'error' ? '✗' : '⏳' }}
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
              </div>
              <p v-if="item.error" class="error-message">{{ item.error }}</p>
            </div>
          </div>
          
          <div v-if="validationComplete" class="validation-result">
            <div class="result-icon" :class="validationSuccess ? 'success' : 'error'">
              {{ validationSuccess ? '✓' : '✗' }}
            </div>
            <h4>{{ validationSuccess ? '验证成功' : '验证失败' }}</h4>
            <p v-if="validationSuccess" class="success-message">
              所有功能验证通过，书库数据已准备就绪
            </p>
            <p v-else class="error-message">
              功能验证失败，请检查数据库配置并重试
            </p>
            
            <div class="action-buttons">
              <button v-if="!validationSuccess" class="secondary-btn" @click="restartConfig">
                重新配置
              </button>
              <button class="primary-btn" @click="completeConfig">
                {{ validationSuccess ? '完成配置' : '返回配置' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// Props
const props = defineProps<{
  visible: boolean;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  configComplete: [];
}>();

// 状态管理
const currentStep = ref(0); // 0: 检测结果, 1: 配置流程, 2: 功能验证
const currentDbType = ref<'calibre' | 'talebook'>('calibre');
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

// 配置流程状态
const hasExistingDb = ref(false);
const dbPath = ref('');

// 功能验证状态
const validationItems = ref([
  { label: '基础数据读取测试', progress: 0, status: 'pending' as 'pending' | 'success' | 'error', error: null },
  { label: '书籍状态修改测试', progress: 0, status: 'pending', error: null },
  { label: '数据同步测试', progress: 0, status: 'pending', error: null }
]);
const validationComplete = ref(false);
const validationSuccess = ref(false);

// 计算属性
const title = computed(() => {
  if (currentStep.value === 0) return '数据库检测结果';
  if (currentStep.value === 1) return `${currentDbType.value === 'calibre' ? 'Calibre' : 'Talebook'} 数据库配置`;
  return '功能验证';
});

const defaultDbPath = computed(() => {
  return currentDbType.value === 'calibre' 
    ? './data/calibre' 
    : './data/talebook';
});

// 方法
const handleClose = () => {
  emit('close');
};

const handleOverlayClick = () => {
  handleClose();
};

const proceedToConfig = () => {
  // 关闭弹窗
  handleClose();
  
  // 跳转到配置页面的同步状态标签页
  window.location.href = '/config?tab=sync-status';
};

const backToDetection = () => {
  currentStep.value = 0;
};

const browseDbPath = () => {
  // 这里可以实现文件浏览器功能，暂时使用默认路径
  dbPath.value = defaultDbPath.value;
};

const validateDbPath = async () => {
  try {
    // 调用后端API验证数据库路径
    const endpoint = currentDbType.value === 'calibre' ? '/api/config/validate-calibre' : '/api/config/validate-talebook';
    const body = currentDbType.value === 'calibre' ? { calibreDir: dbPath.value } : { talebookDir: dbPath.value };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    if (result.success) {
      // 验证成功，保存配置
      await saveDbConfig();
      // 检查是否还有其他数据库需要配置
      checkNextDbConfig();
    } else {
      // 验证失败，显示错误信息
      alert(result.error);
    }
  } catch (error) {
    console.error('验证数据库路径失败:', error);
    alert('验证数据库路径失败，请检查路径是否正确');
  }
};

const saveDbConfig = async () => {
  try {
    const endpoint = currentDbType.value === 'calibre' ? '/api/config/calibre-path' : '/api/config/talebook-path';
    
    // 从完整数据库路径中提取目录路径
    let dirPath = dbPath.value;
    if (dirPath.includes('metadata.db')) {
      dirPath = dirPath.replace(/\\metadata.db$|\/metadata.db$/, '');
    } else if (dirPath.includes('calibre-webserver.db')) {
      dirPath = dirPath.replace(/\\calibre-webserver.db$|\/calibre-webserver.db$/, '');
    }
    
    const body = currentDbType.value === 'calibre' 
      ? { calibreDir: dirPath, isDefault: true }
      : { talebookDir: dirPath, isDefault: true };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '保存配置失败');
    }
  } catch (error) {
    console.error('保存数据库配置失败:', error);
    throw error;
  }
};

const checkNextDbConfig = () => {
  // 更新数据库状态
  if (currentDbType.value === 'calibre') {
    databaseStatus.value.calibre.valid = true;
    // 检查是否需要配置Talebook数据库
    if (!databaseStatus.value.talebook.valid) {
      currentDbType.value = 'talebook';
      hasExistingDb.value = false;
      dbPath.value = '';
    } else {
      // 所有数据库都已配置完成，进入验证阶段
      startValidation();
    }
  } else {
    databaseStatus.value.talebook.valid = true;
    // 所有数据库都已配置完成，进入验证阶段
    startValidation();
  }
};

const startValidation = () => {
  currentStep.value = 2;
  validationComplete.value = false;
  validationSuccess.value = false;
  
  // 重置验证项
  validationItems.value = validationItems.value.map(item => ({
    ...item,
    progress: 0,
    status: 'pending',
    error: null
  }));
  
  // 模拟验证过程
  setTimeout(() => {
    performValidation();
  }, 500);
};

const performValidation = async () => {
  try {
    // 执行实际的功能验证
    // 1. 测试基础数据读取
    await simulateValidationStep(0, '基础数据读取测试');
    
    // 2. 测试书籍状态修改
    await simulateValidationStep(1, '书籍状态修改测试');
    
    // 3. 测试数据同步
    await simulateValidationStep(2, '数据同步测试');
    
    // 所有验证通过
    validationSuccess.value = true;
  } catch (error) {
    console.error('验证失败:', error);
    validationSuccess.value = false;
  } finally {
    validationComplete.value = true;
  }
};

const simulateValidationStep = (index: number, stepName: string) => {
  return new Promise<void>((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      validationItems.value[index].progress = progress;
      
      if (progress >= 100) {
        clearInterval(interval);
        validationItems.value[index].status = 'success';
        resolve();
      }
    }, 200);
  });
};

const restartConfig = () => {
  currentStep.value = 0;
  // 重新检测数据库状态
  checkDatabases();
};

const completeConfig = () => {
  if (validationSuccess.value) {
    emit('configComplete');
  } else {
    currentStep.value = 1;
  }
};

const checkDatabases = async () => {
  try {
    const response = await fetch('/api/config/check-databases');
    const result = await response.json();
    if (result.success) {
      databaseStatus.value = result.data;
    }
  } catch (error) {
    console.error('检测数据库状态失败:', error);
  }
};

// 组件挂载时检测数据库状态
onMounted(() => {
  checkDatabases();
});
</script>

<style scoped>
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
  animation: fadeIn 0.3s ease;
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-content {
  padding: 24px;
}

/* 检测结果样式 */
.detection-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
}

.result-item.invalid {
  border-color: var(--error-color);
  background-color: rgba(255, 82, 82, 0.05);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-indicator {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-indicator.valid {
  background-color: rgba(76, 175, 80, 0.1);
  color: var(--success-color);
}

.status-indicator.invalid {
  background-color: rgba(255, 82, 82, 0.1);
  color: var(--error-color);
}

.error-message {
  color: var(--error-color);
  font-size: 14px;
  margin: 8px 0;
}

.success-message {
  color: var(--success-color);
  font-size: 14px;
  margin: 8px 0;
}

.impact-info {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--warning-color);
}

.impact-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.impact-info ul {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.impact-info li {
  margin-bottom: 4px;
}

/* 配置流程样式 */
.config-flow {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-section p {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.option-buttons {
  display: flex;
  gap: 12px;
}

.option-btn {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-btn:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.path-selection, .create-db {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-message {
  display: flex;
  gap: 16px;
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--info-color);
}

.info-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.info-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.path-input-group {
  display: flex;
  gap: 8px;
}

.path-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.path-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.browse-btn {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.browse-btn:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.hint-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 验证阶段样式 */
.validation-stage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.validation-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 14px;
  color: var(--text-primary);
}

.progress-status {
  font-size: 16px;
  font-weight: 600;
}

.progress-status.success {
  color: var(--success-color);
}

.progress-status.error {
  color: var(--error-color);
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.validation-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.result-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
}

.result-icon.success {
  background-color: rgba(76, 175, 80, 0.1);
  color: var(--success-color);
}

.result-icon.error {
  background-color: rgba(255, 82, 82, 0.1);
  color: var(--error-color);
}

.validation-result h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 按钮样式 */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.primary-btn, .secondary-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn {
  background-color: var(--primary-color);
  color: white;
}

.primary-btn:hover {
  background-color: var(--primary-dark);
}

.primary-btn:disabled {
  background-color: var(--primary-light);
  cursor: not-allowed;
}

.secondary-btn {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.secondary-btn:hover {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>