/**
 * 阅读追踪服务
 * 处理阅读记录、阅读统计等业务逻辑
 */

import databaseService from './database/index.js';
import calibreService from './calibreService.js';
import activityService from './activityService.js';

class ReadingTrackingService {
  constructor() {
    console.log('🔍 ReadingTrackingService 构造函数调用');
    console.log(`   databaseService.calibreDb: ${databaseService.calibreDb ? '已连接' : 'null'}`);
    console.log(`   databaseService.talebookDb: ${databaseService.talebookDb ? '已连接' : 'null'}`);
    // 不再缓存数据库连接，每次使用时都从databaseService获取
  }

  /**
   * 更新数据库连接（此方法已废弃，保留用于向后兼容）
   */
  updateConnection() {
    console.log('🔄 readingTrackingService.updateConnection() 已废弃，请直接使用 databaseService');
    // 不再更新缓存的数据库连接
  }

  // ==================== 阅读记录管理 ====================

  /**
   * 创建阅读记录
   * @param {Object} recordData - 阅读记录数据
   * @param {number} recordData.bookId - 书籍ID
   * @param {number} recordData.readerId - 读者ID
   * @param {string} recordData.startTime - 开始时间
   * @param {string} recordData.endTime - 结束时间
   * @param {number} recordData.duration - 阅读时长(分钟)
   * @param {number} [recordData.startPage=0] - 开始页码
   * @param {number} [recordData.endPage=0] - 结束页码（当前阅读到的页数）
   * @param {number} [recordData.pagesRead=0] - 本次阅读页数
   * @returns {Object} 创建的阅读记录
   */
  async createReadingRecord(recordData) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    console.log('🔄 createReadingRecord 使用数据库:');
    console.log(`   qcBooklogDb: ${qcBooklogDb ? '已连接' : 'null'}`);
    
    if (!qcBooklogDb) {
      throw new Error('QCBookLog 数据库未连接');
    }

    const { bookId, readerId, startTime, endTime, duration, startPage = 0, endPage = 0, pagesRead = 0 } = recordData;

