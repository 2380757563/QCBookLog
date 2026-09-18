/**
 * 表格/ZIP 导入任务：状态与执行托管模块（见 doc/批量任务小窗与任务中心计划.md 4.3）
 *
 * 设计要点：
 * - 导入进度与结果放在模块级（脱离组件实例存活），切页不中断、回来仍可见
 * - 任务记录注册进 useTaskStore（type: import-books），供右上角小窗展示进度 / 跳转
 * - importService 无取消钩子，任务不可取消（canCancel: false）
 * - 重复预检弹窗等用户交互仍留在组件内，本模块只托管最终导入阶段
 */
import { ref, computed } from 'vue';
import { importService } from '@/api/importService';
import type { ImportFormat, ImportProgress, ImportOptions, ImportResult } from '@/api/importService';
import { useTaskStore } from '@/stores/task';

/* ---------- 模块级状态（切页不丢） ---------- */
const progress = ref<ImportProgress>({ percent: 0, phase: 'parsing', message: '' });
const result = ref<ImportResult | null>(null);
/** 是否有导入任务正在模块侧执行 */
const importing = ref(false);

/** 导入进度（组件进度条与小窗共用数据源） */
export const tableImportProgress = progress;
/** 最近一次导入结果（页面结果区展示） */
export const tableImportResult = result;
/** 导入是否进行中 */
export const tableImportActive = computed(() => importing.value);

/** ImportProgress.phase → 小窗阶段文案 */
const PHASE_TEXT: Record<ImportProgress['phase'], string> = {
  parsing: '解析校验',
  creating: '写入书库',
  covers: '处理封面',
  done: '完成'
};

/**
 * 启动导入任务（共用执行体）。
 * @param title 小窗标题（含文件名）
 * @param run 调用 importService 并返回 ImportResult 的执行函数
 */
function startImportTask(title: string, run: (onProgress: (p: ImportProgress) => void) => Promise<ImportResult>): string {
  const taskStore = useTaskStore();
  const taskId = taskStore.createTask({
    type: 'import-books',
    title,
    phase: '准备导入',
    canCancel: false,
    target: { path: '/import' },
    sourcePath: '/import'
  });

  // 重置上次进度/结果，避免残留
  progress.value = { percent: 0, phase: 'parsing', message: '准备导入...' };
  result.value = null;

  const onProgress = (p: ImportProgress) => {
    progress.value = p;
    taskStore.setPhase(taskId, PHASE_TEXT[p.phase] || p.message);
    taskStore.setProgress(taskId, p.current ?? 0, p.total ?? 0, p.message);
  };

  const execute = async () => {
    importing.value = true;
    try {
      const r = await run(onProgress);
      result.value = r;
      taskStore.completeTask(taskId, {
        success: r.imported,
        skipped: r.skipped,
        failed: r.errors.length
      });
    } catch (e) {
      const message = (e as Error).message || '导入失败';
      result.value = {
        success: false, total: 0, imported: 0, skipped: 0,
        errors: [{ row: 0, message }], warnings: []
      };
      taskStore.failTask(taskId, message);
    } finally {
      importing.value = false;
    }
  };

  // 注册执行体（幂等），经调度器启动：任务若被排队，待前序任务终态后自动执行
  taskStore.attachRunner(taskId, execute);
  taskStore.dispatch(taskId);

  return taskId;
}

/**
 * 启动 ZIP 导入任务（页面 confirmImport 的 ZIP 分支调用）。
 * 整个「解析 + 导入」流程托管在模块侧，切页不中断。
 */
export function startZipImportTask(file: File, options: ImportOptions): string {
  return startImportTask(`导入 ${file.name}`, (onProgress) =>
    importService.importFromFile(file, options, onProgress)
  );
}

/**
 * 启动表格导入任务（页面完成解析与重复预检后调用）。
 * books 为最终确认导入的列表，重复项已在前置处理（skipDuplicates 固定 false 避免二次判断）。
 */
export function startTableImportTask(
  books: any[],
  format: ImportFormat,
  updateExisting: boolean,
  fieldMapping: Record<string, string>,
  fileName: string
): string {
  return startImportTask(`导入 ${fileName}`, (onProgress) =>
    importService.importParsedBooks(
      books,
      { format, skipDuplicates: false, updateExisting, fieldMapping },
      onProgress
    )
  );
}
