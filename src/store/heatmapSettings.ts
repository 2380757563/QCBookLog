import { defineStore } from 'pinia';

interface HeatmapSettings {
  wheelSensitivity: number;
  touchSensitivity: number;
  touchFriction: number;
  touchMinVelocity: number;
  /** 书签标签显示范围：近3年/近5年/近10年/全部 */
  bookmarkRange: '3y' | '5y' | '10y' | 'all';
  /** 当前选中的年份（书签高亮） */
  selectedYear: number | null;
  /** 热力图起始年份（用户可自定义最早显示年份） */
  startYear: number;
}

const STORAGE_KEY = 'heatmapSettings';

/**
 * 起始年份合法下界：2000（去除 2018 硬编码限制）
 * 实际可设置范围：2000 ~ 当前年
 */
const HEATMAP_MIN_START_YEAR = 2000;

/**
 * 性能警告阈值：超过该年份跨度会显著影响渲染性能
 * 用于在 UI 提示用户"起始年份过远可能导致卡顿"
 */
const HEATMAP_PERFORMANCE_WARN_YEARS = 15;

const currentYear = new Date().getFullYear();

const defaultSettings: HeatmapSettings = {
  wheelSensitivity: 0.35,
  touchSensitivity: 3.5,
  touchFriction: 0.88,
  touchMinVelocity: 0.6,
  bookmarkRange: '5y',
  selectedYear: null,
  startYear: currentYear - 2
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
    },

    /**
     * 当前起始年份到当前年的总跨度（用于性能提示）
     */
    startYearSpan: (state) => {
      return currentYear - state.startYear + 1;
    },

    /**
     * 是否需要显示性能警告：跨度 > 15 年时提示用户可能卡顿
     */
    shouldWarnPerformance: (state) => {
      return (currentYear - state.startYear + 1) > HEATMAP_PERFORMANCE_WARN_YEARS;
    },

    /** 起始年份可设置的最小值 */
    minStartYear: () => HEATMAP_MIN_START_YEAR,

    /** 起始年份可设置的最大值（当前年） */
    maxStartYear: () => currentYear
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
      this.bookmarkRange = defaultSettings.bookmarkRange;
      this.selectedYear = defaultSettings.selectedYear;
      this.startYear = defaultSettings.startYear;
      this.saveToStorage();
    },
    
    setBookmarkRange(range: '3y' | '5y' | '10y' | 'all') {
      this.bookmarkRange = range;
      this.saveToStorage();
    },
    
    setSelectedYear(year: number | null) {
      this.selectedYear = year;
      this.saveToStorage();
    },

    setStartYear(year: number) {
      /**
       * 起始年份范围：2000 ~ 当前年
       * 移除原 2018 硬编码下界
       * 返回值：保存后是否触发性能警告（跨度 > 15 年）
       *
       * NaN 防护：若传入非数字（如空值解析结果），
       * 不修改 store，保持上一次的合法值。
       */
      if (!Number.isFinite(year)) {
        return this.shouldWarnPerformance;
      }
      const clamped = Math.max(HEATMAP_MIN_START_YEAR, Math.min(year, currentYear));
      this.startYear = clamped;
      this.saveToStorage();
      return this.shouldWarnPerformance;
    },
    
    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          wheelSensitivity: this.wheelSensitivity,
          touchSensitivity: this.touchSensitivity,
          touchFriction: this.touchFriction,
          touchMinVelocity: this.touchMinVelocity,
          bookmarkRange: this.bookmarkRange,
          selectedYear: this.selectedYear,
          startYear: this.startYear
        }));
      } catch (e) {
        console.error('保存热力图设置失败:', e);
      }
    }
  }
});
