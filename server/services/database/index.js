/**
 * 数据库服务主入口
 * 整合所有仓储并提供向后兼容的接口
 */

import DatabaseConnectionManager from './connection-manager.js';
import BookRepository from './repositories/calibre/book-repository.js';
import AuthorRepository from './repositories/calibre/author-repository.js';
import PublisherRepository from './repositories/calibre/publisher-repository.js';
import TagRepository from './repositories/calibre/tag-repository.js';
import ItemsRepository from './repositories/talebook/items-repository.js';
import QcBookdataRepository from './repositories/talebook/qc-bookdata-repository.js';
import QcBookmarksRepository from './repositories/talebook/qc-bookmarks-repository.js';
import ReadingStateRepository from './repositories/talebook/reading-state-repository.js';
import validators from './validators/index.js';
import { createRequire } from 'module';
import crypto from 'crypto';
import path from 'path';
import fsSync from 'fs';

const require = createRequire(import.meta.url);
let Database = null;

try {
  const module = require('better-sqlite3');
  Database = module.default || module;
} catch (error) {
  console.warn('⚠️ better-sqlite3 未安装，数据库服务将不可用');
}

/**
 * 数据库服务类
 */
class DatabaseService {
  constructor() {
    this.connectionManager = new DatabaseConnectionManager();
    this.repositories = null;
    this._initialized = false;
  }

  /**
   * 初始化数据库服务
   */
  async init() {
    if (this._initialized) {
      return;
    }

    await this.connectionManager.init();
    this.initRepositories();
    this._initialized = true;
    console.log('✅ 数据库服务初始化完成');
  }

  /**
   * 初始化所有仓储
   */
  initRepositories() {
    const calibreDb = this.connectionManager.getCalibreDb();
    const talebookDb = this.connectionManager.getTalebookDb();

    // Calibre 仓储
    const bookRepo = new BookRepository(calibreDb, talebookDb);
    const authorRepo = new AuthorRepository(calibreDb);
    const publisherRepo = new PublisherRepository(calibreDb);
    const tagRepo = new TagRepository(calibreDb);

    // Talebook 仓储
    const itemsRepo = talebookDb ? new ItemsRepository(talebookDb) : null;
    const qcBookdataRepo = talebookDb ? new QcBookdataRepository(talebookDb) : null;
    const qcBookmarksRepo = talebookDb ? new QcBookmarksRepository(talebookDb) : null;
    const readingStateRepo = talebookDb ? new ReadingStateRepository(talebookDb) : null;

    this.repositories = {
      calibre: {
        books: bookRepo,
        authors: authorRepo,
        publishers: publisherRepo,
        tags: tagRepo
      },
      talebook: {
        items: itemsRepo,
        qcBookdata: qcBookdataRepo,
        qcBookmarks: qcBookmarksRepo,
        readingState: readingStateRepo
      }
    };
  }

  // ==================== 向后兼容的接口 ====================

  /**
   * 获取所有书籍（向后兼容）
   */
  getAllBooksFromCalibre() {
    this.ensureInitialized();
    return this.repositories.calibre.books.findAll();
  }

  /**
   * 根据ID获取书籍（向后兼容）
   */
  getBookById(bookId) {
    this.ensureInitialized();
    return this.repositories.calibre.books.findById(bookId);
  }

  /**
   * 添加书籍到数据库（向后兼容）
   */
  addBookToDB(book) {
    this.ensureInitialized();
    if (!this.connectionManager.isCalibreAvailable()) {
      throw new Error('Calibre 数据库不可用');
    }
    return this._addBook(book);
  }

  /**
   * 更新书籍（向后兼容）
   */
  updateBookInDB(book) {
    this.ensureInitialized();
    if (!this.connectionManager.isCalibreAvailable()) {
      throw new Error('Calibre 数据库不可用');
    }
    return this._updateBook(book);
  }

