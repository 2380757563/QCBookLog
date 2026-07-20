/**
 * useDataTransfer - 数据转移 Composable
 *
 * 负责源/目标信息查询、转移执行、转移历史日志加载。
 */

import { ref, watch } from 'vue';
import {
  fetchTransferSourceInfo,
  fetchTransferTargetInfo,
  executeTransfer as apiExecuteTransfer,
  fetchTransferLogs,
  type TransferLogEntry
} from '@/api/config/dataTransferService';

export type TransferStep = 'config' | 'confirm' | 'result';

export function useDataTransfer() {
  // 弹窗与步骤
  const transferDialogVisible = ref(false);
  const transferStep = ref<TransferStep>('config');

  // 源信息
  const transferSourceInfo = ref<any>(null);

  // 目标
  const transferTargetDir = ref('');
  const transferTargetInfo = ref<any>(null);
  const transferTargetLoading = ref(false);

  // 转移执行
  const transferLoading = ref(false);
  const transferConfirmText = ref('');
  const transferResult = ref<any>(null);

  // 历史日志
  const transferLogs = ref<TransferLogEntry[]>([]);

  // 文件夹选择 ref（由组件注册）
  const transferFolderInput = ref<HTMLInputElement | null>(null);

  let transferTargetDebounce: ReturnType<typeof setTimeout> | null = null;

  async function loadTransferSourceInfo() {
    try {
      const data = await fetchTransferSourceInfo();
      if (data.success) {
        transferSourceInfo.value = data;
      } else {
        console.warn('⚠️ 加载源信息失败:', data.error);
      }
    } catch (e) {
      console.error('❌ 加载源信息异常:', e);
    }
  }

  async function loadTransferLogs() {
    try {
      const data = await fetchTransferLogs();
      if (data.success) {
        transferLogs.value = data.logs || [];
      }
    } catch (e) {
      console.error('❌ 加载转移日志失败:', e);
    }
  }

  async function openTransferDialog() {
    transferStep.value = 'config';
    transferConfirmText.value = '';
    transferResult.value = null;
    transferTargetInfo.value = null;
    transferDialogVisible.value = true;
    if (!transferSourceInfo.value) {
      await loadTransferSourceInfo();
    }
  }

  function closeTransferDialog() {
    if (transferLoading.value) return;
    transferDialogVisible.value = false;
  }

  function selectTransferTargetFolder() {
    transferFolderInput.value?.click();
  }

  function handleTransferFolderSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;
    const firstPath = (files[0] as any).webkitRelativePath || files[0].name;
    if (firstPath.includes('/')) {
      transferTargetDir.value = firstPath.substring(0, firstPath.indexOf('/'));
    } else {
      transferTargetDir.value = firstPath;
    }
    target.value = '';
  }

  async function checkTargetInfo() {
    if (!transferTargetDir.value) {
      transferTargetInfo.value = null;
      return;
    }
    transferTargetLoading.value = true;
    try {
      const data = await fetchTransferTargetInfo(transferTargetDir.value);
      if (data.success) {
        transferTargetInfo.value = data;
      } else {
        transferTargetInfo.value = null;
      }
    } catch (e) {
      console.error('❌ 估算目标目录失败:', e);
      transferTargetInfo.value = null;
    } finally {
      transferTargetLoading.value = false;
    }
  }

  async function goToConfirmStep() {
    if (!transferTargetDir.value) return;
    if (!transferTargetInfo.value) {
      await checkTargetInfo();
    }
    transferStep.value = 'confirm';
  }

  async function executeTransfer() {
    if (transferConfirmText.value !== '确认覆盖') return;
    transferLoading.value = true;
    transferResult.value = null;
    try {
      const data = await apiExecuteTransfer(transferTargetDir.value);
      transferResult.value = data;
      transferStep.value = 'result';
      if (data.success) {
        await Promise.all([loadTransferSourceInfo(), loadTransferLogs()]);
      }
    } catch (e: any) {
      transferResult.value = {
        success: false,
        error: e?.message || '网络异常'
      };
      transferStep.value = 'result';
    } finally {
      transferLoading.value = false;
    }
  }

  // 监听目标目录变化自动估算
  watch(transferTargetDir, (newVal) => {
    if (transferTargetDebounce) clearTimeout(transferTargetDebounce);
    transferTargetDebounce = setTimeout(() => {
      if (newVal) checkTargetInfo();
      else transferTargetInfo.value = null;
    }, 500);
  });

  return {
    // state
    transferDialogVisible,
    transferStep,
    transferSourceInfo,
    transferTargetDir,
    transferTargetInfo,
    transferTargetLoading,
    transferLoading,
    transferConfirmText,
    transferResult,
    transferLogs,
    transferFolderInput,
    // actions
    loadTransferSourceInfo,
    loadTransferLogs,
    openTransferDialog,
    closeTransferDialog,
    selectTransferTargetFolder,
    handleTransferFolderSelect,
    checkTargetInfo,
    goToConfirmStep,
    executeTransfer
  };
}
