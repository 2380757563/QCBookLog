/**
 * 操作记录服务
 * 提供操作记录的数据库操作
 */

import databaseService from './database-service.js';

class ActivityService {
  constructor() {
    // 操作记录从 qc_activity_log 表查询
    // 同时也从各业务表动态聚合数据
  }

  /**
   * 记录活动日志
   * @param {Object} activity - 活动数据
   * @param {string} activity.type - 活动类型 (book_added, bookmark_added, reading_record 等)
   * @param {number} activity.userId - 用户ID
   * @param {number} activity.readerId - 读者ID
   * @param {number} activity.bookId - 书籍ID
   * @param {string} activity.bookTitle - 书籍标题
   * @param {string} activity.bookAuthor - 书籍作者
   * @param {string} activity.bookCover - 书籍封面
   * @param {string} activity.content - 内容（如书摘内容）
   * @param {string} activity.chapter - 章节
   * @param {number} activity.startPage - 起始页
   * @param {number} activity.endPage - 结束页
   * @param {number} activity.pagesRead - 阅读页数
   * @param {number} activity.duration - 持续时间（秒）
   * @param {string} activity.startTime - 开始时间
   * @param {string} activity.endTime - 结束时间
   * @param {Object} activity.metadata - 额外元数据
   */
  logActivity(activity) {
    const qcBooklogDb = databaseService.getQcBooklogDb();
    if (!qcBooklogDb) {
      console.warn('⚠️ 数据库不可用，无法记录活动日志');
      return null;
    }

    try {
      const query = `
        INSERT INTO qc_activity_log (
          type, user_id, reader_id, book_id, book_title, book_author, book_cover,
          content, chapter, start_page, end_page, pages_read, duration,
          start_time, end_time, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const result = qcBooklogDb.prepare(query).run(
        activity.type || 'unknown',
        activity.userId || 0,
        activity.readerId || 0,
        activity.bookId || null,
        activity.bookTitle || null,
        activity.bookAuthor || null,
        activity.bookCover || null,
        activity.content || null,
        activity.chapter || null,
        activity.startPage || null,
        activity.endPage || null,
        activity.pagesRead || null,
        activity.duration || null,
        activity.startTime || null,
        activity.endTime || null,
        activity.metadata ? JSON.stringify(activity.metadata) : null
      );

      console.log(`✅ 活动日志已记录: ${activity.type}${activity.bookTitle ? ` - ${activity.bookTitle}` : ''}`);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('❌ 记录活动日志失败:', error.message);
      return null;
    }
  }

  /**
   * 获取操作记录列表（优先从活动日志表查询，同时聚合业务表数据）
   */
  async getActivities(filters = {}) {
    try {
      const talebookDb = databaseService.talebookDb;
      const qcBooklogDb = databaseService.getQcBooklogDb();
      const calibreDb = databaseService.calibreDb;
      
      if (!qcBooklogDb) {
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

      const allRows = [];
      const readerFilter = readerId !== undefined ? `AND (user_id = ${readerId} OR reader_id = ${readerId})` : '';
      const bookFilter = bookId !== undefined ? `AND book_id = ${bookId}` : '';
      const typeFilter = type ? `AND type = '${type}'` : '';

      // 优先从活动日志表查询
      try {
        const dateFilter = startDate && endDate ? 
          `AND DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}')` : '';
        
        const activityLogQuery = `
          SELECT 
            id,
            type,
            user_id as readerId,
            reader_id as readerIdAlt,
            book_id as bookId,
            book_title as bookTitle,
            book_author as bookAuthor,
            book_cover as bookCover,
            content,
            chapter,
            start_page as startPage,
            end_page as endPage,
            pages_read as pagesRead,
            duration,
            start_time as startTime,
            end_time as endTime,
            metadata,
            created_at as createdAt
          FROM qc_activity_log
          WHERE 1=1 ${dateFilter} ${readerFilter} ${bookFilter} ${typeFilter}
          ORDER BY createdAt DESC
          ${limit > 0 ? `LIMIT ${limit}` : ''}
        `;
        const activities = qcBooklogDb.prepare(activityLogQuery).all();
        allRows.push(...activities);
        console.log(`✅ 从活动日志表获取 ${activities.length} 条记录`);
      } catch (error) {
        console.warn('⚠️ 从活动日志表查询失败:', error.message);
      }

