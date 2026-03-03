const Database = require('better-sqlite3');

console.log('=== 检查 moni 数据库最新状态 ===');

const calibreDbPath = 'd:/下载/docs-xmnote-master/QC-booklog/moni/book/metadata.db';
const talebookDbPath = 'd:/下载/docs-xmnote-master/QC-booklog/moni/calibre-webserver.db';

console.log('\n--- Calibre 数据库 ---');
try {
  const calibreDb = new Database(calibreDbPath);
  
  const books = calibreDb.prepare('SELECT id, title, timestamp, has_cover FROM books ORDER BY id DESC LIMIT 5').all();
  console.log('最近书籍:', books);
  
  const count = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log('总书籍数:', count.count);
  
  calibreDb.close();
} catch (e) {
  console.error('Calibre 错误:', e.message);
}

console.log('\n--- Talebook 数据库 ---');
try {
  const talebookDb = new Database(talebookDbPath);
  
  const items = talebookDb.prepare('SELECT book_id, create_time FROM items ORDER BY book_id DESC LIMIT 5').all();
  console.log('最近 items:', items);
  
  talebookDb.close();
} catch (e) {
  console.error('Talebook 错误:', e.message);
}

console.log('\n--- 检查封面文件 ---');
const fs = require('fs');
const coverDir = 'd:/下载/docs-xmnote-master/QC-booklog/moni/book';
try {
  const dirs = fs.readdirSync(coverDir, { withFileTypes: true });
  const bookDirs = dirs.filter(d => d.isDirectory());
  console.log('书籍目录数:', bookDirs.length);
  
  // 检查最近的目录
  const recentDirs = bookDirs.slice(-5);
  recentDirs.forEach(d => {
    const dirPath = path.join(coverDir, d.name);
    const files = fs.readdirSync(dirPath);
    console.log(`  ${d.name}:`, files);
  });
} catch (e) {
  console.error('检查封面错误:', e.message);
}

const path = require('path');
