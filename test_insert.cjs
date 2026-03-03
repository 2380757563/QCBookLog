const Database = require('better-sqlite3');
const path = require('path');

const qcBooklogPath = path.join(__dirname, 'data', 'qc_booklog.db');
const qcDb = new Database(qcBooklogPath);

console.log('\n=== qc_book_mapping 结构 ===');
const mappings = qcDb.prepare('SELECT * FROM qc_book_mapping').all();
mappings.forEach(m => console.log(`  ID: ${m.id}, library_uuid: ${m.library_uuid}, calibre_book_id: ${m.calibre_book_id}`));

console.log('\n=== qc_bookdata 结构 ===');
const bookdata = qcDb.prepare('SELECT * FROM qc_bookdata').all();
if (bookdata.length === 0) {
  console.log('  (空表)');
} else {
  bookdata.forEach(b => console.log(`  ID: ${b.id}, mapping_id: ${b.mapping_id}, book_id: ${b.book_id}`));
}

// 尝试手动插入测试数据
console.log('\n=== 测试插入 ===');
try {
  const testInsert = qcDb.prepare(`
    INSERT OR REPLACE INTO qc_bookdata (
      mapping_id, book_id, page_count, standard_price, purchase_price, 
      purchase_date, binding1, binding2, paper1, edge1, edge2, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = testInsert.run(1, 51, 300, 45.0, 38.5, '2024-01-15', 1, 2, 0, 0, 0, '测试');
  console.log('  插入成功:', result);
  
  // 验证
  const verify = qcDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(51);
  console.log('  验证:', verify);
} catch (e) {
  console.error('  插入失败:', e.message);
}

qcDb.close();
