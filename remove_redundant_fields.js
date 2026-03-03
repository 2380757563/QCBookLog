/**
 * 删除 qc_bookdata 表中的冗余字段
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🗑️  开始删除 qc_bookdata 表中的冗余字段...\n');

try {
  // 创建备份
  const backupDir = path.join(path.resolve('.'), 'data/talebook/backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `calibre-webserver_backup_${timestamp}.db`);
  
  console.log('📦 创建数据库备份...');
  fs.copyFileSync(talebookPath, backupPath);
  console.log(`✅ 备份已创建: ${backupPath}\n`);

  // 连接数据库
  const db = new Database(talebookPath);
  
  // 需要删除的字段
  const fieldsToDelete = ['isbn', 'rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'price', 'author'];
  
  console.log(`📋 将要删除 ${fieldsToDelete.length} 个冗余字段:`);
  fieldsToDelete.forEach(field => console.log(`   • ${field}`));
  console.log();

  // SQLite 不支持直接删除列，需要重建表
  console.log('🔄 开始重建表结构...');
  
  // 1. 获取现有数据
  const existingData = db.prepare('SELECT * FROM qc_bookdata').all();
  console.log(`✅ 已读取 ${existingData.length} 条记录\n`);

  // 2. 删除旧表
  db.prepare('DROP TABLE IF EXISTS qc_bookdata_old').run();
  db.prepare('ALTER TABLE qc_bookdata RENAME TO qc_bookdata_old').run();
  console.log('✅ 已重命名旧表为 qc_bookdata_old\n');

  // 3. 创建新表（不包含冗余字段）
  db.prepare(`
    CREATE TABLE "qc_bookdata" (
      "book_id" INTEGER,
      "page_count" INTEGER DEFAULT 0,
      "standard_price" REAL DEFAULT 0,
      "purchase_price" REAL DEFAULT 0,
      "purchase_date" TEXT,
      "binding1" INTEGER DEFAULT 0,
      "binding2" INTEGER DEFAULT 0,
      "note" TEXT,
      "total_reading_time" INTEGER DEFAULT 0,
      "read_pages" INTEGER DEFAULT 0,
      "reading_count" INTEGER DEFAULT 0,
      "last_read_date" DATE DEFAULT NULL,
      "last_read_duration" INTEGER DEFAULT 0,
      PRIMARY KEY ("book_id"),
      FOREIGN KEY ("book_id") REFERENCES "items" ("book_id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();
  console.log('✅ 已创建新表（不包含冗余字段）\n');

  // 4. 迁移数据
  console.log('🔄 迁移数据到新表...');
  const insert = db.prepare(`
    INSERT INTO qc_bookdata (
      book_id, page_count, standard_price, purchase_price, purchase_date,
      binding1, binding2, note, total_reading_time, read_pages,
      reading_count, last_read_date, last_read_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let migratedCount = 0;
  for (const row of existingData) {
    insert.run(
      row.book_id, row.page_count, row.standard_price, row.purchase_price, row.purchase_date,
      row.binding1, row.binding2, row.note, row.total_reading_time, row.read_pages,
      row.reading_count, row.last_read_date, row.last_read_duration
    );
    migratedCount++;
  }
  console.log(`✅ 已迁移 ${migratedCount} 条记录\n`);

  // 5. 删除旧表
  db.prepare('DROP TABLE qc_bookdata_old').run();
  console.log('✅ 已删除旧表\n');

  // 6. 验证新表结构
  const newColumns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  console.log('📋 新表结构验证:');
  console.log(`   总字段数: ${newColumns.length}\n`);
  newColumns.forEach(col => {
    console.log(`   • ${col.name.padEnd(20)} ${col.type.padEnd(15)} PK:${col.pk}`);
  });

  // 7. 验证数据完整性
  const newCount = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
  console.log(`\n📊 数据完整性验证:`);
  console.log(`   迁移前记录数: ${existingData.length}`);
  console.log(`   迁移后记录数: ${newCount}`);
  
  if (newCount === existingData.length) {
    console.log('   ✅ 数据完整性验证通过\n');
  } else {
    console.log('   ❌ 数据完整性验证失败！\n');
    throw new Error('数据迁移失败，记录数不匹配');
  }

  db.close();
  
  console.log('🎉 字段删除完成！');
  console.log(`\n📋 删除摘要:`);
  console.log(`   • 删除字段数: ${fieldsToDelete.length}`);
  console.log(`   • 保留字段数: ${newColumns.length}`);
  console.log(`   • 迁移记录数: ${migratedCount}`);
  console.log(`   • 备份文件: ${backupPath}`);

} catch (error) {
  console.error('\n❌ 删除字段失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}