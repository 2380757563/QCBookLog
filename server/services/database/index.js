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
        book.pubdate || null,
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
      } catch (e) {
        console.warn('⚠️ 创建 items 记录失败:', e.message);
      }
    }

    return this.getBookById(bookId);
  }

  /**
   * 更新书籍（内部方法）
   */
  _updateBook(book) {
    const calibreDb = this.connectionManager.getCalibreDb();

    return this.transaction(() => {
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

      // 2. 更新出版社
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

      // 5. 更新描述
      if (book.description !== undefined) {
        calibreDb.prepare('DELETE FROM comments WHERE book = ?').run(book.id);
        if (book.description) {
          calibreDb.prepare('INSERT INTO comments (book, text) VALUES (?, ?)').run(book.id, book.description);
        }
      }

      return this.getBookById(book.id);
    })();
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
