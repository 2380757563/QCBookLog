const testAddDirect = async () => {
  console.log('========================================');
  console.log('📚 直接测试数据库添加');
  console.log('========================================\n');

  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3').default || require('better-sqlite3');
  const crypto = await import('crypto');
  
  const CALIBRE_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db';
  const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';
  
  const calibreDb = new Database(CALIBRE_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_PATH);
  
  calibreDb.pragma('journal_mode = WAL');
  qcBooklogDb.pragma('journal_mode = WAL');

  const testBook = {
    title: '直接测试_' + Date.now(),
    author: '测试作者',
    publisher: '测试出版社',
    isbn: '9999999999990'
  };

  console.log('步骤 1: 添加书籍到 Calibre');
  console.log('----------------------------------------');

  try {
    const now = new Date().toISOString();
    
    const insertBook = calibreDb.prepare(`
      INSERT INTO books (title, sort, timestamp, pubdate, uuid, has_cover, series_index, path, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertBook.run(
      testBook.title,
      testBook.title,
      now,
      null,
      crypto.randomUUID(),
      0,
      0,
      `${testBook.author}/${testBook.title}`,
      now
    );

    const bookId = result.lastInsertRowid;
    console.log(`✅ 书籍插入成功, ID: ${bookId}`);

    // 添加作者
    let author = calibreDb.prepare('SELECT id FROM authors WHERE name = ?').get(testBook.author);
    if (!author) {
      const authorResult = calibreDb.prepare('INSERT INTO authors (name, sort) VALUES (?, ?)').run(testBook.author, testBook.author);
      author = { id: authorResult.lastInsertRowid };
    }
    calibreDb.prepare('INSERT INTO books_authors_link (book, author) VALUES (?, ?)').run(bookId, author.id);
    console.log('✅ 作者添加成功');

    // 添加 ISBN
    calibreDb.prepare('INSERT INTO identifiers (book, type, val) VALUES (?, ?, ?)').run(bookId, 'isbn', testBook.isbn);
    console.log('✅ ISBN 添加成功');

    console.log('\n步骤 2: 添加映射到 QCBookLog');
    console.log('----------------------------------------');
    
    // 获取 library_uuid
    const libResult = calibreDb.prepare('SELECT uuid FROM library_id LIMIT 1').get();
    const libraryUuid = libResult ? libResult.uuid : '';
    console.log(`library_uuid: ${libraryUuid}`);
    
    // 添加映射
    const mappingResult = qcBooklogDb.prepare(`
      INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, talebook_book_id, title, author)
      VALUES (?, ?, ?, ?, ?)
    `).run(libraryUuid, bookId, bookId, testBook.title, testBook.author);
    console.log('✅ 映射添加成功, lastInsertRowid:', mappingResult.lastInsertRowid);
    
    // 获取映射 ID
    const mapping = qcBooklogDb.prepare(`
      SELECT id FROM qc_book_mapping WHERE library_uuid = ? AND calibre_book_id = ?
    `).get(libraryUuid, bookId);
    const mappingId = mapping ? mapping.id : null;
    console.log(`mapping_id: ${mappingId}`);
    
    // 添加扩展数据
    qcBooklogDb.prepare(`
      INSERT OR REPLACE INTO qc_bookdata (mapping_id, book_id, page_count)
      VALUES (?, ?, ?)
    `).run(mappingId, bookId, 0);
    console.log('✅ 扩展数据添加成功');

    console.log('\n步骤 3: 验证结果');
    console.log('----------------------------------------');
    
    const verifyMapping = qcBooklogDb.prepare(`
      SELECT * FROM qc_book_mapping WHERE calibre_book_id = ?
    `).get(bookId);
    console.log('映射验证:', verifyMapping ? '✅ 成功' : '❌ 失败');
    
    const verifyData = qcBooklogDb.prepare(`
      SELECT * FROM qc_bookdata WHERE book_id = ?
    `).get(bookId);
    console.log('扩展数据验证:', verifyData ? '✅ 成功' : '❌ 失败');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }

  calibreDb.close();
  qcBooklogDb.close();
};

testAddDirect();
