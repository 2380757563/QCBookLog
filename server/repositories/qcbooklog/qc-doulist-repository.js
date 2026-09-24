/**
 * 豆列书单仓储（qc_doulist_books / qc_doulist_imports / qc_doulist_import_items）
 * 与现有 qc_bookdata 完全独立：主键为 douban_id（豆瓣 subject ID），去重不依赖书名/ISBN。
 */
import databaseService from '../../services/legacy/database-service.js';

/**
 * 归一化 ISBN：去掉连字符/空格等符号，统一大写（兼容 ISBN10 的 X 校验位）。
 * Calibre books.isbn 常带连字符（如 978-7-02-...），豆列为纯数字，直接等值匹配会漏判。
 */
function normalizeIsbn(v) {
  return String(v ?? '').toUpperCase().replace(/[^0-9X]/g, '');
}

// SQLite 表达式：对 books.isbn 做同样的归一化（去连字符/空格并大写），仅旧版 Calibre 使用
const ISBN_NORM_EXPR = "REPLACE(REPLACE(UPPER(COALESCE(isbn, '')), '-', ''), ' ', '')";

/**
 * 书名归一化：小写、去空白与所有标点/符号 —— 用于书名严格相等匹配
 */
function normalizeTitle(v) {
  return String(v ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

/**
 * 作者归一化：去掉括号内的国籍标记（如 [日] / (美) / （英国））、间隔符与空白，小写
 * 用于作者模糊匹配（归一化后互相包含即命中，如 "毛姆" vs "威廉·萨默塞特·毛姆"）
 */
function normalizePerson(v) {
  return String(v ?? '')
    .replace(/[（(【\[〔][^）)】\]〕]*[）)】\]〕]/g, '')
    .replace(/[\s·・.,，、;；:：\-—_/\\|]+/g, '')
    .toLowerCase();
}

/**
 * 出版社归一化：去掉「出版社」等字样、空白与标点，小写 —— 用于出版社模糊匹配
 */
function normalizePublisher(v) {
  return String(v ?? '')
    .replace(/出版社|出版公司|出版集团|出版传媒|出版中心|出版/g, '')
    .replace(/[\s·・.,，、;；:：\-—_/\\|()（）【】\[\]〔〕]+/g, '')
    .toLowerCase();
}

/**
 * 模糊匹配：归一化后互相包含即命中
 */
