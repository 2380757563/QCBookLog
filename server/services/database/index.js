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
import QcBooklogQcBookdataRepository from './repositories/qcbooklog/qc-bookdata-repository.js';
import validators from './validators/index.js';
import readingStateSyncService from '../readingStateSyncService.js';
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
   * 获取当前 Calibre 库的 UUID
   */
  getCurrentLibraryUuid() {
    return this.connectionManager?.getCurrentLibraryUuid() || '';
  }

  /**
   * 确保书籍映射存在（使用复合键：library_uuid + calibre_book_id）
   */
  ensureBookMapping(bookId, bookTitle = null, bookAuthor = null) {
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    if (!qcBooklogDb || !bookId || bookId <= 0) {
      return null;
    }

    const libraryUuid = this.getCurrentLibraryUuid();

    const existingMapping = qcBooklogDb.prepare(`
      SELECT id, calibre_book_id FROM qc_book_mapping 
      WHERE library_uuid = ? AND calibre_book_id = ?
    `).get(libraryUuid, bookId);

    if (existingMapping) {
      return existingMapping;
    }

    qcBooklogDb.prepare(`
      INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
      VALUES (?, ?, ?, ?, ?)
    `).run(libraryUuid, bookId, bookId, bookTitle, bookAuthor);

    return { calibre_book_id: bookId };
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
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();

    // Calibre 仓储
    const bookRepo = new BookRepository(calibreDb, talebookDb, qcBooklogDb);
    bookRepo.getCurrentLibraryUuid = () => this.getCurrentLibraryUuid();
    const authorRepo = new AuthorRepository(calibreDb);
    const publisherRepo = new PublisherRepository(calibreDb);
    const tagRepo = new TagRepository(calibreDb);

    // Talebook 仓储
    const itemsRepo = talebookDb ? new ItemsRepository(talebookDb) : null;
    const qcBookdataRepo = talebookDb ? new QcBookdataRepository(talebookDb) : null;
    const qcBookmarksRepo = talebookDb ? new QcBookmarksRepository(talebookDb) : null;
    const readingStateRepo = talebookDb ? new ReadingStateRepository(talebookDb) : null;

    // QCBookLog 仓储
    const qcBooklogQcBookdataRepo = qcBooklogDb ? new QcBooklogQcBookdataRepository(qcBooklogDb) : null;

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
      },
      qcBooklog: {
        qcBookdata: qcBooklogQcBookdataRepo
      }
    };
  }

  // ==================== 向后兼容的接口 ====================

  /**
   * 获取所有书籍（向后兼容）
   */
  getAllBooksFromCalibre(readerId = 0) {
    this.ensureInitialized();
    return this.repositories.calibre.books.findAll({ readerId });
  }

  /**
   * 分页获取书籍（优化版本）
   */
  getBooksPaginated(options = {}) {
    this.ensureInitialized();
    return this.repositories.calibre.books.findPaginated(options);
  }

  /**
   * 获取书籍总数
   */
  getBooksTotalCount() {
    this.ensureInitialized();
    return this.repositories.calibre.books.getTotalCount();
  }

  /**
   * 使书籍计数缓存失效
   */
  invalidateBooksCountCache() {
    this.ensureInitialized();
    return this.repositories.calibre.books.invalidateCountCache();
  }

  /**
   * 根据ID获取书籍（向后兼容）
   */
  getBookById(bookId) {
    this.ensureInitialized();
    return this.repositories.calibre.books.findById(bookId);
  }

  /**
   * 根据路径获取书籍
   */
  getBookByPath(bookPath) {
    this.ensureInitialized();
    return this.repositories.calibre.books.findByPath(bookPath);
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
    
    // 删除 Talebook 数据库中的相关数据（items表等）
    this.deleteTalebookData(bookId);
    
    // 删除 QCBookLog 数据库中的相关数据
    this.deleteQcBooklogData(bookId);
    
    // 删除 Calibre 数据库中的书籍
    return this.repositories.calibre.books.delete(bookId);
  }

  /**
   * 删除 Talebook 数据库中的书籍相关数据
   * 由于items表没有外键约束指向Calibre数据库（跨数据库限制），需要手动删除
   */
  deleteTalebookData(bookId) {
    const talebookDb = this.connectionManager.getTalebookDb();
    if (!talebookDb) {
      console.log('⚠️ Talebook 数据库不可用，跳过删除相关数据');
      return;
    }

    try {
      console.log(`🗑️ 删除 Talebook 数据库中书籍 ${bookId} 的相关数据...`);
      
      const deleteTransaction = talebookDb.transaction(() => {
        // 删除 items 表记录
        const deleteItems = talebookDb.prepare('DELETE FROM items WHERE book_id = ?');
        const itemsResult = deleteItems.run(bookId);
        if (itemsResult.changes > 0) {
          console.log(`  ✅ 删除 items 表记录: book_id=${bookId}, 影响行数: ${itemsResult.changes}`);
        }
        
        // 删除 qc_bookdata 表记录（如果存在）
        try {
          const deleteQcBookdata = talebookDb.prepare('DELETE FROM qc_bookdata WHERE book_id = ?');
          const bookdataResult = deleteQcBookdata.run(bookId);
          if (bookdataResult.changes > 0) {
            console.log(`  ✅ 删除 qc_bookdata 表记录: book_id=${bookId}, 影响行数: ${bookdataResult.changes}`);
          }
        } catch (e) {
          // 表可能不存在，忽略错误
        }
        
        // 删除 qc_bookmarks 表记录（如果存在）
        try {
          const deleteQcBookmarks = talebookDb.prepare('DELETE FROM qc_bookmarks WHERE book_id = ?');
          const bookmarksResult = deleteQcBookmarks.run(bookId);
          if (bookmarksResult.changes > 0) {
            console.log(`  ✅ 删除 qc_bookmarks 表记录: book_id=${bookId}, 影响行数: ${bookmarksResult.changes}`);
          }
        } catch (e) {
          // 表可能不存在，忽略错误
        }
        
        // 注意：qc_book_groups 表的删除操作已移至 deleteQcBooklogData 方法
        // 因为分组数据现在存储在 qcBooklogDb 中
        
        // 删除 reading_state 表记录（如果存在）
        try {
          const deleteReadingState = talebookDb.prepare('DELETE FROM reading_state WHERE book_id = ?');
          const readingStateResult = deleteReadingState.run(bookId);
          if (readingStateResult.changes > 0) {
            console.log(`  ✅ 删除 reading_state 表记录: book_id=${bookId}, 影响行数: ${readingStateResult.changes}`);
          }
        } catch (e) {
          // 表可能不存在，忽略错误
        }
      });
      
      deleteTransaction();
      console.log(`✅ 已删除 Talebook 数据库中书籍 ${bookId} 的相关数据`);
    } catch (error) {
      console.error(`❌ 删除 Talebook 数据库中书籍 ${bookId} 的相关数据失败:`, error.message);
      // 不抛出错误，继续删除 Calibre 数据库中的书籍
    }
  }

  /**
   * 删除 QCBookLog 数据库中的书籍相关数据
   */
  deleteQcBooklogData(bookId) {
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    if (!qcBooklogDb) {
      console.log('⚠️ QCBookLog 数据库不可用，跳过删除相关数据');
      return;
    }

    try {
      console.log(`🗑️ 删除 QCBookLog 数据库中书籍 ${bookId} 的相关数据...`);
      
      // 注意：qc_book_groups 表通过外键级联删除，无需手动删除
      // FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
      
      // 删除书籍映射（使用复合键，会级联删除其他相关数据）
      const libraryUuid = this.getCurrentLibraryUuid();
      const deleteMapping = qcBooklogDb.prepare('DELETE FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?');
      const result = deleteMapping.run(libraryUuid, bookId);
      
      if (result.changes > 0) {
        console.log(`✅ 已删除 QCBookLog 数据库中书籍 ${bookId} 的相关数据`);
      } else {
        console.log(`ℹ️ QCBookLog 数据库中没有找到书籍 ${bookId} 的相关数据`);
      }
    } catch (error) {
      console.error(`❌ 删除 QCBookLog 数据库中书籍 ${bookId} 的相关数据失败:`, error.message);
      // 不抛出错误，继续删除 Calibre 数据库中的书籍
    }
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
   * 获取 QCBookLog 数据库路径
   */
  getQcBooklogDbPath() {
    this.ensureInitialized();
    return this.connectionManager.config.qcBooklogPath;
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
   * 检查 QCBookLog 数据库是否可用
   */
  isQcBooklogAvailable() {
    this.ensureInitialized();
    return this.connectionManager.isQcBooklogAvailable();
  }

  /**
   * 获取 QCBookLog 数据库实例
   */
  getQcBooklogDb() {
    this.ensureInitialized();
    return this.connectionManager.getQcBooklogDb();
  }

  /**
   * 更新 Calibre 数据库路径（向后兼容）
   */
  async updateCalibreDbPath(newPath) {
    this.ensureInitialized();
    this.connectionManager.reloadConfig();

    if (this.connectionManager.getCalibreDb()) {
      this.connectionManager.getCalibreDb().close();
      this.connectionManager.calibreDb = null;
    }

    this.connectionManager.config.calibrePath = newPath;
    await this.connectionManager.initCalibre();

    const path = require('path');
    const fs = require('fs');
    const calibreDir = path.dirname(newPath);
    const talebookPath = path.join(calibreDir, 'calibre-webserver.db');
    
    if (fs.existsSync(talebookPath)) {
      console.log('🔄 检测到配套的 Talebook 数据库:', talebookPath);
      
      if (this.connectionManager.getTalebookDb()) {
        this.connectionManager.getTalebookDb().close();
        this.connectionManager.talebookDb = null;
      }
      
      this.connectionManager.config.talebookPath = talebookPath;
      await this.connectionManager.initTalebook();
    }

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
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    
    if (!talebookDb) {
      return [{
        id: 0,
        name: '默认读者',
        username: 'default',
        active: true,
        note: ''
      }];
    }
    
    try {
      const readers = talebookDb.prepare('SELECT id, username, name, email, avatar, admin, active FROM readers WHERE active = 1 ORDER BY id').all();

      // 从 qc_users 获取备注信息
      const userNotes = new Map();
      if (qcBooklogDb) {
        try {
          const notes = qcBooklogDb.prepare('SELECT id, note FROM qc_users').all();
          notes.forEach(n => userNotes.set(n.id, n.note || ''));
        } catch (e) {
          console.warn('⚠️ 获取用户备注失败:', e.message);
        }
      }

      // 为每个读者添加备注
      const readersWithNotes = readers.map(r => ({
        ...r,
        note: userNotes.get(r.id) || ''
      }));

      // 确保始终包含默认读者（reader_id = 0）
      if (!readersWithNotes.some(r => r.id === 0)) {
        readersWithNotes.unshift({
          id: 0,
          name: '默认读者',
          username: 'default',
          active: true,
          note: userNotes.get(0) || ''
        });
      }

      return readersWithNotes;
    } catch (error) {
      console.error('❌ 获取读者列表失败:', error.message);
      return [{
        id: 0,
        name: '默认读者',
        username: 'default',
        active: true,
        note: ''
      }];
    }
  }

  /**
   * 根据ID获取读者（向后兼容）
   */
  getReaderById(id) {
    this.ensureInitialized();
    const talebookDb = this.connectionManager.getTalebookDb();
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    
    if (id === 0) {
      let note = '';
      if (qcBooklogDb) {
        try {
          const user = qcBooklogDb.prepare('SELECT note FROM qc_users WHERE id = 0').get();
          note = user?.note || '';
        } catch (e) {
          console.warn('⚠️ 获取默认读者备注失败:', e.message);
        }
      }
      return {
        id: 0,
        name: '默认读者',
        username: 'default',
        active: true,
        note
      };
    }
    
    if (!talebookDb) {
      return null;
    }
    
    try {
      const reader = talebookDb.prepare('SELECT id, username, name, email, avatar, admin, active FROM readers WHERE id = ? AND active = 1').get(id);
      
      if (!reader) {
        return null;
      }

      // 从 qc_users 获取备注信息
      let note = '';
      if (qcBooklogDb) {
        try {
          const user = qcBooklogDb.prepare('SELECT note FROM qc_users WHERE id = ?').get(id);
          note = user?.note || '';
        } catch (e) {
          console.warn('⚠️ 获取读者备注失败:', e.message);
        }
      }

      return { ...reader, note };
    } catch (error) {
      console.error(`❌ 获取读者 ID=${id} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 更新读者备注
   */
  updateReaderNote(readerId, note) {
    this.ensureInitialized();
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    if (!qcBooklogDb) {
      throw new Error('QCBookLog 数据库服务不可用');
    }

    try {
      const existingUser = qcBooklogDb.prepare('SELECT id FROM qc_users WHERE id = ?').get(readerId);
      
      if (existingUser) {
        qcBooklogDb.prepare(`
          UPDATE qc_users SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(note, readerId);
      } else {
        const readerName = readerId === 0 ? '默认读者' : `读者${readerId}`;
        qcBooklogDb.prepare(`
          INSERT INTO qc_users (id, username, name, note) VALUES (?, ?, ?, ?)
        `).run(readerId, `reader_${readerId}`, readerName, note);
      }

      return { success: true, readerId, note };
    } catch (error) {
      console.error('❌ 更新读者备注失败:', error.message);
      throw error;
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
   * 验证 QCBookLog 数据库结构
   */
  validateQcBooklogSchema() {
    this.ensureInitialized();
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    return validators.schema.validateQcBooklogSchema(qcBooklogDb);
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
      console.warn('⚠️ 数据库服务未初始化，尝试同步初始化...');
      console.warn('⚠️ 初始化堆栈:', new Error().stack);
    }
  }

  /**
   * 添加书籍（内部方法）
   */
  _addBook(book) {
    const calibreDb = this.connectionManager.getCalibreDb();
    const talebookDb = this.connectionManager.getTalebookDb();

    let bookId;

    // 确保路径是正确的两级结构（移除作者和标题中的路径分隔符）
    if (book.path) {
      const pathParts = book.path.split(/[\/\\]/);
      if (pathParts.length > 2) {
        // 如果路径超过两级，将所有部分合并为两级
        const cleanAuthor = pathParts.slice(0, -1).join('').replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        const cleanTitle = pathParts[pathParts.length - 1].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        book.path = `${cleanAuthor}/${cleanTitle}`;
      } else if (pathParts.length === 2) {
        const cleanAuthor = pathParts[0].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        const cleanTitle = pathParts[1].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        book.path = `${cleanAuthor}/${cleanTitle}`;
      } else {
        book.path = book.path.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      }
    } else if (book.author && book.title) {
      const cleanAuthor = book.author.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      const cleanTitle = book.title.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      book.path = `${cleanAuthor}/${cleanTitle}`;
    }

    // 临时禁用所有使用 title_sort() 函数的触发器
    calibreDb.exec('DROP TRIGGER IF EXISTS books_insert_trg');
    calibreDb.exec('DROP TRIGGER IF EXISTS books_update_trg');
    calibreDb.exec('DROP TRIGGER IF EXISTS series_insert_trg');
    calibreDb.exec('DROP TRIGGER IF EXISTS series_update_trg');

    this.transaction(() => {
      // 1. 插入书籍基本信息
      const insertBook = calibreDb.prepare(`
        INSERT INTO books (title, sort, timestamp, pubdate, uuid, has_cover, series_index, path, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      const result = insertBook.run(
        book.title,
        book.title,
        book.timestamp || now,
        book.pubdate || (book.publishYear ? `${book.publishYear}-01-01` : null),
        book.uuid || crypto.randomUUID(),
        book.has_cover || 0,
        book.series_index || 0,
        book.path || null,
        now
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
      if (book.rating !== undefined && book.rating !== null && book.rating > 0) {
        // Calibre ratings 表存储 0-10 的整数，用户输入也是 0-10
        const ratingValue = Math.round(book.rating);
        if (ratingValue >= 0 && ratingValue <= 10) {
          let ratingId = calibreDb.prepare('SELECT id FROM ratings WHERE rating = ?').get(ratingValue);
          if (!ratingId) {
            const ratingResult = calibreDb.prepare('INSERT INTO ratings (rating) VALUES (?)').run(ratingValue);
            ratingId = { id: ratingResult.lastInsertRowid };
          }
          calibreDb.prepare('INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)').run(bookId, ratingId.id);
        }
      }

      // 8. 添加描述
      if (book.description) {
        calibreDb.prepare('INSERT INTO comments (book, text) VALUES (?, ?)').run(bookId, book.description);
      }
    })();

    // 9. 在 Talebook 数据库中创建 items 记录（在事务外执行）
    if (talebookDb) {
      try {
        const bookTypeToInsert = book.book_type !== undefined && book.book_type !== null ? book.book_type : 1;
        console.log('📝 [_addBook] 准备插入到 Talebook items 表，book_type:', bookTypeToInsert);
        talebookDb.prepare(`
          INSERT OR IGNORE INTO items (
            book_id, book_type, count_visit, count_download, 
            count_guest, website, sole, book_count
          )
          VALUES (?, ?, 0, 0, 0, '', 0, 1)
        `).run(bookId, bookTypeToInsert);
        console.log('✅ Talebook items 记录已创建');
      } catch (e) {
        console.warn('⚠️ 创建 items 记录失败:', e.message);
      }
    }

    // 11. 在 QCBookLog 数据库中创建书籍映射记录
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    
    if (qcBooklogDb) {
      try {
        console.log('📊 准备写入 QCBookLog 数据:');
        console.log('  - book.pages:', book.pages, typeof book.pages);
        console.log('  - book.standardPrice:', book.standardPrice, typeof book.standardPrice);
        console.log('  - book.purchasePrice:', book.purchasePrice, typeof book.purchasePrice);
        console.log('  - book.purchaseDate:', book.purchaseDate, typeof book.purchaseDate);
        console.log('  - book.binding1:', book.binding1, typeof book.binding1);
        console.log('  - book.binding2:', book.binding2, typeof book.binding2);
        
        // 添加书籍映射（使用复合键）
        const libraryUuid = this.getCurrentLibraryUuid();
        const mappingResult = qcBooklogDb.prepare(`
          INSERT OR REPLACE INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
          VALUES (?, ?, ?, ?, ?)
        `).run(libraryUuid, bookId, bookId, book.title, book.author);
        console.log('✅ QCBookLog 书籍映射已创建');
        
        // 获取映射记录的 ID
        const mapping = qcBooklogDb.prepare(`
          SELECT id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
        `).get(libraryUuid, bookId);
        const mappingId = mapping ? mapping.id : null;
        
        // 添加书籍扩展数据
        const pageCount = book.pages !== undefined && book.pages !== null && !isNaN(parseInt(book.pages)) ? parseInt(book.pages) : 0;
        const standardPrice = book.standardPrice !== undefined && book.standardPrice !== null && !isNaN(parseFloat(book.standardPrice)) ? parseFloat(book.standardPrice) : 0;
        const purchasePrice = book.purchasePrice !== undefined && book.purchasePrice !== null && !isNaN(parseFloat(book.purchasePrice)) ? parseFloat(book.purchasePrice) : 0;
        
        console.log('📊 写入数据库的值:');
        console.log('  - mappingId:', mappingId);
        console.log('  - bookId:', bookId);
        console.log('  - pageCount:', pageCount);
        console.log('  - standardPrice:', standardPrice);
        console.log('  - purchasePrice:', purchasePrice);
        console.log('  - purchaseDate:', book.purchaseDate);
        console.log('  - binding1:', book.binding1);
        console.log('  - binding2:', book.binding2);
        
        const insertResult = qcBooklogDb.prepare(`
          INSERT OR REPLACE INTO qc_bookdata (
            mapping_id, book_id, book_type, page_count, standard_price, purchase_price, 
            purchase_date, binding1, binding2, paper1, edge1, edge2, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          mappingId,
          bookId,
          book.book_type !== undefined && book.book_type !== null ? book.book_type : 1,
          pageCount,
          standardPrice,
          purchasePrice,
          book.purchaseDate || null,
          book.binding1 !== undefined && book.binding1 !== null ? parseInt(book.binding1) || 0 : 0,
          book.binding2 !== undefined && book.binding2 !== null ? parseInt(book.binding2) || 0 : 0,
          book.paper1 !== undefined && book.paper1 !== null ? parseInt(book.paper1) || 0 : 0,
          book.edge1 !== undefined && book.edge1 !== null ? parseInt(book.edge1) || 0 : 0,
          book.edge2 !== undefined && book.edge2 !== null ? parseInt(book.edge2) || 0 : 0,
          book.note || ''
        );
        console.log('📊 INSERT 执行结果:', JSON.stringify(insertResult));
        
        // 立即验证写入的数据
        const verifyData = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(bookId);
        console.log('📊 写入后立即验证:', JSON.stringify(verifyData));
        
        console.log('✅ QCBookLog 书籍扩展数据已创建');
        
        // 强制同步 WAL 文件到主数据库
        qcBooklogDb.pragma('wal_checkpoint(FULL)');
        console.log('✅ QCBookLog 数据库 WAL 同步完成');
      } catch (e) {
        console.warn('⚠️ 创建 QCBookLog 记录失败:', e.message);
        console.error(e);
      }
    }

    // 不重新创建触发器，因为 title_sort() 函数在 SQLite 中不存在
    // 触发器是 Calibre 应用程序定义的，在纯 SQLite 环境中无法使用
    console.log('ℹ️ 跳过重新创建触发器（title_sort 函数在 SQLite 中不可用）');

    return this.getBookById(bookId);
  }

  /**
   * 更新书籍（内部方法）
   */
  _updateBook(book) {
    console.log('🔍 _updateBook 方法被调用');
    console.log('🔍 book.id:', book.id);
    console.log('🔍 book.book_type:', book.book_type);
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

    // 确保路径是正确的两级结构（移除作者和标题中的路径分隔符）
    if (book.path !== undefined) {
      const pathParts = book.path.split(/[\/\\]/);
      if (pathParts.length > 2) {
        // 如果路径超过两级，将所有部分合并为两级
        const cleanAuthor = pathParts.slice(0, -1).join('').replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        const cleanTitle = pathParts[pathParts.length - 1].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        book.path = `${cleanAuthor}/${cleanTitle}`;
      } else if (pathParts.length === 2) {
        const cleanAuthor = pathParts[0].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        const cleanTitle = pathParts[1].replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
        book.path = `${cleanAuthor}/${cleanTitle}`;
      } else {
        book.path = book.path.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      }
    } else if (book.author !== undefined && book.title !== undefined) {
      const cleanAuthor = book.author.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      const cleanTitle = book.title.replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
      book.path = `${cleanAuthor}/${cleanTitle}`;
    }

    // 临时禁用所有使用 title_sort() 函数的触发器
    calibreDb.exec('DROP TRIGGER IF EXISTS books_update_trg');
    calibreDb.exec('DROP TRIGGER IF EXISTS series_insert_trg');
    calibreDb.exec('DROP TRIGGER IF EXISTS series_update_trg');

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
      // 同时支持 has_cover (snake_case) 和 hasCover (camelCase)
      if (book.has_cover !== undefined) {
        updates.push('has_cover = ?');
        values.push(book.has_cover ? 1 : 0);
      } else if (book.hasCover !== undefined) {
        updates.push('has_cover = ?');
        values.push(book.hasCover ? 1 : 0);
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

      // 7. 更新豆瓣评分
      if (book.rating !== undefined) {
        calibreDb.prepare('DELETE FROM books_ratings_link WHERE book = ?').run(book.id);
        if (book.rating !== null && book.rating > 0) {
          // Calibre ratings 表存储 0-10 的整数，用户输入也是 0-10
          // 不需要乘以 2，直接四舍五入到整数即可
          const ratingValue = Math.round(book.rating);
          if (ratingValue >= 0 && ratingValue <= 10) {
            let ratingId = calibreDb.prepare('SELECT id FROM ratings WHERE rating = ?').get(ratingValue);
            if (!ratingId) {
              const ratingResult = calibreDb.prepare('INSERT INTO ratings (rating) VALUES (?)').run(ratingValue);
              ratingId = { id: ratingResult.lastInsertRowid };
            }
            calibreDb.prepare('INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)').run(book.id, ratingId.id);
          }
        }
      }
      
      console.log('🔍 事务执行完成');
    })();

    console.log('🔍 事务已提交，开始更新 QCBookLog 数据库中的书籍扩展数据');
    
    // 6. 更新 Talebook 数据库中的 items 表
    if (talebookDb) {
      try {
        console.log('🔄 开始更新Talebook数据库中的items表...');
        
        // 检查 items 表中是否存在该书籍
        const existingItem = talebookDb.prepare(`SELECT * FROM items WHERE book_id = ?`).get(book.id);
        
        if (existingItem) {
          console.log('🔄 更新现有items记录...');
          // 更新 book_type 字段
          if (book.book_type !== undefined) {
            talebookDb.prepare(`
              UPDATE items
              SET book_type = ?
              WHERE book_id = ?
            `).run(book.book_type, book.id);
            console.log('✅ items表book_type更新成功');
          }
        } else {
          console.log('🔄 插入新items记录...');
          // 插入新的 items 记录
          talebookDb.prepare(`
            INSERT OR IGNORE INTO items (
              book_id, book_type, count_visit, count_download, 
              count_guest, website, sole, book_count
            )
            VALUES (?, ?, 0, 0, 0, '', 0, 1)
          `).run(book.id, book.book_type || 0);
          console.log('✅ items表插入成功');
        }
      } catch (talebookError) {
        console.error('❌ 更新Talebook数据库中的items表失败:', talebookError.message);
        console.error('❌ 错误堆栈:', talebookError.stack);
        // 不影响主流程
      }
    } else {
      console.warn('⚠️ talebookDb 为 null，跳过更新 items 表');
    }
    
    // 7. 更新 QCBookLog 数据库中的书籍扩展数据
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    if (qcBooklogDb) {
      try {
        console.log('🔄 开始更新QCBookLog数据库中的书籍扩展数据...');
        
        // 处理前端发送的pages字段，兼容pageCount字段
        let pageCount = 0;
        if (book.pageCount) {
          pageCount = parseInt(book.pageCount) || 0;
        } else if (book.pages) {
          pageCount = parseInt(String(book.pages).match(/\d+/)?.[0] || '0') || 0;
        }
        
        // 检查书籍映射是否存在（使用复合键）
        const libraryUuid = this.getCurrentLibraryUuid();
        const existingMapping = qcBooklogDb.prepare(`
          SELECT * FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
        `).get(libraryUuid, book.id);
        
        // 获取现有的书籍扩展数据，用于保留未提供的字段
        const existingBookData = qcBooklogDb.prepare(`SELECT * FROM qc_bookdata WHERE book_id = ?`).get(book.id);
        
        if (existingMapping && existingBookData) {
          console.log('🔄 更新现有QCBookLog书籍扩展数据...');
          // 只更新提供的字段，保留现有值
          const newPageCount = pageCount || existingBookData.page_count || 0;
          const newStandardPrice = book.standardPrice !== undefined ? book.standardPrice : existingBookData.standard_price;
          const newPurchasePrice = book.purchasePrice !== undefined ? book.purchasePrice : existingBookData.purchase_price;
          const newPurchaseDate = book.purchaseDate !== undefined ? book.purchaseDate : existingBookData.purchase_date;
          const newBinding1 = book.binding1 !== undefined ? book.binding1 : existingBookData.binding1;
          const newBinding2 = book.binding2 !== undefined ? book.binding2 : existingBookData.binding2;
          const newPaper1 = book.paper1 !== undefined ? book.paper1 : existingBookData.paper1;
          const newEdge1 = book.edge1 !== undefined ? book.edge1 : existingBookData.edge1;
          const newEdge2 = book.edge2 !== undefined ? book.edge2 : existingBookData.edge2;
          const newNote = book.note !== undefined ? book.note : existingBookData.note;
          
          console.log('📊 更新值（保留现有值）:');
          console.log(`  - pageCount: ${newPageCount} (原: ${existingBookData.page_count})`);
          console.log(`  - standardPrice: ${newStandardPrice} (原: ${existingBookData.standard_price})`);
          console.log(`  - binding1: ${newBinding1} (原: ${existingBookData.binding1})`);
          
          qcBooklogDb.prepare(`
            UPDATE qc_bookdata
            SET page_count = ?, standard_price = ?, purchase_price = ?, purchase_date = ?, binding1 = ?, binding2 = ?, paper1 = ?, edge1 = ?, edge2 = ?, note = ?
            WHERE book_id = ?
          `).run(
            newPageCount,
            newStandardPrice,
            newPurchasePrice,
            newPurchaseDate,
            newBinding1,
            newBinding2,
            newPaper1,
            newEdge1,
            newEdge2,
            newNote,
            book.id
          );
          console.log('✅ QCBookLog书籍扩展数据更新成功');
        } else if (!existingMapping) {
          console.log('🔄 插入新QCBookLog书籍映射和扩展数据...');
          // 添加书籍映射（使用复合键）
          qcBooklogDb.prepare(`
            INSERT OR REPLACE INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
            VALUES (?, ?, ?, ?, ?)
          `).run(libraryUuid, book.id, book.id, book.title, book.author);
          
          // 获取映射记录的 ID
          const mapping = qcBooklogDb.prepare(`
            SELECT id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
          `).get(libraryUuid, book.id);
          const mappingId = mapping ? mapping.id : null;
          
          // 添加书籍扩展数据
          qcBooklogDb.prepare(`
            INSERT INTO qc_bookdata (mapping_id, book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, paper1, edge1, edge2, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            mappingId,
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
          console.log('✅ QCBookLog书籍映射和扩展数据插入成功');
        } else {
          console.log('🔄 书籍映射存在但无扩展数据，跳过更新');
        }
      } catch (qcBooklogError) {
        console.error('❌ 更新QCBookLog数据库中的书籍扩展数据失败:', qcBooklogError.message);
        console.error('❌ 错误堆栈:', qcBooklogError.stack);
        // 不影响主流程
      }
    } else {
      console.warn('⚠️ qcBooklogDb 为 null，跳过更新 QCBookLog 数据库');
    }

    // 8. 处理分组关联
    console.log('🔄 处理分组关联...');
    console.log('🔄 book.groups:', book.groups);
    console.log('🔄 qcBooklogDb:', qcBooklogDb ? '存在' : '不存在');
    if (book.groups !== undefined && Array.isArray(book.groups) && qcBooklogDb) {
      try {
        // 获取 mapping_id（qc_book_groups 表使用 mapping_id 而不是 book_id）
        const libraryUuid = this.getCurrentLibraryUuid();
        const mappingStmt = qcBooklogDb.prepare('SELECT id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?');
        const mapping = mappingStmt.get(libraryUuid, book.id);
        
        if (!mapping) {
          console.warn(`⚠️ 未找到书籍映射记录: library_uuid=${libraryUuid}, calibre_book_id=${book.id}`);
        } else {
          const mappingId = mapping.id;
          console.log(`🔄 mapping_id: ${mappingId}`);
          
          // 获取当前书籍的所有分组
          const currentGroupsStmt = qcBooklogDb.prepare('SELECT group_id FROM qc_book_groups WHERE mapping_id = ?');
          const currentGroupsResult = currentGroupsStmt.all(mappingId);
          const currentGroupIds = currentGroupsResult.map(g => g.group_id);
          const newGroupIds = book.groups.map(id => parseInt(id)).filter(id => !isNaN(id));
          
          console.log('🔄 当前分组:', currentGroupIds);
          console.log('🔄 新分组:', newGroupIds);
          
          // 找出需要添加的分组
          const groupsToAdd = newGroupIds.filter(id => !currentGroupIds.includes(id));
          // 找出需要移除的分组
          const groupsToRemove = currentGroupIds.filter(id => !newGroupIds.includes(id));
          
          console.log('🔄 需要添加的分组:', groupsToAdd);
          console.log('🔄 需要移除的分组:', groupsToRemove);
          
          // 添加新的分组关联
          const insertStmt = qcBooklogDb.prepare('INSERT OR IGNORE INTO qc_book_groups (mapping_id, group_id) VALUES (?, ?)');
          for (const groupId of groupsToAdd) {
            try {
              insertStmt.run(mappingId, groupId);
              console.log(`✅ 添加书籍到分组: mappingId=${mappingId}, groupId=${groupId}`);
            } catch (addError) {
              console.error(`❌ 添加书籍到分组失败: ${addError.message}`);
            }
          }
          
          // 移除旧的分组关联
          const deleteStmt = qcBooklogDb.prepare('DELETE FROM qc_book_groups WHERE mapping_id = ? AND group_id = ?');
          for (const groupId of groupsToRemove) {
            try {
              deleteStmt.run(mappingId, groupId);
              console.log(`✅ 从分组移除书籍: mappingId=${mappingId}, groupId=${groupId}`);
            } catch (removeError) {
              console.error(`❌ 从分组移除书籍失败: ${removeError.message}`);
            }
          }
          
          console.log('✅ 分组关联处理完成');
        }
      } catch (groupError) {
        console.error('❌ 处理分组关联失败:', groupError.message);
      }
    }

    return this.getBookById(book.id);
  }

  /**
   * 获取书籍的阅读状态
   * 优先从 Talebook 数据库获取，如果不存在则从 QCBookLog 数据库获取
   */
  getReadingState(bookId, readerId = 0) {
    this.ensureInitialized();

    // 首先尝试从 Talebook 数据库获取
    if (this.connectionManager.isTalebookAvailable()) {
      try {
        const talebookDb = this.connectionManager.getTalebookDb();
        if (talebookDb) {
          const query = `
            SELECT * FROM reading_state
            WHERE book_id = ? AND reader_id = ?
          `;
          const result = talebookDb.prepare(query).get(bookId, readerId);

          if (result) {
            return result;
          }
        }
      } catch (error) {
        console.warn(`⚠️ 从 Talebook 获取书籍 ${bookId} 的阅读状态失败:`, error.message);
      }
    }

    // 如果 Talebook 中没有数据，尝试从 QCBookLog 数据库获取
    if (this.connectionManager.isQcBooklogAvailable()) {
      try {
        const qcBooklogDb = this.connectionManager.getQcBooklogDb();
        if (qcBooklogDb) {
          const libraryUuid = this.getCurrentLibraryUuid();
          const query = `
            SELECT rs.* FROM qc_reading_state rs
            JOIN qc_book_mapping m ON rs.mapping_id = m.id
            WHERE m.calibre_book_id = ? AND m.library_uuid = ? AND rs.reader_id = ?
          `;
          const result = qcBooklogDb.prepare(query).get(bookId, libraryUuid, readerId);

          if (result) {
            return result;
          }
        }
      } catch (error) {
        console.warn(`⚠️ 从 QCBookLog 获取书籍 ${bookId} 的阅读状态失败:`, error.message);
      }
    }

    // 如果两个数据库都没有数据，返回默认状态
    return {
      book_id: bookId,
      reader_id: readerId,
      favorite: 0,
      wants: 0,
      read_state: 0,
      online_read: 0,
      download: 0,
      personal_rating: 0,
      personal_rating_date: null
    };
  }

  /**
   * 更新书籍的阅读状态
   * 同时更新 QCBookLog 和 Talebook 数据库，确保双向同步
   */
  updateReadingState(bookId, data, readerId = 0) {
    this.ensureInitialized();

    const talebookAvailable = this.connectionManager.isTalebookAvailable();
    const qcBooklogAvailable = this.connectionManager.isQcBooklogAvailable();

    if (talebookAvailable) {
      try {
        const talebookDb = this.connectionManager.getTalebookDb();

        const existing = talebookDb.prepare(`
          SELECT * FROM reading_state
          WHERE book_id = ? AND reader_id = ?
        `).get(bookId, readerId);

        if (existing) {
          const updates = [];
          const values = [];

          if (data.favorite !== undefined) {
            updates.push('favorite = ?');
            values.push(data.favorite);
          }
          if (data.favorite_date !== undefined) {
            updates.push('favorite_date = ?');
            values.push(data.favorite_date);
          }
          if (data.wants !== undefined) {
            updates.push('wants = ?');
            values.push(data.wants);
          }
          if (data.wants_date !== undefined) {
            updates.push('wants_date = ?');
            values.push(data.wants_date);
          }
          if (data.read_state !== undefined) {
            updates.push('read_state = ?');
            values.push(data.read_state);
          }
          if (data.personal_rating !== undefined) {
            updates.push('personal_rating = ?');
            values.push(data.personal_rating);
          }
          if (data.personal_rating_date !== undefined) {
            updates.push('personal_rating_date = ?');
            values.push(data.personal_rating_date);
          }

          if (updates.length > 0) {
            values.push(bookId, readerId);
            const sql = `UPDATE reading_state SET ${updates.join(', ')} WHERE book_id = ? AND reader_id = ?`;
            talebookDb.prepare(sql).run(values);
          }
        } else {
          talebookDb.prepare(`
            INSERT INTO reading_state (book_id, reader_id, favorite, favorite_date, wants, wants_date, read_state, personal_rating, personal_rating_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            bookId,
            readerId,
            data.favorite || 0,
            data.favorite_date || null,
            data.wants || 0,
            data.wants_date || null,
            data.read_state || 0,
            data.personal_rating || 0,
            data.personal_rating_date || null
          );
        }

        console.log(`✅ Talebook 阅读状态已更新: 书籍 ${bookId}, 读者 ${readerId}`);
      } catch (error) {
        console.error(`❌ 更新 Talebook 阅读状态失败:`, error.message);
      }
    }

    if (qcBooklogAvailable) {
      try {
        const qcBooklogDb = this.connectionManager.getQcBooklogDb();
        const libraryUuid = this.getCurrentLibraryUuid();

        let mapping = qcBooklogDb.prepare(`
          SELECT id FROM qc_book_mapping 
          WHERE library_uuid = ? AND calibre_book_id = ?
        `).get(libraryUuid, bookId);

        if (!mapping) {
          const bookInfo = this.getBookById(bookId);
          const mappingResult = qcBooklogDb.prepare(`
            INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
            VALUES (?, ?, ?, ?, ?)
          `).run(libraryUuid, bookId, bookId, bookInfo?.title || '', bookInfo?.author || '');
          mapping = { id: mappingResult.lastInsertRowid };
        }

        const existing = qcBooklogDb.prepare(`
          SELECT * FROM qc_reading_state WHERE mapping_id = ?
        `).get(mapping.id);

        if (existing) {
          const updates = [];
          const values = [];

          if (data.read_state !== undefined) {
            updates.push('read_state = ?');
            values.push(data.read_state);
          }
          if (data.favorite !== undefined) {
            updates.push('favorite = ?');
            values.push(data.favorite);
          }
          if (data.favorite_date !== undefined) {
            updates.push('favorite_date = ?');
            values.push(data.favorite_date);
          }
          if (data.wants !== undefined) {
            updates.push('wants = ?');
            values.push(data.wants);
          }
          if (data.wants_date !== undefined) {
            updates.push('wants_date = ?');
            values.push(data.wants_date);
          }
          if (data.online_read !== undefined) {
            updates.push('online_read = ?');
            values.push(data.online_read);
          }
          if (data.download !== undefined) {
            updates.push('download = ?');
            values.push(data.download);
          }
          if (data.current_page !== undefined) {
            updates.push('current_page = ?');
            values.push(data.current_page);
          }
          if (data.total_pages !== undefined) {
            updates.push('total_pages = ?');
            values.push(data.total_pages);
          }
          if (data.current_page !== undefined && data.total_pages !== undefined && data.total_pages > 0) {
            updates.push('progress_percent = ?');
            values.push(Math.round((data.current_page / data.total_pages) * 100));
          }
          if (data.current_chapter !== undefined) {
            updates.push('current_chapter = ?');
            values.push(String(data.current_chapter));
          }
          if (data.notes !== undefined) {
            updates.push('notes = ?');
            values.push(data.notes);
          }
          if (data.rating !== undefined) {
            updates.push('rating = ?');
            values.push(data.rating);
          }
          if (data.personal_rating !== undefined) {
            updates.push('personal_rating = ?');
            values.push(data.personal_rating);
          }
          if (data.personal_rating_date !== undefined) {
            updates.push('personal_rating_date = ?');
            values.push(data.personal_rating_date);
          }

          updates.push('last_read_time = ?');
          values.push(new Date().toISOString());
          updates.push('updated_at = CURRENT_TIMESTAMP');

          if (updates.length > 0) {
            values.push(mapping.id);
            const sql = `UPDATE qc_reading_state SET ${updates.join(', ')} WHERE mapping_id = ?`;
            qcBooklogDb.prepare(sql).run(values);
          }
        } else {
          const progress = (data.current_page && data.total_pages && data.total_pages > 0)
            ? Math.round((data.current_page / data.total_pages) * 100)
            : 0;

          qcBooklogDb.prepare(`
            INSERT INTO qc_reading_state (
              mapping_id, book_id, reader_id, read_state, favorite, favorite_date, wants, wants_date, online_read, download,
              current_page, total_pages, progress_percent, current_chapter, notes, rating, 
              personal_rating, personal_rating_date, last_read_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            mapping.id,
            bookId,
            readerId,
            data.read_state || 0,
            data.favorite || 0,
            data.favorite_date || null,
            data.wants || 0,
            data.wants_date || null,
            data.online_read || 0,
            data.download || 0,
            data.current_page || 0,
            data.total_pages || 0,
            progress,
            String(data.current_chapter || ''),
            data.notes || null,
            data.rating || 0,
            data.personal_rating || 0,
            data.personal_rating_date || null,
            new Date().toISOString()
          );
        }

        console.log(`✅ QCBookLog 阅读状态已更新: 书籍 ${bookId}, 读者 ${readerId}`);
      } catch (error) {
        console.error(`❌ 更新 QCBookLog 阅读状态失败:`, error.message);
      }
    }

    return this.getReadingState(bookId, readerId);
  }

   /**
    * 根据书籍ID获取扩展数据
    */
   getQcBookdataByBookId(bookId) {
     this.ensureInitialized();
     
     // 优先从 QCBookLog 数据库获取
     if (this.connectionManager.isQcBooklogAvailable()) {
       try {
         const result = this.repositories.qcBooklog.qcBookdata.findByBookId(bookId);
         return result || null;
       } catch (error) {
         console.warn(`⚠️ 从 QCBookLog 获取书籍 ${bookId} 的扩展数据失败:`, error.message);
         return null;
       }
     }
     
     // 如果 QCBookLog 不可用，尝试从 Talebook 数据库获取
     if (this.connectionManager.isTalebookAvailable()) {
       try {
         const result = this.repositories.talebook.qcBookdata.findByBookId(bookId);
         return result || null;
       } catch (error) {
         console.warn(`⚠️ 从 Talebook 获取书籍 ${bookId} 的扩展数据失败:`, error.message);
         return null;
       }
     }
     
     return null;
   }

  /**
   * 更新书籍的阅读进度
   * @param {number} bookId - 书籍ID
   * @param {number} readPages - 已读页数
   * @param {number} readerId - 读者ID（可选，默认为0）
   * @returns {Object} 更新结果
   */
  updateBookReadingProgress(bookId, readPages, readerId = 0) {
    this.ensureInitialized();
    
    const qcBooklogDb = this.connectionManager.getQcBooklogDb();
    if (!qcBooklogDb) {
      throw new Error('数据库服务不可用');
    }

    const libraryUuid = this.getCurrentLibraryUuid();

    let mapping = qcBooklogDb.prepare(`
      SELECT id FROM qc_book_mapping 
      WHERE library_uuid = ? AND calibre_book_id = ?
    `).get(libraryUuid, bookId);

    if (!mapping) {
      const bookInfo = this.getBookById(bookId);
      const mappingResult = qcBooklogDb.prepare(`
        INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
        VALUES (?, ?, ?, ?, ?)
      `).run(libraryUuid, bookId, bookId, bookInfo?.title || '', bookInfo?.author || '');
      mapping = { id: mappingResult.lastInsertRowid };
      console.log(`✅ 创建书籍映射: bookId=${bookId}, mapping_id=${mapping.id}`);
    }

    const existingState = qcBooklogDb.prepare(`
      SELECT id FROM qc_reading_state WHERE mapping_id = ?
    `).get(mapping.id);

    if (existingState) {
      qcBooklogDb.prepare(`
        UPDATE qc_reading_state 
        SET current_page = ?, updated_at = CURRENT_TIMESTAMP
        WHERE mapping_id = ?
      `).run(readPages, mapping.id);
      console.log(`✅ 更新阅读进度成功: 书籍ID=${bookId}, 已读页数=${readPages}`);
    } else {
      qcBooklogDb.prepare(`
        INSERT INTO qc_reading_state (mapping_id, book_id, reader_id, current_page, read_state)
        VALUES (?, ?, ?, ?, 0)
      `).run(mapping.id, bookId, readerId, readPages);
      console.log(`✅ 创建阅读进度记录成功: 书籍ID=${bookId}, 已读页数=${readPages}`);
    }

    return { bookId, readPages };
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
