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
      <!-- Talebook 书签 -->
      <div class="bookmark-card" :class="{ 'bookmark-card--expanded': talebookExpanded }">
        <div class="bookmark-row" @click="toggleTalebook">
          <div class="bookmark-icon">📚</div>
          <div class="bookmark-info">
            <span class="bookmark-title">Talebook</span>
            <span class="bookmark-desc">连接Talebook书库，实现书籍跳转</span>
          </div>
          <svg class="bookmark-arrow" :class="{ 'bookmark-arrow--expanded': talebookExpanded }" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </div>

        <transition name="expand">
          <div v-show="talebookExpanded" class="bookmark-content">
            <div class="settings-form">
              <!-- 启用开关 -->
              <div class="form-row form-row--toggle">
                <div class="toggle-wrapper">
                  <span class="toggle-label">启用 Talebook</span>
                  <label class="switch">
                    <input type="checkbox" v-model="talebookEnabled" @change="handleTalebookToggle" />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <template v-if="talebookEnabled">
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
              </template>

              <!-- 保存按钮 -->
              <button class="save-btn" @click="saveTalebookSettings" :disabled="isTalebookSaving || !!localUrlError">
                <svg v-if="!isTalebookSaving" viewBox="0 0 24 24">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                <span>{{ isTalebookSaving ? '保存中...' : '保存设置' }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- 书源API密钥配置 书签 -->
      <div class="bookmark-card" :class="{ 'bookmark-card--expanded': bookSourceExpanded }">
        <div class="bookmark-row" @click="toggleBookSource">
          <div class="bookmark-icon">🔑</div>
          <div class="bookmark-info">
            <span class="bookmark-title">书源API密钥配置</span>
            <span class="bookmark-desc">配置各书源的API密钥，用于查询书籍信息</span>
          </div>
          <svg class="bookmark-arrow" :class="{ 'bookmark-arrow--expanded': bookSourceExpanded }" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </div>

        <transition name="expand">
          <div v-show="bookSourceExpanded" class="bookmark-content">
            <div class="settings-form">
              <!-- 书源列表 -->
              <div
                v-for="source in bookSourceList"
                :key="source.sourceKey"
                class="book-source-item"
              >
                <div class="book-source-header">
                  <span class="book-source-name">{{ source.sourceName }}</span>
                  <span v-if="source.isRequired" class="book-source-tag">必填</span>
                </div>
                <p class="book-source-desc">{{ source.description }}</p>
                <div class="form-field">
                  <label class="field-label">API 密钥</label>
                  <input
                    type="text"
                    v-model="source.apiKey"
                    placeholder="请输入API密钥"
                    class="form-input"
                  />
                </div>
              </div>

              <!-- 保存按钮 -->
              <button class="save-btn" @click="saveBookSourceSettings" :disabled="isBookSourceSaving">
                <svg v-if="!isBookSourceSaving" viewBox="0 0 24 24">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                <span>{{ isBookSourceSaving ? '保存中...' : '保存密钥' }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- 豆瓣豆列设置 书签 -->
      <div class="bookmark-card" :class="{ 'bookmark-card--expanded': doulistExpanded }">
        <div class="bookmark-row" @click="toggleDoulist">
          <div class="bookmark-icon">📋</div>
          <div class="bookmark-info">
            <span class="bookmark-title">豆瓣豆列设置</span>
            <span class="bookmark-desc">豆列书单导入的补全模式与抓取速度</span>
          </div>
          <svg class="bookmark-arrow" :class="{ 'bookmark-arrow--expanded': doulistExpanded }" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </div>

        <transition name="expand">
          <div v-show="doulistExpanded" class="bookmark-content">
            <div class="settings-form">
              <!-- 补全模式 -->
              <div class="book-source-item">
                <div class="book-source-header">
                  <span class="book-source-name">元数据补全模式</span>
                  <span class="book-source-tag">默认不补全</span>
                </div>
                <p class="book-source-desc">控制导入豆列时是否调用外部数据源补全 ISBN、页数、定价等字段</p>
                <div class="segmented-control">
                  <button
                    v-for="opt in enrichModeOptions"
                    :key="opt.value"
                    :class="['segmented-btn', { active: doulistSettings.doulistEnrichMode === opt.value }]"
                    @click="doulistSettings.doulistEnrichMode = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <p class="setting-hint">
                  {{ doulistSettings.doulistEnrichMode === 'none'
                    ? '导入最快，豆列页抓不到 ISBN / 页数 / 定价，这些字段会留空。'
                    : '每本约 1 次请求，按 5 秒间隔 100 本约 8 分钟；建议只对勾选的部分书开启。' }}
                </p>
              </div>

              <!-- 补全来源 -->
              <div class="book-source-item">
                <div class="book-source-header">
                  <span class="book-source-name">补全数据来源</span>
                </div>
                <p class="book-source-desc">仅在上方补全模式不为「不补全」时生效</p>
                <div class="segmented-control">
                  <button
                    v-for="opt in enrichSourceOptions"
                    :key="opt.value"
                    :class="['segmented-btn', { active: doulistSettings.doulistEnrichSource === opt.value }]"
                    :disabled="doulistSettings.doulistEnrichMode === 'none'"
                    @click="doulistSettings.doulistEnrichSource = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <p class="setting-hint">{{ enrichSourceHint }}</p>
              </div>

              <!-- 抓取参数 -->
              <div class="book-source-item">
                <div class="book-source-header">
                  <span class="book-source-name">抓取参数</span>
                </div>
                <p class="book-source-desc">控制抓取节奏，间隔越小越快但越容易被豆瓣限制访问</p>
                <div class="form-row">
                  <div class="form-field">
                    <label class="field-label">请求间隔（秒）</label>
                    <input
                      type="number"
                      v-model.number="doulistSettings.doulistDelay"
                      min="2"
                      class="form-input"
                    />
                    <span class="setting-hint">最低 2 秒</span>
                  </div>
                  <div class="form-field">
                    <label class="field-label">单次最多抓取页数</label>
                    <input
                      type="number"
                      v-model.number="doulistSettings.doulistMaxPages"
                      min="0"
                      class="form-input"
                    />
                    <span class="setting-hint">0 表示全部，每页 25 本</span>
                  </div>
                </div>
              </div>

              <!-- 列表显示 -->
              <div class="book-source-item">
                <div class="book-source-header">
                  <span class="book-source-name">列表显示</span>
                </div>
                <div class="form-row form-row--toggle">
                  <div class="toggle-wrapper">
                    <span class="toggle-label">隐藏已划去（已加入书架）的书</span>
                    <label class="switch">
                      <input type="checkbox" v-model="doulistSettings.doulistHideShelved" :true-value="1" :false-value="0" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
                <p class="setting-hint">开启后，已加入书架或手动划去的书在书单列表中不再显示。</p>
              </div>

              <!-- 保存按钮 -->
              <button class="save-btn" @click="saveDoulistSettings" :disabled="isDoulistSaving">
                <svg v-if="!isDoulistSaving" viewBox="0 0 24 24">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                <span>{{ isDoulistSaving ? '保存中...' : '保存设置' }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- GitHub 同步 书签 -->
      <div class="bookmark-card" :class="{ 'bookmark-card--expanded': gitSyncExpanded }">
        <div class="bookmark-row" @click="toggleGitSync">
          <div class="bookmark-icon bookmark-icon--github">
            <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          </div>
          <div class="bookmark-info">
            <span class="bookmark-title">GitHub 同步</span>
            <span class="bookmark-desc">书评同步到 GitHub 仓库，支持版本历史</span>
          </div>
          <svg class="bookmark-arrow" :class="{ 'bookmark-arrow--expanded': gitSyncExpanded }" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </div>

        <transition name="expand">
          <div v-show="gitSyncExpanded" class="bookmark-content">
            <div class="settings-form">
              <GitSyncPanel />
            </div>
          </div>
        </transition>
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
            <li>书源API密钥用于查询书籍元数据，填写后搜索结果更丰富</li>
            <li>豆列设置控制「书单」页从豆瓣豆列导入时的补全模式与抓取速度</li>
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
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useTalebookStore } from '@/stores/talebook';
import GitSyncPanel from '@/views/GitSyncSettings/GitSyncPanel.vue';
import {
  getBookSourceSettings,
  saveBookSourceSettings as saveBookSourceSettingsApi,
  type BookSourceSetting
} from '@/api/bookSourceSettings';
import { doulistApi, type DoulistSettings } from '@/api/doulistService';

const router = useRouter();
const talebookStore = useTalebookStore();

// ===== Talebook 相关 =====
const talebookExpanded = ref(false);
const talebookEnabled = ref(false);
const talebookLocalUrl = ref('');
const talebookLocalPort = ref('');
const talebookRemoteUrl = ref('');
const talebookRemotePort = ref('');
const talebookRemoteUseHttps = ref(false);

const isTalebookSaving = ref(false);
const localUrlError = ref('');

const toggleTalebook = () => {
  talebookExpanded.value = !talebookExpanded.value;
};

const handleTalebookToggle = () => {
};

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

const saveTalebookSettings = async () => {
  if (localUrlError.value) {
    showErrorToast(localUrlError.value);
    return;
  }

  isTalebookSaving.value = true;

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
      showSuccessToast('Talebook设置保存成功');
    } else {
      throw new Error(result.error || '保存失败');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showErrorToast('保存设置失败');
  } finally {
    isTalebookSaving.value = false;
  }
};

// ===== 书源API密钥配置 相关 =====
const bookSourceExpanded = ref(false);
const bookSourceList = reactive<BookSourceSetting[]>([]);
const isBookSourceSaving = ref(false);

const toggleBookSource = () => {
  bookSourceExpanded.value = !bookSourceExpanded.value;
};

// ===== 豆瓣豆列设置 相关 =====
const doulistExpanded = ref(false);
const isDoulistSaving = ref(false);
const doulistSettings = reactive({
  doulistEnrichMode: 'none' as 'none' | 'smart' | 'full',
  doulistEnrichSource: 'dbr' as 'dbr' | 'doubanapi' | 'booksource',
  doulistDelay: 5,
  doulistMaxPages: 0,
  doulistHideShelved: 0
});

const enrichModeOptions: Array<{ value: DoulistSettings['doulistEnrichMode']; label: string }> = [
  { value: 'none', label: '不补全' },
  { value: 'smart', label: '智能补全' },
  { value: 'full', label: '完整补全' }
];

const enrichSourceOptions: Array<{ value: DoulistSettings['doulistEnrichSource']; label: string }> = [
  { value: 'dbr', label: '内置 DBR' },
  { value: 'doubanapi', label: '豆瓣 v2' },
  { value: 'booksource', label: '其他书源' }
];

const enrichSourceHint = computed(() =>
  ({
    dbr: '内置 DBR 直接解析豆瓣详情页，无需配置 API Key，开箱即用。',
    doubanapi: '豆瓣 v2 API 更快，但需要先在书源密钥中配置 apikey，失败时自动回落内置 DBR。',
    booksource: '需先取得 ISBN，再调用已配置密钥的书源做交叉校验，豆瓣字段优先。'
  })[doulistSettings.doulistEnrichSource] || ''
);

const toggleDoulist = () => {
  doulistExpanded.value = !doulistExpanded.value;
};

const loadDoulistSettings = async () => {
  try {
    const res = await doulistApi.getSettings();
    if (res?.data) {
      doulistSettings.doulistEnrichMode = res.data.doulistEnrichMode;
      doulistSettings.doulistEnrichSource = res.data.doulistEnrichSource;
      doulistSettings.doulistDelay = res.data.doulistDelay;
      doulistSettings.doulistMaxPages = res.data.doulistMaxPages;
      doulistSettings.doulistHideShelved = res.data.doulistHideShelved || 0;
    }
  } catch (error) {
    console.error('加载豆列设置失败:', error);
  }
};

const saveDoulistSettings = async () => {
  isDoulistSaving.value = true;
  try {
    await doulistApi.saveSettings({ ...doulistSettings });
    showSuccessToast('豆列设置保存成功');
  } catch (error) {
    console.error('保存豆列设置失败:', error);
    showErrorToast('保存失败，请重试');
  } finally {
    isDoulistSaving.value = false;
  }
};

// ===== GitHub 同步 相关 =====
const gitSyncExpanded = ref(false);

const toggleGitSync = () => {
  gitSyncExpanded.value = !gitSyncExpanded.value;
};

const loadBookSourceSettings = async () => {
  try {
    const data = await getBookSourceSettings();
    // 清空并重新填充响应式数组
    bookSourceList.splice(0, bookSourceList.length, ...data);
  } catch (error) {
    console.error('加载书源设置失败:', error);
  }
};

const saveBookSourceSettings = async () => {
  isBookSourceSaving.value = true;

  try {
    const sources = bookSourceList.map(s => ({
      sourceKey: s.sourceKey,
      apiKey: s.apiKey
    }));

    await saveBookSourceSettingsApi(sources);
    showSuccessToast('书源API密钥保存成功');
  } catch (error) {
    console.error('保存书源设置失败:', error);
    showErrorToast('保存失败，请重试');
  } finally {
    isBookSourceSaving.value = false;
  }
};

// ===== 通用 =====
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

const goBack = () => {
  router.back();
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
  // 加载 Talebook 配置
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

  // 加载书源配置
  await loadBookSourceSettings();
  // 加载豆列设置
  await loadDoulistSettings();
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
  transition: background-color 0.2s ease;
  padding: 0;
}

.back-btn:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
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

/* ===== 书签卡片样式 ===== */
.bookmark-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
  transition: box-shadow 0.2s ease;
}

