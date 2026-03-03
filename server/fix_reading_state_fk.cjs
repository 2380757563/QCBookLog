const Database = require('better-sqlite3');
const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('开始修复 reading_state 表的外键约束...');

try {
  // 备份现有数据
  const existingData = db.prepare('SELECT * FROM reading_state').all();
  console.log(`找到 ${existingData.length} 条现有记录`);

  // 删除旧表
  db.prepare('DROP TABLE IF EXISTS reading_state').run();
  console.log('旧表已删除');

  // 创建新表（不带外键约束）
  db.prepare(`
    CREATE TABLE reading_state (
      book_id INTEGER NOT NULL,
      reader_id INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      favorite_date DATETIME,
      wants INTEGER DEFAULT 0,
      wants_date DATETIME,
      read_state INTEGER NOT NULL DEFAULT 0,
      read_date DATETIME,
      online_read INTEGER DEFAULT 0,
      download INTEGER DEFAULT 0,
      PRIMARY KEY (book_id, reader_id)
    )
  `).run();
  console.log('新表已创建（无外键约束）');

  // 恢复数据
  if (existingData.length > 0) {
    const insert = db.prepare(`
      INSERT INTO reading_state (book_id, reader_id, favorite, favorite_date, wants, wants_date, read_state, read_date, online_read, download)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(
          row.book_id,
          row.reader_id,
          row.favorite,
          row.favorite_date,
          row.wants,
          row.wants_date,
          row.read_state,
          row.read_date,
          row.online_read,
          row.download
        );
      }
    });
    insertMany(existingData);
    console.log('数据已恢复');
  }

  console.log('✅ reading_state 表修复完成');
} catch (error) {
  console.error('❌ 修复失败:', error.message);
} finally {
  db.close();
}