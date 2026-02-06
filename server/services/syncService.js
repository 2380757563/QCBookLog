/**
 * 数据同步服务
 * 保持文件系统和数据库同步，支持冲突解决和异常处理
 */
import databaseService from './database/index.js';
import calibreService from './calibreService.js';
import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';
import {
  MAPPING_RULES,
  TYPE_CONVERTERS,
  CONFLICT_STRATEGIES,
  SYNC_DIRECTIONS,
  SYNC_STATUS,
  SYNC_ERROR_TYPES
} from './syncMapping.js';

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), '../data/logs/sync.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * 数据同步服务
 */
class SyncService {
  constructor() {
    // 默认冲突解决策略
    this.defaultConflictStrategy = CONFLICT_STRATEGIES.USE_LATEST_MODIFIED;
    // 最大重试次数
    this.maxRetries = 3;
    // 重试间隔（毫秒）
    this.retryInterval = 1000;
    // 同步状态
    this.syncStatus = {
      status: SYNC_STATUS.SUCCESS,
      message: '',
      data: {
        synced: 0,
        failed: 0,
        conflicted: 0,
        skipped: 0,
        total: 0
      },
      errors: []
    };
  }

  /**
   * 重置同步状态
   */
  resetSyncStatus() {
    this.syncStatus = {
      status: SYNC_STATUS.SUCCESS,
      message: '',
      data: {
        synced: 0,
        failed: 0,
        conflicted: 0,
        skipped: 0,
        total: 0
      },
      errors: []
    };
  }

  /**
   * 记录错误信息
   */
  logError(errorType, message, details = {}) {
    const error = {
      type: errorType,
      message: message,
      details: details,
      timestamp: new Date().toISOString()
    };
    this.syncStatus.errors.push(error);
    logger.error(message, { errorType, details });
  }

  /**
   * 重试机制
   */
  async retryOperation(operation, operationName, ...args) {
    let retries = 0;
    let lastError = null;

    while (retries <= this.maxRetries) {
      try {
        return await operation(...args);
      } catch (error) {
        retries++;
        lastError = error;
        logger.warn(`❌ ${operationName}失败，第${retries}次重试...`, { error: error.message });
        
        if (retries > this.maxRetries) {
          this.logError(
            SYNC_ERROR_TYPES.SQL_EXECUTION_ERROR,
            `${operationName}失败，已重试${this.maxRetries}次`,
            { error: error.message, retries: this.maxRetries }
          );
          throw error;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, this.retryInterval * retries));
      }
    }
    
