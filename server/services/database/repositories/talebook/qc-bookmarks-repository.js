/**
 * Talebook 书摘仓储 (qc_bookmarks 表)
 * 处理书摘相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Talebook 书摘仓储类
 */
class QcBookmarksRepository extends BaseRepository {
  /**
   * 查找所有书摘
   */
  findAll(options = {}) {
    try {
      const { bookId, tag } = options;

      let query = 'SELECT * FROM qc_bookmarks';
      const params = [];
      const conditions = [];

      if (bookId) {
        conditions.push('book_id = ?');
        params.push(bookId);
      }

      if (tag) {
        conditions.push(`
          EXISTS (
            SELECT 1 FROM qc_bookmark_tags qbt
            WHERE qbt.bookmark_id = qc_bookmarks.id AND qbt.tag_name = ?
          )
        `);
        params.push(tag);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      return this.queryAll(query, params);
    } catch (error) {
      console.error('❌ 获取书摘列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找书摘
   */
  findById(id) {
    try {
      const query = 'SELECT * FROM qc_bookmarks WHERE id = ?';
      return this.queryOne(query, [id]);
    } catch (error) {
      console.error(`❌ 查找书摘 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据书籍ID查找书摘
   */
  findByBookId(bookId) {
    try {
      const query = 'SELECT * FROM qc_bookmarks WHERE book_id = ? ORDER BY created_at DESC';
      return this.queryAll(query, [bookId]);
    } catch (error) {
      console.error(`❌ 获取书籍 ID=${bookId} 的书摘失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建书摘
   */
  create(data) {
    try {
      const bookmarkData = {
        book_id: data.book_id,
        book_title: data.book_title || '',
        book_author: data.book_author || '',
        content: data.content,
        note: data.note || '',
        page: data.page || null
      };

      const id = this.insert('qc_bookmarks', bookmarkData);

      // 添加标签
      if (data.tags && data.tags.length > 0) {
        const addTags = this.transaction((tags) => {
          tags.forEach(tag => {
            this.prepare('INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name) VALUES (?, ?)').run(id, tag);
          });
        });
        addTags(data.tags);
      }

      return this.findById(id);
    } catch (error) {
      console.error('❌ 创建书摘失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新书摘
   */
  update(id, data) {
    try {
      const updates = [];
      const values = [];

      if (data.content !== undefined) {
        updates.push('content = ?');
        values.push(data.content);
      }
      if (data.note !== undefined) {
        updates.push('note = ?');
        values.push(data.note);
      }
      if (data.page !== undefined) {
        updates.push('page = ?');
        values.push(data.page);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        const sql = `UPDATE qc_bookmarks SET ${updates.join(', ')} WHERE id = ?`;
        this.execute(sql, values);
      }

      // 更新标签
      if (data.tags !== undefined) {
        // 删除旧标签
        this.execute('DELETE FROM qc_bookmark_tags WHERE bookmark_id = ?', [id]);
        // 添加新标签
        if (data.tags.length > 0) {
          const addTags = this.transaction((tags) => {
            tags.forEach(tag => {
              this.prepare('INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name) VALUES (?, ?)').run(id, tag);
            });
          });
          addTags(data.tags);
        }
      }

      return this.findById(id);
    } catch (error) {
      console.error(`❌ 更新书摘 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书摘
   */
  delete(id) {
    try {
      // 删除标签关联
      this.execute('DELETE FROM qc_bookmark_tags WHERE bookmark_id = ?', [id]);
      // 删除书摘
      const result = this.execute('DELETE FROM qc_bookmarks WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书摘 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍的所有书摘
   */
  deleteByBookId(bookId) {
    try {
      // 获取该书的所有书摘ID
      const bookmarks = this.findByBookId(bookId);
      const bookmarkIds = bookmarks.map(b => b.id);

      if (bookmarkIds.length === 0) {
        return true;
      }

      // 删除标签关联
      const placeholders = bookmarkIds.map(() => '?').join(',');
      this.execute(`DELETE FROM qc_bookmark_tags WHERE bookmark_id IN (${placeholders})`, bookmarkIds);
      // 删除书摘
      this.execute(`DELETE FROM qc_bookmarks WHERE id IN (${placeholders})`, bookmarkIds);

      return true;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${bookId} 的所有书摘失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索书摘
   */
  search(keyword) {
    try {
      const query = `
        SELECT * FROM qc_bookmarks
        WHERE content LIKE ? OR note LIKE ?
        ORDER BY created_at DESC
      `;
      const pattern = `%${keyword}%`;
      return this.queryAll(query, [pattern, pattern]);
    } catch (error) {
      console.error('❌ 搜索书摘失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取书摘的所有标签
   */
  getTags(bookmarkId) {
    try {
      const query = 'SELECT DISTINCT tag_name FROM qc_bookmark_tags WHERE bookmark_id = ?';
      const result = this.queryAll(query, [bookmarkId]);
      return result.map(r => r.tag_name);
    } catch (error) {
      console.error(`❌ 获取书摘 ID=${bookmarkId} 的标签失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取所有标签
   */
  getAllTags() {
    try {
      const query = `
        SELECT
          tag_name,
          COUNT(*) as count
        FROM qc_bookmark_tags
        GROUP BY tag_name
        ORDER BY count DESC, tag_name ASC
      `;
      return this.queryAll(query);
    } catch (error) {
      console.error('❌ 获取所有标签失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量创建书摘
   */
  batchCreate(bookmarks) {
    try {
      const createBookmarks = this.transaction((items) => {
        return items.map(item => this.create(item));
      });
      return createBookmarks(bookmarks);
    } catch (error) {
      console.error('❌ 批量创建书摘失败:', error.message);
      throw error;
    }
  }
}

export default QcBookmarksRepository;
