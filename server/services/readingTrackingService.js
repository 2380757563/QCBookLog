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
    // 直接使用 databaseService 的属性
    const talebookDb = databaseService.talebookDb;

    console.log('🔄 createReadingRecord 使用数据库:');
    console.log(`   talebookDb: ${talebookDb ? '已连接' : 'null'}`);
    
    if (talebookDb) {
      console.log(`   talebookDb 数据库名称: ${talebookDb.name || 'unknown'}`);
      try {
        const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5").all();
        console.log(`   talebookDb 表列表: ${tables.map(t => t.name).join(', ')}`);
      } catch (error) {
        console.error(`   ❌ 检查 talebookDb 表失败: ${error.message}`);
      }
    }

    if (!talebookDb) {
      throw new Error('Talebook 数据库未连接');
    }

    const { bookId, readerId, startTime, endTime, duration, startPage = 0, endPage = 0, pagesRead = 0 } = recordData;

    try {
      console.log(`📝 准备插入阅读记录: bookId=${bookId}, readerId=${readerId}`);
      
      // 使用 talebookDb 插入阅读记录
      const query = `
        INSERT INTO qc_reading_records (
          book_id, reader_id, start_time, end_time,
          duration, start_page, end_page, pages_read
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      console.log(`📝 SQL 查询: ${query.trim()}`);
      const result = talebookDb.prepare(query).run(
        bookId, readerId, startTime, endTime,
        duration, startPage, endPage, pagesRead
      );

      console.log(`✅ 创建阅读记录: ID=${result.lastInsertRowid}, 书籍ID=${bookId}, 时长=${duration}分钟`);

      // 更新书籍的阅读统计 - 传递endPage而不是pagesRead，以便替换为当前阅读到的页数
      await this.updateBookReadingStats(bookId, readerId, duration, pagesRead, startTime, endPage);

      // 更新每日统计
      const date = new Date(startTime).toISOString().split('T')[0];
      await this.updateDailyReadingStats(readerId, date, 1, pagesRead, duration);

      // 清除书籍列表缓存，确保前端能获取到最新的阅读进度数据
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
  async getBookReadingRecords(bookId, readerId, limit = 10) {
    // 直接从 databaseService 获取 talebookDb
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return [];

    try {
      // 从 Talebook 数据库获取阅读记录
      const query = `
        SELECT *
        FROM qc_reading_records
        WHERE book_id = ? AND reader_id = ?
        ORDER BY start_time DESC
        LIMIT ?
      `;

      const records = talebookDb.prepare(query).all(bookId, readerId, limit);

      // 从 qc_bookdata 表获取书籍信息
      if (records.length > 0) {
        try {
          const bookData = talebookDb.prepare('SELECT page_count FROM qc_bookdata WHERE book_id = ?').get(bookId);

          // 合并书籍信息
          return records.map(record => ({
            ...record,
            title: '',
            author: '',
            coverUrl: '',
            totalPages: bookData?.page_count || 0
          }));
        } catch (error) {
          console.error(`❌ 从 qc_bookdata 表获取书籍信息失败: ${error.message}`);
        }
      }

      return records;
    } catch (error) {
      console.error('❌ 获取书籍阅读记录失败:', error);
      return [];
    }
  }

  /**
   * 获取读者的所有阅读记录
   * @param {number} readerId - 读者ID
   * @param {string} [startDate=null] - 开始日期
   * @param {string} [endDate=null] - 结束日期
   * @returns {Array} 阅读记录列表
   */
  async getReaderReadingRecords(readerId, startDate = null, endDate = null) {
    // 直接从 databaseService 获取 talebookDb
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return [];

    try {
      let query = `
        SELECT *
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

      const records = talebookDb.prepare(query).all(...params);

      // 从 qc_bookdata 表获取书籍信息
      if (records.length > 0) {
        try {
          const bookIds = [...new Set(records.map(r => r.book_id))];
          const bookIdsStr = bookIds.join(',');
          const books = talebookDb.prepare(
            `SELECT book_id as id, page_count FROM qc_bookdata WHERE book_id IN (${bookIdsStr})`
          ).all();

          const bookMap = books.reduce((acc, book) => {
            acc[book.id] = book;
            return acc;
          }, {});

          // 合并书籍信息
          return records.map(record => ({
            ...record,
            title: '',
            author: '',
            coverUrl: '',
            totalPages: bookMap[record.book_id]?.page_count || 0
          }));
        } catch (error) {
          console.error(`❌ 从 qc_bookdata 表获取书籍信息失败: ${error.message}`);
        }
      }

      return records;
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
    // 直接从 databaseService 获取 talebookDb
    const talebookDb = databaseService.talebookDb;

    console.log('🔄 updateBookReadingStats 使用数据库:');
    console.log(`   talebookDb: ${talebookDb ? '已连接' : 'null'}`);
    console.log(`   书籍ID: ${bookId}, 读者ID: ${readerId}`);
    console.log(`   本次阅读: ${pagesRead}页, 时长: ${duration}分钟`);
    console.log(`   当前阅读到第 ${endPage} 页, 将更新 qc_bookdata.read_pages`);

    if (!talebookDb) {
      throw new Error('Talebook 数据库未连接');
    }

    try {
      // 检查 qc_bookdata 表是否存在
      const tableExists = talebookDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='qc_bookdata'
      `).get();

      if (!tableExists) {
        console.error('❌ qc_bookdata 表不存在!');
        throw new Error('qc_bookdata 表不存在,请先创建表');
      }

      // 从 qc_bookdata 表获取书籍的页数
      let totalPages = 0;
      console.log(`📖 查询书籍页数，bookId: ${bookId}`);

      try {
        const bookData = talebookDb.prepare('SELECT page_count FROM qc_bookdata WHERE book_id = ?').get(bookId);
        totalPages = bookData?.page_count || 0;
        console.log(`📖 书籍总页数: ${totalPages}`);
      } catch (error) {
        console.error(`❌ 查询 qc_bookdata 表失败: ${error.message}`);
      }

      // 先检查 qc_bookdata 表中是否已有该书籍的记录
      const checkQuery = `SELECT * FROM qc_bookdata WHERE book_id = ?`;
      const existing = talebookDb.prepare(checkQuery).get(bookId);

      console.log(`📖 检查 qc_bookdata 中是否存在书籍记录:`, existing ? '✅ 存在' : '❌ 不存在');

      if (existing) {
        // 更新现有记录 - 使用 endPage 替换 read_pages(当前阅读到的页数)
        const query = `
          UPDATE qc_bookdata
          SET
            total_reading_time = total_reading_time + ?,
            read_pages = ?,
            reading_count = reading_count + 1,
            last_read_date = ?,
            last_read_duration = ?
          WHERE book_id = ?
        `;

        console.log(`📝 执行更新 SQL:`, query.trim());
        console.log(`📝 更新参数:`, [duration, endPage, readDate, duration, bookId]);

        const result = talebookDb.prepare(query).run(
          duration,
          endPage,  // 使用 endPage 替换 read_pages
          readDate,
          duration,
          bookId
        );

        console.log(`✅ 更新成功,影响行数: ${result.changes}`);
      } else {
        // 插入新记录
        const insertQuery = `
          INSERT INTO qc_bookdata (
            book_id, total_reading_time, read_pages,
            reading_count, last_read_date, last_read_duration,
            page_count
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        console.log(`📝 执行插入 SQL:`, insertQuery.trim());
        console.log(`📝 插入参数:`, [bookId, duration, endPage, 1, readDate, duration, totalPages]);

        const result = talebookDb.prepare(insertQuery).run(
          bookId, duration, endPage,
          1, readDate, duration,
          totalPages
        );

        console.log(`✅ 插入成功,lastInsertRowid: ${result.lastInsertRowid}`);
      }

      // 验证更新结果
      const verifyQuery = `SELECT * FROM qc_bookdata WHERE book_id = ?`;
      const verifyResult = talebookDb.prepare(verifyQuery).get(bookId);
      console.log(`🔍 验证 qc_bookdata 记录:`, verifyResult);
      console.log(`   book_id: ${verifyResult.book_id}`);
      console.log(`   read_pages: ${verifyResult.read_pages} (应该是 ${endPage})`);
      console.log(`   total_reading_time: ${verifyResult.total_reading_time}`);
      console.log(`   reading_count: ${verifyResult.reading_count}`);

      console.log(`✅ 更新书籍阅读统计成功: 书籍ID=${bookId}, 总时长+${duration}分钟, 当前阅读到第${endPage}页`);
    } catch (error) {
      console.error('❌ 更新书籍阅读统计失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 获取书籍的阅读统计
   * @param {number} bookId - 书籍ID
   * @param {number} readerId - 读者ID
   * @returns {Object|null} 阅读统计信息
   */
  async getBookReadingStats(bookId, readerId) {
    // 直接从 databaseService 获取 talebookDb
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return null;

    try {
      // 从 qc_bookdata 表获取页数
      let totalPages = 0;
      try {
        const bookData = talebookDb.prepare('SELECT page_count FROM qc_bookdata WHERE book_id = ?').get(bookId);
        totalPages = bookData?.page_count || 0;
      } catch (error) {
        console.error(`❌ 查询 qc_bookdata 表失败: ${error.message}`);
        totalPages = 0;
      }

      // 从 Talebook 数据库获取阅读统计
      const query = `
        SELECT
          total_reading_time as totalReadingTime,
          read_pages as readPages,
          reading_count as readingCount,
          last_read_date as lastReadDate,
          last_read_duration as lastReadDuration,
          page_count as totalPages
        FROM qc_bookdata
        WHERE book_id = ?
      `;

      const stats = talebookDb.prepare(query).get(bookId);

      if (!stats) {
        // 如果没有统计记录，返回默认值
        return {
          totalReadingTime: 0,
          readPages: 0,
          readingCount: 0,
          lastReadDate: null,
          lastReadDuration: 0,
          totalPages,
          progressPercent: 0
        };
      }

      // 计算进度百分比
      const progressPercent = totalPages > 0
        ? Math.round((stats.readPages * 100.0) / totalPages)
        : 0;

      return {
        ...stats,
        totalPages,
        progressPercent
      };
    } catch (error) {
      console.error('❌ 获取书籍阅读统计失败:', error);
      return null;
    }
  }

  // ==================== 每日阅读统计 ====================

  /**
   * 更新每日阅读统计
   * @param {number} readerId - 读者ID
   * @param {string} date - 统计日期
   * @param {number} booksCount - 阅读书籍数
   * @param {number} pagesCount - 阅读页数
   * @param {number} timeDuration - 阅读时长(分钟)
   */
  async updateDailyReadingStats(readerId, date, booksCount, pagesCount, timeDuration) {
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return;

    try {
      const query = `
        INSERT INTO qc_daily_reading_stats
          (reader_id, date, total_books, total_pages, total_time)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(reader_id, date) DO UPDATE SET
          total_books = total_books + ?,
          total_pages = total_pages + ?,
          total_time = total_time + ?,
          updated_at = CURRENT_TIMESTAMP
      `;

      talebookDb.prepare(query).run(
        readerId, date, booksCount, pagesCount, timeDuration,
        booksCount, pagesCount, timeDuration
      );

      console.log(`✅ 更新每日阅读统计: 日期=${date}, 书籍+${booksCount}, 页数+${pagesCount}, 时长+${timeDuration}分钟`);
    } catch (error) {
      console.error('❌ 更新每日阅读统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取每日阅读统计
   * @param {number} readerId - 读者ID
   * @param {string} [startDate=null] - 开始日期
   * @param {string} [endDate=null] - 结束日期
   * @returns {Array} 每日统计列表
   */
  async getDailyReadingStats(readerId, startDate = null, endDate = null) {
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return [];

    try {
      let query = `
        SELECT * FROM qc_daily_reading_stats
        WHERE reader_id = ?
      `;
      const params = [readerId];

      if (startDate) {
        query += ` AND date >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND date <= ?`;
        params.push(endDate);
      }

      query += ` ORDER BY date DESC`;

      const stats = talebookDb.prepare(query).all(...params);
      return stats;
    } catch (error) {
      console.error('❌ 获取每日阅读统计失败:', error);
      return [];
    }
  }

  /**
   * 获取某一天的详细阅读记录
   * @param {number} readerId - 读者ID
   * @param {string} date - 日期
   * @returns {Array} 阅读记录列表
   */
  async getDailyReadingDetails(readerId, date) {
    // 直接从 databaseService 获取 talebookDb 和 calibreDb
    const talebookDb = databaseService.talebookDb;
    const calibreDb = databaseService.calibreDb;

    if (!talebookDb || !calibreDb) return [];

    try {
      const query = `
        SELECT *
        FROM qc_reading_records
        WHERE reader_id = ? AND DATE(start_time) = ?
        ORDER BY start_time ASC
      `;

      const records = talebookDb.prepare(query).all(readerId, date);

      // 从 Calibre 的 books 表和相关表获取书籍信息
      if (records.length > 0) {
        try {
          const bookIds = [...new Set(records.map(r => r.book_id))];
          const bookIdsStr = bookIds.join(',');

          // 从 Calibre 数据库获取书籍信息
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

          // 从 qc_bookdata 表获取扩展信息
          const extendedBooks = talebookDb.prepare(
            `SELECT book_id as id, page_count FROM qc_bookdata WHERE book_id IN (${bookIdsStr})`
          ).all();

          const extendedMap = extendedBooks.reduce((acc, book) => {
            acc[book.id] = book;
            return acc;
          }, {});

          // 合并书籍信息
          return records.map(record => {
            const bookInfo = bookMap[record.book_id] || {};
            const extendedInfo = extendedMap[record.book_id] || {};
            return {
              ...record,
              book_title: bookInfo.title || '',
              book_author: bookInfo.author || '',
              book_cover: bookInfo.has_cover ? `/api/book/${record.book_id}/cover` : '',
              book_uuid: bookInfo.uuid || '',
              book_path: bookInfo.path || '',
              total_pages: extendedInfo.page_count || 0
            };
          });
        } catch (error) {
          console.error(`❌ 获取书籍信息失败: ${error.message}`);
        }
      }

      // 如果无法获取书籍信息，只返回阅读记录
      return records;
    } catch (error) {
      console.error('❌ 获取每日阅读详情失败:', error);
      return [];
    }
  }

  // ==================== 热力图数据 ====================

  /**
   * 获取热力图数据 (全年)
   * @param {number} readerId - 读者ID
   * @param {number} year - 年份
   * @returns {Object} 热力图数据字典
   */
  async getHeatmapData(readerId, year) {
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return {};

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

      const rows = talebookDb.prepare(query).all(readerId, year);

      // 转换为字典格式 { '2025-01-10': { duration: 90, books: 2, pages: 50 } }
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

  // ==================== 聚合统计 ====================

  /**
   * 获取读者的阅读汇总统计
   * @param {number} readerId - 读者ID
   * @returns {Object} 汇总统计信息
   */
  async getReaderSummary(readerId) {
    const talebookDb = databaseService.talebookDb;

    if (!talebookDb) return null;

    try {
      // 总阅读次数
      const totalRecords = talebookDb.prepare(
        `SELECT COUNT(*) as count FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.count || 0;

      // 总阅读时长
      const totalTime = talebookDb.prepare(
        `SELECT SUM(duration) as total FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.total || 0;

      // 总阅读页数
      const totalPages = talebookDb.prepare(
        `SELECT SUM(pages_read) as total FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.total || 0;

      // 阅读书籍数
      const totalBooks = talebookDb.prepare(
        `SELECT COUNT(DISTINCT book_id) as count FROM qc_reading_records WHERE reader_id = ?`
      ).get(readerId)?.count || 0;

      // 最近阅读日期
      const latest = talebookDb.prepare(
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
