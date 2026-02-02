import { defineStore } from 'pinia';

export interface AppSettings {
  groupThumbnailMax: number; // 分组缩略图最大数量
}

const defaultSettings: AppSettings = {
  groupThumbnailMax: 9
};

export const useAppStore = defineStore('app', {
  state: () => ({
    settings: { ...defaultSettings } as AppSettings
  }),
  getters: {
    groupThumbnailMax: (state) => state.settings.groupThumbnailMax
  },
  actions: {
    setSettings(settings: Partial<AppSettings>) {
      this.settings = { ...this.settings, ...settings };
      this.saveSettings();
    },
    setGroupThumbnailMax(max: number) {
      this.settings.groupThumbnailMax = max;
      this.saveSettings();
    },
    saveSettings() {
      localStorage.setItem('appSettings', JSON.stringify(this.settings));
    },
    loadSettings() {
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        try {
          this.settings = { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
          console.error('加载设置失败:', e);
        }
      }
    }
  }
});
