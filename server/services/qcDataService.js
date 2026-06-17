/**
 * qcDataService
 * 管理qcbooklog应用专属数据表
 * 包括groups表和bookmarks表的CRUD操作
 */

import databaseService from './database/index.js';
import calibreService from './calibreService.js';
import NodeCache from 'node-cache';

// 缓存配置
const GROUPS_CACHE = new NodeCache({ stdTTL: 60, maxKeys: 10 });
const CACHE_PREFIX = 'qc:';

/**
 * qcDataService类
 */
class QcDataService {
  constructor() {
    this._db = null;
  }

  /**
   * 检查数据库是否可用
   */
  isAvailable() {
    return databaseService.isQcBooklogAvailable();
  }

  /**
   * 获取数据库连接（每次都获取最新连接）
   */
  getDb() {
    return databaseService.isQcBooklogAvailable() ? databaseService.getQcBooklogDb() : null;
  }

  /**
   * 获取数据库连接（向后兼容）
   */
  get db() {
    return this.getDb();
  }

  /**
   * 获取当前 Calibre 库的 UUID
   */
  getCurrentLibraryUuid() {
    return databaseService.connectionManager?.getCurrentLibraryUuid() || '';
  }

  /**
   * 确保书籍映射存在（使用复合键：library_uuid + calibre_book_id）
   */
  ensureBookMapping(bookId, bookTitle = null, bookAuthor = null) {
    if (!this.isAvailable() || !bookId || bookId <= 0) {
      console.warn('⚠️ ensureBookMapping 跳过: 数据库不可用或 bookId 无效', { bookId, isAvailable: this.isAvailable() });
      return null;
    }

    const libraryUuid = this.getCurrentLibraryUuid();
    console.log('📚 ensureBookMapping - libraryUuid:', libraryUuid, 'bookId:', bookId);

    if (!libraryUuid) {
      console.error('❌ libraryUuid 为空，无法创建书籍映射');
      return null;
    }

    const existingMapping = this.db.prepare(`
      SELECT id, calibre_book_id FROM qc_book_mapping 
      WHERE library_uuid = ? AND calibre_book_id = ?
    `).get(libraryUuid, bookId);

    if (existingMapping) {
      console.log('✅ 找到已存在的映射:', existingMapping);
      return existingMapping;
    }

    console.log('📝 创建新的书籍映射:', { libraryUuid, bookId, bookTitle, bookAuthor });
    try {
      const result = this.db.prepare(`
        INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
        VALUES (?, ?, ?, ?, ?)
      `).run(libraryUuid, bookId, bookId, bookTitle, bookAuthor);

      const newId = result.lastInsertRowid;
      console.log('✅ 书籍映射创建成功, id:', newId);
      return { id: newId, calibre_book_id: bookId };
    } catch (insertError) {
      console.error('❌ 创建书籍映射失败:', insertError.message);
      return null;
    }
  }

