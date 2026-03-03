const Database = require('better-sqlite3');

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db';

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('📊 查询书籍ID 95的扩展数据:');
  const bookData = db.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(95);
  console.log('📚 书籍数据:', JSON.stringify(bookData, null, 2));
  
  console.log('\n📊 查询所有qc_bookdata表的数据:');
  const allData = db.prepare('SELECT * FROM qc_bookdata').all();
  console.log('📚 所有数据:', JSON.stringify(allData, null, 2));
  
  console.log('\n📊 查询qc_bookdata表结构:');
  const tableInfo = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  console.log('📋 表结构:', JSON.stringify(tableInfo, null, 2));
  
  db.close();
} catch (error) {
  console.error('❌ 查询失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}