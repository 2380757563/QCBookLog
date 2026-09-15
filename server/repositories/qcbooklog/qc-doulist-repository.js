/**
 * 豆列书单仓储（qc_doulist_books / qc_doulist_imports / qc_doulist_import_items）
 * 与现有 qc_bookdata 完全独立：主键为 douban_id（豆瓣 subject ID），去重不依赖书名/ISBN。
 */
import databaseService from '../../services/legacy/database-service.js';

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
  importBooks(books, { doulistId, doulistTitle = null, owner = null, ownerUrl = null, incrementalOnly = false }) {
    const db = this.ensureDb();
    let imported = 0;
    let duplicates = 0;

    const run = db.transaction(() => {
      // 批次表（断点续跑记录）
      db.prepare(`
        INSERT INTO qc_doulist_imports (doulist_id, doulist_title, owner, owner_url, status)
        VALUES (?, ?, ?, ?, 'done')
        ON CONFLICT(doulist_id) DO UPDATE SET
          doulist_title = COALESCE(excluded.doulist_title, doulist_title),
          owner = COALESCE(excluded.owner, owner),
          owner_url = COALESCE(excluded.owner_url, owner_url),
          status = 'done',
          last_start = 0,
          updated_at = CURRENT_TIMESTAMP
      `).run(String(doulistId), doulistTitle, owner, ownerUrl);

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
      INSERT INTO qc_doulist_imports (doulist_id, doulist_title, owner, owner_url, status, last_start, fetched_items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
   * 手动新增一本豆列书籍（不来自豆列抓取）
   * 书籍必须属于一个书单：doulistId 选已有书单，或 doulistTitle 新建本地书单（local_ 前缀 ID）
   * doubanRef 可选：填豆瓣链接或纯数字 ID 就复用豆瓣 subject ID 作为唯一键，
   * 不填则生成本地 ID（local_ 前缀），避免与豆瓣 subject ID 冲突
   * @returns {{ created: boolean, doubanId: string, doulistId: string }}
   */
  createBook({ title, author, publisher, publishYear, isbn13, doubanRef, doulistId, doulistTitle, category }) {
    const db = this.ensureDb();
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
      throw new Error('书名不能为空');
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
        INSERT INTO qc_doulist_imports (doulist_id, doulist_title, status, category)
        VALUES (?, ?, 'done', ?)
      `).run(targetDoulistId, newDoulistTitle || `书单 ${targetDoulistId}`, category === 'read' ? 'read' : 'buy');
    } else if (category === 'read' || category === 'buy') {
      db.prepare('UPDATE qc_doulist_imports SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE doulist_id = ?')
        .run(category, targetDoulistId);
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
   * 按 ISBN 检查本地书库（Calibre books 表）是否已有此书
   * 注意：books 表在 Calibre 数据库，不在 qc_booklog.db
   * @returns {{ exists: boolean, bookId?: number }}
   */
  isBookOnShelfByIsbn(isbn13, isbn10) {
    const calibreDb = databaseService.calibreDb;
    if (!calibreDb) return { exists: false };
    const isbns = [isbn13, isbn10].filter(Boolean);
    if (!isbns.length) return { exists: false };
    const row = calibreDb.prepare(
      'SELECT id FROM books WHERE isbn = ? OR isbn = ? LIMIT 1'
    ).get(String(isbn13 || ''), String(isbn10 || ''));
    return row ? { exists: true, bookId: row.id } : { exists: false };
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
   * 设置书单分类（buy 买书 / read 读书）
   */
  setDoulistCategory(doulistId, category) {
    if (!['buy', 'read'].includes(category)) {
      throw new Error('分类仅支持 buy / read');
    }
    const result = this.ensureDb().prepare(`
      UPDATE qc_doulist_imports SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE doulist_id = ?
    `).run(category, String(doulistId));
    if (result.changes === 0) {
      throw new Error('书单不存在');
    }
    return { ok: true };
  }

  /**
   * 分页列出豆列书籍（前端书单页）
   * 每本书带出其所属书单（doulist_id / doulist_title / category），默认按加入书单的时间倒序
   * @param {object} opts { doulistId, category, status, hideShelved, page, pageSize, keyword }
   */
  listBooks({ doulistId = null, category = null, status = null, hideShelved = false, page = 1, pageSize = 50, keyword = null } = {}) {
    const db = this.ensureDb();
    const where = [];
    const params = [];
    if (doulistId) {
      where.push('b.douban_id IN (SELECT douban_id FROM qc_doulist_import_items WHERE doulist_id = ?)');
      params.push(String(doulistId));
    }
    if (category) {
      where.push('m.category = ?');
      params.push(String(category));
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

    // 每本书取其最早加入的书单关联（书籍必须属于一个书单）
    const membershipJoin = `
      LEFT JOIN (
        SELECT it.douban_id, it.doulist_id, it.added_at,
               di.doulist_title, di.category,
               ROW_NUMBER() OVER (PARTITION BY it.douban_id ORDER BY it.id) AS rn
        FROM qc_doulist_import_items it
        LEFT JOIN qc_doulist_imports di ON di.doulist_id = it.doulist_id
      ) m ON m.douban_id = b.douban_id AND m.rn = 1`;

    const baseSql = `FROM qc_doulist_books b ${membershipJoin} ${whereSql}`;

    const total = db.prepare(
      `SELECT COUNT(*) AS c ${baseSql}`
    ).get(...params).c;

    const rows = db.prepare(`
      SELECT b.*, m.doulist_id, m.doulist_title, m.category, m.added_at AS list_added_at ${baseSql}
      ORDER BY COALESCE(m.added_at, substr(b.created_at, 1, 10)) DESC, b.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize);

    return { total, page, pageSize, data: rows };
  }

  /**
   * 导入记录列表（附每本书单前 4 张封面，供前端文件夹缩略图使用）
   */
  listImports() {
    return this.ensureDb().prepare(`
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
  }

}

export default new QcDoulistRepository();
