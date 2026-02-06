import databaseService from './services/databaseService.js';

console.log('========================================');
console.log('阅读记录插入测试');
console.log('========================================\n');

// 1. 检查数据库连接
console.log('1️⃣ 数据库连接检查');
console.log('   calibreDb:', databaseService.calibreDb ? '✅ 已连接' : '❌ 未连接');
console.log('   talebookDb:', databaseService.talebookDb ? '✅ 已连接' : '❌ 未连接');
console.log('');

// 2. 检查表是否存在
if (databaseService.talebookDb) {
  console.log('2️⃣ Talebook 数据库表检查');
  try {
    const tables = databaseService.talebookDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('qc_reading_records', 'qc_bookdata', 'qc_daily_reading_stats')
    `).all();

    console.log('   qc_reading_records 表:', tables.find(t => t.name === 'qc_reading_records') ? '✅ 存在' : '❌ 不存在');
    console.log('   qc_bookdata 表:', tables.find(t => t.name === 'qc_bookdata') ? '✅ 存在' : '❌ 不存在');
    console.log('   qc_daily_reading_stats 表:', tables.find(t => t.name === 'qc_daily_reading_stats') ? '✅ 存在' : '❌ 不存在');
    console.log('');

    // 3. 检查 books 表（不应该存在）
    console.log('3️⃣ books 表检查（不应该存在）');
    const booksTable = databaseService.talebookDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='books'
    `).get();
    console.log('   books 表:', booksTable ? '⚠️  意外存在！' : '✅ 不存在（正确）');
    console.log('');

    // 4. 尝试插入测试阅读记录
    console.log('4️⃣ 插入测试阅读记录');
    const testRecord = {
      book_id: 1,
      reader_id: 0,
      start_time: new Date(Date.now() - 60000).toISOString(),
      end_time: new Date().toISOString(),
      duration: 1,
      start_page: 0,
      end_page: 10,
      pages_read: 10
    };

    console.log('   测试数据:', testRecord);

    const insert = databaseService.talebookDb.prepare(`
      INSERT INTO qc_reading_records (
        book_id, reader_id, start_time, end_time,
        duration, start_page, end_page, pages_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      testRecord.book_id,
      testRecord.reader_id,
      testRecord.start_time,
      testRecord.end_time,
      testRecord.duration,
      testRecord.start_page,
      testRecord.end_page,
      testRecord.pages_read
    );

    console.log('   ✅ 插入成功！记录ID:', result.lastInsertRowid);
    console.log('');

    // 5. 查询刚插入的记录
    console.log('5️⃣ 查询刚插入的记录');
    const insertedRecord = databaseService.talebookDb.prepare(`
      SELECT * FROM qc_reading_records WHERE id = ?
    `).get(result.lastInsertRowid);

    console.log('   查询结果:', insertedRecord);
    console.log('');

    console.log('========================================');
    console.log('✅ 测试通过！阅读记录功能正常');
    console.log('========================================');

  } catch (error) {
    console.error('   ❌ 测试失败:', error.message);
    console.error('   ❌ 错误堆栈:', error.stack);
  }
} else {
  console.log('❌ Talebook 数据库未连接，无法继续测试');
}

process.exit(0);