      // 继续从业务表聚合数据（作为补充）
      const dateFilterQc = startDate && endDate ? 
        `AND DATE(created_at) >= DATE('${startDate}') AND DATE(created_at) <= DATE('${endDate}')` : '';

      // 从 qcBooklogDb 查询书摘记录
      try {
        const bookmarksQuery = `
          SELECT 
            'bookmark_added' as type,
            user_id as readerId,
            book_id as bookId,
            NULL as bookTitle,
            NULL as bookAuthor,
            NULL as bookPublisher,
            NULL as bookCover,
            NULL as startTime,
            NULL as endTime,
            NULL as duration,
            pos as startPage,
            pos as endPage,
            NULL as pagesRead,
            text as content,
            chapter,
            NULL as metadata,
            created_at as createdAt
          FROM qc_bookmarks
          WHERE 1=1 ${dateFilterQc} ${bookFilter}
          ORDER BY createdAt DESC
        `;
        const bookmarks = qcBooklogDb.prepare(bookmarksQuery).all();
        allRows.push(...bookmarks);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询书摘失败:', error.message);
      }

      // 从 qcBooklogDb 查询阅读记录
      try {
        const readingRecordsQuery = `
          SELECT 
            'reading_record' as type,
            user_id as readerId,
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
          WHERE 1=1 ${dateFilterQc} ${readerFilter} ${bookFilter}
          ORDER BY createdAt DESC
        `;
        const readingRecords = qcBooklogDb.prepare(readingRecordsQuery).all();
        allRows.push(...readingRecords);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询阅读记录失败:', error.message);
      }

      // 从 qcBooklogDb 查询阅读目标
      try {
        const goalsQuery = `
          SELECT 
            'reading_goal_set' as type,
            user_id as readerId,
            NULL as bookId,
            NULL as bookTitle,
            NULL as bookAuthor,
            NULL as bookPublisher,
            NULL as bookCover,
            NULL as startTime,
            NULL as endTime,
            target_value as duration,
            NULL as startPage,
            current_value as endPage,
            NULL as pagesRead,
            NULL as content,
            json_object('start_date', start_date, 'target', target_value, 'current', current_value) as metadata,
            created_at as createdAt
          FROM qc_reading_goals
          WHERE 1=1 ${dateFilterQc} ${readerFilter}
          ORDER BY createdAt DESC
        `;
        const goals = qcBooklogDb.prepare(goalsQuery).all();
        allRows.push(...goals);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询阅读目标失败:', error.message);
      }

      // 从 talebookDb 查询阅读状态变更（优先）
      if (talebookDb) {
        try {
          const dateFilterTb = startDate && endDate ? 
            `AND DATE(read_date) >= DATE('${startDate}') AND DATE(read_date) <= DATE('${endDate}')` : '';
          
          const readingStateQuery = `
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
            WHERE read_date IS NOT NULL ${dateFilterTb} ${readerFilter} ${bookFilter}
            ORDER BY createdAt DESC
          `;
          const readingStates = talebookDb.prepare(readingStateQuery).all();
          allRows.push(...readingStates);
          console.log(`✅ 从 talebookDb 读取状态表获取 ${readingStates.length} 条记录`);
        } catch (error) {
          console.warn('⚠️ 从 talebookDb 查询阅读状态失败:', error.message);
        }
      } else {
        // 降级：从 qcBooklogDb 的 qc_reading_state 表查询
        try {
          const dateFilterQcState = startDate && endDate ? 
            `AND DATE(last_read_time) >= DATE('${startDate}') AND DATE(last_read_time) <= DATE('${endDate}')` : '';
          
          const readingStateQuery = `
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
              last_read_time as createdAt
            FROM qc_reading_state
            WHERE last_read_time IS NOT NULL ${dateFilterQcState} ${readerFilter} ${bookFilter}
            ORDER BY createdAt DESC
          `;
          const readingStates = qcBooklogDb.prepare(readingStateQuery).all();
          allRows.push(...readingStates);
          console.log(`✅ 从 qcBooklogDb 读取状态表获取 ${readingStates.length} 条记录（降级模式）`);
        } catch (error) {
          console.warn('⚠️ 从 qcBooklogDb 查询阅读状态失败:', error.message);
        }
      }

