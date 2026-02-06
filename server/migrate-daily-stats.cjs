const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('🔄 开始迁移: 重新设计 qc_daily_reading_stats 表...\n');

try {
  // 1. 备份现有数据
  console.log('📝 步骤1: 备份现有数据...');
  const existingData = db.prepare('SELECT * FROM qc_daily_reading_stats').all();
  console.log(`   备份了 ${existingData.length} 条记录`);

  // 2. 删除旧表
  console.log('\n📝 步骤2: 删除旧表...');
  db.prepare('DROP TABLE IF EXISTS qc_daily_reading_stats').run();
  console.log('   ✅ 旧表已删除');

  // 3. 创建新表（阅读会话表）
  console.log('\n📝 步骤3: 创建新表（阅读会话表）...');
  db.exec(`
    CREATE TABLE qc_daily_reading_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reader_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      session_start DATETIME NOT NULL,
      session_end DATETIME NOT NULL,
      duration_seconds INTEGER NOT NULL,
      start_page INTEGER DEFAULT 0,
      end_page INTEGER DEFAULT 0,
      pages_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_reader_date ON qc_daily_reading_stats(reader_id, DATE(session_start));
    CREATE INDEX idx_book_reader ON qc_daily_reading_stats(book_id, reader_id);
    CREATE INDEX idx_session_time ON qc_daily_reading_stats(session_start, session_end);
  `);
  console.log('   ✅ 新表创建成功');

  // 4. 从 qc_reading_records 迁移数据
  console.log('\n📝 步骤4: 从 qc_reading_records 迁移数据...');
  const readingRecords = db.prepare('SELECT * FROM qc_reading_records').all();
  console.log(`   找到 ${readingRecords.length} 条阅读记录`);

  if (readingRecords.length > 0) {
    const insert = db.prepare(`
      INSERT INTO qc_daily_reading_stats (
        reader_id, book_id, session_start, session_end,
        duration_seconds, start_page, end_page, pages_read
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        // 计算秒数
        const durationSeconds = row.duration * 60;
        insert.run(
          row.reader_id,
          row.book_id,
          row.start_time,
          row.end_time,
          durationSeconds,
          row.start_page,
          row.end_page,
          row.pages_read
        );
      }
    });

    insertMany(readingRecords);
    console.log(`   ✅ 迁移了 ${readingRecords.length} 条记录`);
  }

  // 5. 验证迁移结果
  console.log('\n📝 步骤5: 验证迁移结果...');
  const newCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
  console.log(`   新表记录数: ${newCount.count}`);

  const sampleData = db.prepare('SELECT * FROM qc_daily_reading_stats LIMIT 3').all();
  console.log('   前3条记录:');
  sampleData.forEach((row, index) => {
    console.log(`   ${index + 1}.`, {
      id: row.id,
      reader_id: row.reader_id,
      book_id: row.book_id,
      session_start: row.session_start,
      session_end: row.session_end,
      duration_seconds: row.duration_seconds,
      pages_read: row.pages_read
    });
  });

  // 6. 测试汇总查询
  console.log('\n📝 步骤6: 测试每日汇总查询...');
  const summaryQuery = `
    SELECT
      DATE(session_start) as date,
      COUNT(DISTINCT book_id) as total_books,
      SUM(pages_read) as total_pages,
      SUM(duration_seconds) / 60 as total_time,
      COUNT(*) as session_count
    FROM qc_daily_reading_stats
    WHERE reader_id = ?
    GROUP BY DATE(session_start)
    ORDER BY date DESC
    LIMIT 5
  `;
  const summary = db.prepare(summaryQuery).all(0);
  console.log('   读者ID=0 的每日汇总:');
  summary.forEach((row, index) => {
    console.log(`   ${index + 1}.`, {
      date: row.date,
      total_books: row.total_books,
      total_pages: row.total_pages,
      total_time: Math.round(row.total_time * 100) / 100,
      session_count: row.session_count
    });
  });

  console.log('\n🎉 迁移完成!');
  db.close();
  process.exit(0);

} catch (error) {
  console.error('\n❌ 迁移失败:', error);
  db.close();
  process.exit(1);
}
