/**
 * reviewService
 * 管理书评（qc_comments表的CRUD操作）
 */

import databaseService from './database-service.js';
import crypto from 'crypto';

// 异步触发 Git 同步（不阻塞响应）
function triggerGitSync(action, reviewId, extra = {}) {
  import('../git/reviewSyncOrchestrator.js')
    .then(({ syncCommitForReview }) => syncCommitForReview(action, reviewId, extra))
    .then((res) => {
      if (res && res.pushed) {
        console.log(`[Review] Git 同步完成 id=${reviewId} commit=${res.commitHash || ''}`);
      } else if (res && !res.ready) {
        // Git 未配置，跳过
      } else if (res && res.note) {
        console.log(`[Review] Git 同步跳过 id=${reviewId}: ${res.note}`);
      }
    })
    .catch((err) => {
      console.warn(`[Review] Git 同步失败 id=${reviewId}:`, err.message);
    });
}

class ReviewService {
  constructor() {
    this._db = null;
  }

  isAvailable() {
    return databaseService.isQcBooklogAvailable();
  }

  getDb() {
    return databaseService.isQcBooklogAvailable() ? databaseService.getQcBooklogDb() : null;
  }

  get db() {
    return this.getDb();
  }

  getCurrentLibraryUuid() {
    return databaseService.connectionManager?.getCurrentLibraryUuid() || '';
  }

  /**
   * 确保书籍映射存在（使用复合键：library_uuid + calibre_book_id）
   */
  ensureBookMapping(bookId, bookTitle = null, bookAuthor = null) {
    if (!this.isAvailable() || !bookId || bookId <= 0) {
      return null;
    }

    const libraryUuid = this.getCurrentLibraryUuid();
    if (!libraryUuid) {
      console.error('❌ libraryUuid 为空，无法创建书籍映射');
      return null;
    }

    const existingMapping = this.db.prepare(`
      SELECT id, calibre_book_id FROM qc_book_mapping
      WHERE library_uuid = ? AND calibre_book_id = ?
    `).get(libraryUuid, bookId);

    if (existingMapping) {
      return existingMapping;
    }

    try {
      const result = this.db.prepare(`
        INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
        VALUES (?, ?, ?, ?, ?)
      `).run(libraryUuid, bookId, bookId, bookTitle, bookAuthor);

      return { id: result.lastInsertRowid, calibre_book_id: bookId };
    } catch (insertError) {
      console.error('❌ 创建书籍映射失败:', insertError.message);
      return null;
    }
  }

  /**
   * 获取所有书评
   */
  getAllReviews() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT c.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_comments c
        LEFT JOIN qc_book_mapping m ON c.mapping_id = m.id
        ORDER BY c.created_at DESC
      `;
      const reviews = this.db.prepare(query).all();

      // 获取书籍封面路径
      const bookIds = [...new Set(reviews.map(r => r.book_id).filter(id => id))];
      const bookPathMap = new Map();

      if (bookIds.length > 0 && databaseService.isCalibreAvailable()) {
        try {
          const calibreDb = databaseService.calibreDb;
          const placeholders = bookIds.map(() => '?').join(',');
          const books = calibreDb.prepare(`SELECT id, path FROM books WHERE id IN (${placeholders})`).all(...bookIds);
          books.forEach(book => bookPathMap.set(book.id, book.path));
        } catch (e) {
          console.warn('⚠️ 获取书籍路径失败:', e.message);
        }
      }

      return reviews.map(review => this.formatReview(review, bookPathMap));
    } catch (error) {
      console.error('❌ 获取所有书评失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ID获取书评
   */
  getReviewById(reviewId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const query = `
        SELECT c.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_comments c
        LEFT JOIN qc_book_mapping m ON c.mapping_id = m.id
        WHERE c.id = ?
      `;
      const review = this.db.prepare(query).get(reviewId);
      if (!review) return null;

      const bookPathMap = new Map();
      if (review.book_id && databaseService.isCalibreAvailable()) {
        try {
          const calibreDb = databaseService.calibreDb;
          const book = calibreDb.prepare('SELECT id, path FROM books WHERE id = ?').get(review.book_id);
          if (book) bookPathMap.set(book.id, book.path);
        } catch (e) {
          console.warn('⚠️ 获取书籍路径失败:', e.message);
        }
      }

      return this.formatReview(review, bookPathMap);
    } catch (error) {
      console.error('❌ 获取书评失败:', error.message);
      return null;
    }
  }

  /**
   * 根据 calibre_book_id 获取该书的书评
   */
  getReviewsByBookId(bookId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT c.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_comments c
        LEFT JOIN qc_book_mapping m ON c.mapping_id = m.id
        WHERE m.calibre_book_id = ?
        ORDER BY c.created_at DESC
      `;
      const reviews = this.db.prepare(query).all(bookId);

