/**
 * 书籍路由模块
 * 处理书籍相关的API请求
 * 优化版本：减少重复数据获取，添加缓存失效
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import {
  readJsonFile,
  writeJsonFile,
  addJsonItem,
  updateJsonItem,
  deleteJsonItem,
  getJsonItem,
  saveFile,
  deleteFile,
  fileExists,
  updateVersionInfo
} from '../services/dataService.js';
import calibreService from '../services/calibreService.js';
import activityService from '../services/activityService.js';
import databaseService from '../services/database/index.js';
import syncService from '../services/syncService.js';

const router = express.Router();

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件（JPEG、PNG、GIF、WebP）'));
    }
  }
});

/**
 * 获取所有书籍
 */
router.get('/', async (req, res) => {
  try {
    // 支持通过查询参数 noCache=true 来强制不使用缓存
    const useCache = req.query.noCache !== 'true';
    // 获取readerId参数（从查询参数），默认为0
    const readerId = parseInt(req.query.readerId) || 0;

    const books = await calibreService.getAllBooksFromCalibre(useCache, readerId);
    res.json(books);
  } catch (error) {
    console.error('⚠️ 获取书籍列表失败，返回空数组:', error.message);
    // 当Calibre不可用时，返回空数组而不是500错误
    // 这样书摘页面等依赖书籍列表的页面可以正常加载
    res.json([]);
  }
});

/**
 * 根据ID获取书籍
 */