    throw lastError;
  }

  /**
   * 检测冲突
   */
  detectConflict(sourceBook, targetBook) {
    if (!targetBook) {
      return false; // 目标不存在，无冲突
    }

    // 比较修改时间
    const sourceModified = new Date(sourceBook.last_modified || sourceBook.timestamp);
    const targetModified = new Date(targetBook.last_modified || targetBook.timestamp);
    
    // 如果源和目标的修改时间不同，存在冲突
    return sourceModified.getTime() !== targetModified.getTime();
  }

  /**
   * 解决冲突
   */
  resolveConflict(sourceBook, targetBook, strategy = this.defaultConflictStrategy) {
    switch (strategy) {
      case CONFLICT_STRATEGIES.KEEP_SOURCE:
        // 保留源数据
        return sourceBook;
      
      case CONFLICT_STRATEGIES.KEEP_TARGET:
        // 保留目标数据
        return targetBook;
      
      case CONFLICT_STRATEGIES.MERGE_SOURCE_PRIORITY:
        // 合并数据，源数据优先
        return {
          ...targetBook,
          ...sourceBook
        };
      
      case CONFLICT_STRATEGIES.MERGE_TARGET_PRIORITY:
        // 合并数据，目标数据优先
        return {
          ...sourceBook,
          ...targetBook
        };
      
      case CONFLICT_STRATEGIES.USE_LATEST_MODIFIED:
      default:
        // 使用最新修改的数据
        const sourceModified = new Date(sourceBook.last_modified || sourceBook.timestamp);
        const targetModified = new Date(targetBook.last_modified || targetBook.timestamp);
        
        if (sourceModified > targetModified) {
          return sourceBook;
        } else {
          return targetBook;
        }
    }
  }

  /**
   * 从数据库同步到文件系统
   */
  async syncDBToFileSystem(options = {}) {
    this.resetSyncStatus();
    
    try {
      logger.info('🔄 开始从数据库同步到文件系统...');
      console.log('\n🔄 开始从数据库同步到文件系统...');

      const conflictStrategy = options.conflictStrategy || this.defaultConflictStrategy;
      
      // 更新书库目录，确保使用最新的配置路径
      calibreService.updateBookDir();

      // 使用重试机制获取数据库书籍
      const dbBooks = await this.retryOperation(
        () => databaseService.getAllBooksFromCalibre(),
        '获取数据库书籍'
      );
      
      this.syncStatus.data.total = dbBooks.length;
      let synced = 0;
      let failed = 0;
      let conflicted = 0;
      let skipped = 0;

      for (const book of dbBooks) {
        const bookPath = path.join(calibreService.getBookDir(), book.path);
        const calibreJsonPath = path.join(bookPath, 'calibre.json');

        // 检查文件是否存在
        try {
          await fs.access(calibreJsonPath);
          
          // 文件存在，检查是否需要更新
          const existingCalibreJson = await fs.readFile(calibreJsonPath, 'utf8');
          const existingBook = JSON.parse(existingCalibreJson);
          
          // 检测冲突
          if (this.detectConflict(book, existingBook)) {
            conflicted++;
            logger.warn(`⚠️ 检测到冲突: ${book.title}`, { source: 'db', target: 'file' });
            
            // 解决冲突
            const resolvedBook = this.resolveConflict(book, existingBook, conflictStrategy);
            
            // 更新文件
            await this.retryOperation(
              () => this.updateBookFile(resolvedBook, bookPath),
              '更新书籍文件',
              resolvedBook, bookPath
            );
            
            synced++;
            logger.info(`✅ 冲突已解决，同步成功: ${book.title}`, { strategy: conflictStrategy });
          } else {
            skipped++;
            logger.info(`⏭️ 文件已存在且无冲突，跳过: ${book.title}`);
          }
        } catch (accessError) {
          // 文件不存在，创建calibre.json和metadata.opf
          try {
            await this.retryOperation(
              () => this.createBookFile(book, bookPath),
              '创建书籍文件',
              book, bookPath
            );
            
            synced++;
            logger.info(`✅ 同步成功: ${book.title}`);
          } catch (err) {
            failed++;
            this.logError(
              SYNC_ERROR_TYPES.SQL_EXECUTION_ERROR,
              `同步失败: ${book.title}`,
              { error: err.message, bookId: book.id }
            );
          }
        }
      }

      this.syncStatus.status = failed > 0 ? SYNC_STATUS.FAILED : SYNC_STATUS.SUCCESS;
      this.syncStatus.message = `同步完成: 成功 ${synced} 本，失败 ${failed} 本，冲突 ${conflicted} 本，跳过 ${skipped} 本`;
      this.syncStatus.data = {
        synced,
        failed,
        conflicted,
        skipped,
        total: dbBooks.length
      };

      logger.info(this.syncStatus.message);
      console.log(`\n📊 ${this.syncStatus.message}`);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.status = SYNC_STATUS.FAILED;
      this.syncStatus.message = `从数据库同步到文件系统失败: ${error.message}`;
      this.logError(
        SYNC_ERROR_TYPES.SYSTEM_ERROR,
        this.syncStatus.message,
        { error: error.message, stack: error.stack }
      );
      
      logger.error(this.syncStatus.message, { error: error.stack });
      console.error(`❌ ${this.syncStatus.message}`);
      return this.syncStatus;
    }
  }

  /**
   * 从文件系统同步到数据库
   */
  async syncFileSystemToDB(options = {}) {
    this.resetSyncStatus();
    
    try {
      logger.info('\n🔄 开始从文件系统同步到数据库...');
      console.log('\n🔄 开始从文件系统同步到数据库...');

      const conflictStrategy = options.conflictStrategy || this.defaultConflictStrategy;
      
      // 获取文件系统中的书籍
      const fileBooks = await this.retryOperation(
        () => calibreService.getAllBooksFromCalibre(false),
        '获取文件系统书籍'
      );
      
      this.syncStatus.data.total = fileBooks.length;
      let synced = 0;
      let failed = 0;
      let conflicted = 0;
      let skipped = 0;

      for (const book of fileBooks) {
        // 检查数据库中是否存在
        const existingBook = await this.retryOperation(
          () => databaseService.getBookById(book.id),
          '获取数据库中现有书籍',
          book.id
        );
        
        if (!existingBook) {
          // 数据库中不存在，添加
          try {
            // 构建完整的书籍对象用于数据库
            const dbBook = this.buildDBBookObject(book);
            
            await this.retryOperation(
              () => databaseService.addBookToDB(dbBook),
              '添加书籍到数据库',
              dbBook
            );
            
            synced++;
            logger.info(`✅ 同步成功: ${book.title}`);
          } catch (err) {
            failed++;
            this.logError(
              SYNC_ERROR_TYPES.SQL_EXECUTION_ERROR,
              `同步失败: ${book.title}`,
              { error: err.message, bookId: book.id }
            );
          }
        } else {
          // 数据库中已存在，检查是否需要更新
          if (this.detectConflict(book, existingBook)) {
            conflicted++;
            logger.warn(`⚠️ 检测到冲突: ${book.title}`, { source: 'file', target: 'db' });
            
            // 解决冲突
            const resolvedBook = this.resolveConflict(book, existingBook, conflictStrategy);
            
            // 更新数据库
            try {
              await this.retryOperation(
                () => databaseService.updateBookInDB(resolvedBook),
                '更新数据库中的书籍',
                resolvedBook
              );
              
              synced++;
              logger.info(`✅ 冲突已解决，同步成功: ${book.title}`, { strategy: conflictStrategy });
            } catch (err) {
              failed++;
              this.logError(
                SYNC_ERROR_TYPES.SQL_EXECUTION_ERROR,
                `更新书籍失败: ${book.title}`,
                { error: err.message, bookId: book.id }
              );
            }
          } else {
            skipped++;
            logger.info(`⏭️ 书籍已存在且无冲突，跳过: ${book.title}`);
          }
        }
      }

      this.syncStatus.status = failed > 0 ? SYNC_STATUS.FAILED : SYNC_STATUS.SUCCESS;
      this.syncStatus.message = `同步完成: 成功 ${synced} 本，失败 ${failed} 本，冲突 ${conflicted} 本，跳过 ${skipped} 本`;
      this.syncStatus.data = {
        synced,
        failed,
        conflicted,
        skipped,
        total: fileBooks.length
      };

      logger.info(this.syncStatus.message);
      console.log(`\n📊 ${this.syncStatus.message}`);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.status = SYNC_STATUS.FAILED;
      this.syncStatus.message = `从文件系统同步到数据库失败: ${error.message}`;
      this.logError(
        SYNC_ERROR_TYPES.SYSTEM_ERROR,
        this.syncStatus.message,
        { error: error.message, stack: error.stack }
      );
      
      logger.error(this.syncStatus.message, { error: error.stack });
      console.error(`❌ ${this.syncStatus.message}`);
      return this.syncStatus;
    }
  }

  /**
   * 构建数据库书籍对象
   */
  buildDBBookObject(book) {
    return {
      id: book.id,
      uuid: book.uuid || '',
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      description: book.description || '',
      publishYear: book.publishYear,
      rating: book.rating,
      series: book.series || '',
      language: book.language || 'zh',
      tags: book.tags || [],
      timestamp: book.timestamp || new Date().toISOString(),
      last_modified: book.last_modified || new Date().toISOString(),
      hasCover: book.hasCover || false,
      path: book.path || `${book.author}/${book.title}`,
      readStatus: book.readStatus || '未读',
      groups: book.groups || [], // 分组信息，由databaseService.enrichBooksWithType填充
      purchaseDate: book.purchaseDate || '',
      readCompleteDate: book.readCompleteDate || '',
      standardPrice: book.standardPrice || 0,
      note: book.note || ''
    };
  }

  /**
   * 创建书籍文件
   */
  async createBookFile(book, bookPath) {
    await fs.mkdir(bookPath, { recursive: true });

    // 构建完整的书籍对象
    const fullBook = {
      ...book,
      readStatus: '未读',
      groups: [],
      purchaseDate: '',
      readCompleteDate: '',
      standardPrice: 0,
      note: ''
    };

    // 生成calibre.json和metadata.opf
    await calibreService.saveBookToCalibre(fullBook);
  }

  /**
   * 更新书籍文件
   */
  async updateBookFile(book, bookPath) {
    // 构建完整的书籍对象
    const fullBook = {
      ...book,
      readStatus: '未读',
      groups: [],
      purchaseDate: '',
      readCompleteDate: '',
      standardPrice: 0,
      note: ''
    };

    // 更新calibre.json和metadata.opf
    await calibreService.saveBookToCalibre(fullBook);
  }

  /**
   * 双向同步（确保文件系统和数据库一致）
   */
  async syncBothWays(options = {}) {
    this.resetSyncStatus();
    
    try {
      logger.info('\n🔄 开始双向同步...');
      console.log('\n🔄 开始双向同步...');

      const conflictStrategy = options.conflictStrategy || this.defaultConflictStrategy;
      
      // 先从文件系统同步到数据库（保留文件系统的自定义字段）
      const fsToDbResult = await this.syncFileSystemToDB({ conflictStrategy });
      
      // 再从数据库同步到文件系统（确保所有数据库记录都有文件）
      const dbToFsResult = await this.syncDBToFileSystem({ conflictStrategy });

      // 合并结果
      this.syncStatus.data = {
        synced: fsToDbResult.data.synced + dbToFsResult.data.synced,
        failed: fsToDbResult.data.failed + dbToFsResult.data.failed,
        conflicted: fsToDbResult.data.conflicted + dbToFsResult.data.conflicted,
        skipped: fsToDbResult.data.skipped + dbToFsResult.data.skipped,
        total: fsToDbResult.data.total + dbToFsResult.data.total
      };
      
      this.syncStatus.status = (fsToDbResult.status === SYNC_STATUS.FAILED || dbToFsResult.status === SYNC_STATUS.FAILED) 
        ? SYNC_STATUS.FAILED 
        : SYNC_STATUS.SUCCESS;
      
      this.syncStatus.message = `双向同步完成: 成功 ${this.syncStatus.data.synced} 本，失败 ${this.syncStatus.data.failed} 本，冲突 ${this.syncStatus.data.conflicted} 本，跳过 ${this.syncStatus.data.skipped} 本`;
      this.syncStatus.errors = [...fsToDbResult.errors, ...dbToFsResult.errors];

      logger.info(this.syncStatus.message);
      console.log(`\n✅ ${this.syncStatus.message}`);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.status = SYNC_STATUS.FAILED;
      this.syncStatus.message = `双向同步失败: ${error.message}`;
      this.logError(
        SYNC_ERROR_TYPES.SYSTEM_ERROR,
        this.syncStatus.message,
        { error: error.message, stack: error.stack }
      );
      
      logger.error(this.syncStatus.message, { error: error.stack });
      console.error(`❌ ${this.syncStatus.message}`);
      return this.syncStatus;
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    try {
      logger.info('获取同步状态...');
      
      // 检查数据库是否可用
      const isCalibreAvailable = databaseService.isCalibreAvailable();
      const isTalebookAvailable = databaseService.isTalebookAvailable();
      
      let calibreBooks = [];
      let talebookBooks = [];
      
      // 获取Calibre书籍（如果可用）
      if (isCalibreAvailable) {
        try {
          calibreBooks = databaseService.getAllBooksFromCalibre();
        } catch (error) {
          logger.error('获取Calibre书籍失败:', error.message);
        }
      }
      
      // 获取Talebook书籍（如果可用）
      if (isTalebookAvailable) {
        try {
          // 获取Talebook书籍 - items表的主键是book_id
          const talebookQuery = `SELECT book_id as id, book_type FROM items`;
          talebookBooks = databaseService.talebookDb.prepare(talebookQuery).all();
        } catch (error) {
          logger.error('获取Talebook书籍失败:', error.message);
        }
      }

      const calibreIds = new Set(calibreBooks.map(b => b.id));
      const talebookIds = new Set(talebookBooks.map(b => b.id));

      // 仅在Calibre中的书籍
      const onlyInCalibre = calibreBooks.filter(b => !talebookIds.has(b.id));

      // 仅在Talebook中的书籍
      const onlyInTalebook = talebookBooks.filter(b => !calibreIds.has(b.id));

      // 两边都有的书籍
      const inBoth = calibreBooks.filter(b => talebookIds.has(b.id));

      // 检测冲突的书籍
      const conflictedBooks = [];
      for (const calibreBook of inBoth) {
        const talebookBook = talebookBooks.find(b => b.id === calibreBook.id);
        if (talebookBook) {
          // 比较修改时间
          const calibreModified = new Date(calibreBook.last_modified || calibreBook.timestamp);
          const talebookModified = new Date(talebookBook.last_modified);
          
          if (calibreModified.getTime() !== talebookModified.getTime()) {
            conflictedBooks.push({
              id: calibreBook.id,
              title: calibreBook.title,
              author: calibreBook.author,
              calibreModified: calibreBook.last_modified,
              talebookModified: talebookBook.last_modified
            });
          }
        }
      }

      return {
        status: SYNC_STATUS.SUCCESS,
        message: '获取同步状态成功',
        data: {
          calibre: {
            available: isCalibreAvailable,
            total: calibreBooks.length,
            onlyInCalibre: onlyInCalibre.length,
            inBoth: inBoth.length
          },
          talebook: {
            available: isTalebookAvailable,
            total: talebookBooks.length,
            onlyInTalebook: onlyInTalebook.length,
            inBoth: inBoth.length
          },
          conflicted: conflictedBooks.length,
          onlyInCalibre: onlyInCalibre.map(b => ({ id: b.id, title: b.title, author: b.author })),
          onlyInTalebook: onlyInTalebook.map(b => ({ id: b.id, title: b.title || `未知书籍 ${b.id}`, author: b.author || '未知作者' })),
          conflictedBooks: conflictedBooks
        },
        errors: []
      };
    } catch (error) {
      const errorMessage = '获取同步状态失败';
      logger.error(errorMessage, { error: error.message });
      console.error(`❌ ${errorMessage}: ${error.message}`);
      return {
        status: SYNC_STATUS.FAILED,
        message: errorMessage,
        data: null,
        errors: [{ type: SYNC_ERROR_TYPES.SYSTEM_ERROR, message: error.message, timestamp: new Date().toISOString() }]
      };
    }
  }

  /**
   * 从Calibre数据库同步到Talebook数据库
   */
  async syncCalibreToTalebook(options = {}) {
    this.resetSyncStatus();
    
    try {
      logger.info('\n🔄 开始从Calibre数据库同步到Talebook数据库...');
      console.log('\n🔄 开始从Calibre数据库同步到Talebook数据库...');

      const conflictStrategy = options.conflictStrategy || this.defaultConflictStrategy;
      
      // 检查数据库是否可用
      if (!databaseService.isCalibreAvailable() || !databaseService.isTalebookAvailable()) {
        throw new Error('数据库服务不可用');
      }
      
      // 获取Calibre书籍
      const calibreBooks = await this.retryOperation(
        () => databaseService.getAllBooksFromCalibre(),
        '获取Calibre书籍'
      );
      
      // 获取Calibre书籍ID集合
      const calibreBookIds = new Set(calibreBooks.map(book => book.id));
      
      this.syncStatus.data.total = calibreBooks.length;
      let synced = 0;
      let failed = 0;
      let conflicted = 0;
      let skipped = 0;
      let deleted = 0;

      // 1. 同步新增和更新的书籍
      for (const book of calibreBooks) {
        try {
          // 检查Talebook数据库中是否存在（items表的主键是book_id）
          const existingItem = databaseService.talebookDb.prepare(`SELECT book_id FROM items WHERE book_id = ?`).get(book.id);

          if (!existingItem) {
            // 不存在，添加到Talebook数据库
            // items表存储统计信息
            databaseService.talebookDb.prepare(`
              INSERT INTO items (book_id, book_type, create_time)
              VALUES (?, ?, ?)
            `).run(
              book.id,
              book.book_type || 1,
              new Date().toISOString()
            );

            synced++;
            logger.info(`✅ 同步成功: ${book.title}`);
          } else {
            // 已存在，检查是否需要更新
            skipped++;
            logger.info(`⏭️ 已存在，跳过: ${book.title}`);
          }
        } catch (err) {
          failed++;
          this.logError(
            SYNC_ERROR_TYPES.SQL_EXECUTION_ERROR,
            `同步失败: ${book.title}`,
            { error: err.message, bookId: book.id }
          );
        }
      }

      // 2. 同步删除的书籍 - 删除Talebook中存在但Calibre中不存在的书籍
      try {
        // 获取Talebook数据库中的所有书籍ID（items表的主键是book_id）
        const talebookBookIds = databaseService.talebookDb.prepare(`SELECT book_id FROM items`).all().map(item => item.book_id);
        console.log(`📊 Talebook中共有 ${talebookBookIds.length} 本书籍: ${talebookBookIds.join(', ')}`);
        
        // 获取Calibre中的书籍ID
        console.log(`📊 Calibre中共有 ${calibreBookIds.size} 本书籍: ${Array.from(calibreBookIds).join(', ')}`);
        
        // 找出需要删除的书籍ID（在Talebook中存在但在Calibre中不存在）
        const booksToDelete = talebookBookIds.filter(bookId => !calibreBookIds.has(bookId));
        console.log(`🔍 需要删除的书籍ID: ${booksToDelete.length}本 - ${booksToDelete.join(', ')}`);
        
        // 批量删除
        if (booksToDelete.length > 0) {
          // 批量删除items表中的记录（使用book_id作为主键）
          const deleteItemsStmt = databaseService.talebookDb.prepare(`DELETE FROM items WHERE book_id = ?`);

          // 批量删除qc_book_groups表中的关联记录
          const deleteGroupsStmt = databaseService.talebookDb.prepare(`DELETE FROM qc_book_groups WHERE book_id = ?`);

          // 批量删除reading_state表中的关联记录
          const deleteReadingStateStmt = databaseService.talebookDb.prepare(`DELETE FROM reading_state WHERE book_id = ?`);
          
          // 开启事务处理所有删除操作
          const deleteTransaction = databaseService.talebookDb.transaction((ids) => {
            for (const id of ids) {
              // 删除items表记录
              const itemsResult = deleteItemsStmt.run(id);
              console.log(`🗑️ 删除Talebook items表记录: book_id=${id}, 影响行数: ${itemsResult.changes}`);
              
              // 删除关联的分组记录
              const groupsResult = deleteGroupsStmt.run(id);
              if (groupsResult.changes > 0) {
                console.log(`🗑️ 删除Talebook qc_book_groups表记录: book_id=${id}, 影响行数: ${groupsResult.changes}`);
              }
              
              // 删除关联的阅读状态记录
              const readingStateResult = deleteReadingStateStmt.run(id);
              if (readingStateResult.changes > 0) {
                console.log(`🗑️ 删除Talebook reading_state表记录: book_id=${id}, 影响行数: ${readingStateResult.changes}`);
              }
            }
          });
          
          deleteTransaction(booksToDelete);
          deleted = booksToDelete.length;
          logger.info(`🗑️ 删除了 ${deleted} 本已从Calibre移除的书籍`);
          console.log(`✅ 成功删除了 ${deleted} 本已从Calibre移除的书籍`);
        } else {
          console.log(`⏭️ 没有需要删除的书籍`);
        }
      } catch (deleteError) {
        logger.error(`❌ 删除书籍时出错:`, deleteError);
        console.error(`❌ 删除书籍时出错:`, deleteError.message);
      }

      this.syncStatus.status = failed > 0 ? SYNC_STATUS.FAILED : SYNC_STATUS.SUCCESS;
      this.syncStatus.message = `从Calibre到Talebook同步完成: 成功 ${synced} 本，失败 ${failed} 本，跳过 ${skipped} 本，删除 ${deleted} 本`;
      this.syncStatus.data = {
        synced,
        failed,
        conflicted,
        skipped,
        deleted,
        total: calibreBooks.length
      };

      logger.info(this.syncStatus.message);
      console.log(`\n📊 ${this.syncStatus.message}`);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.status = SYNC_STATUS.FAILED;
      this.syncStatus.message = `从Calibre数据库同步到Talebook数据库失败: ${error.message}`;
      this.logError(
        SYNC_ERROR_TYPES.SYSTEM_ERROR,
        this.syncStatus.message,
        { error: error.message, stack: error.stack }
      );
      
      logger.error(this.syncStatus.message, { error: error.stack });
      console.error(`❌ ${this.syncStatus.message}`);
      return this.syncStatus;
    }
  }

  /**
   * 执行事务操作
   */
  executeTransaction(db, operation, ...args) {
    try {
      const transaction = db.transaction(() => {
        return operation(...args);
      });
      return transaction();
    } catch (error) {
      logger.error('事务执行失败', { error: error.message });
      throw error;
    }
  }
}

export default new SyncService();
