/**
 * Talebook 阅读状态仓储 (reading_state 表)
 * 处理阅读状态相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Talebook 阅读状态仓储类
 */
class ReadingStateRepository extends BaseRepository {
  /**
   * 根据书籍ID和读者ID查找阅读状态
   */
  find(bookId, readerId = 0) {
    try {
      const query = `
        SELECT * FROM reading_state
        WHERE book_id = ? AND reader_id = ?
      `;
      return this.queryOne(query, [bookId, readerId]);
    } catch (error) {
      console.error(`❌ 查找书籍 ID=${bookId} 的阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据书籍ID查找所有读者的阅读状态
   */
  findByBookId(bookId) {
    try {
      const query = 'SELECT * FROM reading_state WHERE book_id = ?';
      return this.queryAll(query, [bookId]);
    } catch (error) {
      console.error(`❌ 查找书籍 ID=${bookId} 的所有阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据读者ID查找所有书籍的阅读状态
   */
  findByReaderId(readerId = 0) {
    try {
      const query = 'SELECT * FROM reading_state WHERE reader_id = ?';
      return this.queryAll(query, [readerId]);
    } catch (error) {
      console.error(`❌ 查找读者 ID=${readerId} 的阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建或更新阅读状态
   */
  upsert(bookId, data, readerId = 0) {
    try {
      const existing = this.find(bookId, readerId);

      if (existing) {
        // 更新
        const updates = [];
        const values = [];

        if (data.favorite !== undefined) {
          updates.push('favorite = ?');
          values.push(data.favorite);
          if (data.favorite === 1 && (!existing.favorite_date || existing.favorite === 0)) {
            updates.push('favorite_date = ?');
            values.push(new Date().toISOString());
          }
        }
        if (data.wants !== undefined) {
          updates.push('wants = ?');
          values.push(data.wants);
          if (data.wants === 1 && (!existing.wants_date || existing.wants === 0)) {
            updates.push('wants_date = ?');
            values.push(new Date().toISOString());
          }
        }
        if (data.read_state !== undefined) {
          updates.push('read_state = ?');
          values.push(data.read_state);
          if (data.read_state === 1 && !existing.read_date) {
            updates.push('read_date = ?');
            values.push(new Date().toISOString());
          }
        }
        if (data.online_read !== undefined) {
          updates.push('online_read = ?');
          values.push(data.online_read);
        }
        if (data.download !== undefined) {
          updates.push('download = ?');
          values.push(data.download);
        }

        if (updates.length > 0) {
          values.push(bookId, readerId);
          const sql = `UPDATE reading_state SET ${updates.join(', ')} WHERE book_id = ? AND reader_id = ?`;
          this.execute(sql, values);
        }

        return this.find(bookId, readerId);
      } else {
        // 创建
        const stateData = {
          book_id: bookId,
          reader_id: readerId,
          favorite: data.favorite || 0,
          favorite_date: data.favorite === 1 ? new Date().toISOString() : null,
          wants: data.wants || 0,
          wants_date: data.wants === 1 ? new Date().toISOString() : null,
          read_state: data.read_state || 0,
          read_date: data.read_state === 1 ? new Date().toISOString() : null,
          online_read: data.online_read || 0,
          download: data.download || 0
        };

        this.insert('reading_state', stateData);
        return this.find(bookId, readerId);
      }
    } catch (error) {
      console.error(`❌ 创建/更新书籍 ID=${bookId} 的阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 设置收藏状态
   */
  setFavorite(bookId, favorite, readerId = 0) {
    return this.upsert(bookId, { favorite }, readerId);
  }

  /**
   * 设置想读状态
   */
  setWants(bookId, wants, readerId = 0) {
    return this.upsert(bookId, { wants }, readerId);
  }

  /**
   * 设置阅读状态
   */
  setReadState(bookId, readState, readerId = 0) {
    return this.upsert(bookId, { read_state: readState }, readerId);
  }

  /**
   * 删除阅读状态
   */
  delete(bookId, readerId = 0) {
    try {
      const result = this.execute('DELETE FROM reading_state WHERE book_id = ? AND reader_id = ?', [bookId, readerId]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${bookId} 的阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍的所有阅读状态
   */
  deleteByBookId(bookId) {
    try {
      const result = this.execute('DELETE FROM reading_state WHERE book_id = ?', [bookId]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${bookId} 的所有阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取收藏的书籍
   */
  getFavorites(readerId = 0) {
    try {
      const query = `
        SELECT rs.*, b.title, b.path, b.has_cover
        FROM reading_state rs
        LEFT JOIN books b ON b.id = rs.book_id
        WHERE rs.reader_id = ? AND rs.favorite = 1
        ORDER BY rs.favorite_date DESC
      `;
      return this.queryAll(query, [readerId]);
    } catch (error) {
      console.error('❌ 获取收藏书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取想读的书籍
   */
  getWants(readerId = 0) {
    try {
      const query = `
        SELECT rs.*, b.title, b.path, b.has_cover
        FROM reading_state rs
        LEFT JOIN books b ON b.id = rs.book_id
        WHERE rs.reader_id = ? AND rs.wants = 1
        ORDER BY rs.wants_date DESC
      `;
      return this.queryAll(query, [readerId]);
    } catch (error) {
      console.error('❌ 获取想读书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取已读的书籍
   */
  getRead(readerId = 0) {
    try {
      const query = `
        SELECT rs.*, b.title, b.path, b.has_cover
        FROM reading_state rs
        LEFT JOIN books b ON b.id = rs.book_id
        WHERE rs.reader_id = ? AND rs.read_state = 1
        ORDER BY rs.read_date DESC
      `;
      return this.queryAll(query, [readerId]);
    } catch (error) {
      console.error('❌ 获取已读书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 统计阅读状态
   */
  getStats(readerId = 0) {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN favorite = 1 THEN 1 ELSE 0 END) as favorites,
          SUM(CASE WHEN wants = 1 THEN 1 ELSE 0 END) as wants,
          SUM(CASE WHEN read_state = 1 THEN 1 ELSE 0 END) as read
        FROM reading_state
        WHERE reader_id = ?
      `;
      return this.queryOne(query, [readerId]);
    } catch (error) {
      console.error('❌ 统计阅读状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量更新阅读状态
   */
  batchUpdate(bookIds, data, readerId = 0) {
    try {
      const updateStates = this.transaction((ids) => {
        return ids.map(bookId => this.upsert(bookId, data, readerId));
      });
      return updateStates(bookIds);
    } catch (error) {
      console.error('❌ 批量更新阅读状态失败:', error.message);
      throw error;
    }
  }
}

export default ReadingStateRepository;