    try {
      console.log(`📝 准备插入阅读记录: bookId=${bookId}, readerId=${readerId}`);

      // 先把 actualReaderId 计算出来，防重复检查要用
      const actualReaderId = readerId !== undefined && readerId !== null ? readerId : 0;

      // 防重复：相同 (bookId, readerId, startTime) 的记录已存在则直接返回（前端 endReading 幂等锁失败时的兜底）
      const existing = qcBooklogDb.prepare(
        `SELECT id FROM qc_reading_records WHERE book_id = ? AND reader_id = ? AND start_time = ? LIMIT 1`
      ).get(bookId, actualReaderId, startTime);
      if (existing) {
        console.log(`♻️ 检测到重复阅读记录 (id=${existing.id})，跳过插入以避免重复`);
        return {
          id: existing.id,
          ...recordData,
          duplicate: true
        };
      }

      // 确保用户存在（处理外键约束）
      // 支持 readerId >= 0 的情况
      const existingUser = qcBooklogDb.prepare('SELECT id FROM qc_users WHERE id = ?').get(actualReaderId);
      if (!existingUser) {
        qcBooklogDb.prepare(`
          INSERT OR IGNORE INTO qc_users (id, username, display_name)
          VALUES (?, ?, ?)
        `).run(actualReaderId, `user_${actualReaderId}`, actualReaderId === 0 ? '默认用户' : `用户${actualReaderId}`);
        console.log(`✅ 创建用户: id=${actualReaderId}`);
      }

      // 确保书籍映射存在（使用复合键）
      if (bookId && bookId > 0) {
        const libraryUuid = databaseService.getCurrentLibraryUuid();
        const existingMapping = qcBooklogDb.prepare(`
          SELECT calibre_book_id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
        `).get(libraryUuid, bookId);
        if (!existingMapping) {
          qcBooklogDb.prepare(`
            INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id)
            VALUES (?, ?, ?)
          `).run(libraryUuid, bookId, bookId);
        }
      }

      // 确保书籍数据存在（处理外键约束）
      if (bookId && bookId > 0) {
        const existingBookData = qcBooklogDb.prepare('SELECT book_id FROM qc_bookdata WHERE book_id = ?').get(bookId);
        if (!existingBookData) {
          qcBooklogDb.prepare(`
            INSERT OR IGNORE INTO qc_bookdata (book_id, total_reading_time, read_pages, reading_count)
            VALUES (?, 0, 0, 0)
          `).run(bookId);
        }
      }

      const query = `
        INSERT INTO qc_reading_records (
          book_id, user_id, reader_id, start_time, end_time,
          duration, start_page, end_page, pages_read
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      console.log(`📝 SQL 查询: ${query.trim()}`);
      const result = qcBooklogDb.prepare(query).run(
        bookId, actualReaderId, actualReaderId, startTime, endTime,
        duration, startPage, endPage, pagesRead
      );

      console.log(`✅ 创建阅读记录: ID=${result.lastInsertRowid}, 书籍ID=${bookId}, 时长=${duration}分钟`);

      // 同步写入活动日志，便于时间线/详情页直接展示
      try {
        let bookInfo = null;
        try {
          const calibreDb = databaseService.calibreDb;
          if (calibreDb) {
            bookInfo = calibreDb.prepare(`
              SELECT b.id, b.title, b.has_cover, b.path,
                     GROUP_CONCAT(a.name, ' & ') as author
              FROM books b
              LEFT JOIN books_authors_link bal ON bal.book = b.id
              LEFT JOIN authors a ON a.id = bal.author
              WHERE b.id = ?
              GROUP BY b.id
            `).get(bookId);
          }
        } catch (e) {
          console.warn('⚠️ 读取 Calibre 书籍信息失败:', e.message);
        }
        activityService.logActivity({
          type: 'reading_record',
          userId: actualReaderId,
          readerId: actualReaderId,
          bookId,
          bookTitle: bookInfo?.title || null,
          bookAuthor: bookInfo?.author || null,
          bookCover: bookInfo?.has_cover ? `/api/book/${bookId}/cover` : null,
          startTime,
          endTime,
          duration,
          startPage,
          endPage,
          pagesRead
        });
      } catch (logErr) {
        console.warn('⚠️ 写入阅读活动日志失败:', logErr.message);
      }

      await this.updateBookReadingStats(bookId, actualReaderId, duration, pagesRead, startTime, endPage);

      const date = new Date(startTime).toISOString().split('T')[0];
      await this.updateDailyReadingStats(actualReaderId, date, 1, pagesRead, duration);

      calibreService.clearBooksListCache();
      console.log('🗑️ 已清除书籍列表缓存，前端将获取最新的阅读进度数据');

      return {
        id: result.lastInsertRowid,
        ...recordData
      };
    } catch (error) {
      console.error('❌ 创建阅读记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取书籍的阅读记录列表
   * @param {number} bookId - 书籍ID
   * @param {number} readerId - 读者ID
   * @param {number} [limit=10] - 返回记录数
   * @returns {Array} 阅读记录列表
   */
  async getBookReadingRecords(bookId, readerId, limit = 100) {
    const qcBooklogDb = databaseService.getQcBooklogDb();
    const calibreDb = databaseService.calibreDb;

    if (!qcBooklogDb) return [];

    try {
      const query = `
        SELECT
          id,
          book_id   AS bookId,
          reader_id AS readerId,
          start_time AS startTime,
          end_time   AS endTime,
          duration,
          start_page AS startPage,
          end_page   AS endPage,
          pages_read AS pagesRead,
          notes,
          created_at AS createdAt
        FROM qc_reading_records
        WHERE book_id = ? AND reader_id = ?
        ORDER BY start_time DESC
        LIMIT ?
      `;

      const records = qcBooklogDb.prepare(query).all(bookId, readerId, limit);
      console.log(`📚 [getBookReadingRecords] bookId=${bookId}, readerId=${readerId} 返回 ${records.length} 条`);

      // 附带书籍信息
      let bookMap = {};
      try {
        if (calibreDb) {
          const book = calibreDb.prepare(`
            SELECT b.id, b.title, b.has_cover, b.path,
                   GROUP_CONCAT(a.name, ' & ') as author
            FROM books b
            LEFT JOIN books_authors_link bal ON bal.book = b.id
            LEFT JOIN authors a ON a.id = bal.author
            WHERE b.id = ?
            GROUP BY b.id
          `).get(bookId);
          if (book) bookMap[book.id] = book;
        }
      } catch (e) {
        console.warn('⚠️ 读取 Calibre 书籍信息失败:', e.message);
      }

      return records.map(record => {
        const b = bookMap[record.bookId] || {};
        return {
          ...record,
          title: b.title || '',
          author: b.author || '',
          coverUrl: b.has_cover ? `/api/book/${record.bookId}/cover` : '',
          totalPages: 0
        };
      });
    } catch (error) {
      console.error('❌ 获取书籍阅读记录失败:', error);
      return [];
    }
  }

  async getReaderReadingRecords(readerId, startDate = null, endDate = null) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return [];

    try {
      let query = `
        SELECT
          id,
          book_id   AS bookId,
          reader_id AS readerId,
          start_time AS startTime,
          end_time   AS endTime,
          duration,
          start_page AS startPage,
          end_page   AS endPage,
          pages_read AS pagesRead,
          notes,
          created_at AS createdAt
        FROM qc_reading_records
        WHERE reader_id = ?
      `;
      const params = [readerId];

      if (startDate) {
        query += ` AND DATE(start_time) >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND DATE(start_time) <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY start_time DESC`;

      const records = qcBooklogDb.prepare(query).all(...params);

      return records.map(record => ({
        ...record,
        title: '',
        author: '',
        coverUrl: '',
        totalPages: 0
      }));
    } catch (error) {
      console.error('❌ 获取读者阅读记录失败:', error);
      return [];
    }
  }

  // ==================== 书籍阅读统计 ====================

  /**
   * 更新书籍的阅读统计
   * @param {number} bookId - 书籍ID
   * @param {number} readerId - 读者ID
   * @param {number} duration - 阅读时长(分钟)
   * @param {number} pagesRead - 本次阅读页数
   * @param {string} readDate - 阅读日期
   * @param {number} endPage - 当前阅读到的页数（用于替换read_pages）
   */
  async updateBookReadingStats(bookId, readerId, duration, pagesRead, readDate, endPage) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    console.log('🔄 updateBookReadingStats:');
    console.log(`   书籍ID: ${bookId}, 读者ID: ${readerId}`);
    console.log(`   本次阅读: ${pagesRead}页, 时长: ${duration}分钟`);
    console.log(`   当前阅读到第 ${endPage} 页`);

    if (!qcBooklogDb) {
      throw new Error('QCBookLog 数据库未连接');
    }

    try {
      // 确保书籍映射存在（使用复合键）
      if (bookId && bookId > 0) {
        const libraryUuid = databaseService.getCurrentLibraryUuid();
        const existingMapping = qcBooklogDb.prepare(`
          SELECT calibre_book_id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
        `).get(libraryUuid, bookId);
        if (!existingMapping) {
          qcBooklogDb.prepare(`
            INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id)
            VALUES (?, ?, ?)
          `).run(libraryUuid, bookId, bookId);
        }
      }

      // 确保书籍数据存在（处理外键约束）
      if (bookId && bookId > 0) {
        const existingBookData = qcBooklogDb.prepare('SELECT book_id FROM qc_bookdata WHERE book_id = ?').get(bookId);
        if (!existingBookData) {
          qcBooklogDb.prepare(`
            INSERT OR IGNORE INTO qc_bookdata (book_id, total_reading_time, read_pages, reading_count)
            VALUES (?, 0, 0, 0)
          `).run(bookId);
        }
      }

      const existing = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(bookId);

      if (existing) {
        const query = `
          UPDATE qc_bookdata
          SET
            total_reading_time = total_reading_time + ?,
            read_pages = ?,
            reading_count = reading_count + 1,
            last_read_date = ?,
            last_read_duration = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE book_id = ?
        `;

        const result = qcBooklogDb.prepare(query).run(
          duration,
          endPage,
          readDate,
          duration,
          bookId
        );

        console.log(`✅ 更新成功,影响行数: ${result.changes}`);
      } else {
        const insertQuery = `
          INSERT INTO qc_bookdata (
            book_id, total_reading_time, read_pages,
            reading_count, last_read_date, last_read_duration
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = qcBooklogDb.prepare(insertQuery).run(
          bookId, duration, endPage,
          1, readDate, duration
        );

        console.log(`✅ 插入成功,lastInsertRowid: ${result.lastInsertRowid}`);
      }

