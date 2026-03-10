import axios from 'axios';

const API_BASE = '/api/user-settings';

export interface UserSettings {
  [key: string]: any;
}

export interface SettingValue {
  key: string;
  value: any;
}

class UserSettingsService {
  private cache: Map<string, any> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async getSettings(priority?: 'high' | 'medium' | 'low', userId?: number): Promise<UserSettings> {
    try {
      const params: any = {};
      if (priority) params.priority = priority;
      if (userId) params.userId = userId;

      const response = await axios.get(API_BASE, { params });
      const settings = response.data.data || {};

      this.cacheSettings(settings);

      return settings;
    } catch (error) {
      console.error('获取用户设置失败:', error);
      return this.getFromLocalStorage(priority);
    }
  }

  async getSetting(key: string, userId?: number): Promise<any> {
    try {
      const params: any = {};
      if (userId) params.userId = userId;

      const response = await axios.get(`${API_BASE}/${key}`, { params });
      const value = response.data.data?.value;

      this.cache.set(key, value);

      return value;
    } catch (error) {
      console.error(`获取用户设置 ${key} 失败:`, error);
      return this.getSingleSettingFromLocalStorage(key);
    }
  }

  async saveSetting(key: string, value: any, priority?: 'high' | 'medium' | 'low', userId?: number): Promise<boolean> {
    try {
      const data: any = { value };
      if (priority) data.priority = priority;
      if (userId) data.userId = userId;

      await axios.post(`${API_BASE}/${key}`, data);

      this.cache.set(key, value);
      this.saveToLocalStorage(key, value);

      return true;
    } catch (error) {
      console.error(`保存用户设置 ${key} 失败:`, error);
      this.saveToLocalStorage(key, value);
      return false;
    }
  }

  async saveSettings(settings: UserSettings, priority?: 'high' | 'medium' | 'low', userId?: number): Promise<boolean> {
    try {
      const data: any = { settings };
      if (priority) data.priority = priority;
      if (userId) data.userId = userId;

      await axios.post(API_BASE, data);

      this.cacheSettings(settings);
      this.saveToLocalStorage(settings);

      return true;
    } catch (error) {
      console.error('批量保存用户设置失败:', error);
      this.saveToLocalStorage(settings);
      return false;
    }
  }

  async deleteSetting(key: string, userId?: number): Promise<boolean> {
    try {
      const params: any = {};
      if (userId) params.userId = userId;

      await axios.delete(`${API_BASE}/${key}`, { params });

      this.cache.delete(key);
      this.removeFromLocalStorage(key);

      return true;
    } catch (error) {
      console.error(`删除用户设置 ${key} 失败:`, error);
      this.removeFromLocalStorage(key);
      return false;
    }
  }

  async deleteSettings(priority?: 'high' | 'medium' | 'low', userId?: number): Promise<boolean> {
    try {
      const params: any = {};
      if (priority) params.priority = priority;
      if (userId) params.userId = userId;

      await axios.delete(API_BASE, { params });

      this.clearCache();
      this.clearLocalStorage(priority);

      return true;
    } catch (error) {
      console.error('批量删除用户设置失败:', error);
      this.clearLocalStorage(priority);
      return false;
    }
  }

  private cacheSettings(settings: UserSettings): void {
    Object.entries(settings).forEach(([key, value]) => {
      this.cache.set(key, value);
    });
  }

  private getFromLocalStorage(priority?: 'high' | 'medium' | 'low'): UserSettings {
    try {
      const saved = localStorage.getItem('userSettings');
      if (!saved) return {};

      const settings = JSON.parse(saved);
      
      if (priority) {
        const filtered: UserSettings = {};
        Object.entries(settings).forEach(([key, value]) => {
          const settingPriority = this.getSettingPriority(key);
          if (settingPriority === priority) {
            filtered[key] = value;
          }
        });
        return filtered;
      }

      return settings;
    } catch (error) {
      console.error('从localStorage加载设置失败:', error);
      return {};
    }
  }

  private getSingleSettingFromLocalStorage(key: string): any {
    try {
      const saved = localStorage.getItem('userSettings');
      if (!saved) return null;

      const settings = JSON.parse(saved);
      return settings[key];
    } catch (error) {
      console.error(`从localStorage加载设置 ${key} 失败:`, error);
      return null;
    }
  }

  private saveToLocalStorage(settings: UserSettings | string, value?: any): void {
    try {
      let currentSettings: UserSettings = {};

      if (typeof settings === 'string') {
        currentSettings = this.getFromLocalStorage(undefined) || {};
        currentSettings[settings] = value;
      } else {
        currentSettings = settings;
      }

      localStorage.setItem('userSettings', JSON.stringify(currentSettings));
    } catch (error) {
      console.error('保存设置到localStorage失败:', error);
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      const saved = localStorage.getItem('userSettings');
      if (!saved) return;

      const settings = JSON.parse(saved);
      delete settings[key];

      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error(`从localStorage删除设置 ${key} 失败:`, error);
    }
  }

  private clearLocalStorage(priority?: 'high' | 'medium' | 'low'): void {
    try {
      const saved = localStorage.getItem('userSettings');
      if (!saved) return;

      const settings = JSON.parse(saved);

      if (priority) {
        Object.keys(settings).forEach(key => {
          const settingPriority = this.getSettingPriority(key);
          if (settingPriority === priority) {
            delete settings[key];
          }
        });
      } else {
        Object.keys(settings).forEach(key => {
          delete settings[key];
        });
      }

      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('清除localStorage设置失败:', error);
    }
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private getSettingPriority(key: string): 'high' | 'medium' | 'low' {
    const highPriorityKeys = [
      'bookmarkSettings',
      'thirdPartySettings',
      'currentReaderId',
      'defaultReaderId',
      'appSettings'
    ];

    const mediumPriorityKeys = [
      'bookBorderSettings',
      'bindingBorderSettings',
      'progressDisplayMode'
    ];

    if (highPriorityKeys.includes(key)) {
      return 'high';
    } else if (mediumPriorityKeys.includes(key)) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

export default new UserSettingsService();
