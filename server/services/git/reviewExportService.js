/**
 * reviewExportService - 将书评从数据库导出到 Git 工作区
 *
 * 文件布局（每本书一个目录、每篇书评一个文件，用 UUID 命名避免跨设备 ID 冲突）：
 *   sync-repo/
 *     └── reviews/
 *         └── <mapping_id>-<sanitized-title>/
 *             ├── book.json
 *             └── <review-uuid>.md    # frontmatter + 正文
 */

import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import { randomUUID } from 'crypto';
import gitService from './gitService.js';
import databaseService from '../legacy/database-service.js';

const REVIEWS_DIR = 'reviews';

function sanitizeName(name, fallback = 'book') {
  if (!name) return fallback;
  // 移除文件系统不允许的字符，合并空格/斜杠为 -
  return String(name)
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 查询一篇书评的完整信息（含书籍信息）。
 * @param {number|string} reviewId
 */
function getReviewRecord(reviewId) {
  const db = databaseService.getQcBooklogDb();
  return db.prepare(`
    SELECT
      c.id,
      c.uuid,
      c.mapping_id,
      c.content,
      c.title,
      c.rating,
      c.created_at,
      c.updated_at,
      m.calibre_book_id,
      m.library_uuid,
      m.title  AS book_title,
      m.author AS book_author
    FROM qc_comments c
    LEFT JOIN qc_book_mapping m ON m.id = c.mapping_id
    WHERE c.id = ?
  `).get(Number(reviewId));
}

function getBookDir(repoDir, review) {
  const slug = sanitizeName(review.book_title || review.mapping_id, `book-${review.mapping_id}`);
  return path.join(repoDir, REVIEWS_DIR, `${review.mapping_id}-${slug}`);
}

function writeBookJson(bookDir, review) {
  const bookJsonPath = path.join(bookDir, 'book.json');
  const bookJson = {
    mapping_id: review.mapping_id,
    calibre_book_id: review.calibre_book_id,
    library_uuid: review.library_uuid || null,
    title: review.book_title || '',
    author: review.book_author || '',
  };
  // 若已存在且内容一致则不覆盖，保留 mtime（方便 git 只在真实变更时提交）
  let existing = null;
  if (fs.existsSync(bookJsonPath)) {
    try { existing = JSON.parse(fs.readFileSync(bookJsonPath, 'utf8')); } catch {}
  }
  const next = JSON.stringify(bookJson, null, 2);
  if (!existing || JSON.stringify(existing) !== next) {
    fs.writeFileSync(bookJsonPath, next + '\n', 'utf8');
  }
}

function writeReviewFile(bookDir, review) {
  // 用 uuid 命名，无 uuid 则兜底生成并回写
  let uuid = review.uuid;
  if (!uuid) {
    uuid = randomUUID();
    const db = databaseService.getQcBooklogDb();
    db.prepare('UPDATE qc_comments SET uuid = ? WHERE id = ?').run(uuid, review.id);
    review.uuid = uuid;
  }
  const filePath = path.join(bookDir, `${uuid}.md`);

  const front = {
    id: review.id,
    uuid,
    mapping_id: review.mapping_id,
    title: review.title || '',
    rating: review.rating || 0,
    created_at: review.created_at,
    updated_at: review.updated_at,
  };

  const content = (review.content || '').replace(/\r\n/g, '\n');
  const rendered = matter.stringify(content, front);

  // 仅在内容变化时写入，避免无谓的 dirty
  if (fs.existsSync(filePath)) {
    const old = fs.readFileSync(filePath, 'utf8');
    if (old === rendered) return filePath;
  }
  fs.writeFileSync(filePath, rendered, 'utf8');
  return filePath;
}

/**
 * 导出一篇书评到 Git 工作区。不做 commit/push（由调用方决定）。
 * @returns { bookDir, reviewFile, relativePath }
 */
export function exportReview(reviewId) {
  const review = getReviewRecord(reviewId);
  if (!review) throw new Error(`书评不存在: ${reviewId}`);

  const repoDir = gitService.getRepoDir();
  const bookDir = getBookDir(repoDir, review);
  ensureDir(bookDir);

  writeBookJson(bookDir, review);
  const reviewFile = writeReviewFile(bookDir, review);

  return {
    review,
    bookDir,
    reviewFile,
    relativePath: path.relative(repoDir, reviewFile),
  };
}

/**
 * 从工作区删除一篇书评对应的 .md 文件（删除书评时调用）。
 * 注意：不删除 book.json 和目录，因为同书可能还有其他书评。
 */
export function removeReviewFile(review) {
  if (!review || !review.uuid || !review.mapping_id) return null;
  const repoDir = gitService.getRepoDir();
  const bookDir = getBookDir(repoDir, review);
  const target = path.join(bookDir, `${review.uuid}.md`);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    return path.relative(repoDir, target);
  }
  return null;
}

/**
 * 列出所有待推送的书评（pending/failed/未同步 或 内容在同步后又改过的）
 * @returns {Array<{id, uuid, title, book_title, sync_status, updated_at}>}
 */
export function getPendingReviews() {
  const db = databaseService.getQcBooklogDb();
  return db.prepare(`
    SELECT c.id, c.uuid, c.title, c.sync_status, c.updated_at,
           m.title AS book_title
    FROM qc_comments c
    LEFT JOIN qc_book_mapping m ON m.id = c.mapping_id
    WHERE c.sync_status IN ('none', 'pending', 'failed')
       OR c.sync_status IS NULL
       OR (c.last_synced_at IS NOT NULL AND c.updated_at > c.last_synced_at)
    ORDER BY c.updated_at DESC
  `).all();
}

