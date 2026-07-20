/**
 * useConfig - 书库配置管理 Composable
 *
 * 负责 calibre / talebook 书库配置的状态、获取、验证、保存与默认值管理。
 * 仅持有与配置相关的状态与操作，不涉及 UI 模板。
 */

import { ref, watch } from 'vue';
import {
  fetchCalibrePath,
  fetchTalebookPath,
  saveCalibrePath as apiSaveCalibre,
  saveTalebookPath as apiSaveTalebook,
  validateCalibre as apiValidateCalibre,
  validateTalebook as apiValidateTalebook,
  createDatabase as apiCreateDatabase,
  setDefault as apiSetDefault
} from '@/api/config/configService';

export type SelectedType = 'sync-status' | 'calibre' | 'talebook';
export type ConfigMode = 'existing' | 'new';

export function useConfig() {
  // ---- 状态 ----
  const currentStep = ref(0);
  const selectedType = ref<SelectedType>('sync-status');
  const configMode = ref<ConfigMode>('existing');

  const calibrePath = ref('');
  const talebookPath = ref('');
  const newCalibrePath = ref('');
  const newTalebookPath = ref('');

  const validation = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentPath = ref('');
  const initialLoading = ref(true);
  const isDefault = ref(false);

  const calibreStats = ref<any>(null);
  const talebookStats = ref<any>(null);
  const calibreValid = ref(false);
  const talebookValid = ref(false);
  const calibreError = ref<string | null>(null);
  const talebookError = ref<string | null>(null);
  const calibreNeedsReconfig = ref(false);
  const talebookNeedsReconfig = ref(false);

  const databaseStatus = ref({
    calibre: { exists: false, valid: false, error: null as string | null },
    talebook: { exists: false, valid: false, error: null as string | null }
  });

  // ---- 工具：根据当前选中的书库类型获取对应 ref 引用 ----
  function getActivePath(): { value: string } {
    return selectedType.value === 'calibre' ? calibrePath : talebookPath;
  }

  function getActiveNewPath(): { value: string } {
    return selectedType.value === 'calibre' ? newCalibrePath : newTalebookPath;
  }

  function getActiveDbFileName(): string {
    return selectedType.value === 'calibre' ? 'metadata.db' : 'calibre-webserver.db';
  }

  function stripDbFileName(dbPath: string): string {
    if (selectedType.value === 'calibre') {
      return dbPath.replace(/\\metadata.db|\/metadata.db/g, '');
    }
    return dbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
  }

  // ---- 验证 ----
  async function validateDb() {
    loading.value = true;
    error.value = null;
    validation.value = null;

    try {
      const path = getActivePath().value;
      if (!path.trim()) {
        error.value = `请输入或选择 ${selectedType.value === 'calibre' ? 'Calibre' : 'Talebook'} 书库路径`;
        loading.value = false;
        return;
      }

      const data = selectedType.value === 'calibre'
        ? await apiValidateCalibre(path)
        : await apiValidateTalebook(path);

      validation.value = data;

      if (data.success) {
        if (selectedType.value === 'calibre') {
          calibreStats.value = data.stats || null;
          calibreValid.value = true;
          calibreError.value = null;
          calibreNeedsReconfig.value = false;
        } else {
          talebookStats.value = data.stats || null;
          talebookValid.value = true;
          talebookError.value = null;
          talebookNeedsReconfig.value = false;
        }
        currentStep.value = 1;
      } else {
        const errorMsg = data.errors && data.errors.length > 0
          ? data.errors.join(', ')
          : (data.error || '未知错误');
        error.value = `验证失败: ${errorMsg}`;
        if (selectedType.value === 'calibre') {
          calibreNeedsReconfig.value = true;
        } else {
          talebookNeedsReconfig.value = true;
        }
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('验证数据库失败:', err);
      error.value = `验证失败: ${errorMessage}`;
      if (selectedType.value === 'calibre') {
        calibreNeedsReconfig.value = true;
      } else {
        talebookNeedsReconfig.value = true;
      }
    } finally {
      loading.value = false;
    }
  }

  // ---- 保存配置 ----
  async function saveConfig(afterSave?: () => Promise<void> | void) {
    loading.value = true;
    error.value = null;

    try {
      const selectedPath = getActivePath().value;
      const isCalibre = selectedType.value === 'calibre';

      const data = isCalibre
        ? await apiSaveCalibre(selectedPath, isDefault.value)
        : await apiSaveTalebook(selectedPath, isDefault.value);

      if (data.success) {
        const dbPath: string = data.calibreDbPath || data.talebookDbPath || '';
        if (dbPath) {
          getActivePath().value = stripDbFileName(dbPath);
        }
        currentPath.value = dbPath;
        isDefault.value = data.isDefault || false;

        if (isCalibre) {
          calibreValid.value = true;
          calibreError.value = null;
          calibreNeedsReconfig.value = false;
          calibreStats.value = data.stats || null;
        } else {
          talebookValid.value = true;
          talebookError.value = null;
          talebookNeedsReconfig.value = false;
          talebookStats.value = data.stats || null;
        }

        currentStep.value = 2;
        if (afterSave) await afterSave();
      } else {
        error.value = `保存失败: ${data.error || '未知错误'}`;
        if (isCalibre) calibreNeedsReconfig.value = true;
        else talebookNeedsReconfig.value = true;
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('保存配置异常:', err);
      error.value = `保存失败: ${errorMessage}`;
      if (selectedType.value === 'calibre') calibreNeedsReconfig.value = true;
      else talebookNeedsReconfig.value = true;
    } finally {
      loading.value = false;
    }
  }

  // ---- 切换默认书库 ----
  async function toggleDefault() {
    try {
      const newValue = !isDefault.value;
      const data = await apiSetDefault(currentPath.value, newValue);
      if (data.success) {
        isDefault.value = newValue;
      } else {
        error.value = data.error || '设置默认书库失败';
      }
    } catch (err) {
      error.value = (err as Error).message;
    }
  }

  // ---- 创建新数据库 ----
  async function createNewDatabase(afterCreate?: () => Promise<void> | void) {
    loading.value = true;
    error.value = null;
    try {
      const newDbPath = getActiveNewPath().value;
      if (!newDbPath.trim()) {
        error.value = `请输入 ${selectedType.value === 'calibre' ? 'Calibre' : 'Talebook'} 数据库存储路径`;
        return;
      }
      const data = await apiCreateDatabase(selectedType.value as 'calibre' | 'talebook', newDbPath);
      if (data.success) {
        if (data.dbPath) {
          getActivePath().value = stripDbFileName(data.dbPath);
        }
        await saveConfig(afterCreate);
      } else {
        error.value = `创建失败: ${data.error || '未知错误'}`;
      }
    } catch (err) {
      error.value = `创建失败: ${(err as Error).message}`;
    } finally {
      loading.value = false;
    }
  }

  // ---- 获取当前配置 ----
  async function fetchCurrentConfig() {
    try {
      initialLoading.value = true;
      const [calibreData, talebookData] = await Promise.all([
        fetchCalibrePath(),
        fetchTalebookPath()
      ]);

      if (!calibreData.success) {
        error.value = `获取Calibre配置失败: ${calibreData.error}`;
      }
      if (!talebookData.success) {
        error.value = error.value
          ? `${error.value}; 获取Talebook配置失败: ${talebookData.error}`
          : `获取Talebook配置失败: ${talebookData.error}`;
      }

      if (calibreData.success && calibreData.calibreDbPath) {
        calibrePath.value = calibreData.calibreDbPath.replace(/\\metadata.db|\/metadata.db/g, '');
      } else {
        calibrePath.value = '';
      }
      if (talebookData.success && talebookData.talebookDbPath) {
        talebookPath.value = talebookData.talebookDbPath.replace(/\\calibre-webserver.db|\/calibre-webserver.db/g, '');
      } else {
        talebookPath.value = '';
      }

      calibreValid.value = calibreData.valid || false;
      talebookValid.value = talebookData.valid || false;
      calibreError.value = calibreData.error || null;
      talebookError.value = talebookData.error || null;
      calibreStats.value = calibreData.stats || null;
      talebookStats.value = talebookData.stats || null;
      calibreNeedsReconfig.value = calibreData.needsReconfig || false;
      talebookNeedsReconfig.value = talebookData.needsReconfig || false;

      // 简化决策：仅设置状态，不在 fetchCurrentConfig 中切换 selectedType
      if (!currentPath.value) {
        const config = {
          calibre: (calibreData.success && calibreData.calibreDbPath) ? calibreData : null,
          talebook: (talebookData.success && talebookData.talebookDbPath) ? talebookData : null
        };
        if (config.calibre && !config.talebook) {
          currentPath.value = config.calibre.calibreDbPath || '';
          isDefault.value = config.calibre.isDefault || false;
          selectedType.value = 'calibre';
          currentStep.value = config.calibre.valid ? 2 : (config.calibre.exists ? 2 : 0);
          if (!config.calibre.valid && config.calibre.exists) {
            error.value = calibreData.error || '数据库验证失败';
          }
        } else if (!config.calibre && config.talebook) {
          currentPath.value = config.talebook.talebookDbPath || '';
          isDefault.value = config.talebook.isDefault || false;
          selectedType.value = 'talebook';
          currentStep.value = config.talebook.valid ? 2 : (config.talebook.exists ? 2 : 0);
          if (!config.talebook.valid && config.talebook.exists) {
            error.value = talebookData.error || '数据库验证失败';
          }
        } else if (config.calibre && config.talebook) {
          if (config.talebook.isDefault) {
            currentPath.value = config.talebook.talebookDbPath || '';
            isDefault.value = true;
            selectedType.value = 'talebook';
            currentStep.value = config.talebook.valid ? 2 : (config.talebook.exists ? 2 : 0);
            if (!config.talebook.valid && config.talebook.exists) {
              error.value = talebookData.error || '数据库验证失败';
            }
          } else {
            currentPath.value = config.calibre.calibreDbPath || '';
            isDefault.value = config.calibre.isDefault || false;
            selectedType.value = 'calibre';
            currentStep.value = config.calibre.valid ? 2 : (config.calibre.exists ? 2 : 0);
            if (!config.calibre.valid && config.calibre.exists) {
              error.value = calibreData.error || '数据库验证失败';
            }
          }
        } else {
          currentStep.value = 0;
        }
      }

      // 如果有数据库需要重新配置，跳转到对应页面
      if (calibreNeedsReconfig.value || talebookNeedsReconfig.value) {
        if (selectedType.value !== 'sync-status') {
          if (calibreNeedsReconfig.value && !talebookNeedsReconfig.value) {
            selectedType.value = 'calibre';
            currentStep.value = 0;
          } else if (!calibreNeedsReconfig.value && talebookNeedsReconfig.value) {
            selectedType.value = 'talebook';
            currentStep.value = 0;
          } else {
            selectedType.value = 'calibre';
            currentStep.value = 0;
          }
          error.value = calibreNeedsReconfig.value
            ? calibreError.value
            : talebookError.value;
        }
      }
    } catch (err) {
      error.value = `获取配置失败: ${(err as Error).message}`;
    } finally {
      initialLoading.value = false;
    }
  }

  // ---- 切换 tab ----
  function selectType(type: SelectedType) {
    selectedType.value = type;
    validation.value = null;
    error.value = null;

    if (type === 'sync-status') return;

    if (type === 'calibre') {
      currentPath.value = calibrePath.value
        ? `${calibrePath.value.replace(/[/\\]$/, '')}${calibrePath.value.includes('\\') ? '\\' : '/'}metadata.db`
        : '';
    } else {
      currentPath.value = talebookPath.value
        ? `${talebookPath.value.replace(/[/\\]$/, '')}${talebookPath.value.includes('\\') ? '\\' : '/'}calibre-webserver.db`
        : '';
    }

    const isConfigured = type === 'calibre' ? calibrePath.value : talebookPath.value;
    const isValid = type === 'calibre' ? calibreValid.value : talebookValid.value;
    const errorMsg = type === 'calibre' ? calibreError.value : talebookError.value;

    if (isConfigured) {
      currentStep.value = 2;
      if (!isValid && errorMsg) {
        error.value = errorMsg;
      }
    } else {
      currentStep.value = 0;
    }
  }

  function reconfigure() {
    currentStep.value = 0;
    calibrePath.value = '';
    talebookPath.value = '';
    validation.value = null;
    error.value = null;
  }

  // ---- 刷新 Talebook 配置（数据转移完成后调用） ----
  async function reloadTalebookPath() {
    try {
      const data = await fetchTalebookPath();
      if (data.success) {
        talebookPath.value = (data.talebookDbPath || '').replace(
          /\\calibre-webserver.db|\/calibre-webserver.db/g,
          ''
        );
        talebookValid.value = !!data.valid;
        talebookError.value = data.error || null;
        talebookStats.value = data.stats || null;
      }
    } catch (err) {
      console.error('刷新 Talebook 配置失败:', err);
    }
  }

  // ---- 监听 selectedType 变化自动更新 currentPath（与原文件行为保持一致） ----
  watch(selectedType, (type) => {
    if (type === 'sync-status') return;
    if (type === 'calibre') {
      currentPath.value = calibrePath.value
        ? `${calibrePath.value.replace(/[/\\]$/, '')}${calibrePath.value.includes('\\') ? '\\' : '/'}metadata.db`
        : '';
    } else {
      currentPath.value = talebookPath.value
        ? `${talebookPath.value.replace(/[/\\]$/, '')}${talebookPath.value.includes('\\') ? '\\' : '/'}calibre-webserver.db`
        : '';
    }
  });

  return {
    // state
    currentStep,
    selectedType,
    configMode,
    calibrePath,
    talebookPath,
    newCalibrePath,
    newTalebookPath,
    validation,
    loading,
    error,
    currentPath,
    initialLoading,
    isDefault,
    calibreStats,
    talebookStats,
    calibreValid,
    talebookValid,
    calibreError,
    talebookError,
    calibreNeedsReconfig,
    talebookNeedsReconfig,
    databaseStatus,
    // actions
    validateDb,
    saveConfig,
    toggleDefault,
    createNewDatabase,
    fetchCurrentConfig,
    selectType,
    reconfigure,
    reloadTalebookPath,
    getActivePath,
    getActiveNewPath,
    getActiveDbFileName
  };
}
