/**
 * Calibre 书籍仓储
 * 处理书籍相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Calibre 书籍仓储类
 */
class BookRepository extends BaseRepository {
  constructor(db, talebookDb = null) {
    super(db);
    this.talebookDb = talebookDb;
  }

  /**
   * 设置 Talebook 数据库（用于获取书籍类型、分组等信息）
   */
  setTalebookDb(talebookDb) {
    this.talebookDb = talebookDb;
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
          (SELECT r.rating / 2.0 FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
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
            SELECT CASE 
              WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='data') = 0 THEN '[]'
              WHEN (SELECT COUNT(*) FROM data WHERE book = b.id) = 0 THEN '[]'
              ELSE (SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']' FROM data d WHERE d.book = b.id)
            END
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
          (SELECT r.rating / 2.0 FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
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
            SELECT CASE 
              WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='data') = 0 THEN '[]'
              WHEN (SELECT COUNT(*) FROM data WHERE book = b.id) = 0 THEN '[]'
              ELSE (SELECT '[' || GROUP_CONCAT('"' || d.format || '"', ',') || ']' FROM data d WHERE d.book = b.id)
            END
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
          (SELECT r.rating / 2.0 FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
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
    if (!this.talebookDb) {
      // 如果 Talebook 数据库不可用，返回基础书籍数据
      return books.map(book => this.enrichBook(book, readerId));
    }

    try {
      const bookIds = books.map(book => book.id);
      if (bookIds.length === 0) {
        return books.map(book => this.enrichBook(book, readerId));
      }

      const placeholders = bookIds.map(() => '?').join(',');

      // 获取书籍类型信息
      const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;
      const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);
      const bookTypeMap = new Map(bookTypes.map(bt => [bt.id, bt.book_type]));

      // 获取书籍分组信息
      const bookGroupsQuery = `
        SELECT bg.book_id, g.id as group_id, g.name as group_name FROM qc_book_groups bg
        JOIN qc_groups g ON bg.group_id = g.id
        WHERE bg.book_id IN (${placeholders})
        ORDER BY g.name
      `;
      const bookGroups = this.talebookDb.prepare(bookGroupsQuery).all(...bookIds);
      const bookGroupsMap = new Map();
      bookGroups.forEach(item => {
        if (!bookGroupsMap.has(item.book_id)) {
          bookGroupsMap.set(item.book_id, []);
        }
        bookGroupsMap.get(item.book_id).push({
          id: String(item.group_id),
          name: item.group_name
        });
      });

      // 获取书籍扩展数据
      const bookDataQuery = `
        SELECT book_id, page_count, standard_price, purchase_price, purchase_date,
               binding1, binding2, note,
               total_reading_time, read_pages, reading_count, last_read_date, last_read_duration
        FROM qc_bookdata
        WHERE book_id IN (${placeholders})
      `;
      const bookData = this.talebookDb.prepare(bookDataQuery).all(...bookIds);
      const bookDataMap = new Map();
      bookData.forEach(item => {
        bookDataMap.set(item.book_id, {
          page_count: item.page_count || 0,
          standard_price: item.standard_price || 0,
          purchase_price: item.purchase_price || 0,
          purchase_date: item.purchase_date,
          binding1: item.binding1 || 0,
          binding2: item.binding2 || 0,
          note: item.note || '',
          total_reading_time: item.total_reading_time || 0,
          read_pages: item.read_pages || 0,
          reading_count: item.reading_count || 0,
          last_read_date: item.last_read_date || null,
          last_read_duration: item.last_read_duration || 0
        });
      });

      // 获取阅读状态
      const readingStateQuery = `
        SELECT book_id, favorite, wants, read_state
        FROM reading_state
        WHERE book_id IN (${placeholders}) AND reader_id = ?
      `;
      const readingStates = this.talebookDb.prepare(readingStateQuery).all([...bookIds, readerId]);
      const readingStateMap = new Map(readingStates.map(rs => [rs.book_id, rs]));

      // 合并所有数据
      return books.map(book => {
        const bookData = bookDataMap.get(book.id) || {};
        
        // 提取出版年份
        let publishYear = null;
        if (book.pubdate) {
          const dateStr = String(book.pubdate);
          const yearMatch = dateStr.match(/\d{4}/);
          if (yearMatch) {
            publishYear = parseInt(yearMatch[0]);
          }
        }
        
        const enriched = {
          ...book,
          publishYear: publishYear,
          book_type: bookTypeMap.get(book.id) || 1,
          groups: bookGroupsMap.get(book.id) || [],
          // 字段名转换：将数据库字段名转换为API字段名
          pages: bookData.page_count || 0,
          standardPrice: bookData.standard_price || 0,
          purchasePrice: bookData.purchase_price || 0,
          purchaseDate: bookData.purchase_date,
          binding1: bookData.binding1 || 0,
          binding2: bookData.binding2 || 0,
          note: bookData.note || '',
          total_reading_time: bookData.total_reading_time || 0,
          read_pages: bookData.read_pages || 0,
          reading_count: bookData.reading_count || 0,
          last_read_date: bookData.last_read_date || null,
          last_read_duration: bookData.last_read_duration || 0,
          favorite: readingStateMap.get(book.id)?.favorite || 0,
          wants: readingStateMap.get(book.id)?.wants || 0,
          read_state: readingStateMap.get(book.id)?.read_state || 0
        };

        // 处理 JSON 字段
        try {
          enriched.tags = enriched.tags ? JSON.parse(enriched.tags) : [];
          enriched.formats = enriched.formats ? JSON.parse(enriched.formats) : [];
        } catch (e) {
          enriched.tags = [];
          enriched.formats = [];
        }

        return enriched;
      });
    } catch (error) {
      console.error('❌ 丰富书籍信息失败:', error.message);
      // 失败时返回基础数据
      return books.map(book => this.enrichBook(book, readerId));
    }
  }

  /**
   * 丰富单个书籍信息
   */
  enrichBook(book, readerId = 0) {
    // 提取出版年份
    let publishYear = null;
    if (book.pubdate) {
      // pubdate 可能是 ISO 日期格式或其他格式，提取年份部分
      const dateStr = String(book.pubdate);
      const yearMatch = dateStr.match(/\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0]);
      }
    }

    const enriched = {
      ...book,
      publishYear: publishYear, // 添加出版年份字段
      book_type: 1,
      groups: [],
      // 字段名转换：将数据库字段名转换为API字段名
      pages: book.page_count || 0,
      standardPrice: book.standard_price || 0,
      purchasePrice: book.purchase_price || 0,
      purchaseDate: book.purchase_date,
      binding1: book.binding1 || 0,
      binding2: book.binding2 || 0,
      note: book.note || '',
      total_reading_time: book.total_reading_time || 0,
      read_pages: book.read_pages || 0,
      reading_count: book.reading_count || 0,
      last_read_date: book.last_read_date || null,
      last_read_duration: book.last_read_duration || 0,
      favorite: 0,
      wants: 0,
      read_state: 0
    };

    // 处理 JSON 字段
    try {
      enriched.tags = enriched.tags ? JSON.parse(enriched.tags) : [];
      enriched.formats = enriched.formats ? JSON.parse(enriched.formats) : [];
    } catch (e) {
      enriched.tags = [];
      enriched.formats = [];
    }

    return enriched;
  }
}

export default BookRepository;
