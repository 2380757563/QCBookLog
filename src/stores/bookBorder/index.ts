import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import {
  BookBorderSettings,
  BookStatus,
  BorderParams,
  DEFAULT_BOOK_BORDER_SETTINGS,
  getBorderDefinition,
  createDefaultParams
} from './types';

const STORAGE_KEY = 'bookBorderSettings';

export const useBookBorderStore = defineStore('bookBorder', () => {
  const settings = ref<BookBorderSettings>(loadSettings());

  function loadSettings(): BookBorderSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          normal: parsed.normal || DEFAULT_BOOK_BORDER_SETTINGS.normal,
          pending: parsed.pending || DEFAULT_BOOK_BORDER_SETTINGS.pending,
          favorite: parsed.favorite || DEFAULT_BOOK_BORDER_SETTINGS.favorite
        };
      }
    } catch (error) {
      console.error('Failed to load book border settings:', error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_BOOK_BORDER_SETTINGS));
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (error) {
      console.error('Failed to save book border settings:', error);
    }
  }

  watch(settings, saveSettings, { deep: true });

  function selectBorder(status: BookStatus, borderId: string) {
    const definition = getBorderDefinition(borderId);
    if (!definition || definition.status !== status) {
      console.error(`Invalid border id ${borderId} for status ${status}`);
      return;
    }
    settings.value[status] = {
      selectedBorderId: borderId,
      params: createDefaultParams(borderId)
    };
  }

  function updateParams(status: BookStatus, params: Partial<BorderParams>) {
    const currentParams = settings.value[status].params;
    settings.value[status].params = {
      ...currentParams,
      ...params
    } as BorderParams;
  }

  function updateGlowSettings(
    status: BookStatus, 
    glowSettings: Partial<typeof DEFAULT_BOOK_BORDER_SETTINGS.normal.params.glow>
  ) {
    settings.value[status].params.glow = {
      ...settings.value[status].params.glow,
      ...glowSettings
    };
  }

  function resetStatus(status: BookStatus) {
    const defaultSetting = DEFAULT_BOOK_BORDER_SETTINGS[status];
    settings.value[status] = JSON.parse(JSON.stringify(defaultSetting));
  }

  function resetAll() {
    settings.value = JSON.parse(JSON.stringify(DEFAULT_BOOK_BORDER_SETTINGS));
  }

  function applyGlowColorToAll(color: string) {
    const statuses: BookStatus[] = ['normal', 'pending', 'favorite'];
    statuses.forEach(status => {
      settings.value[status].params.glow.color = color;
    });
  }

  function getBorderParams(status: BookStatus): BorderParams {
    return settings.value[status].params;
  }

  function getSelectedBorderId(status: BookStatus): string {
    return settings.value[status].selectedBorderId;
  }

  return {
    settings,
    selectBorder,
    updateParams,
    updateGlowSettings,
    resetStatus,
    resetAll,
    applyGlowColorToAll,
    getBorderParams,
    getSelectedBorderId,
    saveSettings
  };
});
