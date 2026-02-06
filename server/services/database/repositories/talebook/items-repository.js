/**
 * Talebook 统计信息仓储 (items 表)
 * 处理书籍统计信息相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Talebook 统计信息仓储类
 */
class ItemsRepository extends BaseRepository {
  /**
   * 查找所有书籍统计信息
   */
  findAll() {
    try {
      return this.queryAll('SELECT * FROM items ORDER BY create_time DESC');
    } catch (error) {
      console.error('❌ 获取书籍统计信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据书籍ID查找统计信息
   */
  findByBookId(bookId) {
    try {
      const query = 'SELECT * FROM items WHERE book_id = ?';
      return this.queryOne(query, [bookId]);
    } catch (error) {
      console.error(`❌ 查找书籍 ID=${bookId} 的统计信息失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量根据书籍ID查找统计信息
   */
  findByBookIds(bookIds) {
    try {
      if (!bookIds || bookIds.length === 0) {
        return [];
      }

      const placeholders = bookIds.map(() => '?').join(',');
      const query = `SELECT * FROM items WHERE book_id IN (${placeholders})`;
      return this.queryAll(query, bookIds);
    } catch (error) {
      console.error('❌ 批量查找书籍统计信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建或更新书籍统计信息
   */
  upsert(bookId, data) {
    try {
      const existing = this.findByBookId(bookId);

      if (existing) {
        // 更新
        const updates = [];
        const values = [];

        if (data.count_guest !== undefined) {
          updates.push('count_guest = ?');
          values.push(data.count_guest);
        }
        if (data.count_visit !== undefined) {
          updates.push('count_visit = ?');
          values.push(data.count_visit);
        }
        if (data.count_download !== undefined) {
          updates.push('count_download = ?');
          values.push(data.count_download);
        }
        if (data.website !== undefined) {
          updates.push('website = ?');
          values.push(data.website);
        }
        if (data.collector_id !== undefined) {
          updates.push('collector_id = ?');
          values.push(data.collector_id);
        }
        if (data.sole !== undefined) {
          updates.push('sole = ?');
          values.push(data.sole);
        }
        if (data.book_type !== undefined) {
          updates.push('book_type = ?');
          values.push(data.book_type);
        }
        if (data.book_count !== undefined) {
          updates.push('book_count = ?');
          values.push(data.book_count);
        }

        if (updates.length > 0) {
          values.push(bookId);
          const sql = `UPDATE items SET ${updates.join(', ')} WHERE book_id = ?`;
          this.execute(sql, values);
        }

        return this.findByBookId(bookId);
      } else {
        // 创建
        const insertData = {
          book_id: bookId,
          count_guest: data.count_guest || 0,
          count_visit: data.count_visit || 0,
          count_download: data.count_download || 0,
          website: data.website || '',
          collector_id: data.collector_id || null,
          sole: data.sole || 0,
          book_type: data.book_type || 1,
          book_count: data.book_count || 0
        };

        this.insert('items', insertData);
        return this.findByBookId(bookId);
      }
    } catch (error) {
      console.error(`❌ 创建/更新书籍 ID=${bookId} 的统计信息失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍统计信息
   */
  deleteByBookId(bookId) {
    try {
      const result = this.execute('DELETE FROM items WHERE book_id = ?', [bookId]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${bookId} 的统计信息失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新访问计数
   */
  incrementVisitCount(bookId) {
    try {
      this.execute(`
        INSERT INTO items (book_id, count_visit)
        VALUES (?, 1)
        ON CONFLICT(book_id) DO UPDATE SET count_visit = count_visit + 1
      `, [bookId]);
    } catch (error) {
      console.error(`❌ 更新书籍 ID=${bookId} 的访问计数失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新下载计数
   */
  incrementDownloadCount(bookId) {
    try {
      this.execute(`
        INSERT INTO items (book_id, count_download)
        VALUES (?, 1)
        ON CONFLICT(book_id) DO UPDATE SET count_download = count_download + 1
      `, [bookId]);
    } catch (error) {
      console.error(`❌ 更新书籍 ID=${bookId} 的下载计数失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取热门书籍（按访问次数排序）
   */
  getTopBooks(limit = 10) {
    try {
      const query = `
        SELECT
          i.book_id,
          i.count_visit,
          i.count_download,
          b.title,
          b.path
        FROM items i
        LEFT JOIN books b ON b.id = i.book_id
        ORDER BY i.count_visit DESC, i.count_download DESC
        LIMIT ?
      `;
      return this.queryAll(query, [limit]);
    } catch (error) {
      console.error('❌ 获取热门书籍失败:', error.message);
      throw error;
    }
  }
}

export default ItemsRepository;