      const bookPathMap = new Map();
      if (databaseService.isCalibreAvailable()) {
        try {
          const calibreDb = databaseService.calibreDb;
          const book = calibreDb.prepare('SELECT id, path FROM books WHERE id = ?').get(bookId);
          if (book) bookPathMap.set(book.id, book.path);
        } catch (e) {
          console.warn('⚠️ 获取书籍路径失败:', e.message);
        }
      }

      return reviews.map(review => this.formatReview(review, bookPathMap));
    } catch (error) {
      console.error('❌ 获取书籍书评失败:', error.message);
      return [];
    }
  }

  /**
   * 创建书评
   */
  createReview(data) {
    if (!this.isAvailable()) {
      throw new Error('数据库不可用');
    }

    const bookId = data.bookId || data.book_id;
    const bookTitle = data.bookTitle || data.book_title || '';
    const bookAuthor = data.bookAuthor || data.book_author || '';

    // 从 Calibre 补全书名作者
    if (bookId && bookId > 0 && (!bookTitle || !bookAuthor)) {
      try {
        if (databaseService.isCalibreAvailable()) {
          const calibreDb = databaseService.calibreDb;
          const bookInfo = calibreDb.prepare(`
            SELECT b.title,
              (SELECT GROUP_CONCAT(a.name, ' & ')
               FROM authors a
               JOIN books_authors_link bal ON a.id = bal.author
               WHERE bal.book = b.id) as author
            FROM books b
            WHERE b.id = ?
          `).get(bookId);

          if (bookInfo) {
            data.bookTitle = bookInfo.title || bookTitle;
            data.bookAuthor = bookInfo.author || bookAuthor;
          }
        }
      } catch (error) {
        console.warn('⚠️ 获取书籍信息失败:', error.message);
      }
    }

    const mapping = this.ensureBookMapping(bookId, data.bookTitle || bookTitle, data.bookAuthor || bookAuthor);
    const mappingId = mapping ? mapping.id : null;

    if (!mappingId) {
      throw new Error('无法创建书籍映射');
    }

    const uuid = crypto.randomUUID();
    const query = `
      INSERT INTO qc_comments (uuid, mapping_id, user_id, content, title, rating, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const result = this.db.prepare(query).run(
      uuid,
      mappingId,
      data.userId || 0,
      data.content || '',
      data.title || '',
      data.rating || 0
    );

    const reviewId = result.lastInsertRowid;
    const review = this.getReviewById(reviewId);
    triggerGitSync('save', reviewId);
    return review;
  }

  /**
   * 更新书评
   */
  updateReview(reviewId, data) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const query = `
        UPDATE qc_comments
        SET content = ?, title = ?, rating = ?, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.prepare(query).run(
        data.content !== undefined ? data.content : '',
        data.title !== undefined ? data.title : '',
        data.rating !== undefined ? data.rating : 0,
        reviewId
      );

      const updated = this.getReviewById(reviewId);
      triggerGitSync('save', reviewId);
      return updated;
    } catch (error) {
      console.error('❌ 更新书评失败:', error.message);
      return null;
    }
  }

  /**
   * 删除书评
   */
  deleteReview(reviewId) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // 先取书评（以便导出模块定位文件，需要书名来定位目录）
      const existing = this.db.prepare(`
        SELECT c.id, c.uuid, c.mapping_id, m.title AS book_title, m.author AS book_author,
               m.calibre_book_id AS book_id
        FROM qc_comments c
        LEFT JOIN qc_book_mapping m ON m.id = c.mapping_id
        WHERE c.id = ?
      `).get(reviewId);
      const result = this.db.prepare('DELETE FROM qc_comments WHERE id = ?').run(reviewId);
      const ok = result.changes > 0;
      if (ok && existing) {
        triggerGitSync('delete', reviewId, { review: existing });
      }
      return ok;
    } catch (error) {
      console.error('❌ 删除书评失败:', error.message);
      return false;
    }
  }

  /**
   * 格式化书评返回数据
   */
  formatReview(review, bookPathMap) {
    const bookId = review.book_id;
    let coverUrl = null;
    if (bookId) {
      const bookPath = bookPathMap.get(bookId);
      if (bookPath) {
        coverUrl = `/api/static/calibre/${encodeURIComponent(bookPath)}/cover.jpg`;
      } else {
        coverUrl = `/api/static/calibre/${bookId}/cover.jpg`;
      }
    }

    return {
      id: review.id,
      uuid: review.uuid,
      mapping_id: review.mapping_id,
      user_id: review.user_id,
      content: review.content,
      title: review.title || '',
      rating: review.rating || 0,
      book_id: bookId,
      bookId: bookId,
      bookTitle: review.book_title || '未知书籍',
      bookAuthor: review.book_author || '',
      book_title: review.book_title,
      book_author: review.book_author,
      coverUrl: coverUrl,
      sync_status: review.sync_status || 'none',
      last_synced_at: review.last_synced_at,
      created_at: review.created_at,
      updated_at: review.updated_at,
      createTime: review.created_at,
      updateTime: review.updated_at
    };
  }
}

export default new ReviewService();