router.get('/:id', async (req, res) => {
  try {
    const book = await calibreService.getBookFromCalibreById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * 创建书籍
 */
router.post('/', async (req, res) => {
  try {
    console.log('\n📝 开始创建书籍');
    console.log('📥 [POST /books] 接收到的请求体:', JSON.stringify(req.body, null, 2));

    const timestamp = new Date().toISOString();

    // 创建书籍对象，确保必需字段有默认值
  // 注意：ID将由数据库自动生成（自增）
  const newBook = {
    createTime: timestamp,
    updateTime: timestamp,
    timestamp: timestamp,
    last_modified: timestamp,
    title: req.body.title || '未知书名',
    author: req.body.author || '未知作者',
    isbn: req.body.isbn || '',
    publisher: req.body.publisher || '',
    description: req.body.description || '',
    publishYear: req.body.publishYear || undefined,
    pages: req.body.pages || undefined,
    binding1: req.body.binding1 !== undefined ? req.body.binding1 : 0,
    binding2: req.body.binding2 !== undefined ? req.body.binding2 : 0,
    rating: req.body.rating || undefined,
    series: req.body.series || '',
    language: req.body.language || 'zh',
    readStatus: req.body.readStatus || '未读',
    tags: req.body.tags || [],
    groups: req.body.groups || [],
    purchaseDate: req.body.purchaseDate || timestamp,
    purchasePrice: req.body.purchasePrice || undefined,
    readCompleteDate: req.body.readCompleteDate || '',
    standardPrice: req.body.standardPrice || 0,
    note: req.body.note || '',
    book_type: req.body.book_type !== undefined ? req.body.book_type : undefined,
    path: `${req.body.author || '未知作者'}/${req.body.title || '未知书名'}`,
    hasCover: false
  };

  console.log('📚 [POST /books] 构建的书籍对象:', JSON.stringify(newBook, null, 2));
  console.log('📅 [POST /books] publishYear字段:', newBook.publishYear, '类型:', typeof newBook.publishYear);

    console.log(`📚 书籍信息: ${newBook.title} - ${newBook.author}`);

    // 1. 保存到SQLite数据库
    let dbSaveSuccess = false;
    try {
      if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
        const dbBook = databaseService.addBookToDB(newBook);
        console.log('✅ 书籍保存到数据库成功');
        // 使用数据库返回的ID
        newBook.id = dbBook.id;
        dbSaveSuccess = true;
      } else {
        throw new Error('数据库服务不可用');
      }
    } catch (dbError) {
      console.warn('⚠️ 数据库保存失败，仅保存到文件系统:', dbError.message);
      // 数据库保存失败时，保持UUID作为ID（不覆盖）
      // 这样在文件系统模式下仍然可以正常工作
      console.log('📝 保留UUID作为书籍ID:', newBook.id);
      console.warn('ℹ️ 提示：这是降级模式。系统当前使用文件系统模式。');
      console.warn('ℹ️ 如果需要数据库功能，请检查 Calibre 数据库配置。');
    }

    // 2. 保存到Calibre文件系统格式
    await calibreService.saveBookToCalibre(newBook);
    console.log('✅ 书籍保存到文件系统成功');

    // 清除所有缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    console.log('🗑️ 缓存已清除');

    // 强制重新获取书籍列表（不使用缓存）
    const allBooks = await calibreService.getAllBooksFromCalibre(false);

    // 验证新创建的书籍是否存在
    let verifiedBook = allBooks.find(b => b.id === newBook.id);

    if (!verifiedBook) {
      // 如果数据库保存成功，直接使用返回的书籍ID
      if (dbSaveSuccess) {
        console.log(`✅ 数据库保存成功，使用返回的书籍ID: ${newBook.id}`);
        verifiedBook = { ...newBook };
      } else {
        // 如果数据库保存失败，尝试按标题和作者匹配
        verifiedBook = allBooks.find(b =>
          b.title === newBook.title && b.author === newBook.author
        );

        if (verifiedBook) {
          console.log(`✅ 通过标题和作者找到书籍: ${verifiedBook.title} (ID: ${verifiedBook.id})`);
          // 使用数据库返回的 ID
          newBook.id = verifiedBook.id;
          dbSaveSuccess = true; // 标记为成功，因为至少从某个数据源找到了
        } else {
          // 尝试查找最新添加的书籍（列表中的第一本）
          if (allBooks.length > 0) {
            verifiedBook = allBooks[0];
            console.log(`✅ 使用最新添加的书籍: ${verifiedBook.title} (ID: ${verifiedBook.id})`);
            newBook.id = verifiedBook.id;
            dbSaveSuccess = true; // 标记为成功，因为至少从某个数据源找到了
          }
        }
      }
    }

    if (!verifiedBook) {
      console.warn(`⚠️ 书籍验证未找到精确匹配，但保存流程已完成`);
      // 不返回错误，而是继续流程，因为书籍可能已经成功保存
      verifiedBook = { ...newBook };
    }
    console.log(`✅ 验证成功: 书籍已保存，ID: ${newBook.id}`);

    // 更新元数据汇总
    await calibreService.generateCalibreMetadataSummary(allBooks);

    // 同步到Talebook数据库
    try {
      await syncService.syncCalibreToTalebook();
      console.log('✅ 书籍已同步到Talebook数据库');
    } catch (syncError) {
      console.warn('⚠️ 同步到Talebook数据库失败:', syncError.message);
    }
    
    await updateVersionInfo();
    console.log('✅ 书籍创建完成');

    // 记录活动日志
    try {
      activityService.logActivity({
        type: 'book_added',
        userId: 0,
        readerId: 0,
        bookId: newBook.id,
        bookTitle: newBook.title,
        bookAuthor: newBook.author,
        bookCover: newBook.hasCover ? `/api/book/${newBook.id}/cover` : null,
        metadata: {
          isbn: newBook.isbn,
          publisher: newBook.publisher,
          pages: newBook.pages
        }
      });
    } catch (logError) {
      console.warn('⚠️ 记录活动日志失败:', logError.message);
    }

    res.status(201).json(verifiedBook);
  } catch (error) {
    console.error('❌ 创建书籍失败:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * 更新书籍
 */
router.put('/:id', async (req, res) => {
  try {
    console.log('\n📖 ============ 开始处理更新请求 ============');
    console.log('📖 请求URL:', req.originalUrl);
    console.log('📖 请求方法:', req.method);
    console.log('📖 书籍ID (原始):', req.params.id);

    // 验证ID
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId)) {
      console.error('❌ 无效的书籍ID:', req.params.id);
      return res.status(400).json({ error: '无效的书籍ID' });
    }
    console.log('📖 书籍ID (解析后):', bookId);

    console.log('📖 请求体:', JSON.stringify(req.body, null, 2));

    // 从Calibre格式获取当前书籍
    const currentBook = await calibreService.getBookFromCalibreById(bookId);
    if (!currentBook) {
      console.error('❌ 书籍不存在:', bookId);
      return res.status(404).json({ error: 'Book not found' });
    }
    console.log('📖 当前书籍:', {
      id: currentBook.id,
      title: currentBook.title,
      author: currentBook.author
    });

    // 更新书籍信息
    const updatedBook = {
      ...currentBook,
      updateTime: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };

    console.log('📖 开始更新字段...');
    for (const key in req.body) {
      console.log(`📖   ${key}:`, req.body[key]);
      updatedBook[key] = req.body[key];
    }

    console.log('📖 更新后的书籍:', {
      id: updatedBook.id,
      title: updatedBook.title,
      author: updatedBook.author,
      updateTime: updatedBook.updateTime
    });

    // 1. 更新数据库
    console.log('📖 步骤1: 开始更新数据库...');
    try {
      if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
        databaseService.updateBookInDB(updatedBook);
        console.log('✅ 数据库更新成功');
      } else {
        console.error('❌ 数据库服务不可用');
        throw new Error('数据库服务不可用');
      }
    } catch (dbError) {
      console.error('❌ 数据库更新失败:', dbError);
      console.error('❌ 错误堆栈:', dbError.stack);
      throw new Error(`数据库更新失败: ${dbError.message}`);
    }

    // 2. 保存到Calibre文件系统格式
    console.log('📖 步骤2: 开始保存到文件系统...');
    await calibreService.saveBookToCalibre(updatedBook);
    console.log('✅ 文件系统更新成功');

    // 3. 清除缓存
    console.log('📖 步骤3: 清除缓存...');
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    console.log('✅ 缓存已清除');

    // 4. 更新元数据汇总
    console.log('📖 步骤4: 更新元数据...');
    const allBooks = await calibreService.getAllBooksFromCalibre();
    await calibreService.generateCalibreMetadataSummary(allBooks);
    console.log('✅ 元数据已更新');

    // 5. 同步到Talebook数据库
    console.log('📖 步骤5: 同步到Talebook...');
    try {
      await syncService.syncCalibreToTalebook();
      console.log('✅ 书籍已同步到Talebook数据库');
    } catch (syncError) {
      console.warn('⚠️ 同步到Talebook数据库失败:', syncError.message);
      // 不影响主流程
    }

    // 6. 更新版本信息
    console.log('📖 步骤6: 更新版本信息...');
    await updateVersionInfo();
    console.log('✅ 版本信息已更新');

    // 记录活动日志
    try {
      activityService.logActivity({
        type: 'book_updated',
        userId: 0,
        readerId: 0,
        bookId: updatedBook.id,
        bookTitle: updatedBook.title,
        bookAuthor: updatedBook.author,
        bookCover: updatedBook.hasCover ? `/api/book/${updatedBook.id}/cover` : null,
        metadata: {
          updatedFields: Object.keys(req.body)
        }
      });
    } catch (logError) {
      console.warn('⚠️ 记录活动日志失败:', logError.message);
    }

    console.log('📖 ============ 更新请求处理完成 ============');
    console.log('📖 返回数据:', {
      id: updatedBook.id,
      title: updatedBook.title,
      author: updatedBook.author
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('❌ ============ 更新请求处理失败 ============');
    console.error('❌ 错误类型:', error.constructor.name);
    console.error('❌ 错误消息:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除书籍
 */
router.delete('/:id', async (req, res) => {
  try {
    // 只接受整数ID，不接受UUID
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId)) {
      console.error(`❌ 无效的书籍ID: ${req.params.id}，只允许整数ID`);
      return res.status(400).json({ error: '无效的书籍ID，只允许整数ID' });
    }
    
    console.log(`\n🗑️ 开始处理删除请求，ID: ${bookId}`);
    
    let book = null;
    
    // 1. 从数据库中获取书籍信息
    if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
      console.log(`📝 尝试从数据库中获取书籍信息，ID: ${bookId}`);
      book = databaseService.getBookById(bookId);
    }
    
    // 2. 如果数据库中没有找到，从文件系统中查找
    if (!book) {
      console.warn(`⚠️ 数据库中未找到书籍，尝试从文件系统查找...`);
      const books = await calibreService.getAllBooksFromCalibre(false);
      book = books.find(b => b.id === bookId);
    }
    
    // 3. 如果还是没找到，返回404
    if (!book) {
      console.error(`❌ 未找到要删除的书籍: ${bookId}`);
      return res.status(404).json({ error: 'Book not found' });
    }
    
    console.log(`✅ 找到了书籍: ${book.title}, ID: ${book.id}`);
    
    // 4. 从数据库中删除书籍（如果数据库可用）
    // 4.1 从 Calibre 数据库删除
    if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
      console.log(`📝 从Calibre数据库中删除书籍，ID: ${bookId}`);
      try {
        if (databaseService.calibreDb) {
          databaseService.calibreDb.prepare(`DELETE FROM books_authors_link WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM books_tags_link WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM books_publishers_link WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM books_ratings_link WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM books_languages_link WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM identifiers WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM comments WHERE book = ?`).run(bookId);
          databaseService.calibreDb.prepare(`DELETE FROM data WHERE book = ?`).run(bookId);
          const result = databaseService.calibreDb.prepare(`DELETE FROM books WHERE id = ?`).run(bookId);
          if (result.changes > 0) {
            console.log(`✅ 成功从Calibre数据库删除书籍记录，影响行数: ${result.changes}`);
          } else {
            console.warn(`⚠️ Calibre数据库中未找到书籍记录`);
          }
        }
      } catch (dbError) {
        console.error(`❌ Calibre数据库删除失败:`, dbError.message);
      }
    }
    
    // 4.2 从 Talebook 数据库删除（独立于 Calibre，确保始终执行）
    if (databaseService && databaseService.talebookDb) {
      console.log(`📝 从Talebook数据库中删除书籍，ID: ${bookId}`);
      try {
        const deleteResult = databaseService.talebookDb.prepare(`DELETE FROM items WHERE book_id = ?`).run(bookId);
        if (deleteResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库items表删除记录，影响行数: ${deleteResult.changes}`);
        } else {
          console.log(`⏭️ Talebook数据库items表中未找到对应记录`);
        }
        
        // 注意：分组数据存储在 qcBooklogDb 中，通过 mapping_id 关联
        // 删除书籍映射时会级联删除分组关联（ON DELETE CASCADE）
        // 这里只需要删除 talebookDb 中的旧数据（兼容旧版本）
        if (databaseService.talebookDb) {
          const deleteGroupsResult = databaseService.talebookDb.prepare(`DELETE FROM qc_book_groups WHERE book_id = ?`).run(bookId);
          if (deleteGroupsResult.changes > 0) {
            console.log(`✅ 成功从Talebook数据库qc_book_groups表删除关联记录，影响行数: ${deleteGroupsResult.changes}`);
          }
        }
        
        const deleteReadingStateResult = databaseService.talebookDb.prepare(`DELETE FROM reading_state WHERE book_id = ?`).run(bookId);
        if (deleteReadingStateResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库reading_state表删除关联记录，影响行数: ${deleteReadingStateResult.changes}`);
        }
        
        const deleteBookdataResult = databaseService.talebookDb.prepare(`DELETE FROM qc_bookdata WHERE book_id = ?`).run(bookId);
        if (deleteBookdataResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库qc_bookdata表删除关联记录，影响行数: ${deleteBookdataResult.changes}`);
        }
        
        const deleteBookmarksResult = databaseService.talebookDb.prepare(`DELETE FROM qc_bookmarks WHERE book_id = ?`).run(bookId);
        if (deleteBookmarksResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库qc_bookmarks表删除关联记录，影响行数: ${deleteBookmarksResult.changes}`);
        }
        
        const deleteReadingRecordsResult = databaseService.talebookDb.prepare(`DELETE FROM qc_reading_records WHERE book_id = ?`).run(bookId);
        if (deleteReadingRecordsResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库qc_reading_records表删除关联记录，影响行数: ${deleteReadingRecordsResult.changes}`);
        }
        
        const deleteGoalsResult = databaseService.talebookDb.prepare(`DELETE FROM reading_goals WHERE book_id = ?`).run(bookId);
        if (deleteGoalsResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库reading_goals表删除关联记录，影响行数: ${deleteGoalsResult.changes}`);
        }
        
        const deleteActivitiesResult = databaseService.talebookDb.prepare(`DELETE FROM activities WHERE book_id = ?`).run(bookId);
        if (deleteActivitiesResult.changes > 0) {
          console.log(`✅ 成功从Talebook数据库activities表删除关联记录，影响行数: ${deleteActivitiesResult.changes}`);
        }
        
        databaseService.talebookDb.pragma('wal_checkpoint(FULL)');
        console.log(`✅ Talebook数据库WAL已同步`);
      } catch (talebookError) {
        console.error(`⚠️ 从Talebook数据库删除关联记录失败:`, talebookError.message);
      }
    } else {
      console.warn(`⚠️ Talebook数据库不可用，跳过删除操作`);
    }
    
    // 4.3 从 QCBookLog 数据库删除阅读状态（防止定时同步重新创建 items 记录）
    if (databaseService && databaseService.qcBooklogDb) {
      console.log(`📝 从QCBookLog数据库中删除书籍阅读状态，ID: ${bookId}`);
      try {
        const deleteReadingStateResult = databaseService.qcBooklogDb.prepare(`DELETE FROM qc_reading_state WHERE book_id = ?`).run(bookId);
        if (deleteReadingStateResult.changes > 0) {
          console.log(`✅ 成功从QCBookLog数据库qc_reading_state表删除记录，影响行数: ${deleteReadingStateResult.changes}`);
        } else {
          console.log(`⏭️ QCBookLog数据库qc_reading_state表中未找到对应记录`);
        }
        
        databaseService.qcBooklogDb.pragma('wal_checkpoint(FULL)');
        console.log(`✅ QCBookLog数据库WAL已同步`);
      } catch (qcBooklogError) {
        console.error(`⚠️ 从QCBookLog数据库删除阅读状态失败:`, qcBooklogError.message);
      }
    } else {
      console.warn(`⚠️ QCBookLog数据库不可用，跳过删除操作`);
    }
    
    // 5. 从文件系统中删除书籍
    console.log(`📝 从文件系统中删除书籍: ${book.title}`);
    await calibreService.deleteBookFromCalibre(book);
    console.log(`✅ 文件系统删除成功`);
    
    // 6. 清除所有缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    calibreService.clearCoverCache();
    console.log(`✅ 缓存已清除`);
    
    // 7. 更新元数据汇总（使用try-catch避免缓存错误）
    try {
      console.log(`📝 更新元数据汇总`);
      const allBooks = await calibreService.getAllBooksFromCalibre(false);
      await calibreService.generateCalibreMetadataSummary(allBooks);
      console.log(`✅ 元数据汇总已更新`);
    } catch (metadataError) {
      console.warn(`⚠️ 更新元数据汇总失败: ${metadataError.message}`);
    }
    
    // 8. 更新版本信息
    await updateVersionInfo();
    console.log(`✅ 版本信息已更新`);
    
    // 9. 同步到Talebook数据库（删除操作不需要同步，因为已经直接删除了）
    // 注意：删除书籍后不需要调用 syncCalibreToTalebook，因为：
    // 1. 书籍已从 Calibre 删除
    // 2. 书籍已从 Talebook items 表删除
    // 3. 同步服务会检测到 Calibre 中不存在的书籍并删除 Talebook 中的记录
    // 但由于我们已经直接删除了，所以不需要再次同步
    console.log('✅ 书籍删除完成，跳过同步服务（已直接删除）');
    
    console.log(`✅ 删除书籍成功: ${bookId}`);
    
    // 返回被删除的书籍信息，方便前端使用
    res.json({ 
      message: 'Book deleted successfully',
      book: { id: book.id, isbn: book.isbn, title: book.title } 
    });
  } catch (error) {
    console.error(`❌ 删除书籍失败:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 上传书籍封面
 */
router.post('/:id/cover', upload.single('cover'), async (req, res) => {
  try {
    console.log(`\n📤 收到封面上传请求，书籍ID: ${req.params.id}`);
    console.log(`🔍 ID类型: ${typeof req.params.id}`);

    if (!req.file) {
      console.error('❌ 未上传文件');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`✅ 封面文件接收成功: ${req.file.originalname}, 大小: ${req.file.size}字节`);

    // 从Calibre格式获取书籍
    console.log(`🔍 正在查找书籍，ID: ${req.params.id}`);
    let book = await calibreService.getBookFromCalibreById(req.params.id);
    if (!book) {
      console.error(`❌ 书籍不存在，ID: ${req.params.id}`);
      // 尝试刷新缓存后重试
      console.log('🔄 清除缓存并重新查找...');
      calibreService.clearBookCache();
      calibreService.clearBooksListCache();
      book = await calibreService.getBookFromCalibreById(req.params.id, false);  // 强制不使用缓存
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
    }

    console.log(`✅ 找到书籍: ${book.title}`);

    // 确保使用最新的书库目录
    calibreService.updateBookDir();
    const bookDir = calibreService.getBookDir();
    console.log(`📂 当前书库目录: ${bookDir}`);

    // 使用数据库中的path字段构建封面路径（确保只有两级目录）
    const bookPath = book.path || `${book.author || '未知作者'}/${book.title || '未知书名'}`;
    const coverDir = path.join(bookDir, bookPath);
    const coverPath = path.join(coverDir, 'cover.jpg');

    console.log(`💾 保存新封面到Calibre路径: ${coverPath}`);

    // 创建目录（如果不存在）
    await fs.mkdir(coverDir, { recursive: true });

    // 保存封面图片到Calibre路径（使用绝对路径）
    await fs.writeFile(coverPath, req.file.buffer);
    console.log('✅ 封面保存成功');

    // 更新书籍的封面状态
    const updatedBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      hasCover: true,
      path: book.path
    };

    console.log(`💾 更新书籍元数据...`);

    // 1. 更新数据库中的has_cover字段
    try {
      if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
        databaseService.updateBookInDB(updatedBook);
        console.log('✅ 数据库中has_cover字段更新成功');
      }
    } catch (dbError) {
      console.warn('⚠️ 更新数据库has_cover字段失败:', dbError.message);
    }

    // 2. 保存到Calibre格式，更新封面
    await calibreService.saveBookToCalibre(updatedBook);

    console.log('✅ 封面上传成功');

    // 清除缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    calibreService.clearCoverCache();

    // 更新元数据汇总
    const allBooks = await calibreService.getAllBooksFromCalibre();
    await calibreService.generateCalibreMetadataSummary(allBooks);

    await updateVersionInfo();
    res.json(updatedBook);
  } catch (error) {
    console.error(`❌ 封面上传失败:`, error.message);
    console.error('详细错误:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * 删除书籍封面
 */
router.delete('/:id/cover', async (req, res) => {
  try {
    // 从Calibre格式获取书籍
    const book = await calibreService.getBookFromCalibreById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // 确保使用最新的书库目录
    calibreService.updateBookDir();
    const bookDir = calibreService.getBookDir();

    // 使用数据库中的path字段构建封面路径（确保只有两级目录）
    const bookPath = book.path || `${book.author || '未知作者'}/${book.title || '未知书名'}`;
    const coverPath = path.join(bookDir, bookPath, 'cover.jpg');

    try {
      await fs.access(coverPath);
      await fs.unlink(coverPath);
      console.log(`✅ 封面文件已删除: ${coverPath}`);
    } catch (err) {
      console.log(`ℹ️ 封面文件不存在或已删除: ${coverPath}`);
    }

    // 更新书籍信息，移除封面
    const updatedBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      hasCover: false,
      path: book.path
    };

    // 更新数据库中的has_cover状态
    if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
      try {
        databaseService.updateBookInDB(updatedBook);
        console.log('✅ 数据库中的封面状态已更新');
      } catch (dbError) {
        console.warn('⚠️ 更新数据库封面状态失败:', dbError.message);
      }
    }

    // 直接保存到Calibre格式，更新封面状态
    await calibreService.saveBookToCalibre(updatedBook);

    // 清除缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    calibreService.clearCoverCache();

    // 更新元数据汇总
    try {
      const allBooks = await calibreService.getAllBooksFromCalibre();
      await calibreService.generateCalibreMetadataSummary(allBooks);
    } catch (metadataError) {
      console.warn('⚠️ 更新元数据汇总失败:', metadataError.message);
    }

    await updateVersionInfo();
    res.json(updatedBook);
  } catch (error) {
    console.error('❌ 删除封面失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 搜索书籍
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, readStatus, publisher, author } = req.query;
    let books = await calibreService.getAllBooksFromCalibre();
    
    // 过滤逻辑
    if (keyword) {
      const searchTerm = keyword.toLowerCase();
      books = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.isbn?.toLowerCase().includes(searchTerm) ||
        book.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (readStatus) {
      books = books.filter(book => book.readStatus === readStatus);
    }
    
    if (publisher) {
      books = books.filter(book => book.publisher?.toLowerCase().includes(publisher.toLowerCase()));
    }
    
    if (author) {
      books = books.filter(book => book.author?.toLowerCase().includes(author.toLowerCase()));
    }
    
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 导入书籍数据（优化版本：并发处理）
 */
router.post('/import', async (req, res) => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of books.' });
    }

    // 读取现有书籍数据
    const existingBooks = await calibreService.getAllBooksFromCalibre();
    const existingIds = new Set(existingBooks.map(book => book.id));

    // 找出需要导入的新书籍
    const booksToImport = books
      .filter(book => !existingIds.has(book.id))
      .map(book => ({
        ...book,
        id: book.id,
        createTime: book.createTime || new Date().toISOString(),
        updateTime: book.updateTime || new Date().toISOString()
      }));

    if (booksToImport.length === 0) {
      return res.json({ message: '没有新书籍需要导入', total: existingBooks.length });
    }

    const BATCH_SIZE = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < booksToImport.length; i += BATCH_SIZE) {
      const batch = booksToImport.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (book) => {
          if (databaseService && databaseService.isCalibreAvailable && databaseService.isCalibreAvailable()) {
            const dbBook = databaseService.addBookToDB(book);
            book.id = dbBook.id;
            console.log(`✅ [批量导入] 书籍 "${book.title}" 已保存到数据库, ID: ${book.id}`);
          }
          await calibreService.saveBookToCalibre(book);
          return true;
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
          console.error('❌ [批量导入] 导入失败:', result.reason?.message || result.reason);
        }
      });
    }

    // 清除所有缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();

    // 更新元数据汇总
    const allBooks = await calibreService.getAllBooksFromCalibre();
    await calibreService.generateCalibreMetadataSummary(allBooks);

    await updateVersionInfo();
    res.json({
      message: `导入成功，新增${successCount}本书籍` + (failCount > 0 ? `，失败${failCount}本` : ''),
      total: allBooks.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 导出书籍数据
 */
router.get('/export', async (req, res) => {
  try {
    // 使用Calibre直接读取功能获取所有书籍
    const books = await calibreService.getAllBooksFromCalibre();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="books_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取书籍的阅读状态
 */
router.get('/:id/reading-state', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    // 从查询参数获取readerId，默认为0
    const readerId = parseInt(req.query.readerId) || 0;

    const readingState = databaseService.getReadingState(bookId, readerId);
    res.json(readingState);
  } catch (error) {
    console.error('❌ 获取阅读状态失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新书籍的阅读状态
 */
router.put('/:id/reading-state', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    // 从查询参数获取readerId，默认为0
    const readerId = parseInt(req.query.readerId) || 0;

    const readingState = req.body;

    // 验证必需字段
    if (readingState.read_state === undefined) {
      return res.status(400).json({ error: 'read_state is required' });
    }

    // 获取书籍信息用于活动日志
    let bookInfo = null;
    try {
      bookInfo = await calibreService.getBookFromCalibreById(bookId);
    } catch (e) {
      console.warn('⚠️ 获取书籍信息失败:', e.message);
    }

    const updatedState = databaseService.updateReadingState(bookId, readingState, readerId);

    // 记录活动日志
    try {
      const stateMap = { 0: '未读', 1: '在读', 2: '已读' };
      activityService.logActivity({
        type: 'reading_state_changed',
        userId: readerId,
        readerId: readerId,
        bookId: bookId,
        bookTitle: bookInfo?.title || null,
        bookAuthor: bookInfo?.author || null,
        bookCover: bookInfo?.hasCover ? `/api/book/${bookId}/cover` : null,
        metadata: {
          read_state: readingState.read_state,
          read_state_label: stateMap[readingState.read_state] || '未知',
          favorite: readingState.favorite,
          wants: readingState.wants
        }
      });
    } catch (logError) {
      console.warn('⚠️ 记录活动日志失败:', logError.message);
    }

    // 清除缓存，确保下次获取时能看到最新的阅读状态
    calibreService.clearBookCache();
    calibreService.clearBooksListCache();
    console.log(`🗑️ 已清除书籍 ${bookId} 的缓存`);

    res.json(updatedState);
  } catch (error) {
    console.error('❌ 更新阅读状态失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新书籍的阅读进度
 * PUT /api/books/:id/reading-progress
 */
router.put('/:id/reading-progress', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const { readPages } = req.body;

    // 验证必需字段
    if (readPages === undefined || readPages === null) {
      return res.status(400).json({ error: 'readPages is required' });
    }

    const result = databaseService.updateBookReadingProgress(bookId, readPages);

    // 清除缓存，确保下次获取时能看到最新的阅读进度
    calibreService.clearBookCache();
    calibreService.clearBooksListCache();
    console.log(`🗑️ 已清除书籍 ${bookId} 的缓存`);

    res.json(result);
  } catch (error) {
    console.error('❌ 更新阅读进度失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;