  /**
   * 更新数据库连接
   */
  updateConnection() {
    this.db = databaseService.isQcBooklogAvailable() ? databaseService.getQcBooklogDb() : null;
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
      throw new Error('QCBookLog数据库不可用');
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
      
      // 清除分组缓存
      this.clearGroupsCache();
      
      return {
        id: String(result.lastInsertRowid),
        name: groupData.name,
        sort: result.lastInsertRowid,
        parentId: null,
        bookCount: 0,
        description: groupData.description || '',
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
   * 返回格式匹配前端 BookGroup 类型
   */
  getAllGroups() {
    if (!this.isAvailable()) {
      return [];
    }

    // 检查缓存
    const cacheKey = `${CACHE_PREFIX}groups:all`;
    const cachedGroups = GROUPS_CACHE.get(cacheKey);
    if (cachedGroups) {
      console.log('📦 从缓存获取分组列表');
      return cachedGroups;
    }

    try {
      const query = `
        SELECT 
          g.id, 
          g.name, 
          g.description,
          g.color,
          g.created_at,
          g.updated_at,
          (SELECT COUNT(*) FROM qc_book_groups bg WHERE bg.group_id = g.id) as bookCount
        FROM qc_groups g
        ORDER BY g.name
      `;
      const groups = this.db.prepare(query).all();
      
      const result = groups.map(g => ({
        id: String(g.id),
        name: g.name,
        sort: g.id,
        parentId: null,
        bookCount: g.bookCount || 0,
        description: g.description || '',
        color: g.color,
        created_at: g.created_at,
        updated_at: g.updated_at
      }));

      // 存入缓存
      GROUPS_CACHE.set(cacheKey, result);
      console.log(`✅ 获取分组列表并缓存，共 ${result.length} 个分组`);
      
      return result;
    } catch (error) {
      console.error('❌ 获取所有分组失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ID获取分组
   * 返回格式匹配前端 BookGroup 类型
   */
  getGroupById(groupId) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const query = `
        SELECT 
          g.id, 
          g.name, 
          g.description,
          g.color,
          g.created_at,
          g.updated_at,
          (SELECT COUNT(*) FROM qc_book_groups bg WHERE bg.group_id = g.id) as bookCount
        FROM qc_groups g
        WHERE g.id = ?
      `;
      const group = this.db.prepare(query).get(groupId);
      
      if (!group) return null;
      
      return {
        id: String(group.id),
        name: group.name,
        sort: group.id,
        parentId: null,
        bookCount: group.bookCount || 0,
        description: group.description || '',
        color: group.color,
        created_at: group.created_at,
        updated_at: group.updated_at
      };
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
      throw new Error('QCBookLog数据库不可用');
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
      
      // 清除分组缓存
      this.clearGroupsCache();
      
      return {
        id: String(groupId),
        name: groupData.name,
        sort: groupId,
        parentId: null,
        bookCount: 0,
        description: groupData.description || '',
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
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      // 先删除分组与书籍的关联
      this.db.prepare('DELETE FROM qc_book_groups WHERE group_id = ?').run(groupId);
      
      // 再删除分组
      const query = 'DELETE FROM qc_groups WHERE id = ?';
      const result = this.db.prepare(query).run(groupId);
      
      // 清除分组缓存
      this.clearGroupsCache();
      
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除分组ID ${groupId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 清除分组缓存
   */
  clearGroupsCache() {
    GROUPS_CACHE.flushAll();
    console.log('🗑️ 分组缓存已清除');
  }

  // ----------------------
  // 书籍分组关联管理
  // ----------------------

  /**
   * 确保书籍在 qc_bookdata 表中存在
   * @param {number} bookId - 书籍ID
   * @returns {boolean} 是否成功
   */
  ensureBookInBookdata(bookId) {
    if (!this.isAvailable() || !bookId || bookId <= 0) {
      return false;
    }

    try {
      const existing = this.db.prepare('SELECT book_id FROM qc_bookdata WHERE book_id = ?').get(bookId);
      if (existing) {
        return true;
      }

      this.db.prepare(`
        INSERT OR IGNORE INTO qc_bookdata (book_id, page_count, created_at, updated_at)
        VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(bookId);
      console.log(`✅ 创建 qc_bookdata 记录: book_id=${bookId}`);
      return true;
    } catch (error) {
      console.error(`❌ 确保 qc_bookdata 记录失败:`, error.message);
      return false;
    }
  }

  /**
   * 添加书籍到分组
   */
  addBookToGroup(bookId, groupId) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      this.ensureBookInBookdata(bookId);

      // 获取 mapping_id
      const mapping = this.db.prepare('SELECT id FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId);
      if (!mapping) {
        throw new Error(`未找到书籍映射: calibre_book_id=${bookId}`);
      }

      const query = `
        INSERT OR IGNORE INTO qc_book_groups (mapping_id, group_id)
        VALUES (?, ?)
      `;
      const result = this.db.prepare(query).run(mapping.id, groupId);
      
      // 清除分组缓存以更新书籍数量
      if (result.changes > 0) {
        this.clearGroupsCache();
      }
      
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
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      // 获取 mapping_id
      const mapping = this.db.prepare('SELECT id FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId);
      if (!mapping) {
        throw new Error(`未找到书籍映射: calibre_book_id=${bookId}`);
      }

      const query = `
        DELETE FROM qc_book_groups
        WHERE mapping_id = ? AND group_id = ?
      `;
      const result = this.db.prepare(query).run(mapping.id, groupId);
      
      // 清除分组缓存以更新书籍数量
      if (result.changes > 0) {
        this.clearGroupsCache();
      }
      
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
      // 注意：qc_book_groups 表使用 mapping_id，需要通过 qc_book_mapping 转换
      const query = `
        SELECT g.* FROM qc_groups g
        JOIN qc_book_groups bg ON g.id = bg.group_id
        JOIN qc_book_mapping m ON bg.mapping_id = m.id
        WHERE m.calibre_book_id = ?
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
      // 注意：qc_book_groups 表使用 mapping_id，需要通过 qc_book_mapping 获取 calibre_book_id
      const query = `
        SELECT m.calibre_book_id as book_id FROM qc_book_groups bg
        JOIN qc_book_mapping m ON bg.mapping_id = m.id
        WHERE bg.group_id = ?
      `;
      const results = this.db.prepare(query).all(groupId);
      return results.map(item => item.book_id);
    } catch (error) {
      console.error(`❌ 获取分组ID ${groupId} 中的书籍失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取书籍的所有自定义标签
   */
  getBookTags(bookId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      // qc_book_tags 表使用 mapping_id + tag_id，需要 JOIN qc_book_mapping 和 qc_tags
      const query = `
        SELECT DISTINCT t.name as name
        FROM qc_book_tags bt
        JOIN qc_tags t ON bt.tag_id = t.id
        JOIN qc_book_mapping m ON bt.mapping_id = m.id
        WHERE m.calibre_book_id = ?
        ORDER BY t.name
      `;
      const results = this.db.prepare(query).all(bookId);
      return results.map(item => item.name);
    } catch (error) {
      console.error(`❌ 获取书籍ID ${bookId} 的标签失败:`, error.message);
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
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      console.log('📝 createBookmark 收到的数据:', JSON.stringify(bookmarkData, null, 2));
      const bookId = bookmarkData.bookId || bookmarkData.book_id;
      let bookTitle = bookmarkData.bookTitle || bookmarkData.book_title || null;
      let bookAuthor = bookmarkData.bookAuthor || bookmarkData.book_author || null;

      console.log('📚 解析后的 bookId:', bookId, 'bookTitle:', bookTitle, 'bookAuthor:', bookAuthor);

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

      // 确保书籍映射存在（使用复合键）
      let mappingId = null;
      if (bookId && bookId > 0) {
        const mapping = this.ensureBookMapping(bookId, bookTitle, bookAuthor);
        console.log('📚 ensureBookMapping 返回:', mapping);
        mappingId = mapping ? mapping.id : null;
      } else {
        console.error('❌ bookId 无效:', bookId);
      }

      console.log('📚 最终 mappingId:', mappingId);

      if (!mappingId) {
        throw new Error('无法创建书籍映射');
      }

      const query = `
        INSERT INTO qc_bookmarks (mapping_id, user_id, chapter, pos, pos_type, text, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const pos = bookmarkData.pos || bookmarkData.pageNum || bookmarkData.page || bookmarkData.pageNumber || 0;
      console.log('📄 保存页码信息 - pos:', pos, '原始数据:', {
        pos: bookmarkData.pos,
        pageNum: bookmarkData.pageNum,
        page: bookmarkData.page,
        pageNumber: bookmarkData.pageNumber
      });
      const result = this.db.prepare(query).run(
        mappingId,
        bookmarkData.userId || 0,
        bookmarkData.chapter || null,
        pos,
        bookmarkData.pos_type || 'chapter',
        bookmarkData.text || bookmarkData.content || '',
        bookmarkData.note || null
      );

      const bookmarkId = result.lastInsertRowid;

      // 处理标签（直接存储标签名称到 qc_bookmark_tags）
      if (bookmarkData.tags && Array.isArray(bookmarkData.tags) && bookmarkData.tags.length > 0) {
        for (const tag of bookmarkData.tags) {
          // 确保 tag 是字符串类型
          const tagStr = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : String(tag));
          if (tagStr && tagStr.trim() !== '') {
            const insertTagQuery = `
              INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_id)
              VALUES (?, ?)
            `;
            this.db.prepare(insertTagQuery).run(bookmarkId, tagStr.trim());
          }
        }
      }

      return {
        id: bookmarkId,
        mapping_id: mappingId,
        book_id: bookId,
        bookId: bookId,
        bookTitle: bookTitle,
        bookAuthor: bookAuthor,
        book_title: bookTitle,
        book_author: bookAuthor,
        chapter: bookmarkData.chapter,
        pos: pos,
        pageNum: pos,
        page: pos,
        text: bookmarkData.text || bookmarkData.content,
        content: bookmarkData.text || bookmarkData.content,
        note: bookmarkData.note,
        tags: bookmarkData.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      const query = `
        SELECT bm.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_bookmarks bm
        LEFT JOIN qc_book_mapping m ON bm.mapping_id = m.id
        ORDER BY bm.created_at DESC
      `;
      const bookmarks = this.db.prepare(query).all();

      const bookmarkIds = bookmarks.map(b => b.id);
      const bookmarkTags = new Map();

      if (bookmarkIds.length > 0) {
        const placeholders = bookmarkIds.map(() => '?').join(',');
        const tagsQuery = `
          SELECT bookmark_id, tag_id
          FROM qc_bookmark_tags
          WHERE bookmark_id IN (${placeholders})
        `;
        const tags = this.db.prepare(tagsQuery).all(...bookmarkIds);

        for (const tag of tags) {
          if (!bookmarkTags.has(tag.bookmark_id)) {
            bookmarkTags.set(tag.bookmark_id, []);
          }
          bookmarkTags.get(tag.bookmark_id).push(tag.tag_id);
        }
      }

      // 获取所有书籍信息用于构建封面URL
      const bookIds = [...new Set(bookmarks.map(b => b.book_id).filter(id => id))];
      const bookPathMap = new Map();
      
      if (bookIds.length > 0 && databaseService.isCalibreAvailable()) {
        try {
          const calibreDb = databaseService.calibreDb;
          const placeholders = bookIds.map(() => '?').join(',');
          const booksQuery = `SELECT id, path FROM books WHERE id IN (${placeholders})`;
          const books = calibreDb.prepare(booksQuery).all(...bookIds);
          books.forEach(book => bookPathMap.set(book.id, book.path));
        } catch (e) {
          console.warn('⚠️ 获取书籍路径失败:', e.message);
        }
      }

      const enrichedBookmarks = bookmarks.map(bookmark => {
        const tags = bookmarkTags.get(bookmark.id) || [];
        const bookId = bookmark.book_id;
        
        // 构建封面URL（使用书籍路径）
        let coverUrl = null;
        if (bookId) {
          const bookPath = bookPathMap.get(bookId);
          if (bookPath) {
            coverUrl = `/api/static/calibre/${encodeURIComponent(bookPath)}/cover.jpg`;
          } else {
            // 降级：使用bookId（可能不工作，但保持兼容）
            coverUrl = `/api/static/calibre/${bookId}/cover.jpg`;
          }
        }
        
        return {
          id: bookmark.id,
          mapping_id: bookmark.mapping_id,
          user_id: bookmark.user_id,
          chapter: bookmark.chapter,
          pos: bookmark.pos,
          pos_type: bookmark.pos_type,
          text: bookmark.text,
          note: bookmark.note,
          book_id: bookId,
          bookId: bookId,
          bookTitle: bookmark.book_title || '未知书籍',
          bookAuthor: bookmark.book_author || '',
          book_title: bookmark.book_title,
          book_author: bookmark.book_author,
          pageNum: bookmark.pos,
          pageNumber: bookmark.pos,
          content: bookmark.text,
          tags: tags,
          coverUrl: coverUrl,
          localCoverData: coverUrl,
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at,
          createTime: bookmark.created_at,
          updateTime: bookmark.updated_at
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
      const query = `
        SELECT bm.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_bookmarks bm
        LEFT JOIN qc_book_mapping m ON bm.mapping_id = m.id
        WHERE bm.id = ?
      `;
      const bookmark = this.db.prepare(query).get(bookmarkId);
      if (bookmark) {
        // 获取标签
        const tagsQuery = `
          SELECT tag_id FROM qc_bookmark_tags WHERE bookmark_id = ?
        `;
        const tagRows = this.db.prepare(tagsQuery).all(bookmarkId);
        const tags = tagRows.map(t => t.tag_id);

        // 获取书籍路径用于构建封面URL
        let coverUrl = null;
        if (bookmark.book_id && databaseService.isCalibreAvailable()) {
          try {
            const calibreDb = databaseService.calibreDb;
            const book = calibreDb.prepare('SELECT path FROM books WHERE id = ?').get(bookmark.book_id);
            if (book && book.path) {
              coverUrl = `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
            }
          } catch (e) {
            console.warn('⚠️ 获取书籍路径失败:', e.message);
          }
        }

        const result = {
          id: bookmark.id,
          mapping_id: bookmark.mapping_id,
          book_id: bookmark.book_id,
          bookId: bookmark.book_id,
          bookTitle: bookmark.book_title,
          bookAuthor: bookmark.book_author,
          book_title: bookmark.book_title,
          book_author: bookmark.book_author,
          chapter: bookmark.chapter,
          pos: bookmark.pos,
          pos_type: bookmark.pos_type,
          text: bookmark.text,
          content: bookmark.text,
          note: bookmark.note,
          pageNum: bookmark.pos,
          pageNumber: bookmark.pos,
          tags: tags,
          coverUrl: coverUrl,
          created_at: bookmark.created_at,
          updated_at: bookmark.updated_at,
          createTime: bookmark.created_at,
          updateTime: bookmark.updated_at
        };
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
      const libraryUuid = this.getCurrentLibraryUuid();
      const mapping = this.db.prepare(`
        SELECT id FROM qc_book_mapping 
        WHERE library_uuid = ? AND calibre_book_id = ?
      `).get(libraryUuid, bookId);

      if (!mapping) {
        return [];
      }

      const query = `
        SELECT bm.*, m.title as book_title, m.author as book_author, m.calibre_book_id as book_id
        FROM qc_bookmarks bm
        JOIN qc_book_mapping m ON bm.mapping_id = m.id
        WHERE bm.mapping_id = ?
        ORDER BY bm.created_at DESC
      `;
      const bookmarks = this.db.prepare(query).all(mapping.id);

      const bookmarkIds = bookmarks.map(b => b.id);
      const bookmarkTags = new Map();

      if (bookmarkIds.length > 0) {
        const placeholders = bookmarkIds.map(() => '?').join(',');
        const tagsQuery = `
          SELECT bookmark_id, tag_id
          FROM qc_bookmark_tags
          WHERE bookmark_id IN (${placeholders})
        `;
        const tags = this.db.prepare(tagsQuery).all(...bookmarkIds);

        for (const tag of tags) {
          if (!bookmarkTags.has(tag.bookmark_id)) {
            bookmarkTags.set(tag.bookmark_id, []);
          }
          bookmarkTags.get(tag.bookmark_id).push(tag.tag_id);
        }
      }

      const enrichedBookmarks = bookmarks.map(bookmark => {
        const tags = bookmarkTags.get(bookmark.id) || [];
        return {
          ...bookmark,
          bookId: bookmark.book_id,
          pageNum: bookmark.pos,
          pageNumber: bookmark.pos,
          content: bookmark.text,
          tags: tags,
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
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const currentBookmark = this.db.prepare('SELECT * FROM qc_bookmarks WHERE id = ?').get(bookmarkId);
      if (!currentBookmark) {
        return null;
      }

      const pos = bookmarkData.pos !== undefined ? bookmarkData.pos :
                  bookmarkData.pageNum !== undefined ? bookmarkData.pageNum :
                  bookmarkData.pageNumber !== undefined ? bookmarkData.pageNumber :
                  currentBookmark.pos;

      const query = `
        UPDATE qc_bookmarks
        SET chapter = ?, pos = ?, pos_type = ?, text = ?, note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        bookmarkData.chapter !== undefined ? bookmarkData.chapter : currentBookmark.chapter,
        pos,
        bookmarkData.pos_type || currentBookmark.pos_type || 'chapter',
        bookmarkData.text !== undefined ? bookmarkData.text : (bookmarkData.content !== undefined ? bookmarkData.content : currentBookmark.text),
        bookmarkData.note !== undefined ? bookmarkData.note : currentBookmark.note,
        bookmarkId
      );

      if (result.changes === 0) {
        return null;
      }

      if (bookmarkData.tags && Array.isArray(bookmarkData.tags)) {
        const deleteTagsQuery = `DELETE FROM qc_bookmark_tags WHERE bookmark_id = ?`;
        this.db.prepare(deleteTagsQuery).run(bookmarkId);

        const insertTagQuery = `
          INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_id)
          VALUES (?, ?)
        `;
        const insertTag = this.db.prepare(insertTagQuery);

        for (const tag of bookmarkData.tags) {
          // 确保 tag 是字符串类型
          const tagStr = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : String(tag));
          if (tagStr && tagStr.trim() !== '') {
            insertTag.run(bookmarkId, tagStr.trim());
          }
        }
      }

      const mapping = this.db.prepare('SELECT * FROM qc_book_mapping WHERE id = ?').get(currentBookmark.mapping_id);

      return {
        id: bookmarkId,
        mapping_id: currentBookmark.mapping_id,
        book_id: mapping ? mapping.calibre_book_id : null,
        bookId: mapping ? mapping.calibre_book_id : null,
        bookTitle: mapping ? mapping.title : null,
        bookAuthor: mapping ? mapping.author : null,
        book_title: mapping ? mapping.title : null,
        book_author: mapping ? mapping.author : null,
        chapter: bookmarkData.chapter !== undefined ? bookmarkData.chapter : currentBookmark.chapter,
        pos: pos,
        text: bookmarkData.text !== undefined ? bookmarkData.text : (bookmarkData.content !== undefined ? bookmarkData.content : currentBookmark.text),
        content: bookmarkData.text !== undefined ? bookmarkData.text : (bookmarkData.content !== undefined ? bookmarkData.content : currentBookmark.text),
        note: bookmarkData.note !== undefined ? bookmarkData.note : currentBookmark.note,
        tags: bookmarkData.tags || [],
        created_at: currentBookmark.created_at,
        updated_at: new Date().toISOString(),
        createTime: currentBookmark.created_at,
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
      throw new Error('QCBookLog数据库不可用');
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
      throw new Error('QCBookLog数据库不可用');
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

  /**
   * 搜索书摘
   */
  searchBookmarks(keyword) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT * FROM qc_bookmarks
        WHERE content LIKE ? OR chapter LIKE ?
        ORDER BY created_at DESC
      `;
      const pattern = `%${keyword}%`;
      return this.db.prepare(query).all(pattern, pattern);
    } catch (error) {
      console.error('❌ 搜索书摘失败:', error.message);
      return [];
    }
  }

  /**
   * 获取所有书摘标签（带数量）
   */
  getAllBookmarkTags() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT
          tag_id,
          COUNT(*) as count
        FROM qc_bookmark_tags
        GROUP BY tag_id
        ORDER BY count DESC, tag_id ASC
      `;
      return this.db.prepare(query).all();
    } catch (error) {
      console.error('❌ 获取所有书摘标签失败:', error.message);
      return [];
    }
  }

  /**
   * 获取指定书摘的标签
   */
  getBookmarkTags(bookmarkId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT tag_id
        FROM qc_bookmark_tags
        WHERE bookmark_id = ?
        ORDER BY tag_id ASC
      `;
      const tags = this.db.prepare(query).all(bookmarkId);
      return tags.map(t => t.tag_id);
    } catch (error) {
      console.error(`❌ 获取书摘ID ${bookmarkId} 的标签失败:`, error.message);
      return [];
    }
  }

  // ----------------------
  // 愿望清单管理 (wishlist)
  // ----------------------

  /**
   * 获取愿望清单
   */
  getWishlist(readerId = 0) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT * FROM qc_wishlist
        WHERE user_id = ? OR reader_id = ?
        ORDER BY created_at DESC
      `;
      return this.db.prepare(query).all(readerId, readerId);
    } catch (error) {
      console.error('❌ 获取愿望清单失败:', error.message);
      return [];
    }
  }

  /**
   * 添加到愿望清单
   */
  addToWishlist(readerId, wishlistData) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const query = `
        INSERT INTO qc_wishlist (user_id, reader_id, isbn, title, author, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const result = this.db.prepare(query).run(
        readerId,
        readerId,
        wishlistData.isbn,
        wishlistData.title || '',
        wishlistData.author || '',
        wishlistData.notes || ''
      );
      
      return {
        id: result.lastInsertRowid,
        reader_id: readerId,
        user_id: readerId,
        ...wishlistData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 添加到愿望清单失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新愿望清单项
   */
  updateWishlistItem(wishlistId, updateData) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const query = `
        UPDATE qc_wishlist
        SET title = ?, author = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        updateData.title || '',
        updateData.author || '',
        updateData.notes || '',
        wishlistId
      );
      
      if (result.changes === 0) {
        return null;
      }
      
      return {
        id: wishlistId,
        ...updateData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ 更新愿望清单项ID ${wishlistId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 从愿望清单中移除
   */
  removeFromWishlist(readerId, isbn) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const query = `
        DELETE FROM qc_wishlist
        WHERE (user_id = ? OR reader_id = ?) AND isbn = ?
      `;
      const result = this.db.prepare(query).run(readerId, readerId, isbn);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ 从愿望清单移除失败:', error.message);
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
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      // 确保用户存在（支持 readerId >= 0）
      const actualReaderId = readerId !== undefined && readerId !== null ? readerId : 0;
      const existingUser = this.db.prepare('SELECT id FROM qc_users WHERE id = ?').get(actualReaderId);
      if (!existingUser) {
        this.db.prepare(`
          INSERT OR IGNORE INTO qc_users (id, username, display_name)
          VALUES (?, ?, ?)
        `).run(actualReaderId, `user_${actualReaderId}`, actualReaderId === 0 ? '默认用户' : `用户${actualReaderId}`);
      }

      const existingGoal = this.db.prepare(`
        SELECT * FROM qc_reading_goals
        WHERE user_id = ? AND goal_type = 'yearly' AND start_date = ?
      `).get(actualReaderId, `${year}-01-01`);

      if (existingGoal) {
        return {
          id: existingGoal.id,
          readerId: existingGoal.user_id,
          year: year,
          target: existingGoal.target_value,
          completed: existingGoal.current_value,
          created_at: existingGoal.created_at,
          updated_at: existingGoal.updated_at
        };
      }

      const result = this.db.prepare(`
        INSERT INTO qc_reading_goals (user_id, goal_type, target_value, current_value, start_date, status)
        VALUES (?, 'yearly', 12, 0, ?, 'active')
      `).run(actualReaderId, `${year}-01-01`);

      return {
        id: result.lastInsertRowid,
        readerId: actualReaderId,
        year: year,
        target: 12,
        completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 获取或创建阅读目标失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新阅读目标
   */
  updateReadingGoal(goalId, updateData) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const query = `
        UPDATE qc_reading_goals
        SET target_value = ?, current_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = this.db.prepare(query).run(
        updateData.target || 12,
        updateData.completed || 0,
        goalId
      );

      if (result.changes === 0) {
        return null;
      }

      const goal = this.db.prepare('SELECT * FROM qc_reading_goals WHERE id = ?').get(goalId);
      return {
        id: goal.id,
        readerId: goal.user_id,
        year: new Date(goal.start_date).getFullYear(),
        target: goal.target_value,
        completed: goal.current_value,
        created_at: goal.created_at,
        updated_at: goal.updated_at
      };
    } catch (error) {
      console.error('❌ 更新阅读目标失败:', error.message);
      throw error;
    }
  }

  /**
   * 增加阅读目标已完成数量
   */
  incrementReadingGoalCompleted(goalId) {
    if (!this.isAvailable()) {
      throw new Error('QCBookLog数据库不可用');
    }

    try {
      const result = this.db.prepare(`
        UPDATE qc_reading_goals
        SET current_value = current_value + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(goalId);

      return result.changes > 0;
    } catch (error) {
      console.error('❌ 增加阅读目标已完成数量失败:', error.message);
      throw error;
    }
  }
}

export default new QcDataService();