.bookmark-card--expanded {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.bookmark-row {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.bookmark-row:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.03));
}

.bookmark-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.bookmark-icon--github {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-icon--github svg {
  width: 30px;
  height: 30px;
  fill: #24292f;
}

.bookmark-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bookmark-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.bookmark-desc {
  font-size: 12px;
  color: var(--text-hint);
}

.bookmark-arrow {
  width: 20px;
  height: 20px;
  fill: var(--text-hint);
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.bookmark-arrow--expanded {
  transform: rotate(180deg);
}

.bookmark-content {
  border-top: 1px solid var(--border-light);
  overflow: hidden;
}

/* ===== 展开/收起动画 ===== */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 1000px;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ===== 表单样式 ===== */
.settings-form {
  padding: 0 16px 16px;
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
  box-sizing: border-box;
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

/* ===== 开关样式 ===== */
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

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary);
}

/* ===== 书源配置项 ===== */
.book-source-item {
  margin-top: 16px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: var(--radius-md);
}

.book-source-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.book-source-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.book-source-tag {
  font-size: 11px;
  padding: 2px 8px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-weight: 500;
}

.book-source-desc {
  font-size: 12px;
  color: var(--text-hint);
  margin: 0 0 10px 0;
  line-height: 1.5;
}

/* ===== 豆列设置：分段控件 ===== */
.segmented-control {
  display: flex;
  gap: 4px;
  padding: 4px;
  background-color: var(--bg-tertiary, #f1f5f9);
  border-radius: 8px;
  margin-top: 10px;
}

.segmented-btn {
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.segmented-btn.active {
  background-color: var(--bg-primary, #fff);
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.segmented-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-hint {
  display: block;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-hint);
  line-height: 1.6;
}

/* ===== 保存按钮 ===== */
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

/* ===== 说明卡片 ===== */
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

/* ===== Toast ===== */
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
