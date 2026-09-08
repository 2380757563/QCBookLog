import gitService from './gitService.js';
import reviewExportService from './reviewExportService.js';
import databaseService from '../legacy/database-service.js';

/**
 * reviewSyncOrchestrator
 *   高层 API：保存/删除书评后调用，负责导出文件 + commit + push（串行化在 gitService 内部完成）。
 */

async function syncCommitForReview(action, reviewId, extra = {}) {
  if (!gitService.isReady()) {
    // 未配置时不报错，但记录状态为 pending（前端会显示"未同步"）
    return { committed: false, pushed: false, ready: false };
  }

  let filesToStage = [];
  let message = '';

  if (action === 'save') {
    const { review, relativePath } = reviewExportService.exportReview(reviewId);
    filesToStage.push(relativePath);
    // 也提交 book.json（目录级元数据）
    const bookJsonRel = relativePath.replace(/\/[^/]+\.md$/, '/book.json');
    filesToStage.push(bookJsonRel);
    const title = review.book_title || `#${review.mapping_id}`;
    const reviewTitle = review.title ? `「${review.title}」` : '';
    message = `review: 更新《${title}》${reviewTitle} 书评`;
  } else if (action === 'delete') {
    // reviewId 此时可能是 { review, id } 结构（删除前捕获的记录）
    const review = extra.review || null;
    const removed = reviewExportService.removeReviewFile(review);
    if (removed) {
      filesToStage.push(removed);
      message = `review: 删除书评`;
    } else {
      return { committed: false, pushed: false, note: '无文件变更' };
    }
  }

  // 串行执行 commit + push（可用 extra.message 覆盖默认提交信息）
  // 若未配置远端仓库，则不强制 push，仅提交本地
  const status = await gitService.getStatus();
  const effectiveForcePush = !!(extra.forcePush && status.configured);
  const result = await gitService.commitAndPush({
    files: filesToStage,
    message: extra.message || message,
    forcePush: effectiveForcePush,
  });

  if (action === 'save' && (result.committed || result.pushed)) {
    reviewExportService.markSynced([reviewId]);
  }

  return result;
}

/**
 * 导出所有待同步书评，做一次批量提交 + 推送。
 */
async function syncAllPending(forcePush = false) {
  if (!gitService.isReady()) {
    throw new Error('Git 仓库尚未初始化');
  }
  const files = reviewExportService.exportAllPendingReviews();
  // 获取本次导出涉及的所有 review id（sync_status=pending 的）
  // 直接把 reviews 目录整体 add，保证删除也会被提交
  // 若未配置远端仓库，则不强制 push，仅提交本地
  const status = await gitService.getStatus();
  const effectiveForcePush = forcePush && status.configured;
  // 注意：即使没有待导出书评，也要走到 commitAndPush，
  // 以便把本地"已提交未推送"的 commit 推送到远端
  const result = await gitService.commitAndPush({
    files: ['reviews/'],
    message: files.length > 0 ? `review: 批量同步 ${files.length} 篇书评` : 'review: 手动同步',
    forcePush: effectiveForcePush,
  });
  // 简单标记当前已导出的所有 pending 为 synced
  const db = databaseService.getQcBooklogDb();
  const pendingIds = db.prepare(`
    SELECT id FROM qc_comments WHERE sync_status IN ('pending','failed','none') OR sync_status IS NULL
  `).all().map(r => r.id);
  reviewExportService.markSynced(pendingIds);
  return { ...result, fileCount: files.length };
}

/**
 * 清空某篇书评的全部历史提交（重写历史 + 强推同步删除远端记录），只保留当前版本。
 * 步骤：确保最新文件在工作区 → filter-branch 移除该文件全部历史 → 重新导出 → 提交最新版本并强推
 */
async function purgeReviewHistory(reviewId) {
  if (!gitService.isReady()) {
    throw new Error('Git 仓库尚未初始化');
  }
  const filePath = reviewExportService.getReviewFilePath(reviewId);
  if (!filePath) {
    throw new Error('书评文件未找到，可能尚未同步到 Git');
  }
  // 1. 先把最新版本落到工作区（若有变化会 commit，确保清空前的状态是最新的）
  reviewExportService.exportReview(reviewId);
  // 2. 从所有历史提交中移除该文件（重写历史）
  const purged = await gitService.purgeFileHistory(filePath, { push: false });
  // 3. filter-branch 后 HEAD 不再包含该文件，重新导出当前版本
  reviewExportService.exportReview(reviewId);
  // 4. 提交当前版本并强推（重写历史后与远端分叉，必须 force-with-lease）
  const result = await gitService.commitAndPush({
    files: [filePath],
    message: `review: 清空书评历史，仅保留当前版本`,
    forcePush: true,
    forceLease: true,
  });
  reviewExportService.markSynced([reviewId]);
  return { ...purged, ...result };
}

export default {
  syncCommitForReview,
  syncAllPending,
  purgeReviewHistory,
};
export { syncCommitForReview, syncAllPending, purgeReviewHistory };