  /**
   * 删除书籍（向后兼容）
   */
  deleteBookFromDB(bookId) {
    this.ensureInitialized();
    if (!this.connectionManager.isCalibreAvailable()) {
      throw new Error('Calibre 数据库不可用');
    }
    return this.repositories.calibre.books.delete(bookId);
  }

  /**
   * 获取 Calibre 数据库路径（向后兼容）
   */
  getDbPath() {
    this.ensureInitialized();
    return this.connectionManager.config.calibrePath;
  }

  /**
   * 获取 Talebook 数据库路径（向后兼容）
   */
  getTalebookDbPath() {
    this.ensureInitialized();
    return this.connectionManager.config.talebookPath;
  }

  /**
   * 检查 Calibre 数据库是否可用（向后兼容）
   */
  isCalibreAvailable() {
    this.ensureInitialized();
    return this.connectionManager.isCalibreAvailable();
  }

  /**
   * 检查 Talebook 数据库是否可用（向后兼容）
   */
  isTalebookAvailable() {
    this.ensureInitialized();
    return this.connectionManager.isTalebookAvailable();
  }

  /**
   * 更新 Calibre 数据库路径（向后兼容）
   */
  async updateCalibreDbPath(newPath) {
    this.ensureInitialized();
    this.connectionManager.reloadConfig();

    // 关闭现有连接
    if (this.connectionManager.getCalibreDb()) {
      this.connectionManager.getCalibreDb().close();
      this.connectionManager.calibreDb = null;
    }

    // 更新路径并重新初始化
    this.connectionManager.config.calibrePath = newPath;
    await this.connectionManager.initCalibre();

    // 重新初始化仓储
    this.initRepositories();
  }

  /**
   * 更新 Talebook 数据库路径（向后兼容）
   */
  async updateTalebookDbPath(newPath) {
    this.ensureInitialized();
    this.connectionManager.reloadConfig();

    // 关闭现有连接
    if (this.connectionManager.getTalebookDb()) {
      this.connectionManager.getTalebookDb().close();
      this.connectionManager.talebookDb = null;
    }

    // 更新路径并重新初始化
    this.connectionManager.config.talebookPath = newPath;
    await this.connectionManager.initTalebook();

    // 重新初始化仓储
    this.initRepositories();
  }

  // ==================== 新的仓储访问接口 ====================

  /**
   * 获取所有仓储
   */
  get repositories() {
    return this._repositories;
  }

  /**
   * 设置所有仓储
   */
  set repositories(value) {
    this._repositories = value;
  }

  // ==================== 向后兼容的属性访问器 ====================

  /**
   * 获取 Calibre 数据库实例（向后兼容）
   */
  get calibreDb() {
    return this.connectionManager.getCalibreDb();
  }

  /**
   * 获取 Talebook 数据库实例（向后兼容）
   */
  get talebookDb() {
    return this.connectionManager.getTalebookDb();
  }

  /**
   * 获取 Talebook 数据库（向后兼容，与 talebookDb 相同）
   */
  get db() {
    return this.connectionManager.getTalebookDb();
  }

  /**
   * 获取 Calibre 数据库实例（向后兼容，与 calibreDb 相同）
   */
  get getCalibreDatabase() {
    return this.connectionManager.getCalibreDb();
  }

  /**
   * 获取 Talebook 数据库实例（向后兼容，与 talebookDb 相同）
   */
  get getDatabase() {
    return this.connectionManager.getTalebookDb();
  }

