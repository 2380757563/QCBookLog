import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查 qc_bookmarks 表结构');
const bookmarkColumns = db.prepare("PRAGMA table_info(qc_bookmarks)").all();
console.log('📊 qc_bookmarks 表字段:');
bookmarkColumns.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

console.log('\n🔍 检查 qc_bookmarks 表数据');
const bookmarks = db.prepare('SELECT * FROM qc_bookmarks LIMIT 5').all();
console.log(`📊 共 ${bookmarks.length} 条记录`);
bookmarks.forEach((b, i) => {
  console.log(`\n书摘 ${i + 1}:`);
  console.log(`  ID: ${b.id}`);
  console.log(`  书籍ID: ${b.book_id}`);
  console.log(`  书名: ${b.book_title}`);
  console.log(`  作者: ${b.book_author}`);
  console.log(`  内容: ${b.content?.substring(0, 50)}...`);
  console.log(`  创建时间: ${b.created_at}`);
});

db.close();
console.log('\n✅ 检查完成');
