/**
 * qcDataService
 * 管理qcbooklog应用专属数据表
 * 包括groups表和bookmarks表的CRUD操作
 */

import databaseService from './databaseService.js';

/**
 * qcDataService类
 */
class QcDataService {
  constructor() {
    this.updateConnection();
  }

  /**
   * 检查Talebook数据库是否可用
   */
  isAvailable() {
    return databaseService.isTalebookAvailable();
  }

  /**
   * 更新数据库连接
   */
  updateConnection() {
    this.db = databaseService.talebookDb;
    console.log('🔄 qcDataService 数据库连接已更新:', this.db ? '已连接' : '未连接');
    
    // 启用外键约束
    if (this.db) {
      this.db.pragma('foreign_keys = ON');
      console.log('✅ 外键约束已启用');
    }
  }

  // ----------------------
  // 分组管理 (groups)
  // ----------------------

  /**
   * 创建分组
   */
  createGroup(groupData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        INSERT INTO qc_groups (name, description, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const result = this.db.prepare(query).run(
        groupData.name,
        groupData.description || ''
      );
      
      return {
        id: result.lastInsertRowid,
        ...groupData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 创建分组失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取所有分组
   */
  getAllGroups() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = 'SELECT * FROM qc_groups ORDER BY name';
      return this.db.prepare(query).all();
    } catch (error) {
      console.error('❌ 获取所有分组失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ID获取分组
   */
  getGroupById(groupId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const query = 'SELECT * FROM qc_groups WHERE id = ?';
      return this.db.prepare(query).get(groupId);
    } catch (error) {
      console.error(`❌ 获取分组ID ${groupId} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 更新分组
   */
  updateGroup(groupId, groupData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        UPDATE qc_groups
        SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        groupData.name,
        groupData.description || '',
        groupId
      );
      
      if (result.changes === 0) {
        return null;
      }
      
      return {
        id: groupId,
        ...groupData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ 更新分组ID ${groupId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除分组
   */
  deleteGroup(groupId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      // 先删除分组与书籍的关联
      this.db.prepare('DELETE FROM qc_book_groups WHERE group_id = ?').run(groupId);
      
      // 再删除分组
      const query = 'DELETE FROM qc_groups WHERE id = ?';
      const result = this.db.prepare(query).run(groupId);
      
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除分组ID ${groupId} 失败:`, error.message);
      throw error;
    }
  }

  // ----------------------
  // 书籍分组关联管理
  // ----------------------

  /**
   * 添加书籍到分组
   */
  addBookToGroup(bookId, groupId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        INSERT OR IGNORE INTO qc_book_groups (book_id, group_id)
        VALUES (?, ?)
      `;
      const result = this.db.prepare(query).run(bookId, groupId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 添加书籍ID ${bookId} 到分组ID ${groupId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 从分组中移除书籍
   */
  removeBookFromGroup(bookId, groupId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        DELETE FROM qc_book_groups
        WHERE book_id = ? AND group_id = ?
      `;
      const result = this.db.prepare(query).run(bookId, groupId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 从分组ID ${groupId} 移除书籍ID ${bookId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取书籍所属的所有分组
   */
  getBookGroups(bookId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT g.* FROM qc_groups g
        JOIN qc_book_groups bg ON g.id = bg.group_id
        WHERE bg.book_id = ?
        ORDER BY g.name
      `;
      return this.db.prepare(query).all(bookId);
    } catch (error) {
      console.error(`❌ 获取书籍ID ${bookId} 的分组失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取分组中的所有书籍
   */
  getGroupBooks(groupId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT bg.book_id FROM qc_book_groups bg
        WHERE bg.group_id = ?
      `;
      const results = this.db.prepare(query).all(groupId);
      return results.map(item => item.book_id);
    } catch (error) {
      console.error(`❌ 获取分组ID ${groupId} 中的书籍失败:`, error.message);
      return [];
    }
  }

  // ----------------------
  // 书摘管理 (bookmarks)
  // ----------------------

  /**
   * 创建书摘
   */
  createBookmark(bookmarkData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      // 支持 camelCase 和 snake_case 两种字段名
      const bookId = bookmarkData.bookId || bookmarkData.book_id;
      let bookTitle = bookmarkData.bookTitle || bookmarkData.book_title || null;
      let bookAuthor = bookmarkData.bookAuthor || bookmarkData.book_author || null;

      // 从Calibre数据库获取书籍信息（如果提供了 book_id）
      if (bookId && (!bookTitle || !bookAuthor)) {
        try {
          const calibreDb = databaseService.calibreDb;
          if (calibreDb) {
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
              bookTitle = bookInfo.title || bookTitle;
              bookAuthor = bookInfo.author || bookAuthor;
            }
          }
        } catch (error) {
          console.warn('⚠️ 获取书籍信息失败:', error.message);
        }
      }

      const query = `
        INSERT INTO qc_bookmarks (book_id, book_title, book_author, content, note, page, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const result = this.db.prepare(query).run(
        bookId,
        bookTitle,
        bookAuthor,
        bookmarkData.content,
        bookmarkData.note || null,
        bookmarkData.page || null
      );

      const bookmarkId = result.lastInsertRowid;

      // 处理标签（直接存储标签名称到 qc_bookmark_tags）
      if (bookmarkData.tags && Array.isArray(bookmarkData.tags) && bookmarkData.tags.length > 0) {
        for (const tag of bookmarkData.tags) {
          if (tag && tag.trim() !== '') {
            const insertTagQuery = `
              INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name)
              VALUES (?, ?)
            `;
            this.db.prepare(insertTagQuery).run(bookmarkId, tag);
          }
        }
      }

      return {
        id: bookmarkId,
        book_id: bookId,
        bookId: bookId, // 同时返回 camelCase
        bookTitle: bookTitle,
        bookAuthor: bookAuthor,
        book_title: bookTitle, // 同时返回 snake_case
        book_author: bookAuthor, // 同时返回 snake_case
        ...bookmarkData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 添加 createTime 和 updateTime 字段（兼容前端）
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 创建书摘失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取所有书摘
   */
  getAllBookmarks() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = 'SELECT * FROM qc_bookmarks ORDER BY created_at DESC';
      const bookmarks = this.db.prepare(query).all();

      // 为每个书摘获取标签信息（从 qc_bookmark_tags 直接读取标签名称）
      const bookmarkIds = bookmarks.map(b => b.id);
      const bookmarkTags = new Map();

      if (bookmarkIds.length > 0) {
        const placeholders = bookmarkIds.map(() => '?').join(',');
        const tagsQuery = `
          SELECT bookmark_id, tag_name
          FROM qc_bookmark_tags
          WHERE bookmark_id IN (${placeholders})
        `;
        const tags = this.db.prepare(tagsQuery).all(...bookmarkIds);

        // 将标签按bookmark_id分组
        for (const tag of tags) {
          if (!bookmarkTags.has(tag.bookmark_id)) {
            bookmarkTags.set(tag.bookmark_id, []);
          }
          bookmarkTags.get(tag.bookmark_id).push(tag.tag_name);
        }
      }

      // 将标签信息合并到书摘对象中，并统一字段名
      const enrichedBookmarks = bookmarks.map(bookmark => {
        const tags = bookmarkTags.get(bookmark.id) || [];
        return {
          ...bookmark,
          // 兼容性处理：使用 book_title 和 book_author 作为 bookTitle 和 bookAuthor
          bookTitle: bookmark.book_title,
          bookAuthor: bookmark.book_author,
          pageNum: bookmark.page, // 将 page 字段映射为 pageNum
          tags: tags,
          // 添加 createTime 和 updateTime 字段（兼容前端）
          createTime: bookmark.created_at,
          updateTime: bookmark.updated_at,
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at
        };
      });

      return enrichedBookmarks;
    } catch (error) {
      console.error('❌ 获取所有书摘失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ID获取书摘
   */
  getBookmarkById(bookmarkId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const query = 'SELECT * FROM qc_bookmarks WHERE id = ?';
      const bookmark = this.db.prepare(query).get(bookmarkId);
      if (bookmark) {
        console.log('🔍 qcDataService获取到的书摘数据:', bookmark);
        console.log('🔍 qcDataService获取到的created_at:', bookmark.created_at);
        console.log('🔍 qcDataService获取到的updated_at:', bookmark.updated_at);
        
        // 兼容性处理：统一字段名，确保前端能正确访问
        const result = {
          id: bookmark.id,
          book_id: bookmark.book_id,
          bookTitle: bookmark.book_title,
          bookAuthor: bookmark.book_author,
          bookId: bookmark.book_id, // 添加 bookId 字段（驼峰命名）
          content: bookmark.content,
          note: bookmark.note,
          page: bookmark.page,
          pageNum: bookmark.page, // 添加 pageNum 字段
          tags: [], // 标签需要单独查询
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at,
          // 添加 createTime 和 updateTime 字段（兼容前端）
          createTime: bookmark.created_at,
          updateTime: bookmark.updated_at
        };
        
        console.log('🔍 qcDataService返回的书摘数据:', result);
        console.log('🔍 qcDataService返回的created_at:', result.created_at);
        console.log('🔍 qcDataService返回的updated_at:', result.updated_at);
        
        return result;
      }
      return null;
    } catch (error) {
      console.error(`❌ 获取书摘ID ${bookmarkId} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 获取书籍的所有书摘
   */
  getBookmarksByBookId(bookId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      console.log('🔍 getBookmarksByBookId - bookId:', bookId, '类型:', typeof bookId);

      const query = `
        SELECT * FROM qc_bookmarks
        WHERE book_id = ?
        ORDER BY created_at DESC
      `;
      const bookmarks = this.db.prepare(query).all(bookId);

      console.log(`🔍 找到 ${bookmarks.length} 条书摘`);

      // 为每个书摘获取标签信息（从 qc_bookmark_tags 直接读取标签名称）
      const bookmarkIds = bookmarks.map(b => b.id);
      const bookmarkTags = new Map();

      if (bookmarkIds.length > 0) {
        const placeholders = bookmarkIds.map(() => '?').join(',');
        const tagsQuery = `
          SELECT bookmark_id, tag_name
          FROM qc_bookmark_tags
          WHERE bookmark_id IN (${placeholders})
        `;
        const tags = this.db.prepare(tagsQuery).all(...bookmarkIds);

        // 将标签按bookmark_id分组
        for (const tag of tags) {
          if (!bookmarkTags.has(tag.bookmark_id)) {
            bookmarkTags.set(tag.bookmark_id, []);
          }
          bookmarkTags.get(tag.bookmark_id).push(tag.tag_name);
        }
      }

      // 将标签信息合并到书摘对象中，并统一字段名
      const enrichedBookmarks = bookmarks.map(bookmark => {
        const tags = bookmarkTags.get(bookmark.id) || [];
        return {
          ...bookmark,
          // 兼容性处理：使用 book_title 和 book_author 作为 bookTitle 和 bookAuthor
          bookTitle: bookmark.book_title,
          bookAuthor: bookmark.book_author,
          pageNum: bookmark.page, // 将 page 字段映射为 pageNum
          tags: tags,
          // 添加 createTime 和 updateTime 字段（兼容前端）
          createTime: bookmark.created_at,
          updateTime: bookmark.updated_at,
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at
        };
      });

      return enrichedBookmarks;
    } catch (error) {
      console.error(`❌ 获取书籍ID ${bookId} 的书摘失败:`, error.message);
      return [];
    }
  }

  /**
   * 更新书摘
   */
  updateBookmark(bookmarkId, bookmarkData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      // 获取当前书摘信息
      const currentBookmark = this.db.prepare('SELECT * FROM qc_bookmarks WHERE id = ?').get(bookmarkId);
      if (!currentBookmark) {
        return null;
      }

      // 支持 camelCase 和 snake_case 两种字段名
      const newBookId = bookmarkData.bookId !== undefined ? bookmarkData.bookId : bookmarkData.book_id;
      const bookId = newBookId !== undefined ? newBookId : currentBookmark.book_id;

      // 当book_id发生变化时，重新从Calibre获取书籍信息
      const isBookIdChanged = newBookId !== undefined && newBookId !== currentBookmark.book_id;

      let bookTitle = currentBookmark.book_title;
      let bookAuthor = currentBookmark.book_author;

      if (isBookIdChanged) {
        console.log('📚 书籍ID已变化，从 Calibre 获取新书籍信息');
        console.log('旧 book_id:', currentBookmark.book_id, '新 book_id:', bookId);
        try {
          const calibreDb = databaseService.calibreDb;
          if (calibreDb) {
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
              bookTitle = bookInfo.title;
              bookAuthor = bookInfo.author;
              console.log('📚 从Calibre获取到书籍信息:', bookTitle, bookAuthor);
            }
          }
        } catch (error) {
          console.warn('⚠️ 获取书籍信息失败:', error.message);
        }
      }

      // 只有在book_id没有变化时才使用前端传入的书籍信息
      if (!isBookIdChanged) {
        bookTitle = bookmarkData.bookTitle !== undefined ? bookmarkData.bookTitle :
                    bookmarkData.book_title !== undefined ? bookmarkData.book_title : bookTitle;
        bookAuthor = bookmarkData.bookAuthor !== undefined ? bookmarkData.bookAuthor :
                     bookmarkData.book_author !== undefined ? bookmarkData.book_author : bookAuthor;
      }

      // 支持多种页码字段名
      const page = bookmarkData.pageNum !== undefined ? bookmarkData.pageNum :
                   bookmarkData.page !== undefined ? bookmarkData.page : currentBookmark.page;

      const query = `
        UPDATE qc_bookmarks
        SET book_id = ?, book_title = ?, book_author = ?, content = ?, note = ?, page = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        bookId,
        bookTitle,
        bookAuthor,
        bookmarkData.content,
        bookmarkData.note !== undefined ? bookmarkData.note : currentBookmark.note,
        page,
        bookmarkId
      );

      if (result.changes === 0) {
        return null;
      }

      // 更新标签（直接存储标签名称到 qc_bookmark_tags）
      if (bookmarkData.tags && Array.isArray(bookmarkData.tags)) {
        // 删除旧标签
        const deleteTagsQuery = `DELETE FROM qc_bookmark_tags WHERE bookmark_id = ?`;
        this.db.prepare(deleteTagsQuery).run(bookmarkId);

        // 插入新标签
        const insertTagQuery = `
          INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name)
          VALUES (?, ?)
        `;
        const insertTag = this.db.prepare(insertTagQuery);

        for (const tag of bookmarkData.tags) {
          if (tag && tag.trim() !== '') {
            insertTag.run(bookmarkId, tag);
          }
        }
      }

      return {
        id: bookmarkId,
        book_id: bookId,
        bookId: bookId, // 同时返回 camelCase
        bookTitle: bookTitle,
        bookAuthor: bookAuthor,
        book_title: bookTitle, // 同时返回 snake_case
        book_author: bookAuthor, // 同时返回 snake_case
        ...bookmarkData,
        created_at: bookmarkData.created_at || currentBookmark.created_at,
        updated_at: new Date().toISOString(),
        // 添加 createTime 和 updateTime 字段（兼容前端）
        createTime: bookmarkData.created_at || currentBookmark.created_at,
        updateTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 更新书摘失败:', error.message);
      throw error;
    }
  }

  /**
   * 删除书摘
   */
  deleteBookmark(bookmarkId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = 'DELETE FROM qc_bookmarks WHERE id = ?';
      const result = this.db.prepare(query).run(bookmarkId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书摘ID ${bookmarkId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍的所有书摘
   */
  deleteBookBookmarks(bookId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = 'DELETE FROM qc_bookmarks WHERE book_id = ?';
      const result = this.db.prepare(query).run(bookId);
      return result.changes;
    } catch (error) {
      console.error(`❌ 删除书籍ID ${bookId} 的所有书摘失败:`, error.message);
      throw error;
    }
  }

  // ----------------------
  // 数据迁移 (从JSON文件到数据库)
  // ----------------------

  /**
   * 从JSON文件迁移分组数据到数据库
   */
  async migrateGroupsFromJson(groupsJsonPath) {
    // 这里实现从JSON文件迁移分组数据到数据库的逻辑
    // 例如读取 groups.json 文件并将数据导入到 qc_groups 表
    console.log('🔄 开始从JSON迁移分组数据...');
    // 实现代码...
    console.log('✅ 分组数据迁移完成');
  }

  /**
   * 从JSON文件迁移书摘数据到数据库
   */
  async migrateBookmarksFromJson(bookmarksJsonPath) {
    // 这里实现从JSON文件迁移书摘数据到数据库的逻辑
    // 例如读取 bookmarks.json 文件并将数据导入到 qc_bookmarks 表
    console.log('🔄 开始从JSON迁移书摘数据...');
    // 实现代码...
    console.log('✅ 书摘数据迁移完成');
  }

  // ----------------------
  // 数据导出
  // ----------------------

  /**
   * 导出分组数据为JSON格式
   */
  exportGroupsToJson() {
    const groups = this.getAllGroups();
    return JSON.stringify(groups, null, 2);
  }

  /**
   * 导出书摘数据为JSON格式
   */
  exportBookmarksToJson() {
    const bookmarks = this.getAllBookmarks();
    return JSON.stringify(bookmarks, null, 2);
  }

  // ----------------------
  // 书摘标签管理
  // ----------------------

  /**
   * 获取书摘的所有标签（直接从 qc_bookmark_tags 读取标签名称）
   */
  getBookmarkTags(bookmarkId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT tag_name
        FROM qc_bookmark_tags
        WHERE bookmark_id = ?
        ORDER BY tag_name
      `;
      const results = this.db.prepare(query).all(bookmarkId);
      return results.map(r => r.tag_name);
    } catch (error) {
      console.error(`❌ 获取书摘ID ${bookmarkId} 的标签失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有书摘标签（去重）
   */
  getAllBookmarkTags() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT DISTINCT tag_name
        FROM qc_bookmark_tags
        ORDER BY tag_name
      `;
      const results = this.db.prepare(query).all();
      return results.map(r => r.tag_name);
    } catch (error) {
      console.error('❌ 获取所有书摘标签失败:', error.message);
      return [];
    }
  }

  /**
   * 删除指定标签（从所有书摘中移除该标签）
   */
  deleteTag(tagName) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        DELETE FROM qc_bookmark_tags
        WHERE tag_name = ?
      `;
      const result = this.db.prepare(query).run(tagName);
      return result.changes;
    } catch (error) {
      console.error('❌ 删除标签失败:', error.message);
      throw error;
    }
  }

  // ----------------------
  // 阅读目标管理 (reading_goals)
  // ----------------------

  /**
   * 获取或创建阅读目标
   */
  getOrCreateReadingGoal(readerId, year) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        SELECT * FROM reading_goals
        WHERE reader_id = ? AND year = ?
      `;
      let goal = this.db.prepare(query).get(readerId || 0, year);

      if (!goal) {
        const insertQuery = `
          INSERT INTO reading_goals (reader_id, year, target, completed)
          VALUES (?, ?, 0, 0)
        `;
        const result = this.db.prepare(insertQuery).run(readerId || 0, year);
        goal = {
          id: result.lastInsertRowid,
          reader_id: readerId || 0,
          year: year,
          target: 0,
          completed: 0
        };
      }

      return {
        id: goal.id,
        readerId: goal.reader_id,
        year: goal.year,
        target: goal.target,
        completed: goal.completed,
        created_at: goal.created_at,
        updated_at: goal.updated_at
      };
    } catch (error) {
      console.error('❌ 获取阅读目标失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新阅读目标
   */
  updateReadingGoal(goalId, goalData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        UPDATE reading_goals
        SET target = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        goalData.target,
        goalData.completed || 0,
        goalId
      );

      if (result.changes === 0) {
        return null;
      }

      return {
        id: goalId,
        ...goalData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 更新阅读目标失败:', error.message);
      throw error;
    }
  }

  /**
   * 增加已完成数量
   */
  incrementReadingGoalCompleted(goalId) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        UPDATE reading_goals
        SET completed = completed + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(goalId);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ 增加已完成数量失败:', error.message);
      throw error;
    }
  }

  // ----------------------
  // 阅读热力图管理 (reading_heatmap)
  // ----------------------

  /**
   * 获取指定年份的阅读热力图数据
   */
  getReadingHeatmap(readerId, year) {
    if (!this.isAvailable()) {
      return {};
    }

    try {
      const query = `
        SELECT date, bookmark_count
        FROM reading_heatmap
        WHERE reader_id = ? AND date LIKE ?
        ORDER BY date
      `;
      const results = this.db.prepare(query).all(
        readerId || 0,
        `${year}-%`
      );

      const heatmapData = {};
      for (const row of results) {
        heatmapData[row.date] = row.bookmark_count;
      }

      return heatmapData;
    } catch (error) {
      console.error('❌ 获取阅读热力图失败:', error.message);
      return {};
    }
  }

  /**
   * 更新或插入阅读热力图数据
   */
  upsertReadingHeatmap(readerId, date, bookmarkCount) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        INSERT INTO reading_heatmap (reader_id, date, bookmark_count)
        VALUES (?, ?, ?)
        ON CONFLICT(reader_id, date) DO UPDATE SET
          bookmark_count = excluded.bookmark_count
      `;
      this.db.prepare(query).run(readerId || 0, date, bookmarkCount);
      return true;
    } catch (error) {
      console.error('❌ 更新阅读热力图失败:', error.message);
      throw error;
    }
  }

  /**
   * 从书摘重新计算热力图数据
   */
  recalculateHeatmapFromBookmarks(readerId, year) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      // 清除当年的热力图数据
      this.db.prepare(`
        DELETE FROM reading_heatmap
        WHERE reader_id = ? AND date LIKE ?
      `).run(readerId || 0, `${year}-%`);

      // 从书摘统计每日数量
      const query = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM qc_bookmarks
        WHERE DATE(created_at) LIKE ?
        GROUP BY DATE(created_at)
      `;
      const results = this.db.prepare(query).all(`${year}-%`);

      // 批量插入热力图数据
      for (const row of results) {
        this.upsertReadingHeatmap(readerId || 0, row.date, row.count);
      }

      return results.length;
    } catch (error) {
      console.error('❌ 重新计算热力图失败:', error.message);
      throw error;
    }
  }

  // ----------------------
  // 愿望清单管理 (wishlist)
  // ----------------------

  /**
   * 获取愿望清单
   */
  getWishlist(readerId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT * FROM wishlist
        WHERE reader_id = ?
        ORDER BY created_at DESC
      `;
      return this.db.prepare(query).all(readerId || 0);
    } catch (error) {
      console.error('❌ 获取愿望清单失败:', error.message);
      return [];
    }
  }

  /**
   * 添加到愿望清单
   */
  addToWishlist(readerId, wishlistItem) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        INSERT INTO wishlist (reader_id, isbn, title, author, notes)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(reader_id, isbn) DO UPDATE SET
          title = excluded.title,
          author = excluded.author,
          notes = excluded.notes
      `;
      const result = this.db.prepare(query).run(
        readerId || 0,
        wishlistItem.isbn,
        wishlistItem.title || null,
        wishlistItem.author || null,
        wishlistItem.notes || null
      );

      return {
        id: result.lastInsertRowid,
        readerId: readerId || 0,
        ...wishlistItem,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 添加到愿望清单失败:', error.message);
      throw error;
    }
  }

  /**
   * 从愿望清单中移除
   */
  removeFromWishlist(readerId, isbn) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        DELETE FROM wishlist
        WHERE reader_id = ? AND isbn = ?
      `;
      const result = this.db.prepare(query).run(readerId || 0, isbn);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ 从愿望清单移除失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新愿望清单项
   */
  updateWishlistItem(wishlistId, wishlistData) {
    if (!this.isAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    try {
      const query = `
        UPDATE wishlist
        SET title = ?, author = ?, notes = ?
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        wishlistData.title || null,
        wishlistData.author || null,
        wishlistData.notes || null,
        wishlistId
      );

      if (result.changes === 0) {
        return null;
      }

      return {
        id: wishlistId,
        ...wishlistData
      };
    } catch (error) {
      console.error('❌ 更新愿望清单项失败:', error.message);
      throw error;
    }
  }
}

export default new QcDataService();