  /**
   * 获取所有读者（向后兼容）
   */
  getAllReaders() {
    this.ensureInitialized();
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      return [];
    }
    try {
      return talebookDb.prepare('SELECT * FROM users ORDER BY id').all();
    } catch (error) {
      console.error('❌ 获取读者列表失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ID获取读者（向后兼容）
   */
  getReaderById(id) {
    this.ensureInitialized();
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      return null;
    }
    try {
      return talebookDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } catch (error) {
      console.error(`❌ 获取读者 ID=${id} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 验证 Calibre 数据库结构
   */
  validateCalibreSchema() {
    this.ensureInitialized();
    const calibreDb = this.connectionManager.getCalibreDb();
    return validators.schema.validateCalibreSchema(calibreDb);
  }

  /**
   * 验证 Talebook 数据库结构
   */
  validateTalebookSchema() {
    this.ensureInitialized();
    const talebookDb = this.connectionManager.getTalebookDb();
    return validators.schema.validateTalebookSchema(talebookDb);
  }

  /**
   * 获取 Calibre 数据库统计信息
   */
  getCalibreStats() {
    this.ensureInitialized();
    const calibreDb = this.connectionManager.getCalibreDb();
    if (!calibreDb) {
      return null;
    }
    try {
      // 获取书籍数量
      const bookCountResult = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
      const bookCount = bookCountResult.count || 0;

      // 获取库UUID
      let libraryUuid = null;
      try {
        const libraryUuidResult = calibreDb.prepare(`
          SELECT value FROM metadata_plugins WHERE name = 'calibre_library_uuid'
        `).get();
        libraryUuid = libraryUuidResult ? libraryUuidResult.value : null;
      } catch (error) {
        // 如果 metadata_plugins 表不存在，尝试其他方式获取UUID
        try {
          const libConfig = calibreDb.prepare(`
            SELECT value FROM preferences WHERE name = 'library_uuid'
          `).get();
          libraryUuid = libConfig ? libConfig.value : null;
        } catch (e) {
          // 忽略错误，UUID不是必需的
        }
      }

      return {
        bookCount,
        libraryUuid,
        dbPath: this.connectionManager.config.calibrePath
      };
    } catch (error) {
      console.error('❌ 获取 Calibre 统计信息失败:', error.message);
      return {
        bookCount: 0,
        libraryUuid: null,
        dbPath: this.connectionManager.config.calibrePath,
        error: error.message
      };
    }
  }

  /**
   * 获取 Talebook 数据库统计信息
   */
  getTalebookStats() {
    this.ensureInitialized();
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      return null;
    }
    try {
      // 获取书籍数量
      const bookCountResult = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get();
      const bookCount = bookCountResult.count || 0;

      // 获取用户数量
      const userCountResult = talebookDb.prepare('SELECT COUNT(*) as count FROM users').get();
      const userCount = userCountResult.count || 0;

      return {
        bookCount,
        userCount,
        dbPath: this.connectionManager.config.talebookPath
      };
    } catch (error) {
      console.error('❌ 获取 Talebook 统计信息失败:', error.message);
      return {
        bookCount: 0,
        userCount: 0,
        dbPath: this.connectionManager.config.talebookPath,
        error: error.message
      };
    }
  }

  // ==================== 数据验证接口 ====================

  /**
   * 验证书籍数据
   */
  validateBook(book) {
    return validators.book.validate(book);
  }

  /**
   * 批量验证书籍数据
   */
  validateBooks(books) {
    return validators.book.validateBatch(books);
  }

  /**
   * 清理书籍数据
   */
  sanitizeBook(book) {
    return validators.book.sanitize(book);
  }

  /**
   * 验证 Calibre 数据库结构
   */
  validateCalibreSchema(db) {
    const calibreDb = db || this.connectionManager.getCalibreDb();
    return validators.schema.validateCalibreSchema(calibreDb);
  }

  /**
   * 验证 Talebook 数据库结构
   */
  validateTalebookSchema(db) {
    const talebookDb = db || this.connectionManager.getTalebookDb();
    return validators.schema.validateTalebookSchema(talebookDb);
  }

  /**
   * 验证数据库完整性
   */
  validateIntegrity(db) {
    return validators.schema.validateIntegrity(db);
  }

  /**
   * 获取验证器实例
   */
  get validators() {
    return validators;
  }

  // ==================== 私有方法 ====================

  /**
   * 确保服务已初始化
   */
  ensureInitialized() {
    if (!this._initialized) {
      throw new Error('数据库服务未初始化，请先调用 init() 方法');
    }
  }

  /**
   * 添加书籍（内部方法）
   */
  _addBook(book) {
    const calibreDb = this.connectionManager.getCalibreDb();
    const talebookDb = this.connectionManager.getTalebookDb();

    let bookId;

    this.transaction(() => {
      // 1. 插入书籍基本信息
      const insertBook = calibreDb.prepare(`
        INSERT INTO books (title, timestamp, pubdate, uuid, has_cover, series_index, path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertBook.run(
        book.title,
        book.timestamp || new Date().toISOString(),
        book.pubdate || (book.publishYear ? `${book.publishYear}-01-01` : null),
        book.uuid || crypto.randomUUID(),
        book.has_cover || 0,
        book.series_index || 0,
        book.path || null
      );

      bookId = result.lastInsertRowid;
      console.log('✅ 书籍插入成功, ID:', bookId);

      // 2. 添加作者
      if (book.author) {
        const authors = book.author.split(' & ');
        const insertAuthorLink = calibreDb.prepare('INSERT INTO books_authors_link (book, author) VALUES (?, ?)');

        authors.forEach(authorName => {
          let author = calibreDb.prepare('SELECT id FROM authors WHERE name = ?').get(authorName.trim());
          if (!author) {
            const authorResult = calibreDb.prepare('INSERT INTO authors (name, sort) VALUES (?, ?)').run(authorName.trim(), authorName.trim());
            author = { id: authorResult.lastInsertRowid };
          }
          insertAuthorLink.run(bookId, author.id);
        });
      }

      // 3. 添加出版社
      if (book.publisher) {
        let publisher = calibreDb.prepare('SELECT id FROM publishers WHERE name = ?').get(book.publisher);
        if (!publisher) {
          const pubResult = calibreDb.prepare('INSERT INTO publishers (name) VALUES (?)').run(book.publisher);
          publisher = { id: pubResult.lastInsertRowid };
        }
        calibreDb.prepare('INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)').run(bookId, publisher.id);
      }

      // 4. 添加丛书
      if (book.series) {
        let series = calibreDb.prepare('SELECT id FROM series WHERE name = ?').get(book.series);
        if (!series) {
          const seriesResult = calibreDb.prepare('INSERT INTO series (name) VALUES (?)').run(book.series);
          series = { id: seriesResult.lastInsertRowid };
        }
        calibreDb.prepare('INSERT INTO books_series_link (book, series) VALUES (?, ?)').run(bookId, series.id);
      }

      // 5. 添加标签
      if (book.tags && Array.isArray(book.tags)) {
        const insertTagLink = calibreDb.prepare('INSERT INTO books_tags_link (book, tag) VALUES (?, ?)');
        book.tags.forEach(tagName => {
          let tag = calibreDb.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
          if (!tag) {
            const tagResult = calibreDb.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
            tag = { id: tagResult.lastInsertRowid };
          }
          insertTagLink.run(bookId, tag.id);
        });
      }

      // 6. 添加ISBN
      if (book.isbn) {
        calibreDb.prepare('INSERT INTO identifiers (book, type, val) VALUES (?, ?, ?)').run(bookId, 'isbn', book.isbn);
      }

      // 7. 添加评分
      if (book.rating !== undefined && book.rating !== null) {
        const ratingValue = Math.round(book.rating * 2);
        let ratingId = calibreDb.prepare('SELECT id FROM ratings WHERE rating = ?').get(ratingValue);
        if (!ratingId) {
          const ratingResult = calibreDb.prepare('INSERT INTO ratings (rating) VALUES (?)').run(ratingValue);
          ratingId = { id: ratingResult.lastInsertRowid };
        }
        calibreDb.prepare('INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)').run(bookId, ratingId.id);
      }

      // 8. 添加描述
      if (book.description) {
        calibreDb.prepare('INSERT INTO comments (book, text) VALUES (?, ?)').run(bookId, book.description);
      }
    })();

    // 9. 在 Talebook 数据库中创建 items 记录（在事务外执行）
    if (talebookDb) {
      try {
        talebookDb.prepare(`
          INSERT OR IGNORE INTO items (book_id, book_type)
          VALUES (?, 1)
        `).run(bookId);
        
        // 10. 在 Talebook 数据库的 qc_bookdata 表中同步扩展数据
         talebookDb.prepare(`
           INSERT OR IGNORE INTO qc_bookdata (
             book_id, 
             page_count, 
             standard_price, 
             purchase_price, 
             purchase_date, 
             binding1, 
             binding2, 
             note,
             total_reading_time,
             read_pages,
             reading_count,
             last_read_date,
             last_read_duration
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `).run(
           bookId,
           book.pages ? parseInt(book.pages) || 0 : 0,           // page_count
           book.standardPrice ? parseFloat(book.standardPrice) || 0 : 0,   // standard_price
           book.purchasePrice ? parseFloat(book.purchasePrice) || 0 : 0,   // purchase_price
           book.purchaseDate || null, // purchase_date
           book.binding1 ? parseInt(book.binding1) || 0 : 0,        // binding1
           book.binding2 ? parseInt(book.binding2) || 0 : 0,        // binding2
           book.note || '',           // note
           0,                         // total_reading_time
           0,                         // read_pages
           0,                         // reading_count
           null,                      // last_read_date
           0                          // last_read_duration
         );
      } catch (e) {
        console.warn('⚠️ 创建 items 或 qc_bookdata 记录失败:', e.message);
      }
    }

    return this.getBookById(bookId);
  }

  /**
   * 更新书籍（内部方法）
   */
  _updateBook(book) {
    console.log('🔍 _updateBook 方法被调用');
    console.log('🔍 book.id:', book.id);
    console.log('🔍 book.standardPrice:', book.standardPrice);
    console.log('🔍 book.purchasePrice:', book.purchasePrice);
    console.log('🔍 book.binding1:', book.binding1);
    console.log('🔍 book.binding2:', book.binding2);
    console.log('🔍 book.paper1:', book.paper1);
    console.log('🔍 book.edge1:', book.edge1);
    console.log('🔍 book.edge2:', book.edge2);
    console.log('🔍 book.note:', book.note);
    
    const calibreDb = this.connectionManager.getCalibreDb();
    const talebookDb = this.connectionManager.getTalebookDb();
    
    console.log('🔍 calibreDb:', calibreDb ? '存在' : '不存在');
    console.log('🔍 talebookDb:', talebookDb ? '存在' : '不存在');

    this.transaction(() => {
      console.log('🔍 事务开始执行');
      
      // 1. 更新书籍基本信息
      const updates = [];
      const values = [];

      if (book.title !== undefined) {
        updates.push('title = ?');
        values.push(book.title);
      }
      if (book.pubdate !== undefined) {
        updates.push('pubdate = ?');
        values.push(book.pubdate);
      }
      if (book.publishYear !== undefined) {
        updates.push('pubdate = ?');
        values.push(book.publishYear ? `${book.publishYear}-01-01` : null);
      }
      if (book.has_cover !== undefined) {
        updates.push('has_cover = ?');
        values.push(book.has_cover);
      }
      if (book.series_index !== undefined) {
        updates.push('series_index = ?');
        values.push(book.series_index);
      }
      if (book.path !== undefined) {
        updates.push('path = ?');
        values.push(book.path);
      }

      if (updates.length > 0) {
        values.push(book.id);
        calibreDb.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      // 2. 更新作者
      if (book.author !== undefined) {
        calibreDb.prepare('DELETE FROM books_authors_link WHERE book = ?').run(book.id);
        if (book.author) {
          const authors = book.author.split(' & ');
          const insertAuthorLink = calibreDb.prepare('INSERT INTO books_authors_link (book, author) VALUES (?, ?)');

          authors.forEach(authorName => {
            let author = calibreDb.prepare('SELECT id FROM authors WHERE name = ?').get(authorName.trim());
            if (!author) {
              const authorResult = calibreDb.prepare('INSERT INTO authors (name, sort) VALUES (?, ?)').run(authorName.trim(), authorName.trim());
              author = { id: authorResult.lastInsertRowid };
            }
            insertAuthorLink.run(book.id, author.id);
          });
        }
      }

      // 3. 更新出版社
      if (book.publisher !== undefined) {
        calibreDb.prepare('DELETE FROM books_publishers_link WHERE book = ?').run(book.id);
        if (book.publisher) {
          let publisher = calibreDb.prepare('SELECT id FROM publishers WHERE name = ?').get(book.publisher);
          if (!publisher) {
            const pubResult = calibreDb.prepare('INSERT INTO publishers (name) VALUES (?)').run(book.publisher);
            publisher = { id: pubResult.lastInsertRowid };
          }
          calibreDb.prepare('INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)').run(book.id, publisher.id);
        }
      }

      // 3. 更新丛书
      if (book.series !== undefined) {
        calibreDb.prepare('DELETE FROM books_series_link WHERE book = ?').run(book.id);
        if (book.series) {
          let series = calibreDb.prepare('SELECT id FROM series WHERE name = ?').get(book.series);
          if (!series) {
            const seriesResult = calibreDb.prepare('INSERT INTO series (name) VALUES (?)').run(book.series);
            series = { id: seriesResult.lastInsertRowid };
          }
          calibreDb.prepare('INSERT INTO books_series_link (book, series) VALUES (?, ?)').run(book.id, series.id);
        }
      }

      // 4. 更新标签
      if (book.tags !== undefined) {
        calibreDb.prepare('DELETE FROM books_tags_link WHERE book = ?').run(book.id);
        if (book.tags && Array.isArray(book.tags)) {
          const insertTagLink = calibreDb.prepare('INSERT INTO books_tags_link (book, tag) VALUES (?, ?)');
          book.tags.forEach(tagName => {
            let tag = calibreDb.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
            if (!tag) {
              const tagResult = calibreDb.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
              tag = { id: tagResult.lastInsertRowid };
            }
            insertTagLink.run(book.id, tag.id);
          });
        }
      }

      // 5. 更新ISBN
      if (book.isbn !== undefined) {
        calibreDb.prepare('DELETE FROM identifiers WHERE book = ? AND type = ?').run(book.id, 'isbn');
        if (book.isbn) {
          calibreDb.prepare('INSERT INTO identifiers (book, type, val) VALUES (?, ?, ?)').run(book.id, 'isbn', book.isbn);
        }
      }

      // 6. 更新描述
      if (book.description !== undefined) {
        calibreDb.prepare('DELETE FROM comments WHERE book = ?').run(book.id);
        if (book.description) {
          calibreDb.prepare('INSERT INTO comments (book, text) VALUES (?, ?)').run(book.id, book.description);
        }
      }
      
      console.log('🔍 事务执行完成');
    })();

    console.log('🔍 事务已提交，开始更新 qc_bookdata 表');
    
    // 6. 更新 Talebook 数据库中的 qc_bookdata 表（在事务外执行）
    console.log('🔄 调试：talebookDb =', talebookDb ? '存在' : '不存在');
    console.log('🔄 调试：book.id =', book.id);
    console.log('🔄 调试：book.standardPrice =', book.standardPrice);
    console.log('🔄 调试：book.purchasePrice =', book.purchasePrice);
    console.log('🔄 调试：book.binding1 =', book.binding1);
    console.log('🔄 调试：book.binding2 =', book.binding2);
    console.log('🔄 调试：book.paper1 =', book.paper1);
    console.log('🔄 调试：book.edge1 =', book.edge1);
    console.log('🔄 调试：book.edge2 =', book.edge2);
    console.log('🔄 调试：book.note =', book.note);
    
    if (talebookDb) {
      try {
        console.log('🔄 开始更新Talebook数据库中的qc_bookdata表...');
        
        // 处理前端发送的pages字段，兼容pageCount字段
        let pageCount = 0;
        if (book.pageCount) {
          pageCount = parseInt(book.pageCount) || 0;
        } else if (book.pages) {
          pageCount = parseInt(String(book.pages).match(/\d+/)?.[0] || '0') || 0;
        }

        const existingBookData = talebookDb.prepare(`SELECT * FROM qc_bookdata WHERE book_id = ?`).get(book.id);
        
        if (existingBookData) {
          console.log('🔄 更新现有qc_bookdata记录...');
          talebookDb.prepare(`
            UPDATE qc_bookdata
            SET page_count = ?, standard_price = ?, purchase_price = ?, purchase_date = ?, binding1 = ?, binding2 = ?, paper1 = ?, edge1 = ?, edge2 = ?, note = ?
            WHERE book_id = ?
          `).run(
            pageCount,
            book.standardPrice !== undefined ? book.standardPrice : existingBookData.standard_price,
            book.purchasePrice !== undefined ? book.purchasePrice : existingBookData.purchase_price,
            book.purchaseDate !== undefined ? book.purchaseDate : existingBookData.purchase_date,
            book.binding1 !== undefined ? book.binding1 : existingBookData.binding1,
            book.binding2 !== undefined ? book.binding2 : existingBookData.binding2,
            book.paper1 !== undefined ? book.paper1 : existingBookData.paper1,
            book.edge1 !== undefined ? book.edge1 : existingBookData.edge1,
            book.edge2 !== undefined ? book.edge2 : existingBookData.edge2,
            book.note !== undefined ? book.note : existingBookData.note,
            book.id
          );
          console.log('✅ qc_bookdata更新成功');
        } else {
          console.log('🔄 插入新qc_bookdata记录...');
          talebookDb.prepare(`
            INSERT INTO qc_bookdata (book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, paper1, edge1, edge2, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            book.id,
            pageCount,
            book.standardPrice || 0,
            book.purchasePrice || 0,
            book.purchaseDate || new Date().toISOString(),
            book.binding1 || 0,
            book.binding2 || 0,
            book.paper1 || 0,
            book.edge1 || 0,
            book.edge2 || 0,
            book.note || ''
          );
          console.log('✅ qc_bookdata插入成功');
        }
      } catch (talebookError) {
        console.error('❌ 更新Talebook数据库中的qc_bookdata表失败:', talebookError.message);
        console.error('❌ 错误堆栈:', talebookError.stack);
        // 不影响主流程
      }
    } else {
      console.warn('⚠️ talebookDb 为 null，跳过更新 qc_bookdata 表');
    }

    return this.getBookById(book.id);
  }

  /**
   * 获取书籍的阅读状态
   */
  getReadingState(bookId, readerId = 0) {
    this.ensureInitialized();
    
    if (!this.connectionManager.isTalebookAvailable()) {
      console.warn('⚠️ Talebook 数据库不可用，返回默认阅读状态');
      // 如果Talebook数据库不可用，返回默认状态
      return {
        book_id: bookId,
        reader_id: readerId,
        favorite: 0,
        wants: 0,
        read_state: 0,
        online_read: 0,
        download: 0
      };
    }
    
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      console.warn('⚠️ Talebook 数据库连接不可用，返回默认阅读状态');
      return {
        book_id: bookId,
        reader_id: readerId,
        favorite: 0,
        wants: 0,
        read_state: 0,
        online_read: 0,
        download: 0
      };
    }
    
    try {
      const query = `
        SELECT * FROM reading_state
        WHERE book_id = ? AND reader_id = ?
      `;
      const result = talebookDb.prepare(query).get(bookId, readerId);
      
      if (result) {
        return result;
      } else {
        // 如果没有找到记录，返回默认状态
        return {
          book_id: bookId,
          reader_id: readerId,
          favorite: 0,
          wants: 0,
          read_state: 0,
          online_read: 0,
          download: 0
        };
      }
    } catch (error) {
      console.warn(`⚠️ 获取书籍 ${bookId} 的阅读状态失败:`, error.message);
      // 发生错误时返回默认状态
      return {
        book_id: bookId,
        reader_id: readerId,
        favorite: 0,
        wants: 0,
        read_state: 0,
        online_read: 0,
        download: 0
      };
    }
  }

  /**
   * 更新书籍的阅读状态
   */
  updateReadingState(bookId, data, readerId = 0) {
    this.ensureInitialized();
    
    if (!this.connectionManager.isTalebookAvailable()) {
      throw new Error('Talebook 数据库不可用');
    }
    
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      throw new Error('Talebook 数据库连接不可用');
    }
    
    try {
      // 检查是否已存在记录
      const existing = this.getReadingState(bookId, readerId);

      if (existing && Object.keys(existing).length > 0) {
        // 更新现有记录
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
          talebookDb.prepare(sql).run(values);
        }
        
        return this.getReadingState(bookId, readerId);
      } else {
        // 创建新记录
        const insertData = {
          book_id: bookId,
          reader_id: readerId,
          favorite: data.favorite || 0,
          wants: data.wants || 0,
          read_state: data.read_state || 0,
          online_read: data.online_read || 0,
          download: data.download || 0
        };

        if (data.favorite === 1) {
          insertData.favorite_date = new Date().toISOString();
        }
        if (data.wants === 1) {
          insertData.wants_date = new Date().toISOString();
        }
        if (data.read_state === 1) {
          insertData.read_date = new Date().toISOString();
        }

        talebookDb.prepare(`
          INSERT INTO reading_state (
            book_id, reader_id, favorite, wants, read_state, 
            online_read, download, favorite_date, wants_date, read_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          insertData.book_id,
          insertData.reader_id,
          insertData.favorite,
          insertData.wants,
          insertData.read_state,
          insertData.online_read,
          insertData.download,
          insertData.favorite_date || null,
          insertData.wants_date || null,
          insertData.read_date || null
        );
        
        return this.getReadingState(bookId, readerId);
      }
    } catch (error) {
      console.error(`❌ 更新书籍 ${bookId} 的阅读状态失败:`, error.message);
      throw error;
    }
  }

   /**
    * 根据书籍ID获取Talebook扩展数据
    */
   getQcBookdataByBookId(bookId) {
     this.ensureInitialized();
     
     if (!this.connectionManager.isTalebookAvailable()) {
       console.warn('⚠️ Talebook 数据库不可用');
       return null;
     }
     
     try {
       // 使用仓库方法获取数据
       const result = this.repositories.talebook.qcBookdata.findByBookId(bookId);
       return result || null;
     } catch (error) {
       console.warn(`⚠️ 获取书籍 ${bookId} 的扩展数据失败:`, error.message);
       return null;
     }
   }

   /**
    * 辅助方法：获取事务包装器
    */
  transaction(fn) {
    this.ensureInitialized();
    const db = this.connectionManager.getCalibreDb();
    return db.transaction(fn);
  }
}

// 创建单例实例
const databaseServiceInstance = new DatabaseService();

// 自动初始化（向后兼容）
const initPromise = databaseServiceInstance.init()
  .then(() => {
    console.log('✅ 数据库服务自动初始化成功');
  })
  .catch(error => {
    console.error('❌ 数据库服务初始化失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
  });

export default databaseServiceInstance;
export { initPromise };