      // 按时间排序并限制数量
      allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const rows = limit > 0 ? allRows.slice(0, limit) : allRows;
      
      // 如果有 Calibre 数据库，为记录添加书籍信息
      if (calibreDb && rows.length > 0) {
        const bookIds = rows
          .filter(r => r.bookId)
          .map(r => r.bookId);
        
        console.log(`📚 时间线: 需要查询封面的书籍ID: ${JSON.stringify(bookIds)}`);
        
        if (bookIds.length > 0) {
          const uniqueBookIds = [...new Set(bookIds)];
          const bookIdsStr = uniqueBookIds.join(',');
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
            
            console.log(`📚 时间线: 从Calibre查询到 ${books.length} 本书籍信息`);
            
            const bookMap = books.reduce((acc, book) => {
              acc[book.id] = book;
              return acc;
            }, {});
            
            rows.forEach(row => {
              if (row.bookId && bookMap[row.bookId]) {
                const book = bookMap[row.bookId];
                if (!row.bookTitle) row.bookTitle = book.title || '';
                if (!row.bookAuthor) row.bookAuthor = book.author || '';
                row.bookCover = `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
                console.log(`📚 时间线: 书籍 ${book.title} 封面路径: ${row.bookCover}`);
              } else if (row.bookId) {
                console.log(`⚠️ 时间线: 书籍ID ${row.bookId} 在Calibre中未找到`);
              }
            });
          } catch (error) {
            console.error('❌ 获取书籍信息失败:', error);
          }
        }
      } else {
        console.log(`⚠️ 时间线: calibreDb=${!!calibreDb}, rows.length=${rows.length}`);
      }
      
      console.log(`✅ 获取操作记录成功，共 ${rows.length} 条`);
      return rows;
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  }

  /**
   * 获取某日的操作记录（从活动日志表和业务表查询）
   */
  async getActivitiesByDate(date, readerId = 0) {
    try {
      const qcBooklogDb = databaseService.getQcBooklogDb();
      
      if (!qcBooklogDb) {
        console.warn('⚠️ 数据库不可用，无法获取操作记录');
        return [];
      }

      const allRows = [];
      const readerFilter = readerId !== undefined ? `AND (user_id = ${readerId} OR reader_id = ${readerId})` : '';

      // 从活动日志表查询
      try {
        const activityLogQuery = `
          SELECT 
            id,
            type,
            user_id as readerId,
            reader_id as readerIdAlt,
            book_id as bookId,
            book_title as bookTitle,
            book_author as bookAuthor,
            book_cover as bookCover,
            content,
            chapter,
            start_page as startPage,
            end_page as endPage,
            pages_read as pagesRead,
            duration,
            start_time as startTime,
            end_time as endTime,
            metadata,
            created_at as createdAt
          FROM qc_activity_log
          WHERE DATE(created_at) = DATE('${date}') ${readerFilter}
          ORDER BY createdAt DESC
        `;
        const activities = qcBooklogDb.prepare(activityLogQuery).all();
        allRows.push(...activities);
        console.log(`✅ 从活动日志表获取 ${activities.length} 条记录`);
      } catch (error) {
        console.warn('⚠️ 从活动日志表查询失败:', error.message);
      }

      // 从 qcBooklogDb 查询书摘
      try {
        const bookmarksQuery = `
          SELECT 
            'bookmark_added' as type,
            user_id as readerId,
            book_id as bookId,
            NULL as bookTitle,
            NULL as bookAuthor,
            NULL as bookPublisher,
            NULL as bookCover,
            NULL as startTime,
            NULL as endTime,
            NULL as duration,
            pos as startPage,
            pos as endPage,
            NULL as pagesRead,
            text as content,
            chapter,
            NULL as metadata,
            created_at as createdAt
          FROM qc_bookmarks
          WHERE DATE(created_at) = DATE('${date}')
          ORDER BY createdAt DESC
        `;
        const bookmarks = qcBooklogDb.prepare(bookmarksQuery).all();
        allRows.push(...bookmarks);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询书摘失败:', error.message);
      }

      // 从 qcBooklogDb 查询阅读记录
      try {
        const readingRecordsQuery = `
          SELECT 
            'reading_record' as type,
            user_id as readerId,
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
          WHERE DATE(created_at) = DATE('${date}') ${readerFilter}
          ORDER BY createdAt DESC
        `;
        const readingRecords = qcBooklogDb.prepare(readingRecordsQuery).all();
        allRows.push(...readingRecords);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询阅读记录失败:', error.message);
      }

      // 从 qcBooklogDb 查询阅读目标
      try {
        const goalsQuery = `
          SELECT 
            'reading_goal_set' as type,
            user_id as readerId,
            NULL as bookId,
            NULL as bookTitle,
            NULL as bookAuthor,
            NULL as bookPublisher,
            NULL as bookCover,
            NULL as startTime,
            NULL as endTime,
            target_value as duration,
            NULL as startPage,
            current_value as endPage,
            NULL as pagesRead,
            NULL as content,
            json_object('start_date', start_date, 'target', target_value, 'current', current_value) as metadata,
            created_at as createdAt
          FROM qc_reading_goals
          WHERE DATE(created_at) = DATE('${date}') ${readerFilter}
          ORDER BY createdAt DESC
        `;
        const goals = qcBooklogDb.prepare(goalsQuery).all();
        allRows.push(...goals);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询阅读目标失败:', error.message);
      }

      // 从 qc_reading_state 查询阅读状态变更
      try {
        const readingStateQuery = `
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
            last_read_time as createdAt
          FROM qc_reading_state
          WHERE last_read_time IS NOT NULL AND DATE(last_read_time) = DATE('${date}') ${readerFilter}
          ORDER BY createdAt DESC
        `;
        const readingStates = qcBooklogDb.prepare(readingStateQuery).all();
        allRows.push(...readingStates);
      } catch (error) {
        console.warn('⚠️ 从 qcBooklogDb 查询阅读状态失败:', error.message);
      }

      // 按时间排序
      allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // 如果有 Calibre 数据库，为记录添加书籍信息
      const calibreDb = databaseService.calibreDb;
      if (calibreDb && allRows.length > 0) {
        const bookIds = allRows
          .filter(r => r.bookId)
          .map(r => r.bookId);
        
        console.log(`📚 时间线(按日期): 需要查询封面的书籍ID: ${JSON.stringify(bookIds)}`);
        
        if (bookIds.length > 0) {
          const uniqueBookIds = [...new Set(bookIds)];
          const bookIdsStr = uniqueBookIds.join(',');
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
            
            console.log(`📚 时间线(按日期): 从Calibre查询到 ${books.length} 本书籍信息`);
            
            const bookMap = books.reduce((acc, book) => {
              acc[book.id] = book;
              return acc;
            }, {});
            
            allRows.forEach(row => {
              if (row.bookId && bookMap[row.bookId]) {
                const book = bookMap[row.bookId];
                if (!row.bookTitle) row.bookTitle = book.title || '';
                if (!row.bookAuthor) row.bookAuthor = book.author || '';
                row.bookCover = `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
                console.log(`📚 时间线(按日期): 书籍 ${book.title} 封面路径: ${row.bookCover}`);
              } else if (row.bookId) {
                console.log(`⚠️ 时间线(按日期): 书籍ID ${row.bookId} 在Calibre中未找到`);
              }
            });
          } catch (error) {
            console.error('❌ 获取书籍信息失败:', error);
          }
        }
      } else {
        console.log(`⚠️ 时间线(按日期): calibreDb=${!!calibreDb}, allRows.length=${allRows.length}`);
      }
      
      console.log(`✅ 获取 ${date} 的操作记录成功，共 ${allRows.length} 条`);
      return allRows;
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  }

}

export default new ActivityService();