/**
 * 导出数据库中所有 pending 状态的书评（用于"全量同步" / 首次初始化）。
 * @returns 受影响的文件相对路径数组
 */
export function exportAllPendingReviews() {
  const db = databaseService.getQcBooklogDb();
  const rows = db.prepare(`
    SELECT id FROM qc_comments
    WHERE sync_status IN ('none', 'pending', 'failed') OR sync_status IS NULL
  `).all();
  const files = [];
  for (const r of rows) {
    try {
      const { relativePath } = exportReview(r.id);
      files.push(relativePath);
    } catch (err) {
      console.error('[reviewExport] 导出失败 id=' + r.id, err.message);
    }
  }
  return files;
}

/**
 * 获取一篇书评在 Git 工作区中的相对路径（不导出，仅计算路径）
 */
export function getReviewFilePath(reviewId) {
  const review = getReviewRecord(reviewId);
  if (!review || !review.uuid) return null;
  const repoDir = gitService.getRepoDir();
  const bookDir = getBookDir(repoDir, review);
  return path.relative(repoDir, path.join(bookDir, `${review.uuid}.md`));
}

/**
 * 标记一批书评已同步
 */
export function markSynced(ids) {
  if (!ids || ids.length === 0) return;
  const db = databaseService.getQcBooklogDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE qc_comments
    SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders})
  `).run(...ids);
}

/**
 * 拉取远端后导入：扫描仓库 reviews/ 目录下所有 .md，解析 frontmatter，按 uuid 回写数据库。
 * 规则：
 *   - 远端文件 updated_at 比本地新 → 覆盖本地内容（content/title/rating）
 *   - 本地不存在该 uuid → 若能从 book.json 拿到 mapping_id 且映射存在则新建
 *   - 回写后统一标记为已同步
 * @returns { imported, updated, created, skipped, syncedIds }
 */
export function importAllReviews() {
  const db = databaseService.getQcBooklogDb();
  const repoDir = gitService.getRepoDir();
  const reviewsRoot = path.join(repoDir, REVIEWS_DIR);
  if (!fs.existsSync(reviewsRoot)) {
    return { imported: 0, updated: 0, created: 0, skipped: 0, syncedIds: [] };
  }

  // 递归收集所有 .md 文件
  const mdFiles = [];
  (function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) mdFiles.push(full);
    }
  })(reviewsRoot);

  const findByUuid = db.prepare('SELECT id, updated_at FROM qc_comments WHERE uuid = ?');
  const updateByUuid = db.prepare(`
    UPDATE qc_comments
    SET content = ?, title = ?, rating = ?, updated_at = ?,
        sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP
    WHERE uuid = ?
  `);
  const insertReview = db.prepare(`
    INSERT INTO qc_comments (uuid, mapping_id, user_id, content, title, rating, sync_status, created_at, updated_at)
    VALUES (?, ?, 0, ?, ?, ?, 'synced', ?, ?)
  `);

  let updated = 0;
  let created = 0;
  let skipped = 0;
  const syncedIds = [];

  for (const file of mdFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      const uuid = data && data.uuid;
      if (!uuid) {
        skipped++;
        continue;
      }

      // 从同目录 book.json 补充 mapping_id
      let mappingId = data.mapping_id;
      if (!mappingId) {
        const bookJsonPath = path.join(path.dirname(file), 'book.json');
        if (fs.existsSync(bookJsonPath)) {
          try {
            mappingId = JSON.parse(fs.readFileSync(bookJsonPath, 'utf8')).mapping_id;
          } catch {}
        }
      }

      const title = String(data.title || '');
      const rating = Number(data.rating) || 0;
      const remoteUpdatedAt = data.updated_at || null;
      const remoteCreatedAt = data.created_at || remoteUpdatedAt || new Date().toISOString();

      const existing = findByUuid.get(uuid);
      if (existing) {
        // 远端不新于本地则跳过（默认最新修改优先）
        if (remoteUpdatedAt && existing.updated_at && new Date(remoteUpdatedAt) <= new Date(existing.updated_at)) {
          skipped++;
          continue;
        }
        updateByUuid.run(content, title, rating, remoteUpdatedAt || existing.updated_at, uuid);
        syncedIds.push(existing.id);
        updated++;
      } else {
        // 本地没有该 uuid：需要 mapping 存在才能新建
        if (!mappingId) {
          skipped++;
          continue;
        }
        const mapping = db.prepare('SELECT id FROM qc_book_mapping WHERE id = ?').get(mappingId);
        if (!mapping) {
          skipped++;
          continue;
        }
        const res = insertReview.run(uuid, mappingId, content, title, rating, remoteCreatedAt, remoteUpdatedAt || remoteCreatedAt);
        syncedIds.push(res.lastInsertRowid);
        created++;
      }
    } catch (err) {
      console.warn('[importAllReviews] 解析失败:', file, err.message);
      skipped++;
    }
  }

  return { imported: mdFiles.length, updated, created, skipped, syncedIds };
}

export default {
  getPendingReviews,
  exportReview,
  removeReviewFile,
  exportAllPendingReviews,
  markSynced,
  getReviewFilePath,
  importAllReviews,
};
