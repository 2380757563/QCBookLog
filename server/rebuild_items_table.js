/**
 * 重建 calibre-webserver.db 的 items 表，删除多余字段
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '../data/talebook/calibre-webserver.db');

console.log('🔄 开始重建 items 表...\n');

const db = new Database(dbPath);

// 开始事务
const rebuild = db.transaction(() => {
  console.log('📋 步骤 1: 创建新表 items_new...');
  db.exec(`
    CREATE TABLE items_new (
      book_id INTEGER NOT NULL PRIMARY KEY,
      count_guest INTEGER NOT NULL DEFAULT 0,
      count_visit INTEGER NOT NULL DEFAULT 0,
      count_download INTEGER NOT NULL DEFAULT 0,
      website VARCHAR(255) NOT NULL DEFAULT '',
      collector_id INTEGER DEFAULT 0,
      sole BOOLEAN NOT NULL DEFAULT 0,
      book_type INTEGER NOT NULL DEFAULT 1,
      book_count INTEGER NOT NULL DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('📋 步骤 2: 复制数据到新表...');
  const copyResult = db.prepare(`
    INSERT INTO items_new (
      book_id, count_guest, count_visit, count_download,
      website, collector_id, sole, book_type, book_count, create_time
    )
    SELECT 
      book_id, count_guest, count_visit, count_download,
      website, collector_id, sole, book_type, book_count, create_time
    FROM items
  `).run();
  
  console.log(`✅ 复制了 ${copyResult.changes} 条记录`);

  console.log('📋 步骤 3: 删除旧表 items...');
  db.exec('DROP TABLE items');

  console.log('📋 步骤 4: 重命名新表为 items...');
  db.exec('ALTER TABLE items_new RENAME TO items');

  console.log('✅ items 表重建完成');
});

rebuild();

db.close();

console.log('\n✅ 数据库更新完成！');
console.log('📊 新的 items 表结构:');
const newDb = new Database(dbPath, { readonly: true });
const columns = newDb.prepare('PRAGMA table_info(items)').all();
columns.forEach(col => {
  console.log(`  ${col.name.padEnd(20)} ${col.type.padEnd(15)} PK: ${col.pk} NOTNULL: ${col.notnull}`);
});
newDb.close();
