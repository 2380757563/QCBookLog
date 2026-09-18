/**
 * 整库备份任务：状态与执行循环托管模块（见 doc/批量任务小窗与任务中心计划.md P5.4）
 *
 * 设计要点：
 * - 复用 exportService.exportLibrary 的 jobId 轮询（后端异步任务），托管为 'export' 类型任务
 * - 轮询与下载跑在模块级（脱离组件实例存活），切页不中断；后端无取消钩子 → canCancel: false
 * - 进度同时写本模块 ref（页面遮罩视图）与 taskStore（右上角小窗）
 */
import { ref } from 'vue';
import { exportService, type ExportProgress } from '@/api/exportService';
import { useTaskStore } from '@/stores/task';

/** 整库备份进行中（页面遮罩显隐） */
export const libraryExportActive = ref(false);
/** 整库备份进度（页面遮罩视图数据源） */
export const libraryExportProgress = ref<ExportProgress>({
  percent: 0,
  phase: 'building',
  message: '准备打包...'
});

/** 启动整库备份任务，返回 taskId */
export function startLibraryExportTask(): string {
  const taskStore = useTaskStore();
  const taskId = taskStore.createTask({
    type: 'export',
    title: '整库备份',
    phase: '准备打包',
    total: 100,
    canCancel: false,
    target: { path: '/export' },
    sourcePath: '/export'
  });
  libraryExportActive.value = true;
  taskStore.attachRunner(taskId, () => runExport(taskId));
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 整库备份执行体：jobId 轮询 → 下载备份文件 */
async function runExport(taskId: string) {
  const taskStore = useTaskStore();
  try {
    const blob = await exportService.exportLibrary({}, (p) => {
      libraryExportProgress.value = p;
      taskStore.setProgress(taskId, p.percent, 100, p.message);
      taskStore.setPhase(taskId, p.phase === 'downloading' ? '正在下载备份文件' : '正在打包书库');
    });
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    exportService.downloadFile(blob, `library-backup-${date}.zip`);
    taskStore.setProgress(taskId, 100, 100, '备份完成');
    taskStore.completeTask(taskId, { success: 1, skipped: 0, failed: 0 });
  } catch (e: any) {
    taskStore.failTask(taskId, e?.message || '整库备份失败');
  } finally {
    libraryExportActive.value = false;
  }
}
