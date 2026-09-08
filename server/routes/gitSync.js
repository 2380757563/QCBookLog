import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import gitService from '../services/git/gitService.js';
import { reviewSyncOrchestrator } from '../services/git/index.js';
import reviewExportService from '../services/git/reviewExportService.js';
import matter from 'gray-matter';

const router = Router();

// TODO: 后续接入认证中间件。当前为单用户场景，直接放行。

/**
 * GET /api/git/status
 * 返回同步配置状态（token 脱敏）
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await gitService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/git/configure
 * body: { repoUrl, branch, token, userName, userEmail, autoPush, mirrors }
 * 保存配置并尝试 clone/init
 */
router.post('/configure', async (req, res, next) => {
  try {
    const { repoUrl, branch, token, userName, userEmail, autoPush, mirrors } = req.body || {};
    const status = await gitService.configure({
      repoUrl: typeof repoUrl === 'string' ? repoUrl.trim() : repoUrl,
      branch: typeof branch === 'string' ? branch.trim() : branch,
      token: typeof token === 'string' ? token : token,
      userName: typeof userName === 'string' ? userName.trim() : userName,
      userEmail: typeof userEmail === 'string' ? userEmail.trim() : userEmail,
      autoPush,
      mirrors,
    });
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/pending
 * 预览本次需要推送的书评列表
 */
router.get('/pending', async (req, res, next) => {
  try {
    const reviews = reviewExportService.getPendingReviews();
    const unpushed = await gitService.getUnpushedCommits();
    res.json({ reviews, count: reviews.length, unpushed });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/export
 * 导出整个本地 git 仓库（含 .git 全部历史）为 zip，方便网盘/硬盘备份
 */
router.get('/export', async (req, res, next) => {
  try {
    const repoDir = gitService.getRepoDir();
    if (!fs.existsSync(repoDir) || !fs.existsSync(path.join(repoDir, '.git'))) {
      return res.status(404).json({ error: '本地仓库不存在，请先保存一篇书评或配置同步' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `qcbooklog-history-${timestamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);
    archive.directory(repoDir, path.basename(repoDir));
    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/git/sync
 * 手动触发同步：导出全部 pending 书评 + commit + push（force=true）
 * body: {}
 */
router.post('/sync', async (req, res, next) => {
  try {
    const result = await reviewSyncOrchestrator.syncAllPending(true);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/git/sync-review/:id
 * 单篇书评触发同步（保存/删除后前端可显式调用；当前后端保存后已自动调用）
 */
router.post('/sync-review/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await reviewSyncOrchestrator.syncCommitForReview('save', id, { forcePush: true });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/history/:reviewId
 * 获取某篇书评的 Git 提交历史
 */
router.get('/history/:reviewId', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const filePath = reviewExportService.getReviewFilePath(reviewId);
    if (!filePath) {
      return res.json({ history: [], note: '该书评尚未同步到 Git' });
    }
    const history = await gitService.getFileHistory(filePath);
    res.json({ history, filePath });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/version/:reviewId/:commitHash
 * 读取某个历史版本的书评内容（解析 frontmatter 后返回纯 markdown）
 */
router.get('/version/:reviewId/:commitHash', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const { commitHash } = req.params;
    const filePath = reviewExportService.getReviewFilePath(reviewId);
    if (!filePath) {
      return res.status(404).json({ error: '书评文件未找到' });
    }
    const raw = await gitService.showFileAtCommit(commitHash, filePath);
    const parsed = matter(raw);
    res.json({
      content: parsed.content,
      data: parsed.data,
      commitHash,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/diff/:reviewId
 * query: ?old=<hash>&new=<hash>
 * 对比两个版本的书评差异
 */
router.get('/diff/:reviewId', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const { old: oldHash, new: newHash } = req.query;
    if (!oldHash || !newHash) {
      return res.status(400).json({ error: '需要 old 和 new 参数' });
    }
    const filePath = reviewExportService.getReviewFilePath(reviewId);
    if (!filePath) {
      return res.status(404).json({ error: '书评文件未找到' });
    }
    const diff = await gitService.diffFile(oldHash, newHash, filePath);
    res.json({ diff });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/git/restore/:reviewId
 * body: { commitHash }
 * 恢复某篇书评到指定历史版本
 */
router.post('/restore/:reviewId', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const { commitHash } = req.body || {};
    if (!commitHash) {
      return res.status(400).json({ error: '需要 commitHash 参数' });
    }
    const filePath = reviewExportService.getReviewFilePath(reviewId);
    if (!filePath) {
      return res.status(404).json({ error: '书评文件未找到' });
    }
    const raw = await gitService.showFileAtCommit(commitHash, filePath);
    const parsed = matter(raw);

    // 写回数据库
    const databaseService = (await import('../services/legacy/database-service.js')).default;
    const db = databaseService.getQcBooklogDb();
    db.prepare(`
      UPDATE qc_comments
      SET content = ?, title = ?, rating = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      parsed.content,
      parsed.data.title || '',
      parsed.data.rating || 0,
      reviewId
    );

    // 重新导出并 commit
    const result = await reviewSyncOrchestrator.syncCommitForReview('save', reviewId, {
      forcePush: true,
      message: `review: 恢复《${parsed.data.title || ''}》到 ${commitHash.slice(0, 7)}`,
    });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/git/pull
 * body: { force?: boolean }
 * 从 GitHub 拉取远端变更（force=true 时用远端覆盖本地），并导入合并到数据库
 */
router.post('/pull', async (req, res, next) => {
  try {
    const { force } = req.body || {};
    const result = await gitService.pull({ mode: force ? 'overwrite' : 'merge' });
    let importResult = null;
    if (result.pulled) {
      importResult = reviewExportService.importAllReviews();
    }
    res.json({ ...result, import: importResult });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/git/history/:reviewId/:commitHash
 * 删除某篇书评的单个历史版本（重写历史 + 强推同步删除远端记录）
 */
router.delete('/history/:reviewId/:commitHash', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const { commitHash } = req.params;
    const filePath = reviewExportService.getReviewFilePath(reviewId);
    if (!filePath) {
      return res.status(404).json({ error: '书评文件未找到' });
    }
    const result = await gitService.dropCommit(commitHash, { push: true });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/git/history/:reviewId
 * 清空某篇书评的全部历史（重写历史 + 强推），只保留当前版本
 */
router.delete('/history/:reviewId', async (req, res, next) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const result = await reviewSyncOrchestrator.purgeReviewHistory(reviewId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
