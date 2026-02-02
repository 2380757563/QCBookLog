import { defineStore } from 'pinia';

interface HeatmapSettings {
  wheelSensitivity: number;
  touchSensitivity: number;
  touchFriction: number;
  touchMinVelocity: number;
}

const STORAGE_KEY = 'heatmapSettings';

const defaultSettings: HeatmapSettings = {
  wheelSensitivity: 0.35,
  touchSensitivity: 3.5,
  touchFriction: 0.88,
  touchMinVelocity: 0.6
};

const loadFromStorage = (): HeatmapSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error('加载热力图设置失败:', e);
  }
  return { ...defaultSettings };
};

export const useHeatmapSettingsStore = defineStore('heatmapSettings', {
  state: (): HeatmapSettings => ({
    ...loadFromStorage()
  }),
  
  getters: {
    wheelSensitivityLabel: (state) => {
      if (state.wheelSensitivity <= 0.2) return '极低';
      if (state.wheelSensitivity <= 0.35) return '低';
      if (state.wheelSensitivity <= 0.53) return '中';
      return '高';
    },
    
    touchSensitivityLabel: (state) => {
      if (state.touchSensitivity <= 2.0) return '极低';
      if (state.touchSensitivity <= 3.5) return '低';
      if (state.touchSensitivity <= 7.11) return '中';
      return '高';
    }
  },
  
  actions: {
    setWheelSensitivity(value: number) {
      this.wheelSensitivity = value;
      this.saveToStorage();
    },
    
    setTouchSensitivity(value: number) {
      this.touchSensitivity = value;
      this.saveToStorage();
    },
    
    setTouchFriction(value: number) {
      this.touchFriction = value;
      this.saveToStorage();
    },
    
    setTouchMinVelocity(value: number) {
      this.touchMinVelocity = value;
      this.saveToStorage();
    },
    
    setPreset(level: 'veryLow' | 'low' | 'medium' | 'high') {
      switch (level) {
        case 'veryLow':
          this.wheelSensitivity = 0.1;
          this.touchSensitivity = 1.0;
          this.touchFriction = 0.82;
          this.touchMinVelocity = 1.0;
          break;
        case 'low':
          this.wheelSensitivity = 0.2;
          this.touchSensitivity = 2.0;
          this.touchFriction = 0.85;
          this.touchMinVelocity = 0.8;
          break;
        case 'medium':
          this.wheelSensitivity = 0.35;
          this.touchSensitivity = 3.5;
          this.touchFriction = 0.88;
          this.touchMinVelocity = 0.6;
          break;
        case 'high':
          this.wheelSensitivity = 0.53;
          this.touchSensitivity = 7.11;
          this.touchFriction = 0.92;
          this.touchMinVelocity = 0.45;
          break;
      }
      this.saveToStorage();
    },
    
    resetToDefaults() {
      this.wheelSensitivity = defaultSettings.wheelSensitivity;
      this.touchSensitivity = defaultSettings.touchSensitivity;
      this.touchFriction = defaultSettings.touchFriction;
      this.touchMinVelocity = defaultSettings.touchMinVelocity;
      this.saveToStorage();
    },
    
    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          wheelSensitivity: this.wheelSensitivity,
          touchSensitivity: this.touchSensitivity,
          touchFriction: this.touchFriction,
          touchMinVelocity: this.touchMinVelocity
        }));
      } catch (e) {
        console.error('保存热力图设置失败:', e);
      }
    }
  }
});
