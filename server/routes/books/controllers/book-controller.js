/**
 * 书籍控制器
 * 处理书籍相关的业务逻辑
 */

import calibreService from '../../../services/calibreService.js';
import activityService from '../../../services/activityService.js';
import databaseService from '../../../services/database/index.js';
import syncService from '../../../services/syncService.js';
import coverService from '../services/cover-service.js';
import { updateVersionInfo } from '../../../services/dataService.js';

/**
 * 获取所有书籍
 */
async function getAllBooks(req, res) {
  try {
    // 支持通过查询参数 noCache=true 来强制不使用缓存
    const useCache = req.query.noCache !== 'true';
    // 获取 readerId 参数（从查询参数），默认为 0
    const readerId = parseInt(req.query.readerId) || 0;

    const books = await calibreService.getAllBooksFromCalibre(useCache, readerId);
    res.json(books);
  } catch (error) {
    console.error('⚠️ 获取书籍列表失败，返回空数组:', error.message);
    // 当 Calibre 不可用时，返回空数组而不是 500 错误
    // 这样书摘页面等依赖书籍列表的页面可以正常加载
    res.json([]);
  }
}

/**
 * 根据ID获取书籍
 */
async function getBookById(req, res) {
  try {
    // 从查询参数获取readerId，默认为0
    const readerId = parseInt(req.query.readerId) || 0;
    console.log('📖 GET /:id - 书籍ID:', req.params.id, '读者ID:', readerId);
    
    const book = await calibreService.getBookFromCalibreById(req.params.id, readerId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

/**
 * 创建书籍
 */
async function createBook(req, res) {
  try {
    console.log('\n📝 开始创建书籍');
    console.log('📥 [POST /books] 接收到的请求体:', JSON.stringify(req.body, null, 2));

    const timestamp = new Date().toISOString();

    // 创建书籍对象（必需字段有默认值）
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
      pages: req.body.pages !== undefined ? req.body.pages : undefined,
      binding1: req.body.binding1 !== undefined ? req.body.binding1 : 0,
      binding2: req.body.binding2 !== undefined ? req.body.binding2 : 0,
      paper1: req.body.paper1 !== undefined ? req.body.paper1 : 0,
      edge1: req.body.edge1 !== undefined ? req.body.edge1 : 0,
      edge2: req.body.edge2 !== undefined ? req.body.edge2 : 0,
      rating: req.body.rating || undefined,
      series: req.body.series || '',
      language: req.body.language || 'zh',
      readStatus: req.body.readStatus || '未读',
      tags: req.body.tags || [],
      groups: req.body.groups || [],
      purchaseDate: req.body.purchaseDate || timestamp,
      purchasePrice: req.body.purchasePrice !== undefined ? req.body.purchasePrice : undefined,
      readCompleteDate: req.body.readCompleteDate || '',
      standardPrice: req.body.standardPrice !== undefined ? req.body.standardPrice : 0,
      note: req.body.note || '',
      path: `${(req.body.author || '未知作者').replace(/[\/\\]/g, '').replace(/\s+/g, ' ')}/${(req.body.title || '未知书名').replace(/[\/\\]/g, '').replace(/\s+/g, ' ')}`,
      hasCover: false
    };

    console.log('📚 [POST /books] 构建的书籍对象:', JSON.stringify(newBook, null, 2));
    console.log(`📚 书籍信息: ${newBook.title} - ${newBook.author}`);

    // 1. 保存到 SQLite 数据库
    let dbSaveSuccess = false;
    try {
      if (databaseService.isCalibreAvailable()) {
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
      // 数据库保存失败时，保持 UUID 作为 ID（不覆盖）
      // 这样在文件系统模式下仍然可以正常工作
      console.log('📝 保留 UUID 作为书籍ID:', newBook.id);
      console.warn('ℹ️ 提示：这是降级模式。系统当前使用文件系统模式。');
      console.warn('ℹ️ 如果需要数据库功能，请检查 Calibre 数据库配置。');
    }

    // 2. 保存到 Calibre 文件系统格式
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

    // 同步到 Talebook 数据库
    try {
      await syncService.syncCalibreToTalebook();
      console.log('✅ 书籍已同步到Talebook数据库');
    } catch (syncError) {
      console.warn('⚠️ 同步到Talebook数据库失败:', syncError.message);
    }
    
    await updateVersionInfo();
    console.log('✅ 书籍创建完成');

    res.status(201).json(verifiedBook);
  } catch (error) {
    console.error('❌ 创建书籍失败:', error.message);
    res.status(400).json({ error: error.message });
  }
}

/**
 * 更新书籍
 */
async function updateBook(req, res) {
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

    // 从查询参数获取readerId，默认为0
    const readerId = parseInt(req.query.readerId) || 0;
    console.log('📖 读者ID:', readerId);

    // 从 Calibre 格式获取当前书籍
    const currentBook = await calibreService.getBookFromCalibreById(bookId, readerId);
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
      if (databaseService.isCalibreAvailable()) {
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

    // 1.5 更新阅读状态（favorite/wants/personal_rating）
    console.log('🔍 检查阅读状态更新条件...');
    console.log('🔍 req.body.favorite:', req.body.favorite, '!== undefined:', req.body.favorite !== undefined);
    console.log('🔍 req.body.wants:', req.body.wants, '!== undefined:', req.body.wants !== undefined);
    console.log('🔍 req.body.personal_rating:', req.body.personal_rating, '!== undefined:', req.body.personal_rating !== undefined);
    if (req.body.favorite !== undefined || req.body.wants !== undefined || req.body.personal_rating !== undefined) {
      console.log('📖 步骤1.5: 更新阅读状态（favorite/wants/personal_rating）... readerId:', readerId);
      try {
        const readingState = {
          favorite: req.body.favorite !== undefined ? req.body.favorite : 0,
          wants: req.body.wants !== undefined ? req.body.wants : 0,
          favorite_date: req.body.favorite_date || null,
          wants_date: req.body.wants_date || null,
          personal_rating: req.body.personal_rating !== undefined ? req.body.personal_rating : 0,
          personal_rating_date: req.body.personal_rating_date || null
        };
        databaseService.updateReadingState(bookId, readingState, readerId);
        console.log('✅ 阅读状态更新成功:', readingState, 'readerId:', readerId);
        // 同步更新到 updatedBook 对象
        updatedBook.favorite = readingState.favorite;
        updatedBook.wants = readingState.wants;
        updatedBook.favorite_date = readingState.favorite_date;
        updatedBook.wants_date = readingState.wants_date;
        updatedBook.personal_rating = readingState.personal_rating;
        updatedBook.personal_rating_date = readingState.personal_rating_date;
      } catch (readingStateError) {
        console.error('❌ 更新阅读状态失败:', readingStateError.message);
      }
    }

    // 2. 保存到 Calibre 文件系统格式
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

    // 5. 同步到 Talebook 数据库
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
}

/**
 * 删除书籍
 */
async function deleteBook(req, res) {
  try {
    // 只接受整数ID，不接受 UUID
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId)) {
      console.error(`❌ 无效的书籍ID: ${req.params.id}，只允许整数ID`);
      return res.status(400).json({ error: '无效的书籍ID，只允许整数ID' });
    }

    console.log(`\n🗑️ 开始处理删除请求，ID: ${bookId}`);
    
    let book = null;
    
    // 1. 从数据库中获取书籍信息
    if (databaseService.isCalibreAvailable()) {
      console.log(`📝 尝试从数据库中获取书籍信息，ID: ${bookId}`);
      book = databaseService.getBookById(bookId);
    }
    
    // 2. 如果数据库中没有找到，从文件系统中查找
    if (!book) {
      console.warn(`⚠️ 数据库中未找到书籍，尝试从文件系统查找...`);
      const books = await calibreService.getAllBooksFromCalibre(false);
      book = books.find(b => b.id === bookId);
    }
    
    // 3. 如果还是没找到，返回 404
    if (!book) {
      console.error(`❌ 未找到要删除的书籍: ${bookId}`);
      return res.status(404).json({ error: 'Book not found' });
    }
    
    console.log(`✅ 找到了书籍: ${book.title}, ID: ${book.id}`);
    
    // 4. 从数据库中删除书籍（如果数据库可用）
    if (databaseService.isCalibreAvailable()) {
      console.log(`📝 从数据库中删除书籍，ID: ${bookId}`);
      databaseService.deleteBookFromDB(bookId);
      console.log(`✅ 数据库删除成功`);
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
    
    // 7. 更新元数据汇总（使用 try-catch 避免缓存错误）
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
    
    // 9. 同步到 Talebook 数据库
    try {
      await syncService.syncCalibreToTalebook();
      console.log('✅ 书籍删除已同步到Talebook数据库');
    } catch (syncError) {
      console.warn('⚠️ 同步到Talebook数据库失败:', syncError.message);
    }
    
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
}

/**
 * 搜索书籍
 */
async function searchBooks(req, res) {
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
    console.error('❌ 搜索书籍失败:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 上传封面
 */
async function uploadBookCover(req, res) {
  try {
    if (!req.file) {
      console.error('❌ 未上传文件');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`✅ 封面文件接收成功: ${req.file.originalname}, 大小: ${req.file.size}字节`);

    const updatedBook = await coverService.uploadCover(req.params.id, req.file.buffer, req.file.originalname);
    
    await updateVersionInfo();
    res.json(updatedBook);
  } catch (error) {
    console.error(`❌ 封面上传失败:`, error.message);
    console.error(`详细错误:`, error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * 删除封面
 */
async function deleteBookCover(req, res) {
  try {
    const updatedBook = await coverService.deleteCover(req.params.id);
    
    await updateVersionInfo();
    res.json(updatedBook);
  } catch (error) {
    console.error('❌ 删除封面失败:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 获取书籍的阅读状态
 */
async function getReadingState(req, res) {
  try {
    const bookId = parseInt(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const readerId = parseInt(req.query.readerId) || 0;

    const readingState = databaseService.getReadingState(bookId, readerId);
    res.json(readingState);
  } catch (error) {
    console.error('❌ 获取阅读状态失败:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 更新书籍的阅读状态
 */
async function updateReadingState(req, res) {
  try {
    const bookId = parseInt(req.params.id);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const readerId = parseInt(req.query.readerId) || 0;
    const readingState = req.body;

    if (readingState.read_state === undefined) {
      return res.status(400).json({ error: 'read_state is required' });
    }

    const updatedState = databaseService.updateReadingState(bookId, readingState, readerId);

    calibreService.clearBookCache();
    calibreService.clearBooksListCache();
    console.log(`🗑️ 已清除书籍 ${bookId} 的缓存`);

    res.json(updatedState);
  } catch (error) {
    console.error('❌ 更新阅读状态失败:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  searchBooks,
  uploadBookCover,
  deleteBookCover,
  getReadingState,
  updateReadingState
};
