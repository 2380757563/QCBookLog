import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import {
  BindingBorderSettings,
  DEFAULT_BINDING_BORDER_SETTINGS,
  EbookBorderParams,
  PaperbackBorderParams,
  HardcoverBorderParams,
  SpecialBorderParams
} from './types';

const STORAGE_KEY = 'bindingBorderSettings';

export const useBindingBorderStore = defineStore('bindingBorder', () => {
  const settings = ref<BindingBorderSettings>(loadSettings());

  function loadSettings(): BindingBorderSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ebook: { ...DEFAULT_BINDING_BORDER_SETTINGS.ebook, ...parsed.ebook },
          paperback: { ...DEFAULT_BINDING_BORDER_SETTINGS.paperback, ...parsed.paperback },
          hardcover: { ...DEFAULT_BINDING_BORDER_SETTINGS.hardcover, ...parsed.hardcover },
          special: { ...DEFAULT_BINDING_BORDER_SETTINGS.special, ...parsed.special }
        };
      }
    } catch (error) {
      console.error('Failed to load binding border settings:', error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS));
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (error) {
      console.error('Failed to save binding border settings:', error);
    }
  }

  watch(settings, saveSettings, { deep: true });

  function updateEbookParams(params: Partial<EbookBorderParams>) {
    settings.value.ebook = {
      ...settings.value.ebook,
      ...params
    };
  }

  function updatePaperbackParams(params: Partial<PaperbackBorderParams>) {
    settings.value.paperback = {
      ...settings.value.paperback,
      ...params
    };
  }

  function updateHardcoverParams(params: Partial<HardcoverBorderParams>) {
    settings.value.hardcover = {
      ...settings.value.hardcover,
      ...params
    };
  }

  function updateSpecialParams(params: Partial<SpecialBorderParams>) {
    settings.value.special = {
      ...settings.value.special,
      ...params
    };
  }

  function resetEbook() {
    settings.value.ebook = JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS.ebook));
  }

  function resetPaperback() {
    settings.value.paperback = JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS.paperback));
  }

  function resetHardcover() {
    settings.value.hardcover = JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS.hardcover));
  }

  function resetSpecial() {
    settings.value.special = JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS.special));
  }

  function resetAll() {
    settings.value = JSON.parse(JSON.stringify(DEFAULT_BINDING_BORDER_SETTINGS));
  }

  function getEbookParams(): EbookBorderParams {
    return settings.value.ebook;
  }

  function getPaperbackParams(): PaperbackBorderParams {
    return settings.value.paperback;
  }

  function getHardcoverParams(): HardcoverBorderParams {
    return settings.value.hardcover;
  }

  function getSpecialParams(): SpecialBorderParams {
    return settings.value.special;
  }

  return {
    settings,
    updateEbookParams,
    updatePaperbackParams,
    updateHardcoverParams,
    updateSpecialParams,
    resetEbook,
    resetPaperback,
    resetHardcover,
    resetSpecial,
    resetAll,
    getEbookParams,
    getPaperbackParams,
    getHardcoverParams,
    getSpecialParams,
    saveSettings
  };
});
