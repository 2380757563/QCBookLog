/**
 * 诊断脚本：检查数据库中的书籍ID情况
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/book/metadata.db');

console.log('='.repeat(70));
console.log('数据库书籍ID诊断');
console.log('='.repeat(70));

try {
  const db = new Database(DB_PATH);
  
  // 检查所有书籍
  const books = db.prepare('SELECT id, title, isbn, author FROM books ORDER BY id').all();
  
  console.log('\n📚 数据库中共有 ' + books.length + ' 本书\n');
  console.log('ID    ISBN             标题');
  console.log('-'.repeat(70));
  
  for (const book of books) {
    const isbn = book.isbn || 'N/A';
    const id = String(book.id).padEnd(5, ' ');
    console.log(id + ' ' + isbn.padEnd(15, ' ') + ' ' + book.title);
  }
  
  // 检查是否有ID为20和21的书籍
  console.log('\n🔍 检查特定ID:');
  const book20 = db.prepare('SELECT * FROM books WHERE id = ?').get(20);
  const book21 = db.prepare('SELECT * FROM books WHERE id = ?').get(21);
  
  console.log('  ID=20: ' + (book20 ? '✅ 存在 - ' + book20.title : '❌ 不存在'));
  console.log('  ID=21: ' + (book21 ? '✅ 存在 - ' + book21.title : '❌ 不存在'));
  
  // 检查最大ID
  const maxId = db.prepare('SELECT MAX(id) as maxId FROM books').get();
  console.log('  最大ID: ' + (maxId.maxId || '无'));
  
  // 检查ID序列
  const nextId = db.prepare('SELECT seq FROM sqlite_sequence WHERE name = "books"').get();
  console.log('  下一个自增ID: ' + (nextId ? nextId.seq : '未知'));
  
  db.close();
  
  console.log('\n💡 分析结果:');
  if (!book21) {
    console.log('  ⚠️ ID=21 的书籍不存在，这说明该书籍已被删除');
    console.log('  📌 如果前端还尝试删除ID=21，说明前端缓存或状态有问题');
  }
  
  if (!book20) {
    console.log('  ⚠️ ID=20 的书籍不存在');
  } else {
    console.log('  ✅ ID=20 的书籍存在，但删除时返回500错误');
    console.log('  📌 这可能是数据库删除操作时的错误，需要检查服务器日志');
  }
  
} catch (error) {
  console.error('❌ 诊断失败:', error.message);
}
