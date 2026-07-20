<template>
  <div class="third-party-settings">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">第三方设置</h1>
      <div class="header-right"></div>
    </div>

    <div class="content">
      <!-- Talebook 设置 -->
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">📚</div>
          <div class="section-info">
            <h3 class="section-title">Talebook</h3>
            <p class="section-desc">连接Talebook书库，实现书籍跳转</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="talebookEnabled" @change="handleTalebookToggle" />
            <span class="slider"></span>
          </label>
        </div>

        <div v-if="talebookEnabled" class="settings-form">
          <!-- 内网配置 -->
          <div class="form-group">
            <label class="form-label">内网配置</label>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label">内网网址</label>
                <input
                  type="text"
                  v-model="talebookLocalUrl"
                  placeholder="例如: 192.168.1.100"
                  class="form-input"
                  :class="{ 'form-input--error': localUrlError }"
                  @input="validateLocalUrl"
                  @blur="validateLocalUrl"
                />
                <span v-if="localUrlError" class="error-message">{{ localUrlError }}</span>
              </div>
              <div class="form-field form-field--port">
                <label class="field-label">端口</label>
                <input
                  type="text"
                  v-model="talebookLocalPort"
                  placeholder="例如: 8080"
                  class="form-input"
                />
              </div>
            </div>
            <div class="form-example">
              <span class="example-label">配置地址例如:</span>
              <span class="example-value">192.168.1.100:8080</span>
            </div>
            <div v-if="localUrlPreview" class="url-preview">
              <span class="preview-label">地址预览:</span>
              <span class="preview-value">http://{{ localUrlPreview }}</span>
            </div>
          </div>

          <!-- 外网配置 -->
          <div class="form-group">
            <label class="form-label">外网配置</label>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label">外网网址</label>
                <input
                  type="text"
                  v-model="talebookRemoteUrl"
                  placeholder="例如: talebook.example.com"
                  class="form-input"
                  @input="cleanRemoteUrl"
                />
              </div>
              <div class="form-field form-field--port">
                <label class="field-label">端口</label>
                <input
                  type="text"
                  v-model="talebookRemotePort"
                  placeholder="例如: 443"
                  class="form-input"
                />
              </div>
            </div>
            <div class="form-row form-row--toggle">
              <div class="toggle-wrapper">
                <span class="toggle-label">使用 HTTPS</span>
                <label class="switch switch--small">
                  <input type="checkbox" v-model="talebookRemoteUseHttps" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="form-example">
              <span class="example-label">配置地址例如:</span>
              <span class="example-value">talebook.example.com:443</span>
            </div>
            <div v-if="remoteUrlPreview" class="url-preview">
              <span class="preview-label">地址预览:</span>
              <span class="preview-value">{{ talebookRemoteUseHttps ? 'https' : 'http' }}://{{ remoteUrlPreview }}</span>
            </div>
          </div>

          <!-- 保存按钮 -->
          <button class="save-btn" @click="saveSettings" :disabled="isSaving || !!localUrlError">
            <svg v-if="!isSaving" viewBox="0 0 24 24">
              <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
            <span>{{ isSaving ? '保存中...' : '保存设置' }}</span>
          </button>
        </div>
      </div>

      <!-- 说明信息 -->
      <div class="info-card">
        <div class="info-icon">💡</div>
        <div class="info-content">
          <h4 class="info-title">使用说明</h4>
          <ul class="info-list">
            <li>开启Talebook功能后，可在书籍详情页跳转到Talebook查看书籍</li>
            <li>内网地址用于本地网络访问，外网地址用于远程访问</li>
            <li>内网地址格式：IP地址（如 192.168.1.100），不要添加 http/https 前缀</li>
            <li>外网地址支持域名或IP，可使用HTTPS开关切换协议</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 保存成功提示 -->
    <transition name="toast">
      <div v-if="showToast" class="toast" :class="{ 'toast--error': toastType === 'error' }">
        <svg viewBox="0 0 24 24">
          <path v-if="toastType === 'success'" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          <path v-else d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTalebookStore } from '@/stores/talebook';

const router = useRouter();
const talebookStore = useTalebookStore();

const talebookEnabled = ref(false);
const talebookLocalUrl = ref('');
const talebookLocalPort = ref('');
const talebookRemoteUrl = ref('');
const talebookRemotePort = ref('');
const talebookRemoteUseHttps = ref(false);

const isSaving = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
const localUrlError = ref('');

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipWithPortPattern = /^(\d{1,3}\.){3}\d{1,3}:\d+$/;

const validateLocalUrl = () => {
  const url = talebookLocalUrl.value.trim();
  
  if (!url) {
    localUrlError.value = '';
    return;
  }
  
  if (url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://')) {
    localUrlError.value = '请勿输入 http:// 或 https:// 前缀，只需输入IP地址';
    return;
  }
  
  if (ipWithPortPattern.test(url)) {
    localUrlError.value = '端口请单独填写在端口输入框中';
    return;
  }
  
  if (!ipPattern.test(url)) {
    localUrlError.value = '请输入有效的IP地址格式（如 192.168.1.100）';
    return;
  }
  
  const parts = url.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      localUrlError.value = 'IP地址每段数值应在 0-255 之间';
      return;
    }
  }
  
  localUrlError.value = '';
};

