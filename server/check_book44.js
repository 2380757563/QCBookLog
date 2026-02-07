import Database from 'better-sqlite3';

const db = new Database('data/calibre/metadata.db');

// 检查books表中是否有书籍
const books = db.prepare('SELECT id, title FROM books LIMIT 5').all();
console.log('Calibre数据库中的书籍:');
books.forEach(b => console.log(`  - ID: ${b.id}, 标题: ${b.title}`));

// 检查是否有书籍格式相关的表
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\n所有表:');
allTables.forEach(t => console.log(`  - ${t.name}`));

// 尝试查询书籍44
const book44 = db.prepare('SELECT * FROM books WHERE id = 44').get();
console.log('\n书籍44:', book44);

db.close();
