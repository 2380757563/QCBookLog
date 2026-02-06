/**
 * Talebook 书籍扩展数据仓储 (qc_bookdata 表)
 * 处理书籍扩展数据（页数、价格、阅读追踪等）的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Talebook 书籍扩展数据仓储类
 */
class QcBookdataRepository extends BaseRepository {
  /**
   * 根据书籍ID查找扩展数据
   */
  findByBookId(bookId) {
    try {
      const query = 'SELECT * FROM qc_bookdata WHERE book_id = ?';
      return this.queryOne(query, [bookId]);
    } catch (error) {
      console.error(`❌ 查找书籍 ID=${bookId} 的扩展数据失败:`, error.message);
      throw error;
    }
  }

  /**
   * 批量根据书籍ID查找扩展数据
   */
  findByBookIds(bookIds) {
    try {
      if (!bookIds || bookIds.length === 0) {
        return [];
      }

      const placeholders = bookIds.map(() => '?').join(',');
      const query = `SELECT * FROM qc_bookdata WHERE book_id IN (${placeholders})`;
      return this.queryAll(query, bookIds);
    } catch (error) {
      console.error('❌ 批量查找书籍扩展数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建或更新书籍扩展数据
   */
  upsert(bookId, data) {
    try {
      const existing = this.findByBookId(bookId);

      if (existing) {
        // 更新
        const updates = [];
        const values = [];

        if (data.page_count !== undefined) {
          updates.push('page_count = ?');
          values.push(data.page_count);
        }
        if (data.standard_price !== undefined) {
          updates.push('standard_price = ?');
          values.push(data.standard_price);
        }
        if (data.purchase_price !== undefined) {
          updates.push('purchase_price = ?');
          values.push(data.purchase_price);
        }
        if (data.purchase_date !== undefined) {
          updates.push('purchase_date = ?');
          values.push(data.purchase_date);
        }
        if (data.binding1 !== undefined) {
          updates.push('binding1 = ?');
          values.push(data.binding1);
        }
        if (data.binding2 !== undefined) {
          updates.push('binding2 = ?');
          values.push(data.binding2);
        }
        if (data.note !== undefined) {
          updates.push('note = ?');
          values.push(data.note);
        }
        if (data.total_reading_time !== undefined) {
          updates.push('total_reading_time = ?');
          values.push(data.total_reading_time);
        }
        if (data.read_pages !== undefined) {
          updates.push('read_pages = ?');
          values.push(data.read_pages);
        }
        if (data.reading_count !== undefined) {
          updates.push('reading_count = ?');
          values.push(data.reading_count);
        }
        if (data.last_read_date !== undefined) {
          updates.push('last_read_date = ?');
          values.push(data.last_read_date);
        }
        if (data.last_read_duration !== undefined) {
          updates.push('last_read_duration = ?');
          values.push(data.last_read_duration);
        }

        if (updates.length > 0) {
          values.push(bookId);
          const sql = `UPDATE qc_bookdata SET ${updates.join(', ')} WHERE book_id = ?`;
          this.execute(sql, values);
        }

        return this.findByBookId(bookId);
      } else {
        // 创建
        const insertData = {
          book_id: bookId,
          page_count: data.page_count || 0,
          standard_price: data.standard_price || 0,
          purchase_price: data.purchase_price || 0,
          purchase_date: data.purchase_date || null,
          binding1: data.binding1 || 0,
          binding2: data.binding2 || 0,
          note: data.note || '',
          total_reading_time: data.total_reading_time || 0,
          read_pages: data.read_pages || 0,
          reading_count: data.reading_count || 0,
          last_read_date: data.last_read_date || null,
          last_read_duration: data.last_read_duration || 0
        };

        this.insert('qc_bookdata', insertData);
        return this.findByBookId(bookId);
      }
    } catch (error) {
      console.error(`❌ 创建/更新书籍 ID=${bookId} 的扩展数据失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新阅读进度
   */
  updateReadingProgress(bookId, readPages, duration = 0) {
    try {
      const existing = this.findByBookId(bookId);
      const now = new Date().toISOString();

      if (existing) {
        const updates = [];
        const values = [];

        updates.push('read_pages = ?');
        values.push(readPages);
        updates.push('last_read_date = ?');
        values.push(now);
        updates.push('last_read_duration = ?');
        values.push(duration);
        updates.push('reading_count = reading_count + 1');
        updates.push('total_reading_time = total_reading_time + ?');
        values.push(duration);

        values.push(bookId);
        const sql = `UPDATE qc_bookdata SET ${updates.join(', ')} WHERE book_id = ?`;
        this.execute(sql, values);
      } else {
        this.insert('qc_bookdata', {
          book_id: bookId,
          read_pages: readPages,
          last_read_date: now,
          last_read_duration: duration,
          reading_count: 1,
          total_reading_time: duration
        });
      }

      return this.findByBookId(bookId);
    } catch (error) {
      console.error(`❌ 更新书籍 ID=${bookId} 的阅读进度失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍扩展数据
   */
  deleteByBookId(bookId) {
    try {
      const result = this.execute('DELETE FROM qc_bookdata WHERE book_id = ?', [bookId]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${bookId} 的扩展数据失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取阅读统计
   */
  getReadingStats() {
    try {
      const query = `
        SELECT
          COUNT(*) as total_books,
          SUM(read_pages) as total_pages,
          SUM(total_reading_time) as total_time,
          SUM(reading_count) as total_readings,
          MAX(last_read_date) as last_read_date
        FROM qc_bookdata
        WHERE read_pages > 0
      `;
      return this.queryOne(query);
    } catch (error) {
      console.error('❌ 获取阅读统计失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取最近阅读的书籍
   */
  getRecentlyRead(limit = 10) {
    try {
      const query = `
        SELECT
          qbd.*,
          b.title,
          b.path
        FROM qc_bookdata qbd
        LEFT JOIN books b ON b.id = qbd.book_id
        WHERE qbd.last_read_date IS NOT NULL
        ORDER BY qbd.last_read_date DESC
        LIMIT ?
      `;
      return this.queryAll(query, [limit]);
    } catch (error) {
      console.error('❌ 获取最近阅读的书籍失败:', error.message);
      throw error;
    }
  }
}

export default QcBookdataRepository;