      console.log(`✅ 更新书籍阅读统计成功: 书籍ID=${bookId}, 总时长+${duration}分钟, 当前阅读到第${endPage}页`);
    } catch (error) {
      console.error('❌ 更新书籍阅读统计失败:', error);
      throw error;
    }
  }

  async getBookReadingStats(bookId, readerId) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return null;

    try {
      const bookData = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(bookId);

      if (!bookData) {
        return {
          totalReadingTime: 0,
          readPages: 0,
          readingCount: 0,
          lastReadDate: null,
          lastReadDuration: 0,
          totalPages: 0,
          progressPercent: 0
        };
      }

      const progressPercent = bookData.page_count > 0
        ? Math.round((bookData.read_pages * 100.0) / bookData.page_count)
        : 0;

      return {
        totalReadingTime: bookData.total_reading_time || 0,
        readPages: bookData.read_pages || 0,
        readingCount: bookData.reading_count || 0,
        lastReadDate: bookData.last_read_date,
        lastReadDuration: bookData.last_read_duration || 0,
        totalPages: bookData.page_count || 0,
        progressPercent
      };
    } catch (error) {
      console.error('❌ 获取书籍阅读统计失败:', error);
      return null;
    }
  }

  async updateDailyReadingStats(readerId, date, booksCount, pagesCount, timeDuration) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return;

    try {
      // 确保用户存在（支持 readerId >= 0）
      const actualReaderId = readerId !== undefined && readerId !== null ? readerId : 0;
      const existingUser = qcBooklogDb.prepare('SELECT id FROM qc_users WHERE id = ?').get(actualReaderId);
      if (!existingUser) {
        qcBooklogDb.prepare(`
          INSERT OR IGNORE INTO qc_users (id, username, display_name)
          VALUES (?, ?, ?)
        `).run(actualReaderId, `user_${actualReaderId}`, actualReaderId === 0 ? '默认用户' : `用户${actualReaderId}`);
      }

      const query = `
        INSERT INTO qc_daily_reading_stats
          (user_id, reader_id, stat_date, date, books_read_count, total_books, total_pages_read, total_pages, total_reading_time, total_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, stat_date) DO UPDATE SET
          books_read_count = books_read_count + ?,
          total_books = total_books + ?,
          total_pages_read = total_pages_read + ?,
          total_pages = total_pages + ?,
          total_reading_time = total_reading_time + ?,
          total_time = total_time + ?,
          updated_at = CURRENT_TIMESTAMP
      `;

      qcBooklogDb.prepare(query).run(
        actualReaderId, actualReaderId, date, date, booksCount, booksCount, pagesCount, pagesCount, timeDuration, timeDuration,
        booksCount, booksCount, pagesCount, pagesCount, timeDuration, timeDuration
      );

      console.log(`✅ 更新每日阅读统计: 日期=${date}, 书籍+${booksCount}, 页数+${pagesCount}, 时长+${timeDuration}分钟`);
    } catch (error) {
      console.error('❌ 更新每日阅读统计失败:', error);
      throw error;
    }
  }

  async getDailyReadingStats(readerId, startDate = null, endDate = null) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return [];

    try {
      let query = `
        SELECT * FROM qc_daily_reading_stats
        WHERE reader_id = ?
      `;
      const params = [readerId];

      if (startDate) {
        query += ` AND stat_date >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND stat_date <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY stat_date DESC`;

      const stats = qcBooklogDb.prepare(query).all(...params);
      return stats;
    } catch (error) {
      console.error('❌ 获取每日阅读统计失败:', error);
      return [];
    }
  }

  async getDailyReadingDetails(readerId, date) {
    const qcBooklogDb = databaseService.getQcBooklogDb();
    const calibreDb = databaseService.calibreDb;

    if (!qcBooklogDb || !calibreDb) return [];

    try {
      const query = `
        SELECT
          id,
          book_id   AS bookId,
          reader_id AS readerId,
          start_time AS startTime,
          end_time   AS endTime,
          duration,
          start_page AS startPage,
          end_page   AS endPage,
          pages_read AS pagesRead,
          notes,
          created_at AS createdAt
        FROM qc_reading_records
        WHERE reader_id = ? AND DATE(start_time) = ?
        ORDER BY start_time ASC
      `;

      const records = qcBooklogDb.prepare(query).all(readerId, date);

      if (records.length > 0) {
        try {
          const bookIds = [...new Set(records.map(r => r.book_id))];
          const bookIdsStr = bookIds.join(',');

          const books = calibreDb.prepare(`
            SELECT 
              b.id,
              b.title,
              b.uuid,
              b.has_cover,
              b.path,
              GROUP_CONCAT(a.name, ' & ') as author
            FROM books b
            LEFT JOIN books_authors_link bal ON bal.book = b.id
            LEFT JOIN authors a ON a.id = bal.author
            WHERE b.id IN (${bookIdsStr})
            GROUP BY b.id
          `).all();

          const bookMap = books.reduce((acc, book) => {
            acc[book.id] = book;
            return acc;
          }, {});

          return records.map(record => {
            const bookInfo = bookMap[record.book_id] || {};
            return {
              ...record,
              book_title: bookInfo.title || '',
              book_author: bookInfo.author || '',
              book_cover: bookInfo.has_cover ? `/api/book/${record.book_id}/cover` : '',
              book_uuid: bookInfo.uuid || '',
              book_path: bookInfo.path || '',
              total_pages: 0
            };
          });
        } catch (error) {
          console.error(`❌ 获取书籍信息失败: ${error.message}`);
        }
      }

      return records;
    } catch (error) {
      console.error('❌ 获取每日阅读详情失败:', error);
      return [];
    }
  }

  async getHeatmapData(readerId, year) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return {};

    try {
      const query = `
        SELECT
          DATE(start_time) as date,
          SUM(duration) as totalDuration,
          COUNT(DISTINCT book_id) as totalBooks,
          SUM(pages_read) as totalPages
        FROM qc_reading_records
        WHERE reader_id = ? AND strftime('%Y', start_time) = ?
        GROUP BY DATE(start_time)
      `;

      const rows = qcBooklogDb.prepare(query).all(readerId, year);

      const result = {};
      rows.forEach(row => {
        result[row.date] = {
          duration: row.totalDuration,
          books: row.totalBooks,
          pages: row.totalPages
        };
      });

      console.log(`✅ 获取热力图数据: 年份=${year}, 数据点数=${Object.keys(result).length}`);
      return result;
    } catch (error) {
      console.error('❌ 获取热力图数据失败:', error);
      return {};
    }
  }

  async getReaderSummary(readerId) {
    const qcBooklogDb = databaseService.getQcBooklogDb();

    if (!qcBooklogDb) return null;

    try {
      const totalRecords = qcBooklogDb.prepare(
        `SELECT COUNT(*) as count FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.count || 0;

      const totalTime = qcBooklogDb.prepare(
        `SELECT SUM(duration) as total FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.total || 0;

      const totalPages = qcBooklogDb.prepare(
        `SELECT SUM(pages_read) as total FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.total || 0;

      const totalBooks = qcBooklogDb.prepare(
        `SELECT COUNT(DISTINCT book_id) as count FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.count || 0;

      const latest = qcBooklogDb.prepare(
        `SELECT DATE(MAX(start_time)) as date FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.date || null;

      return {
        totalRecords,
        totalTime,
        totalPages,
        totalBooks,
        latestReadDate: latest
      };
    } catch (error) {
      console.error('❌ 获取读者汇总统计失败:', error);
      return null;
    }
  }
}

export default new ReadingTrackingService();