function fuzzyContains(a, b) {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

class QcDoulistRepository {
  constructor() {
    this.db = null;
  }

  ensureDb() {
    if (!this.db) {
      this.db = databaseService.getQcBooklogDb();
    }
    if (!this.db) {
      throw new Error('QCBookLog 数据库不可用');
    }
    return this.db;
  }

  /**
   * 按 douban_id 查找书籍
   */
  findByDoubanId(doubanId) {
    return this.ensureDb().prepare(
      'SELECT * FROM qc_doulist_books WHERE douban_id = ?'
    ).get(String(doubanId));
  }

  /**
   * upsert 书籍主表（douban_id 唯一键）
   * 已存在时仅更新非空字段，避免把补全过的数据覆盖为空
   */
  upsertBook(book) {
    const db = this.ensureDb();
    const existing = this.findByDoubanId(book.doubanId);
    const fields = {
      title: book.title ?? null,
      subtitle: book.subtitle ?? null,
      author: book.author ?? null,
      translator: book.translator ?? null,
      publisher: book.publisher ?? null,
      publish_year: book.publishYear ?? null,
      isbn13: book.isbn13 ?? null,
      isbn10: book.isbn10 ?? null,
      pages: book.pages ?? null,
      price: book.price ?? null,
      binding: book.binding ?? null,
      producer: book.producer ?? null,
      series: book.series ?? null,
      rating: book.rating ?? null,
      rating_count: book.ratingCount ?? null,
      tags: book.tags ?? null,
      summary: book.summary ?? null,
      cover_url: book.coverUrl ?? null,
      douban_url: book.url ?? `https://book.douban.com/subject/${book.doubanId}/`,
      enrich_status: book.enrichStatus ?? null
    };
    // 数组/对象参数需序列化（better-sqlite3 会把数组展开为多个绑定值）
    for (const k of ['tags', 'translator', 'producer', 'series']) {
      if (fields[k] !== null && typeof fields[k] === 'object') {
        fields[k] = JSON.stringify(fields[k]);
      }
    }

    if (existing) {
      // 合并：新值非空才覆盖
      const merged = { ...existing };
      for (const [k, v] of Object.entries(fields)) {
        if (v !== null && v !== undefined && v !== '') merged[k] = v;
      }
      db.prepare(`
        UPDATE qc_doulist_books SET
          title = ?, subtitle = ?, author = ?, translator = ?, publisher = ?,
          publish_year = ?, isbn13 = ?, isbn10 = ?, pages = ?, price = ?,
          binding = ?, producer = ?, series = ?, rating = ?, rating_count = ?,
          tags = ?, summary = ?, cover_url = ?, douban_url = ?,
          enrich_status = COALESCE(?, enrich_status),
          enriched_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE enriched_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE douban_id = ?
      `).run(
        merged.title, merged.subtitle, merged.author, merged.translator, merged.publisher,
        merged.publish_year, merged.isbn13, merged.isbn10, merged.pages, merged.price,
        merged.binding, merged.producer, merged.series, merged.rating, merged.rating_count,
        merged.tags, merged.summary, merged.cover_url, merged.douban_url,
        merged.enrich_status ?? null, merged.enrich_status ?? null,
        String(book.doubanId)
      );
      return { id: existing.id, created: false };
    }

    const result = db.prepare(`
      INSERT INTO qc_doulist_books (
        douban_id, title, subtitle, author, translator, publisher, publish_year,
        isbn13, isbn10, pages, price, binding, producer, series,
        rating, rating_count, tags, summary, cover_url, douban_url,
        enrich_status, enriched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(book.doubanId), fields.title, fields.subtitle, fields.author, fields.translator,
      fields.publisher, fields.publish_year, fields.isbn13, fields.isbn10, fields.pages,
      fields.price, fields.binding, fields.producer, fields.series, fields.rating,
      fields.rating_count, fields.tags, fields.summary, fields.cover_url, fields.douban_url,
      fields.enrich_status || 'none',
      fields.enrich_status ? new Date().toISOString() : null
    );
    return { id: Number(result.lastInsertRowid), created: true };
  }

  /**
   * 导入一批书籍（事务）：写主表 + 批次表 + 关联表
   * @param {object} opts { doulistId, doulistTitle, owner, ownerUrl, incrementalOnly }
   *   incrementalOnly=true 时为增量刷新：已在该书单里的书不做任何更改（不覆盖字段、不动书架状态）
   * @returns {{ imported: number, duplicates: number }}
   */
  importBooks(books, { doulistId, doulistTitle = null, owner = null, ownerUrl = null, isBuy = 1, isRead = 0, incrementalOnly = false }) {
    const db = this.ensureDb();
    let imported = 0;
    let duplicates = 0;

    const run = db.transaction(() => {
      // 批次表（断点续跑记录）；分类标志仅在首次建档时写入，增量刷新不覆盖
      db.prepare(`
        INSERT INTO qc_doulist_imports (doulist_id, doulist_title, owner, owner_url, status, is_buy, is_read)
        VALUES (?, ?, ?, ?, 'done', ?, ?)
        ON CONFLICT(doulist_id) DO UPDATE SET
          doulist_title = COALESCE(excluded.doulist_title, doulist_title),
          owner = COALESCE(excluded.owner, owner),
          owner_url = COALESCE(excluded.owner_url, owner_url),
          status = 'done',
          last_start = 0,
          updated_at = CURRENT_TIMESTAMP
      `).run(String(doulistId), doulistTitle, owner, ownerUrl, isBuy ? 1 : 0, isRead ? 1 : 0);

      for (const book of books) {
        if (!book || !book.doubanId) continue;

        const itemExists = db.prepare(
          'SELECT 1 FROM qc_doulist_import_items WHERE doulist_id = ? AND douban_id = ?'
        ).get(String(doulistId), String(book.doubanId));

        // 增量刷新：已在该书单里的书不做任何更改
        if (incrementalOnly && itemExists) {
          duplicates++;
          continue;
        }

        const { created } = this.upsertBook(book);

        const itemResult = db.prepare(`
          INSERT OR IGNORE INTO qc_doulist_import_items (doulist_id, douban_id, added_at, remark)
          VALUES (?, ?, ?, ?)
        `).run(String(doulistId), String(book.doubanId), book.addedAt ?? null, book.remark ?? null);

        if (created || itemResult.changes > 0) {
          imported++;
        } else {
          duplicates++;
        }
      }

      db.prepare(`
        UPDATE qc_doulist_imports SET
          fetched_items = (SELECT COUNT(*) FROM qc_doulist_import_items WHERE doulist_id = ?),
          updated_at = CURRENT_TIMESTAMP
        WHERE doulist_id = ?
      `).run(String(doulistId), String(doulistId));
    });

    run();
    return { imported, duplicates };
  }

  /**
   * 保存抓取进度（断点续跑）
   * 抓取期间前端每抓完一页调用一次：lastStart > 0 标记 status='running'；
   * lastStart = 0 表示抓取完成/放弃（status='done'），此时不再提供续传。
   */
  saveCrawlProgress({ doulistId, lastStart = 0, fetchedItems = 0, title = null, owner = null, ownerUrl = null }) {
    const db = this.ensureDb();
    const status = Number(lastStart) > 0 ? 'running' : 'done';
    db.prepare(`
      INSERT INTO qc_doulist_imports (doulist_id, doulist_title, owner, owner_url, status, last_start, fetched_items, is_buy, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
      ON CONFLICT(doulist_id) DO UPDATE SET
        doulist_title = COALESCE(excluded.doulist_title, doulist_title),
        owner = COALESCE(excluded.owner, owner),
        owner_url = COALESCE(excluded.owner_url, owner_url),
        status = excluded.status,
        last_start = excluded.last_start,
        fetched_items = CASE WHEN excluded.status = 'running' THEN excluded.fetched_items ELSE fetched_items END,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      String(doulistId),
      title || null,
      owner || null,
      ownerUrl || null,
      status,
      Number(lastStart) || 0,
      Number(fetchedItems) || 0
    );
    return { ok: true };
  }

  /**
   * 更新补全字段与状态
   * 注意：better-sqlite3 会把数组参数展开为多个绑定值，数组字段必须先序列化
   */
  saveEnriched(doubanId, fields) {
    const db = this.ensureDb();
    const toText = (v) => {
      if (v === null || v === undefined) return null;
      return Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : v;
    };
    db.prepare(`
      UPDATE qc_doulist_books SET
        isbn13 = COALESCE(?, isbn13),
        isbn10 = COALESCE(?, isbn10),
        pages = COALESCE(?, pages),
        price = COALESCE(?, price),
        binding = COALESCE(?, binding),
        producer = COALESCE(?, producer),
        series = COALESCE(?, series),
        subtitle = COALESCE(?, subtitle),
        translator = COALESCE(?, translator),
        publisher = COALESCE(?, publisher),
        publish_year = COALESCE(?, publish_year),
        tags = COALESCE(?, tags),
        summary = COALESCE(?, summary),
        enrich_status = ?,
        enriched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE douban_id = ?
    `).run(
      toText(fields.isbn13), toText(fields.isbn10), fields.pages ?? null, fields.price ?? null,
      toText(fields.binding), toText(fields.producer), toText(fields.series), toText(fields.subtitle),
      toText(fields.translator), toText(fields.publisher), toText(fields.publishYear),
      toText(fields.tags), toText(fields.summary),
      fields.enrichStatus || 'done',
      String(doubanId)
    );
  }

  /**
   * 创建一个空书单（不添加任何书籍）
   * @returns {{ ok: true, doulistId: string }}
   */
  createDoulist({ doulistTitle, isBuy, isRead }) {
    const db = this.ensureDb();
    const title = String(doulistTitle || '').trim();
    if (!title) {
      throw new Error('书单名称不能为空');
    }
    const buyFlag = isBuy === undefined ? 1 : (isBuy ? 1 : 0);
    const readFlag = isRead ? 1 : 0;
    if (!buyFlag && !readFlag) {
      throw new Error('购书清单与阅读清单至少需勾选一个');
    }
    const doulistId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`
      INSERT INTO qc_doulist_imports (doulist_id, doulist_title, status, is_buy, is_read)
      VALUES (?, ?, 'done', ?, ?)
    `).run(doulistId, title, buyFlag, readFlag);
    return { ok: true, doulistId };
  }

  /**
   * 手动新增一本豆列书籍（不来自豆列抓取）
   * 书籍必须属于一个书单：doulistId 选已有书单，或 doulistTitle 新建本地书单（local_ 前缀 ID）
   * doubanRef 可选：填豆瓣链接或纯数字 ID 就复用豆瓣 subject ID 作为唯一键，
   * 不填则生成本地 ID（local_ 前缀），避免与豆瓣 subject ID 冲突
   * @returns {{ created: boolean, doubanId: string, doulistId: string }}
   */
  createBook({ title, author, publisher, publishYear, isbn13, doubanRef, doulistId, doulistTitle, isBuy, isRead }) {
    const db = this.ensureDb();
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
      throw new Error('书名不能为空');
    }
    const buyFlag = isBuy === undefined ? 1 : (isBuy ? 1 : 0);
    const readFlag = isRead ? 1 : 0;
    if (!buyFlag && !readFlag) {
      throw new Error('购书清单与阅读清单至少需勾选一个');
    }

    // 书籍必须归属一个书单
    let targetDoulistId = doulistId ? String(doulistId).trim() : null;
    const newDoulistTitle = String(doulistTitle || '').trim();
    if (!targetDoulistId && !newDoulistTitle) {
      throw new Error('必须选择一个书单或填写新书单名称');
    }
    if (!targetDoulistId && newDoulistTitle) {
      targetDoulistId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    // 新建本地书单（或给不存在的 doulistId 建档）
    const doulistRow = db.prepare('SELECT doulist_id FROM qc_doulist_imports WHERE doulist_id = ?').get(targetDoulistId);
    if (!doulistRow) {
      db.prepare(`
        INSERT INTO qc_doulist_imports (doulist_id, doulist_title, status, is_buy, is_read)
        VALUES (?, ?, 'done', ?, ?)
      `).run(targetDoulistId, newDoulistTitle || `书单 ${targetDoulistId}`, buyFlag, readFlag);
    } else if (isBuy !== undefined || isRead !== undefined) {
      db.prepare('UPDATE qc_doulist_imports SET is_buy = ?, is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE doulist_id = ?')
        .run(buyFlag, readFlag, targetDoulistId);
    }

    // 从链接 / 纯数字中提取豆瓣 subject ID
    let doubanId = null;
    const ref = String(doubanRef || '').trim();
    if (ref) {
      const match = ref.match(/subject\/(\d+)/) || ref.match(/^(\d+)$/);
      if (!match) {
        throw new Error('豆瓣链接或 ID 格式不正确');
      }
      doubanId = match[1];
    } else {
      doubanId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    const existingBook = this.findByDoubanId(doubanId);
    if (existingBook) {
      // 书已存在：只补上书单归属
      const itemResult = db.prepare(`
        INSERT OR IGNORE INTO qc_doulist_import_items (doulist_id, douban_id)
        VALUES (?, ?)
      `).run(targetDoulistId, String(doubanId));
      return { created: itemResult.changes > 0, doubanId, doulistId: targetDoulistId };
    }

    db.prepare(`
      INSERT INTO qc_doulist_books (
        douban_id, title, author, publisher, publish_year, isbn13, douban_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      doubanId,
      cleanTitle,
      author || null,
      publisher || null,
      publishYear || null,
      isbn13 || null,
      doubanId.startsWith('local_') ? null : `https://book.douban.com/subject/${doubanId}/`
    );

    db.prepare(`
      INSERT INTO qc_doulist_import_items (doulist_id, douban_id)
      VALUES (?, ?)
    `).run(targetDoulistId, String(doubanId));

    return { created: true, doubanId, doulistId: targetDoulistId };
  }

  /**
   * 加入 / 撤回书架（加入书架后前端划线折叠展示）
   */
  setShelfStatus(doubanId, status) {
    if (!['pending', 'shelf'].includes(status)) {
      throw new Error('状态仅支持 pending / shelf');
    }
    const result = this.ensureDb().prepare(`
      UPDATE qc_doulist_books SET
        shelf_status = ?,
        shelved_at = CASE WHEN ? = 'shelf' THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE douban_id = ?
    `).run(status, status, String(doubanId));
    if (result.changes === 0) {
      throw new Error('书籍不存在');
    }
    return { ok: true };
  }

  /**
   * 构建"归一化 ISBN → calibre book id"映射（每次调用实时重建，书库量级下开销可忽略）
   * 注意：新版 Calibre（v5+）的 books 表没有 isbn 列，ISBN 存在 identifiers 表（type='isbn'）；
   *      旧版 Calibre 的 ISBN 在 books.isbn 列。两处都查，兼容两种版本。
   * @returns {Map<string, number>}
   */
  getCalibreIsbnMap() {
    const calibreDb = databaseService.calibreDb;
    const map = new Map();
    if (!calibreDb) return map;
    // 1) identifiers 表（新版 Calibre 的 ISBN 存储位置）
    try {
      const rows = calibreDb.prepare("SELECT book, val FROM identifiers WHERE LOWER(type) = 'isbn'").all();
      for (const r of rows) {
        const n = normalizeIsbn(r.val);
        if (n && !map.has(n)) map.set(n, r.book);
      }
    } catch { /* identifiers 表缺失时忽略 */ }
    // 2) books.isbn 列（旧版 Calibre）
    try {
      const hasIsbnCol = calibreDb.prepare('PRAGMA table_info(books)').all().some((c) => c.name === 'isbn');
      if (hasIsbnCol) {
        const rows = calibreDb.prepare(
          `SELECT id, ${ISBN_NORM_EXPR} AS nisbn FROM books WHERE isbn IS NOT NULL AND trim(isbn) != ''`
        ).all();
        for (const r of rows) {
          if (r.nisbn && !map.has(r.nisbn)) map.set(r.nisbn, r.id);
        }
      }
    } catch { /* 忽略 */ }
    return map;
  }

  /**
   * 构建书库匹配索引（每次调用实时重建；数百~千级书库开销可忽略，保证新增书籍立即可见）
   * - isbnMap : 归一化 ISBN → calibre book id（identifiers 表 + 旧版 books.isbn 列）
   * - byTitle : 归一化书名 → [{ id, authorN, pubN }]，配合作者/出版社模糊匹配兜底
   * @returns {{ isbnMap: Map<string, number>, byTitle: Map<string, Array> } | null}
   */
  getCalibreLibraryIndex() {
    const calibreDb = databaseService.calibreDb;
    if (!calibreDb) return null;
    const isbnMap = this.getCalibreIsbnMap();
    const byTitle = new Map();
    try {
      // 作者（多作者聚合）
      const authorsByBook = new Map();
      try {
        for (const r of calibreDb.prepare(
          'SELECT bal.book AS book, a.name AS author FROM books_authors_link bal JOIN authors a ON a.id = bal.author'
        ).all()) {
          if (!authorsByBook.has(r.book)) authorsByBook.set(r.book, []);
          authorsByBook.get(r.book).push(r.author);
        }
      } catch { /* 作者表缺失时忽略 */ }

      // 书名 + 出版社
      let books = [];
      try {
        books = calibreDb.prepare(`
          SELECT b.id, b.title, b.author_sort, p.name AS publisher
          FROM books b
          LEFT JOIN books_publishers_link bpl ON bpl.book = b.id
          LEFT JOIN publishers p ON p.id = bpl.publisher
        `).all();
      } catch { /* 出版社表缺失时忽略 */ }

      for (const b of books) {
        const tN = normalizeTitle(b.title);
        if (!tN) continue;
        const authors = (authorsByBook.get(b.id) || []).join(';');
        const authorN = normalizePerson(b.author_sort) || normalizePerson(authors);
        const pubN = normalizePublisher(b.publisher);
        if (!byTitle.has(tN)) byTitle.set(tN, []);
        byTitle.get(tN).push({ id: b.id, authorN, pubN });
      }
    } catch { /* 索引构建失败时退回仅 ISBN 匹配 */ }
    return { isbnMap, byTitle };
  }

  /**
   * 豆列书 → 书库书匹配：
   * 1) ISBN 归一化精确匹配（优先）
   * 2) 无 ISBN 或未命中时：书名严格相等 + 作者/出版社模糊匹配兜底
   *    （作者/出版社任一侧缺数据时跳过该项校验，避免误判）
   * @returns {number|null} calibre book id
   */
  matchLibraryBook(index, book) {
    if (!index) return null;
    const n13 = normalizeIsbn(book?.isbn13);
    const n10 = normalizeIsbn(book?.isbn10);
    if (n13 && index.isbnMap.has(n13)) return index.isbnMap.get(n13);
    if (n10 && index.isbnMap.has(n10)) return index.isbnMap.get(n10);

    const tN = normalizeTitle(book?.title);
    if (!tN) return null;
    const candidates = index.byTitle.get(tN);
    if (!candidates || !candidates.length) return null;
    const aN = normalizePerson(book?.author);
    const pN = normalizePublisher(book?.publisher);
    for (const c of candidates) {
      if (aN && c.authorN && !fuzzyContains(aN, c.authorN)) continue;
      if (pN && c.pubN && !fuzzyContains(pN, c.pubN)) continue;
      return c.id;
    }
    return null;
  }

  /**
   * 查询书库书籍的阅读状态（qc_book_mapping + qc_reading_state）
   * @returns {Map<number, string>} calibre_book_id → 中文状态
   */
  getReadStatusesByCalibreBookIds(bookIds) {
    const stateByBookId = new Map();
    if (!bookIds.length) return stateByBookId;
    try {
      const qcDb = this.ensureDb();
      const libraryUuid = databaseService.getCurrentLibraryUuid?.() || null;
      const idPh = bookIds.map(() => '?').join(',');
      const rows = libraryUuid
        ? qcDb.prepare(`
            SELECT m.calibre_book_id, rs.read_status
            FROM qc_book_mapping m
            LEFT JOIN qc_reading_state rs ON rs.mapping_id = m.id
            WHERE m.library_uuid = ? AND m.calibre_book_id IN (${idPh})
          `).all(libraryUuid, ...bookIds)
        : qcDb.prepare(`
            SELECT m.calibre_book_id, rs.read_status
            FROM qc_book_mapping m
            LEFT JOIN qc_reading_state rs ON rs.mapping_id = m.id
            WHERE m.calibre_book_id IN (${idPh})
          `).all(...bookIds);
      for (const r of rows) {
        stateByBookId.set(r.calibre_book_id, r.read_status || '未读');
      }
    } catch { /* 映射/状态缺失时按未读处理 */ }
    return stateByBookId;
  }

  /**
   * 判断单本豆列书是否已在书库（ISBN 精确优先，书名+作者+出版社兜底）
   * @returns {{ exists: boolean, bookId?: number, readStatus?: string }}
   */
  isBookInLibrary(book) {
    const index = this.getCalibreLibraryIndex();
    if (!index) return { exists: false };
    const bookId = this.matchLibraryBook(index, book);
    if (!bookId) return { exists: false };
    const readStatus = this.getReadStatusesByCalibreBookIds([bookId]).get(bookId) || '未读';
    return { exists: true, bookId, readStatus };
  }

  /**
   * 设置阅读状态（unread 未读 / reading 在读 / read 已读）
   */
  setReadStatus(doubanId, status) {
    if (!['unread', 'reading', 'read'].includes(status)) {
      throw new Error('阅读状态仅支持 unread / reading / read');
    }
    const result = this.ensureDb().prepare(`
      UPDATE qc_doulist_books SET read_status = ?, updated_at = CURRENT_TIMESTAMP WHERE douban_id = ?
    `).run(status, String(doubanId));
    if (result.changes === 0) {
      throw new Error('书籍不存在');
    }
    return { ok: true };
  }

  /**
   * 设置书单双分类标志（isBuy 购书清单 / isRead 阅读清单），至少勾选一个
   */
  setDoulistCategories(doulistId, isBuy, isRead) {
    const buyFlag = isBuy ? 1 : 0;
    const readFlag = isRead ? 1 : 0;
    if (!buyFlag && !readFlag) {
      throw new Error('购书清单与阅读清单至少需勾选一个');
    }
    const result = this.ensureDb().prepare(`
      UPDATE qc_doulist_imports SET is_buy = ?, is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE doulist_id = ?
    `).run(buyFlag, readFlag, String(doulistId));
    if (result.changes === 0) {
      throw new Error('书单不存在');
    }
    return { ok: true };
  }

  /**
   * 分页列出豆列书籍（前端书单页）
   * 每本书带出其所属书单（doulist_id / doulist_title / list_is_buy / list_is_read），默认按加入书单的时间倒序
   * 并批量附加书库状态：on_shelf / library_book_id / library_read_status（实时取自书库）
   * @param {object} opts { doulistId, category, status, hideShelved, page, pageSize, keyword, sortBy }
   */
  listBooks({ doulistId = null, category = null, status = null, hideShelved = false, page = 1, pageSize = 50, keyword = null, sortBy = null } = {}) {
    const db = this.ensureDb();
    const where = [];
    const params = [];
    if (doulistId) {
      where.push('b.douban_id IN (SELECT douban_id FROM qc_doulist_import_items WHERE doulist_id = ?)');
      params.push(String(doulistId));
    }
    if (category === 'buy') {
      where.push('m.is_buy = 1');
    } else if (category === 'read') {
      where.push('m.is_read = 1');
    }
    if (status) {
      where.push("COALESCE(b.shelf_status, 'pending') = ?");
      params.push(String(status));
    }
    if (hideShelved) {
      where.push("COALESCE(b.shelf_status, 'pending') != 'shelf'");
    }
    if (keyword) {
      where.push('(b.title LIKE ? OR b.author LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 排序：默认按加入书单时间倒序；支持评分/书名/作者
    const SORT_MAP = {
      rating: "CASE WHEN b.rating IS NULL THEN 1 ELSE 0 END ASC, b.rating DESC, b.id DESC",
      title: "b.title COLLATE NOCASE ASC, b.id DESC",
      author: "b.author COLLATE NOCASE ASC, b.id DESC"
    };
    const orderSql = SORT_MAP[String(sortBy)] || 'COALESCE(m.added_at, substr(b.created_at, 1, 10)) DESC, b.id DESC';

    // 每本书取其最早加入的书单关联（书籍必须属于一个书单）
    const membershipJoin = `
      LEFT JOIN (
        SELECT it.douban_id, it.doulist_id, it.added_at,
               di.doulist_title, di.is_buy, di.is_read,
               ROW_NUMBER() OVER (PARTITION BY it.douban_id ORDER BY it.id) AS rn
        FROM qc_doulist_import_items it
        LEFT JOIN qc_doulist_imports di ON di.doulist_id = it.doulist_id
      ) m ON m.douban_id = b.douban_id AND m.rn = 1`;

    const baseSql = `FROM qc_doulist_books b ${membershipJoin} ${whereSql}`;

    const total = db.prepare(
      `SELECT COUNT(*) AS c ${baseSql}`
    ).get(...params).c;

    const rows = db.prepare(`
      SELECT b.*, m.doulist_id, m.doulist_title, m.is_buy AS list_is_buy, m.is_read AS list_is_read, m.added_at AS list_added_at ${baseSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize);

    // 批量附加书库在架状态与阅读状态（避免前端逐本调 shelf-check）
    // 匹配策略：ISBN 归一化精确匹配优先；无 ISBN（或未命中）时
    // 书名严格相等 + 作者/出版社模糊匹配兜底（去国籍括号标记与"出版社"字样）
    const index = this.getCalibreLibraryIndex();
    const bookIdByRow = new Map();
    for (const r of rows) {
      bookIdByRow.set(r, index ? this.matchLibraryBook(index, r) : null);
    }
    const matchedBookIds = [...new Set([...bookIdByRow.values()].filter(Boolean))];
    const stateByBookId = this.getReadStatusesByCalibreBookIds(matchedBookIds);
    for (const r of rows) {
      const bookId = bookIdByRow.get(r) || null;
      r.on_shelf = bookId ? 1 : 0;
      r.library_book_id = bookId;
      r.library_read_status = bookId ? (stateByBookId.get(bookId) || '未读') : null;
    }

    return { total, page, pageSize, data: rows };
  }

  /**
   * 入库衔接点：把书单阅读状态一次性单向写入书库（书库此后为权威）
   * unread→未读/0  reading→在读/1  read→已读/2
   * @returns {{ ok: true, bookId: number, mappingId: number, readStatus: string }}
   */
  applyReadStatusToLibrary(doubanId) {
    const book = this.findByDoubanId(doubanId);
    if (!book) throw new Error('书籍不存在');

    const calibreDb = databaseService.calibreDb;
    if (!calibreDb) throw new Error('Calibre 数据库不可用');
    // 匹配策略与列表一致：ISBN 优先，书名+作者+出版社兜底
    const index = this.getCalibreLibraryIndex();
    const calibreBookId = this.matchLibraryBook(index, book);
    if (!calibreBookId) throw new Error('书库中未找到此书，请先加入书架');
    const calibreBook = { id: calibreBookId };

    const readStatus = { unread: '未读', reading: '在读', read: '已读' }[book.read_status] || '未读';
    const readState = { unread: 0, reading: 1, read: 2 }[book.read_status] ?? 0;

    const qcDb = this.ensureDb();
    const libraryUuid = databaseService.getCurrentLibraryUuid?.() || '';
    let mapping = qcDb.prepare(
      'SELECT id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?'
    ).get(libraryUuid, calibreBook.id);
    if (!mapping) {
      const result = qcDb.prepare(
        'INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id) VALUES (?, ?, ?)'
      ).run(libraryUuid, calibreBook.id, calibreBook.id);
      mapping = { id: Number(result.lastInsertRowid) };
    }

    const existing = qcDb.prepare('SELECT id FROM qc_reading_state WHERE mapping_id = ?').get(mapping.id);
    if (existing) {
      qcDb.prepare(`
        UPDATE qc_reading_state SET
          read_status = ?, read_state = ?, updated_at = CURRENT_TIMESTAMP
        WHERE mapping_id = ?
      `).run(readStatus, readState, mapping.id);
    } else {
      qcDb.prepare(`
        INSERT INTO qc_reading_state (mapping_id, user_id, read_status, read_state, sync_status, last_sync_time)
        VALUES (?, 0, ?, ?, 1, ?)
      `).run(mapping.id, readStatus, readState, new Date().toISOString());
    }

    return { ok: true, bookId: calibreBook.id, mappingId: mapping.id, readStatus };
  }

  /**
   * 导入记录列表（附每本书单前 4 张封面，供前端文件夹缩略图使用）
   * 并附加购书/阅读进度统计：buy_done/buy_total/read_done/read_total
   * 已购买 = 书籍可匹配到书库（on_shelf）；已阅读 = 书内已标记已读 或 书库阅读状态为已读
   */
  listImports() {
    const rows = this.ensureDb().prepare(`
      SELECT i.*,
        (
          SELECT COUNT(*) FROM qc_doulist_import_items it WHERE it.doulist_id = i.doulist_id
        ) AS item_count,
        (
          SELECT group_concat(t.cover_url, '|') FROM (
            SELECT b.cover_url AS cover_url
            FROM qc_doulist_import_items it
            JOIN qc_doulist_books b ON b.douban_id = it.douban_id
            WHERE it.doulist_id = i.doulist_id AND b.cover_url IS NOT NULL
            ORDER BY it.id
            LIMIT 4
          ) t
        ) AS covers
      FROM qc_doulist_imports i
      ORDER BY i.updated_at DESC
    `).all();
    this.attachImportStats(rows);
    return rows;
  }

  /**
   * 批量为书单记录附加购书/阅读进度统计（buy_done/buy_total/read_done/read_total）
   * 匹配策略与 listBooks 一致：calibre 索引 ISBN 精确优先、书名作者兜底；
   * 未勾选对应分类的书单统计字段为 0（前端只对勾选的分类渲染进度条）
   */
  attachImportStats(rows) {
    for (const r of rows) {
      r.buy_done = 0; r.buy_total = 0; r.read_done = 0; r.read_total = 0;
    }
    if (!rows.length) return;
    const db = this.ensureDb();
    const items = db.prepare(`
      SELECT it.doulist_id, it.douban_id, b.*
      FROM qc_doulist_import_items it
      JOIN qc_doulist_books b ON b.douban_id = it.douban_id
    `).all();
    if (!items.length) return;

    // 每本豆瓣书只匹配一次书库，避免跨书单重复匹配
    const index = this.getCalibreLibraryIndex();
    const calibreIdByDouban = new Map();
    for (const it of items) {
      if (!calibreIdByDouban.has(it.douban_id)) {
        calibreIdByDouban.set(it.douban_id, index ? this.matchLibraryBook(index, it) : null);
      }
    }
    const matchedIds = [...new Set([...calibreIdByDouban.values()].filter(Boolean))];
    const stateByBookId = this.getReadStatusesByCalibreBookIds(matchedIds);

    // 按书单聚合：总数 / 已购（匹配到书库）/ 已读（书内标记已读 或 书库已读）
    const perDoulist = new Map();
    for (const it of items) {
      const s = perDoulist.get(it.doulist_id) || { n: 0, bought: 0, read: 0 };
      s.n += 1;
      const calibreId = calibreIdByDouban.get(it.douban_id);
      if (calibreId) s.bought += 1;
      const libRead = stateByBookId.get(calibreId);
      if (it.read_status === 'read' || libRead === '已读') s.read += 1;
      perDoulist.set(it.doulist_id, s);
    }

    for (const r of rows) {
      const s = perDoulist.get(r.doulist_id);
      if (!s) continue;
      if (r.is_buy === 1) { r.buy_total = s.n; r.buy_done = s.bought; }
      if (r.is_read === 1) { r.read_total = s.n; r.read_done = s.read; }
    }
  }

}

export default new QcDoulistRepository();
