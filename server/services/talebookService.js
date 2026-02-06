/**
 * Talebook服务
 * 处理Talebook特定的数据操作
 */

import databaseService from './database/index.js';

/**
 * Talebook服务类
 */
class TalebookService {
  constructor() {
    this.db = databaseService.talebookDb;
  }

  /**
   * 检查Talebook数据库是否可用
   */
  isAvailable() {
    return databaseService.isTalebookAvailable();
  }

  /**
   * 获取所有书籍的类型信息
   */
  async getAllBookTypes() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = 'SELECT book_id as id, book_type FROM items';
      return this.db.prepare(query).all();
    } catch (error) {
      console.error('❌ 获取所有书籍类型失败:', error.message);
      return [];
    }
  }

  /**
   * 根据书籍ID获取书籍类型
   */
  async getBookTypeById(bookId) {
    if (!this.isAvailable()) {
      return 1; // 默认实体书
    }

    try {
      const query = 'SELECT book_type FROM items WHERE book_id = ?';
      const result = this.db.prepare(query).get(bookId);
      return result ? result.book_type : 1;
    } catch (error) {
      console.error(`❌ 获取书籍ID ${bookId} 的类型失败:`, error.message);
      return 1;
    }
  }

  /**
   * 获取书籍的完整信息，包括Talebook特定字段
   */
  async getBookWithType(bookId) {
    // 先从Calibre数据库获取基本信息
    const book = databaseService.getBookById(bookId);
    if (!book) {
      return null;
    }

    // 添加Talebook特定字段
    try {
      const bookType = await this.getBookTypeById(bookId);
      return {
        ...book,
        book_type: bookType,
        typeText: bookType === 0 ? '电子书' : '实体书'
      };
    } catch (error) {
      console.error(`❌ 获取书籍 ${bookId} 完整信息失败:`, error.message);
      return book;
    }
  }

  /**
   * 关联查询，获取书籍及其相关数据
   */
  async getBookWithRelations(bookId) {
    const book = await this.getBookWithType(bookId);
    if (!book) {
      return null;
    }

    try {
      // 获取书籍分组
      const groups = await this.getBookGroups(bookId);
      // 获取书籍书摘
      const bookmarks = await this.getBookBookmarks(bookId);

      return {
        ...book,
        groups: groups,
        bookmarks: bookmarks
      };
    } catch (error) {
      console.error(`❌ 获取书籍 ${bookId} 关联数据失败:`, error.message);
      return book;
    }
  }

  /**
   * 获取书籍所属的分组
   */
  async getBookGroups(bookId) {
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
      console.error(`❌ 获取书籍 ${bookId} 分组失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取书籍的所有书摘
   */
  async getBookBookmarks(bookId) {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = `
        SELECT * FROM qc_bookmarks
        WHERE book_id = ?
        ORDER BY created_at DESC
      `;
      return this.db.prepare(query).all(bookId);
    } catch (error) {
      console.error(`❌ 获取书籍 ${bookId} 书摘失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有分组
   */
  async getAllGroups() {
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
   * 获取所有书摘
   */
  async getAllBookmarks() {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const query = 'SELECT * FROM qc_bookmarks ORDER BY created_at DESC';
      return this.db.prepare(query).all();
    } catch (error) {
      console.error('❌ 获取所有书摘失败:', error.message);
      return [];
    }
  }

  /**
   * 数据同步逻辑
   * 将Calibre数据同步到Talebook数据库
   */
  async syncCalibreToTalebook() {
    if (!this.isAvailable()) {
      console.warn('⚠️ Talebook数据库不可用，跳过同步');
      return { success: false, message: 'Talebook数据库不可用' };
    }

    try {
      console.log('🔄 开始同步Calibre数据到Talebook数据库...');
      
      // 获取Calibre数据库中的所有书籍
      const calibreBooks = databaseService.getAllBooksFromCalibre();
      console.log(`📚 从Calibre获取到 ${calibreBooks.length} 本书籍`);
      
      // 同步书籍数据
      let syncedCount = 0;
      for (const book of calibreBooks) {
        try {
          // 检查Talebook数据库中是否已存在该书（items表的主键是book_id）
          const existingBook = this.db.prepare('SELECT book_id FROM items WHERE book_id = ?').get(book.id);

          if (existingBook) {
            // 更新现有书籍类型
            this.db.prepare(`
              UPDATE items
              SET book_type = ?
              WHERE book_id = ?
            `).run(0, book.id); // 默认电子书类型
          } else {
            // 插入新书 - items表只存储统计信息
            this.db.prepare(`
              INSERT INTO items (book_id, book_type, create_time)
              VALUES (?, 0, ?)
            `).run(
              book.id,
              new Date().toISOString()
            );
          }
          
          syncedCount++;
        } catch (bookError) {
          console.error(`❌ 同步书籍ID ${book.id} 失败:`, bookError.message);
          continue;
        }
      }
      
      console.log(`✅ 同步完成，成功同步 ${syncedCount} 本书籍`);
      return { success: true, syncedCount };
    } catch (error) {
      console.error('❌ 同步Calibre到Talebook失败:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * 解析book_type字段值
   * @param {number} bookType - 书籍类型（0: 电子书, 1: 实体书）
   * @returns {string} - 书籍类型文本
   */
  parseBookType(bookType) {
    return bookType === 0 ? '电子书' : '实体书';
  }

  /**
   * 更新Talebook数据库连接
   */
  updateConnection() {
    this.db = databaseService.talebookDb;
  }
}

export default new TalebookService();