const cleanRemoteUrl = () => {
  let url = talebookRemoteUrl.value.trim();
  
  if (url.toLowerCase().startsWith('https://')) {
    url = url.substring(8);
    talebookRemoteUseHttps.value = true;
    talebookRemoteUrl.value = url;
  } else if (url.toLowerCase().startsWith('http://')) {
    url = url.substring(7);
    talebookRemoteUseHttps.value = false;
    talebookRemoteUrl.value = url;
  }
};

const localUrlPreview = computed(() => {
  const url = talebookLocalUrl.value.trim();
  const port = talebookLocalPort.value.trim();
  
  if (!url) return '';
  
  if (port) {
    return `${url}:${port}`;
  }
  
  return url;
});

const remoteUrlPreview = computed(() => {
  const url = talebookRemoteUrl.value.trim();
  const port = talebookRemotePort.value.trim();
  
  if (!url) return '';
  
  if (port) {
    return `${url}:${port}`;
  }
  
  return url;
});

const goBack = () => {
  router.back();
};

const handleTalebookToggle = () => {
};

const saveSettings = async () => {
  if (localUrlError.value) {
    showErrorToast(localUrlError.value);
    return;
  }
  
  isSaving.value = true;

  try {
    const settings = {
      enabled: talebookEnabled.value,
      localUrl: talebookLocalUrl.value,
      localPort: talebookLocalPort.value,
      remoteUrl: talebookRemoteUrl.value,
      remotePort: talebookRemotePort.value,
      remoteUseHttps: talebookRemoteUseHttps.value
    };

    const response = await fetch('/api/config/third-party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        talebook: settings
      })
    });

    const result = await response.json();

    if (result.success) {
      talebookStore.setSettings(settings);
      showSuccessToast('设置保存成功');
    } else {
      throw new Error(result.error || '保存失败');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showErrorToast('保存设置失败');
  } finally {
    isSaving.value = false;
  }
};

const showSuccessToast = (message: string) => {
  toastMessage.value = message;
  toastType.value = 'success';
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2000);
};

const showErrorToast = (message: string) => {
  toastMessage.value = message;
  toastType.value = 'error';
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

onMounted(async () => {
  try {
    const response = await fetch('/api/config/third-party');
    const result = await response.json();

    if (result.success && result.config?.talebook) {
      const talebook = result.config.talebook;
      talebookEnabled.value = talebook.enabled || false;
      talebookLocalUrl.value = talebook.localUrl || '';
      talebookLocalPort.value = talebook.localPort || '';
      talebookRemoteUrl.value = talebook.remoteUrl || '';
      talebookRemotePort.value = talebook.remotePort || '';
      talebookRemoteUseHttps.value = talebook.remoteUseHttps || false;
      
      talebookStore.setSettings({
        enabled: talebook.enabled || false,
        localUrl: talebook.localUrl || '',
        localPort: talebook.localPort || '',
        remoteUrl: talebook.remoteUrl || '',
        remotePort: talebook.remotePort || '',
        remoteUseHttps: talebook.remoteUseHttps || false
      });
    }
  } catch (error) {
    console.error('加载服务器配置失败:', error);
  }
});
</script>

<style scoped>
.third-party-settings {
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
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary);
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

.settings-section {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.section-icon {
  font-size: 32px;
}

.section-info {
  flex: 1;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 12px;
  color: var(--text-hint);
  margin: 0;
}

.switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.switch--small {
  width: 36px;
  height: 20px;
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

.switch--small .slider:before {
  height: 14px;
  width: 14px;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.switch--small input:checked + .slider:before {
  transform: translateX(16px);
}

.settings-form {
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-light);
}

.form-group {
  margin-top: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row--toggle {
  margin-top: 12px;
}

.form-field {
  flex: 1;
}

.form-field--port {
  flex: 0 0 100px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 6px;
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
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: var(--primary-color);
}

.form-input--error {
  border-color: #f44336;
}

.form-input--error:focus {
  border-color: #f44336;
}

.form-input::placeholder {
  color: var(--text-hint);
}

.error-message {
  display: block;
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}

.form-example {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-hint);
}

.example-label {
  margin-right: 4px;
}

.example-value {
  color: var(--primary-color);
  font-family: monospace;
}

.url-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #f5f5f5;
  border-radius: var(--radius-md);
  font-size: 13px;
}

.preview-label {
  color: var(--text-hint);
  margin-right: 8px;
}

.preview-value {
  color: var(--primary-color);
  font-family: monospace;
  word-break: break-all;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary);
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 24px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.save-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.info-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #fff8f0;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 152, 0, 0.1);
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-title {
  font-size: 14px;
  font-weight: 600;
  color: #e65100;
  margin: 0 0 8px 0;
}

.info-list {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  color: #bf360c;
  line-height: 1.8;
}

.info-list code {
  background-color: rgba(255, 152, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.toast {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #4caf50;
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast--error {
  background-color: #f44336;
}

.toast svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }

  .form-field--port {
    flex: 1;
  }
}
</style>
