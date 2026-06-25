/**
 * Calibre 书籍仓储
 * 处理书籍相关的数据库操作
 * 优化版本：支持分页查询、索引优化
 */

import BaseRepository from '../base-repository.js';
import { normalizeBookTypeBindings } from '../../../../utils/bookBinding.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

class BookRepository extends BaseRepository {
  constructor(db, talebookDb = null, qcBooklogDb = null) {
    super(db);
    this.talebookDb = talebookDb;
    this.qcBooklogDb = qcBooklogDb;
    this._totalBooksCount = null;
  }

  setTalebookDb(talebookDb) {
    this.talebookDb = talebookDb;
  }

  setQcBooklogDb(qcBooklogDb) {
    this.qcBooklogDb = qcBooklogDb;
  }

  getTotalCount() {
    if (this._totalBooksCount !== null) {
      return this._totalBooksCount;
    }
    try {
      const result = this.queryOne('SELECT COUNT(*) as count FROM books');
      this._totalBooksCount = result?.count || 0;
      return this._totalBooksCount;
    } catch (error) {
      console.error('获取书籍总数失败:', error.message);
      return 0;
    }
  }

  invalidateCountCache() {
    this._totalBooksCount = null;
  }

  findPaginated(options = {}) {
    const {
      readerId = 0,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sortBy = 'last_modified',
      sortOrder = 'DESC',
      filters = {}
    } = options;

    const validPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const validPage = Math.max(1, page);
    const offset = (validPage - 1) * validPageSize;

    console.log(`📄 分页查询: page=${validPage}, pageSize=${validPageSize}, offset=${offset}`);

    if (!this.db) {
      throw new Error('Calibre 数据库服务不可用');
    }

    this.db.pragma('wal_checkpoint(PASSIVE)');

    const validSortFields = {
      'last_modified': 'b.last_modified',
      'timestamp': 'b.timestamp',
      'title': 'b.title',
      'pubdate': 'b.pubdate',
      'id': 'b.id'
    };
    const sortField = validSortFields[sortBy] || 'b.last_modified';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        b.id,
        b.title,
        b.timestamp,
        b.pubdate,
        b.path,
        b.uuid,
        b.has_cover,
        b.series_index,
        b.last_modified,
        (
          SELECT GROUP_CONCAT(a.name, ' & ')
          FROM authors a
          JOIN books_authors_link bal ON a.id = bal.author
          WHERE bal.book = b.id
        ) as author,
        (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
        (SELECT r.rating FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
        (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
        (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
        (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
        (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
        (
          SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
          FROM tags t
          JOIN books_tags_link btl ON t.id = btl.tag
          WHERE btl.book = b.id
        ) as tags,
        (
          SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']'
          FROM data d
          WHERE d.book = b.id
        ) as formats
      FROM books b
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `;

    const books = this.queryAll(query, [validPageSize, offset]);
    console.log(`✅ 分页查询到 ${books.length} 本书籍`);

    const enrichedBooks = this.enrichBooks(books, readerId);

    const total = this.getTotalCount();
    const totalPages = Math.ceil(total / validPageSize);

    return {
      list: enrichedBooks,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
      hasMore: validPage < totalPages
    };
  }

  /**
   * 查找所有书籍
   * @param {Object} options - 查询选项
   * @param {boolean} options.useCache - 是否使用缓存
   * @param {number} options.readerId - 读者ID，用于获取阅读状态
   */
  findAll(options = {}) {
    const { useCache = true, readerId = 0 } = options;

    try {
      console.log('🔄 === 开始从 Calibre 获取所有书籍 ===');

      if (!this.db) {
        throw new Error('Calibre 数据库服务不可用');
      }

      // 强制同步WAL文件，确保能看到最新的写入数据
      this.db.pragma('wal_checkpoint(PASSIVE)');

      // 使用Calibre的meta视图获取书籍信息
      const query = `
        SELECT
          b.id,
          b.title,
          b.timestamp,
          b.pubdate,
          b.path,
          b.uuid,
          b.has_cover,
          b.series_index,
          b.last_modified,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author,
          (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
          (SELECT r.rating FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
          (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
          (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
          (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
          (
            SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
            FROM tags t
            JOIN books_tags_link btl ON t.id = btl.tag
            WHERE btl.book = b.id
          ) as tags,
          (
            SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']'
            FROM data d
            WHERE d.book = b.id
          ) as formats
        FROM books b
        ORDER BY b.last_modified DESC
      `;

      const books = this.queryAll(query);
      console.log('✅ 查询到 Calibre 书籍数量:', books.length);

      // 丰富书籍信息（类型、分组、扩展数据等）
      return this.enrichBooks(books, readerId);
    } catch (error) {
      console.error('❌ 从 Calibre 数据库获取书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找书籍
   */
  findById(id) {
    try {
      const query = `
        SELECT
          b.id,
          b.title,
          b.timestamp,
          b.pubdate,
          b.path,
          b.uuid,
          b.has_cover,
          b.series_index,
          b.last_modified,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author,
          (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
          (SELECT r.rating FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
          (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
          (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
          (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
          (
            SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
            FROM tags t
            JOIN books_tags_link btl ON t.id = btl.tag
            WHERE btl.book = b.id
          ) as tags,
          (
            SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']'
            FROM data d
            WHERE d.book = b.id
          ) as formats
        FROM books b
        WHERE b.id = ?
      `;

      const book = this.queryOne(query, [id]);
      
      if (book) {
        return this.enrichBook(book);
      }

      return null;
    } catch (error) {
      console.error(`❌ 查找书籍 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据路径查找书籍
   */
  findByPath(bookPath) {
    try {
      const query = `
        SELECT
          b.id,
          b.title,
          b.timestamp,
          b.pubdate,
          b.path,
          b.uuid,
          b.has_cover,
          b.series_index,
          b.last_modified,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author,
          (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
          (SELECT r.rating FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
          (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
          (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
          (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
          (
            SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
            FROM tags t
            JOIN books_tags_link btl ON t.id = btl.tag
            WHERE btl.book = b.id
          ) as tags,
          (
            SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']'
            FROM data d
            WHERE d.book = b.id
          ) as formats
        FROM books b
        WHERE b.path = ?
      `;

      const book = this.queryOne(query, [bookPath]);
      
      if (book) {
        return this.enrichBook(book);
      }

      return null;
    } catch (error) {
      console.error(`❌ 查找书籍 path=${bookPath} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建书籍
   */
  create(bookData) {
    try {
      const insertBook = this.transaction((data) => {
        // 插入书籍基本信息
        const insertStmt = this.prepare(`
          INSERT INTO books (title, timestamp, pubdate, uuid, has_cover, series_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
          data.title,
          data.timestamp || new Date().toISOString(),
          data.pubdate || null,
          data.uuid || crypto.randomUUID(),
          data.has_cover || 0,
          data.series_index || null
        );

        const bookId = result.lastInsertRowid;

        // 插入作者关联
        if (data.author) {
          const authors = data.author.split(' & ');
          authors.forEach(authorName => {
            // 查找或创建作者
            let author = this.queryOne('SELECT id FROM authors WHERE name = ?', [authorName.trim()]);
            if (!author) {
              const authorInsert = this.prepare('INSERT INTO authors (name) VALUES (?)');
              const authorResult = authorInsert.run(authorName.trim());
              author = { id: authorResult.lastInsertRowid };
            }
            // 建立关联
            this.prepare('INSERT OR IGNORE INTO books_authors_link (book, author) VALUES (?, ?)').run(bookId, author.id);
          });
        }

        return bookId;
      });

      return insertBook(bookData);
    } catch (error) {
      console.error('❌ 创建书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新书籍
   */
  update(id, data) {
    try {
      const updates = [];
      const values = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      if (data.timestamp !== undefined) {
        updates.push('timestamp = ?');
        values.push(data.timestamp);
      }
      if (data.pubdate !== undefined) {
        updates.push('pubdate = ?');
        values.push(data.pubdate);
      }
      if (data.has_cover !== undefined) {
        updates.push('has_cover = ?');
        values.push(data.has_cover);
      }
      if (data.series_index !== undefined) {
        updates.push('series_index = ?');
        values.push(data.series_index);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const sql = `UPDATE books SET ${updates.join(', ')} WHERE id = ?`;
      this.execute(sql, values);

      return this.findById(id);
    } catch (error) {
      console.error(`❌ 更新书籍 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除书籍
   */
  delete(id) {
    try {
      // 由于有外键约束 ON DELETE CASCADE，删除书籍会自动删除关联的数据
      const result = this.execute('DELETE FROM books WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除书籍 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索书籍
   */
  search({ keyword, readStatus, publisher, author }) {
    try {
      const conditions = [];
      const params = [];

      if (keyword) {
        conditions.push('(b.title LIKE ? OR b.path LIKE ?)');
        const keywordPattern = `%${keyword}%`;
        params.push(keywordPattern, keywordPattern);
      }

      if (author) {
        conditions.push('EXISTS (SELECT 1 FROM books_authors_link bal JOIN authors a ON bal.author = a.id WHERE bal.book = b.id AND a.name LIKE ?)');
        params.push(`%${author}%`);
      }

      if (publisher) {
        conditions.push('EXISTS (SELECT 1 FROM books_publishers_link bpl JOIN publishers p ON bpl.publisher = p.id WHERE bpl.book = b.id AND p.name LIKE ?)');
        params.push(`%${publisher}%`);
      }

      const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

      const query = `
        SELECT
          b.id,
          b.title,
          b.timestamp,
          b.pubdate,
          b.path,
          b.uuid,
          b.has_cover,
          b.series_index,
          b.last_modified,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author,
          (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
          (SELECT r.rating FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
          (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series
        FROM books b
        WHERE ${whereClause}
        ORDER BY b.last_modified DESC
      `;

      const books = this.queryAll(query, params);
      return this.enrichBooks(books);
    } catch (error) {
      console.error('❌ 搜索书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 丰富书籍信息（添加类型、分组、扩展数据等）
   */
  enrichBooks(books, readerId = 0) {
    const bookDataMap = new Map();
    const bookTypeMap = new Map();
    const bookGroupsMap = new Map();
    const readingStateMap = new Map();

    if (books.length === 0) {
      return books.map(book => this.enrichBook(book, readerId));
    }

    const bookIds = books.map(book => book.id);
    const placeholders = bookIds.map(() => '?').join(',');

    // ========== 获取分组数据 ==========
    // 分组数据存储在 qcBooklogDb 中，使用 mapping_id 关联
    if (this.qcBooklogDb) {
      try {
        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
        const bookGroupsQuery = `
          SELECT m.calibre_book_id as book_id, g.id as group_id, g.name as group_name
          FROM qc_book_groups bg
          JOIN qc_book_mapping m ON bg.mapping_id = m.id
          JOIN qc_groups g ON bg.group_id = g.id
          WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ?
        `;
        const bookGroups = this.qcBooklogDb.prepare(bookGroupsQuery).all(...bookIds, currentLibraryUuid);
        bookGroups.forEach(item => {
          if (!bookGroupsMap.has(item.book_id)) {
            bookGroupsMap.set(item.book_id, []);
          }
          // 只存储分组ID（字符串），匹配前端类型定义 string[]
          bookGroupsMap.get(item.book_id).push(String(item.group_id));
        });
        console.log(`✅ 从 QCBookLog 数据库获取了 ${bookGroups.length} 条分组关联`);
      } catch (error) {
        console.warn('⚠️ 从 QCBookLog 获取分组数据失败:', error.message);
      }
    }

    if (this.talebookDb) {
      try {
        const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;
        const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);
        bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));
        console.log(`✅ 从 Talebook 数据库获取了 ${bookTypes.length} 本书籍的载体类型`);
      } catch (error) {
        console.warn('⚠️ 从 Talebook 获取书籍类型信息失败:', error.message);
      }

      try {
        const readingStateQuery = `
          SELECT book_id, favorite, wants, read_state, personal_rating, personal_rating_date
          FROM reading_state
          WHERE book_id IN (${placeholders}) AND reader_id = ?
        `;
        const readingStates = this.talebookDb.prepare(readingStateQuery).all(...bookIds, readerId);
        readingStates.forEach(rs => readingStateMap.set(rs.book_id, rs));
        console.log(`✅ 从 Talebook 数据库获取了 ${readingStates.length} 本书籍的阅读状态`);
      } catch (error) {
        console.warn('⚠️ 从 Talebook 获取阅读状态失败:', error.message);
      }

      const missingBookIds = bookIds.filter(id => !bookTypeMap.has(id));
      if (missingBookIds.length > 0 && this.qcBooklogDb) {
        try {
          const missingPlaceholders = missingBookIds.map(() => '?').join(',');
          const bookTypesQuery = `
            SELECT m.calibre_book_id as id, bd.book_type
            FROM qc_bookdata bd
            JOIN qc_book_mapping m ON bd.mapping_id = m.id
            WHERE m.calibre_book_id IN (${missingPlaceholders}) AND m.library_uuid = ?
          `;
          const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
          const bookTypes = this.qcBooklogDb.prepare(bookTypesQuery).all(...missingBookIds, currentLibraryUuid);
          bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));
          console.log(`✅ 从 QCBookLog 数据库获取了 ${bookTypes.length} 本书籍的载体类型（补充模式）`);
        } catch (error) {
          console.warn('⚠️ 从 QCBookLog 获取书籍类型失败:', error.message);
        }
      }
    }

    if (!this.talebookDb && this.qcBooklogDb) {
      try {
        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
        const readingStateQuery = `
          SELECT m.calibre_book_id as book_id, rs.favorite, rs.wants, rs.read_state, rs.personal_rating, rs.personal_rating_date
          FROM qc_reading_state rs
          JOIN qc_book_mapping m ON rs.mapping_id = m.id
          WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ? AND rs.reader_id = ?
        `;
        const readingStates = this.qcBooklogDb.prepare(readingStateQuery).all(...bookIds, currentLibraryUuid, readerId);
        readingStates.forEach(rs => readingStateMap.set(rs.book_id, rs));
        console.log(`✅ 从 QCBookLog 数据库获取了 ${readingStates.length} 本书籍的阅读状态（降级模式）`);
      } catch (error) {
        console.warn('⚠️ 从 QCBookLog 获取阅读状态失败:', error.message);
      }
    }

    if (this.qcBooklogDb) {
      try {
        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
        const bookDataQuery = `
          SELECT m.calibre_book_id as book_id, bd.page_count, bd.standard_price, bd.purchase_price, bd.purchase_date,
                 bd.binding1, bd.binding2, bd.paper1, bd.edge1, bd.edge2, bd.note, bd.book_type, bd.source
          FROM qc_bookdata bd
          JOIN qc_book_mapping m ON bd.mapping_id = m.id
          WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ?
        `;
        const bookData = this.qcBooklogDb.prepare(bookDataQuery).all(...bookIds, currentLibraryUuid);
        bookData.forEach(item => {
          // 修正常见的 binding1 历史脏数据：若 binding1=0 但载体是实体书，
          // 按 book_type 重新判定：电子书→0，实体书→1
          const { binding1, binding2 } = normalizeBookTypeBindings({
            book_type: item.book_type,
            binding1: item.binding1,
            binding2: item.binding2
          });
          bookDataMap.set(item.book_id, {
            page_count: item.page_count || 0,
            standard_price: item.standard_price || 0,
            purchase_price: item.purchase_price || 0,
            purchase_date: item.purchase_date,
            binding1,
            binding2,
            paper1: item.paper1 || 0,
            edge1: item.edge1 || 0,
            edge2: item.edge2 || 0,
            note: item.note || '',
            book_type: item.book_type || 1,
            source: item.source || '',
            total_reading_time: 0,
            read_pages: 0,
            reading_count: 0,
            last_read_date: null,
            last_read_duration: 0
          });
        });
        console.log(`✅ 从 QCBookLog 数据库获取了 ${bookData.length} 本书籍的扩展数据`);
      } catch (error) {
        console.warn('⚠️ 从 QCBookLog 获取书籍扩展数据失败:', error.message);
      }
    } else if (this.talebookDb) {
      try {
        const bookDataQuery = `
          SELECT book_id, page_count, standard_price, purchase_price, purchase_date,
                 binding1, binding2, note,
                 total_reading_time, read_pages, reading_count, last_read_date, last_read_duration
          FROM qc_bookdata
          WHERE book_id IN (${placeholders})
        `;
        const bookData = this.talebookDb.prepare(bookDataQuery).all(...bookIds);
        bookData.forEach(item => {
          bookDataMap.set(item.book_id, {
            page_count: item.page_count || 0,
            standard_price: item.standard_price || 0,
            purchase_price: item.purchase_price || 0,
            purchase_date: item.purchase_date,
            binding1: item.binding1 || 0,
            binding2: item.binding2 || 0,
            paper1: 0,
            edge1: 0,
            edge2: 0,
            note: item.note || '',
            total_reading_time: item.total_reading_time || 0,
            read_pages: item.read_pages || 0,
            reading_count: item.reading_count || 0,
            last_read_date: item.last_read_date || null,
            last_read_duration: item.last_read_duration || 0
          });
        });
        console.log(`✅ 从 Talebook 数据库获取了 ${bookData.length} 本书籍的扩展数据（降级模式）`);
      } catch (error) {
        console.warn('⚠️ 从 Talebook 获取书籍扩展数据失败:', error.message);
      }
    }

    return books.map(book => {
      const bookData = bookDataMap.get(book.id) || {};
      
      let publishYear = null;
      if (book.pubdate) {
        const dateStr = String(book.pubdate);
        const yearMatch = dateStr.match(/\d{4}/);
        if (yearMatch) {
          publishYear = parseInt(yearMatch[0]);
        }
      }
      
      const bookType = (bookTypeMap.get(book.id) !== undefined && bookTypeMap.get(book.id) !== null)
        ? bookTypeMap.get(book.id)
        : 1; // 默认实体书
      const { binding1, binding2 } = normalizeBookTypeBindings({
        book_type: bookType,
        binding1: bookData.binding1,
        binding2: bookData.binding2
      });
      const enriched = {
        ...book,
        publishYear: publishYear,
        book_type: bookType,
        groups: bookGroupsMap.get(book.id) || [],
        pages: bookData.page_count || 0,
        standardPrice: bookData.standard_price || 0,
        purchasePrice: bookData.purchase_price || 0,
        purchaseDate: bookData.purchase_date,
        binding1,
        binding2,
        paper1: bookData.paper1 || 0,
        edge1: bookData.edge1 || 0,
        edge2: bookData.edge2 || 0,
        note: bookData.note || '',
        total_reading_time: bookData.total_reading_time || 0,
        read_pages: bookData.read_pages || 0,
        reading_count: bookData.reading_count || 0,
        last_read_date: bookData.last_read_date || null,
        last_read_duration: bookData.last_read_duration || 0,
        favorite: readingStateMap.get(book.id)?.favorite || 0,
        wants: readingStateMap.get(book.id)?.wants || 0,
        read_state: readingStateMap.get(book.id)?.read_state || 0,
        personal_rating: readingStateMap.get(book.id)?.personal_rating || 0,
        personal_rating_date: readingStateMap.get(book.id)?.personal_rating_date || null
      };

      try {
        enriched.tags = enriched.tags ? JSON.parse(enriched.tags) : [];
        enriched.formats = enriched.formats ? JSON.parse(enriched.formats) : [];
      } catch (e) {
        enriched.tags = [];
        enriched.formats = [];
      }

      const statusMap = { 0: '未读', 1: '在读', 2: '已读' };
      enriched.readStatus = statusMap[enriched.read_state] || '未读';

      return enriched;
    });
  }

  /**
   * 丰富单个书籍信息
   */
  enrichBook(book, readerId = 0) {
    let publishYear = null;
    if (book.pubdate) {
      const dateStr = String(book.pubdate);
      const yearMatch = dateStr.match(/\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0]);
      }
    }

    let extendedData = {
      pages: 0,
      standardPrice: 0,
      purchasePrice: 0,
      purchaseDate: null,
      binding1: 0,
      binding2: 0,
      paper1: 0,
      edge1: 0,
      edge2: 0,
      note: '',
      total_reading_time: 0,
      read_pages: 0,
      reading_count: 0,
      last_read_date: null,
      last_read_duration: 0,
      source: ''
    };

    if (this.qcBooklogDb) {
      try {
        const bookData = this.qcBooklogDb.prepare(`
          SELECT page_count, standard_price, purchase_price, purchase_date,
                 binding1, binding2, paper1, edge1, edge2, note,
                 total_reading_time, read_pages, reading_count, last_read_date, last_read_duration, book_type, source
          FROM qc_bookdata
          WHERE book_id = ?
        `).get(book.id);

        if (bookData) {
          // 按 book_type 修正 binding1 默认值（实体书→平装，电子书→电子书）
          const { binding1, binding2 } = normalizeBookTypeBindings({
            book_type: bookData.book_type,
            binding1: bookData.binding1,
            binding2: bookData.binding2
          });
          extendedData = {
            pages: bookData.page_count || 0,
            standardPrice: bookData.standard_price || 0,
            purchasePrice: bookData.purchase_price || 0,
            purchaseDate: bookData.purchase_date,
            binding1,
            binding2,
            paper1: bookData.paper1 || 0,
            edge1: bookData.edge1 || 0,
            edge2: bookData.edge2 || 0,
            note: bookData.note || '',
            total_reading_time: bookData.total_reading_time || 0,
            read_pages: bookData.read_pages || 0,
            reading_count: bookData.reading_count || 0,
            last_read_date: bookData.last_read_date || null,
            last_read_duration: bookData.last_read_duration || 0,
            book_type: bookData.book_type !== undefined && bookData.book_type !== null ? bookData.book_type : 1,
            source: bookData.source || ''
          };
        }
      } catch (error) {
        console.warn(`⚠️ 从 QCBookLog 获取书籍 ${book.id} 扩展数据失败:`, error.message);
      }
    } else if (this.talebookDb) {
      try {
        const bookData = this.talebookDb.prepare(`
          SELECT page_count, standard_price, purchase_price, purchase_date,
                 binding1, binding2, note,
                 total_reading_time, read_pages, reading_count, last_read_date, last_read_duration
          FROM qc_bookdata
          WHERE book_id = ?
        `).get(book.id);
        
        if (bookData) {
          // talebook 表没有 book_type 列，按默认实体书处理
          const { binding1, binding2 } = normalizeBookTypeBindings({
            book_type: 1,
            binding1: bookData.binding1,
            binding2: bookData.binding2
          });
          extendedData = {
            pages: bookData.page_count || 0,
            standardPrice: bookData.standard_price || 0,
            purchasePrice: bookData.purchase_price || 0,
            purchaseDate: bookData.purchase_date,
            binding1,
            binding2,
            paper1: 0,
            edge1: 0,
            edge2: 0,
            note: bookData.note || '',
            total_reading_time: bookData.total_reading_time || 0,
            read_pages: bookData.read_pages || 0,
            reading_count: bookData.reading_count || 0,
            last_read_date: bookData.last_read_date || null,
            last_read_duration: bookData.last_read_duration || 0
          };
        }
      } catch (error) {
        console.warn(`⚠️ 从 Talebook 获取书籍 ${book.id} 扩展数据失败:`, error.message);
      }
    }

    let bookType = 1;
    if (this.talebookDb) {
      try {
        const bookTypeResult = this.talebookDb.prepare(`
          SELECT book_type FROM items WHERE book_id = ?
        `).get(book.id);
        
        if (bookTypeResult) {
          bookType = bookTypeResult.book_type;
        }
      } catch (error) {
        console.warn(`⚠️ 从 Talebook 获取书籍 ${book.id} 类型失败:`, error.message);
      }
    }

    // 如果 extendedData 中有 book_type 且 talebook 中没有找到，使用 extendedData 的值
    if (bookType === 1 && extendedData.book_type !== undefined && extendedData.book_type !== null) {
      bookType = extendedData.book_type;
    }

    // 获取分组数据
    let groups = [];
    if (this.qcBooklogDb) {
      try {
        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
        const bookGroups = this.qcBooklogDb.prepare(`
          SELECT g.id, g.name
          FROM qc_book_groups bg
          JOIN qc_book_mapping m ON bg.mapping_id = m.id
          JOIN qc_groups g ON bg.group_id = g.id
          WHERE m.calibre_book_id = ? AND m.library_uuid = ?
        `).all(book.id, currentLibraryUuid);
        groups = bookGroups.map(g => String(g.id));
      } catch (error) {
        console.warn(`⚠️ 从 QCBookLog 获取书籍 ${book.id} 分组失败:`, error.message);
      }
    }

    const enriched = {
      ...book,
      publishYear: publishYear,
      groups: groups,
      ...extendedData,
      book_type: bookType,
      favorite: 0,
      wants: 0,
      read_state: 0,
      personal_rating: 0,
      personal_rating_date: null
    };

    if (this.talebookDb) {
      try {
        const readingState = this.talebookDb.prepare(`
          SELECT favorite, wants, read_state, personal_rating, personal_rating_date
          FROM reading_state
          WHERE book_id = ? AND reader_id = ?
        `).get(book.id, readerId);
        
        if (readingState) {
          enriched.favorite = readingState.favorite || 0;
          enriched.wants = readingState.wants || 0;
          enriched.read_state = readingState.read_state || 0;
          enriched.personal_rating = readingState.personal_rating || 0;
          enriched.personal_rating_date = readingState.personal_rating_date || null;
        }
      } catch (error) {
        console.warn(`⚠️ 从 Talebook 获取书籍 ${book.id} 阅读状态失败:`, error.message);
      }
    } else if (this.qcBooklogDb) {
      try {
        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;
        const readingState = this.qcBooklogDb.prepare(`
          SELECT rs.favorite, rs.wants, rs.read_state, rs.personal_rating, rs.personal_rating_date
          FROM qc_reading_state rs
          JOIN qc_book_mapping m ON rs.mapping_id = m.id
          WHERE m.calibre_book_id = ? AND m.library_uuid = ? AND rs.reader_id = ?
        `).get(book.id, currentLibraryUuid, readerId);
        
        if (readingState) {
          enriched.favorite = readingState.favorite || 0;
          enriched.wants = readingState.wants || 0;
          enriched.read_state = readingState.read_state || 0;
          enriched.personal_rating = readingState.personal_rating || 0;
          enriched.personal_rating_date = readingState.personal_rating_date || null;
        }
      } catch (error) {
        console.warn(`⚠️ 从 QCBookLog 获取书籍 ${book.id} 阅读状态失败:`, error.message);
      }
    }

    try {
      enriched.tags = enriched.tags ? JSON.parse(enriched.tags) : [];
      enriched.formats = enriched.formats ? JSON.parse(enriched.formats) : [];
    } catch (e) {
      enriched.tags = [];
      enriched.formats = [];
    }

    const statusMap = { 0: '未读', 1: '在读', 2: '已读' };
    enriched.readStatus = statusMap[enriched.read_state] || '未读';

    const hasCover = !!enriched.has_cover;
    console.log(`📖 [enrichBook] 书籍ID=${enriched.id}, has_cover=${enriched.has_cover}, hasCover=${hasCover}, path=${enriched.path}`);
    if (hasCover && enriched.path) {
      enriched.coverUrl = `/api/static/calibre/${encodeURIComponent(enriched.path)}/cover.jpg`;
      console.log(`📖 [enrichBook] 生成封面URL: ${enriched.coverUrl}`);
    } else {
      console.log(`📖 [enrichBook] 未生成封面URL, hasCover=${hasCover}, path=${enriched.path || 'undefined'}`);
    }

    return enriched;
  }
}

export default BookRepository;
