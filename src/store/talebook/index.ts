import { ref, computed, watch } from 'vue';

interface TalebookSettings {
  enabled: boolean;
  localUrl: string;
  localPort: string;
  remoteUrl: string;
  remotePort: string;
  remoteUseHttps: boolean;
}

const STORAGE_KEY = 'thirdPartySettings';

const defaultSettings: TalebookSettings = {
  enabled: false,
  localUrl: '',
  localPort: '',
  remoteUrl: '',
  remotePort: '',
  remoteUseHttps: false
};

const settings = ref<TalebookSettings>({ ...defaultSettings });

const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.talebook) {
        settings.value = {
          enabled: parsed.talebook.enabled || false,
          localUrl: parsed.talebook.localUrl || '',
          localPort: parsed.talebook.localPort || '',
          remoteUrl: parsed.talebook.remoteUrl || '',
          remotePort: parsed.talebook.remotePort || '',
          remoteUseHttps: parsed.talebook.remoteUseHttps || false
        };
      }
    }
  } catch (error) {
    console.error('加载Talebook设置失败:', error);
  }
};

const saveSettings = (newSettings: Partial<TalebookSettings>) => {
  settings.value = { ...settings.value, ...newSettings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    talebook: settings.value
  }));
};

const resetSettings = () => {
  settings.value = { ...defaultSettings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    talebook: settings.value
  }));
};

watch(settings, (newSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    talebook: newSettings
  }));
}, { deep: true });

loadSettings();

export const useTalebookStore = () => {
  return {
    settings: computed(() => settings.value),
    enabled: computed(() => settings.value.enabled),
    localUrl: computed(() => settings.value.localUrl),
    localPort: computed(() => settings.value.localPort),
    remoteUrl: computed(() => settings.value.remoteUrl),
    remotePort: computed(() => settings.value.remotePort),
    remoteUseHttps: computed(() => settings.value.remoteUseHttps),
    setSettings: saveSettings,
    reset: resetSettings,
    reload: loadSettings
  };
};