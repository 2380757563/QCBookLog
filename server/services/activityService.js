/**
 * 操作记录服务
 * 提供操作记录的数据库操作
 */

import databaseService from './databaseService.js';

class ActivityService {
  constructor() {
    this.initActivityTable();
  }

  /**
   * 初始化操作记录表
   */
  async initActivityTable() {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        console.warn('⚠️ 数据库不可用，无法初始化操作记录表');
        return;
      }

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          readerId INTEGER NOT NULL,
          bookId INTEGER,
          bookTitle TEXT,
          bookAuthor TEXT,
          bookPublisher TEXT,
          bookCover TEXT,
          startTime TEXT,
          endTime TEXT,
          duration INTEGER,
          startPage INTEGER,
          endPage INTEGER,
          pagesRead INTEGER,
          content TEXT,
          metadata TEXT,
          createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
      `;

      await db.exec(createTableSQL);
      console.log('✅ 操作记录表初始化成功');
    } catch (error) {
      console.error('❌ 初始化操作记录表失败:', error);
    }
  }

  /**
   * 创建操作记录
   */
  async createActivity(activity) {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        console.warn('⚠️ 数据库不可用，无法创建操作记录');
        return null;
      }

      const {
        type,
        readerId,
        bookId,
        bookTitle,
        bookAuthor,
        bookPublisher,
        bookCover,
        startTime,
        endTime,
        duration,
        startPage,
        endPage,
        pagesRead,
        content,
        metadata
      } = activity;

      const insertSQL = `
        INSERT INTO activities (
          type, readerId, bookId, bookTitle, bookAuthor, bookPublisher, bookCover,
          startTime, endTime, duration, startPage, endPage, pagesRead,
          content, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const metadataStr = metadata ? JSON.stringify(metadata) : null;

      db.prepare(insertSQL).run(
        type,
        readerId,
        bookId || null,
        bookTitle || null,
        bookAuthor || null,
        bookPublisher || null,
        bookCover || null,
        startTime || null,
        endTime || null,
        duration || null,
        startPage || null,
        endPage || null,
        pagesRead || null,
        content || null,
        metadataStr
      );

      console.log(`✅ 操作记录创建成功: ${type}`);
      return this.getLastInsertId();
    } catch (error) {
      console.error('❌ 创建操作记录失败:', error);
      return null;
    }
  }

  /**
   * 获取操作记录列表（从各业务表查询）
   */
  async getActivities(filters = {}) {
    try {
      const db = databaseService.getDatabase();
      const calibreDb = databaseService.getCalibreDatabase();
      if (!db) {
        console.warn('⚠️ 数据库不可用，无法获取操作记录');
        return [];
      }

      const {
        readerId,
        startDate,
        endDate,
        type,
        bookId,
        limit = 100
      } = filters;

      const dateFilter = startDate && endDate ? `AND DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}')` : '';
      const readerFilter = readerId !== undefined ? `AND reader_id = ${readerId}` : '';
      const bookFilter = bookId !== undefined ? `AND book_id = ${bookId}` : '';
      const typeFilter = type ? `AND type = '${type}'` : '';
      const limitSQL = limit > 0 ? `LIMIT ${limit}` : '';

      const query = `
        SELECT 
          'bookmark_added' as type,
          0 as readerId,
          book_id as bookId,
          book_title as bookTitle,
          book_author as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          NULL as duration,
          NULL as startPage,
          page_num as endPage,
          NULL as pagesRead,
          content,
          NULL as metadata,
          created_at as createdAt
        FROM qc_bookmarks
        WHERE 1=1 ${dateFilter} ${bookFilter}

        UNION ALL

        SELECT 
          'reading_state_changed' as type,
          reader_id as readerId,
          book_id as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          NULL as duration,
          NULL as startPage,
          NULL as endPage,
          NULL as pagesRead,
          NULL as content,
          json_object('read_state', read_state, 'favorite', favorite, 'wants', wants) as metadata,
          read_date as createdAt
        FROM reading_state
        WHERE read_date IS NOT NULL AND DATE(read_date) >= DATE('${startDate}') AND DATE(read_date) <= DATE('${endDate}') ${readerFilter} ${bookFilter}

        UNION ALL

        SELECT 
          'reading_record' as type,
          reader_id as readerId,
          book_id as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          start_time as startTime,
          end_time as endTime,
          duration,
          start_page as startPage,
          end_page as endPage,
          pages_read as pagesRead,
          NULL as content,
          NULL as metadata,
          created_at as createdAt
        FROM qc_reading_records
        WHERE 1=1 ${dateFilter} ${readerFilter} ${bookFilter}

        UNION ALL

        SELECT 
          'reading_goal_set' as type,
          reader_id as readerId,
          NULL as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          target as duration,
          NULL as startPage,
          completed as endPage,
          NULL as pagesRead,
          NULL as content,
          json_object('year', year, 'target', target, 'completed', completed) as metadata,
          created_at as createdAt
        FROM reading_goals
        WHERE 1=1 ${dateFilter} ${readerFilter}

        ORDER BY createdAt DESC
        ${limitSQL}
      `;

      const rows = db.prepare(query).all();
      
      // 如果有 Calibre 数据库，为阅读记录添加书籍信息
      if (calibreDb && rows.length > 0) {
        const readingRecordIds = rows
          .filter(r => r.type === 'reading_record' && r.bookId)
          .map(r => r.bookId);
        
        if (readingRecordIds.length > 0) {
          const bookIdsStr = readingRecordIds.join(',');
          try {
            const books = calibreDb.prepare(`
              SELECT 
                b.id,
                b.title,
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
            
            // 为阅读记录添加书籍信息
            rows.forEach(row => {
              if (row.type === 'reading_record' && row.bookId && bookMap[row.bookId]) {
                const book = bookMap[row.bookId];
                row.bookTitle = book.title || '';
                row.bookAuthor = book.author || '';
                row.bookCover = book.has_cover ? `/api/book/${row.bookId}/cover` : '';
              }
            });
          } catch (error) {
            console.error('❌ 获取书籍信息失败:', error);
          }
        }
      }
      
      console.log(`✅ 获取操作记录成功，共 ${rows.length} 条`);
      return rows;
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  }

  /**
   * 获取某日的操作记录（从各业务表查询）
   */
  async getActivitiesByDate(date, readerId = 0) {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        console.warn('⚠️ 数据库不可用，无法获取操作记录');
        return [];
      }

      const startDate = `${date} 00:00:00`;
      const endDate = `${date} 23:59:59`;
      const readerFilter = readerId !== undefined ? `AND reader_id = ${readerId}` : '';

      const query = `
        SELECT 
          'bookmark_added' as type,
          0 as readerId,
          book_id as bookId,
          book_title as bookTitle,
          book_author as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          NULL as duration,
          NULL as startPage,
          page_num as endPage,
          NULL as pagesRead,
          content,
          NULL as metadata,
          created_at as createdAt
        FROM qc_bookmarks
        WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}')

        UNION ALL

        SELECT 
          'reading_state_changed' as type,
          reader_id as readerId,
          book_id as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          NULL as duration,
          NULL as startPage,
          NULL as endPage,
          NULL as pagesRead,
          NULL as content,
          json_object('read_state', read_state, 'favorite', favorite, 'wants', wants) as metadata,
          read_date as createdAt
        FROM reading_state
        WHERE DATE(read_date) >= DATE('${startDate}') AND DATE(read_date) <= DATE('${endDate}') ${readerFilter}

        UNION ALL

        SELECT 
          'reading_record' as type,
          reader_id as readerId,
          book_id as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          start_time as startTime,
          end_time as endTime,
          duration,
          start_page as startPage,
          end_page as endPage,
          pages_read as pagesRead,
          NULL as content,
          NULL as metadata,
          created_at as createdAt
        FROM qc_reading_records
        WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}') ${readerFilter}

        UNION ALL

        SELECT 
          'reading_goal_set' as type,
          reader_id as readerId,
          NULL as bookId,
          NULL as bookTitle,
          NULL as bookAuthor,
          NULL as bookPublisher,
          NULL as bookCover,
          NULL as startTime,
          NULL as endTime,
          target as duration,
          NULL as startPage,
          completed as endPage,
          NULL as pagesRead,
          NULL as content,
          json_object('year', year, 'target', target, 'completed', completed) as metadata,
          created_at as createdAt
        FROM reading_goals
        WHERE DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}') ${readerFilter}

        ORDER BY createdAt DESC
      `;

      const rows = db.prepare(query).all();
      console.log(`✅ 获取 ${date} 的操作记录成功，共 ${rows.length} 条`);
      return rows;
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  }

  /**
   * 获取最后插入的ID
   */
  async getLastInsertId() {
    try {
      const db = databaseService.getDatabase();
      if (!db) return null;

      const row = db.prepare('SELECT last_insert_rowid() as id FROM activities').get();
      return row ? row.id : null;
    } catch (error) {
      console.error('❌ 获取最后插入ID失败:', error);
      return null;
    }
  }
}

export default new ActivityService();
