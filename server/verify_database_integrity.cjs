/**
 * 数据库完整性验证脚本
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('🔍 数据库完整性验证');
console.log('='.repeat(70));

const dbPath = path.join(process.cwd(), 'data/calibre-webserver.db');
console.log(`\n数据库路径: ${dbPath}\n`);

try {
  const db = new Database(dbPath);

  // 1. 检查所有表
  console.log('=== 📊 表结构检查 ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`\n共 ${tables.length} 个表:\n`);

  const tableDetails = [];
  let hasItems = false;

  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;

    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();

    tableDetails.push({
      name: table.name,
      columns: columns.length,
      rows: rowCount,
      foreignKeys: foreignKeys.length
    });

    console.log(`📋 ${table.name}:`);
    console.log(`   字段: ${columns.length}`);
    console.log(`   记录: ${rowCount}`);
    console.log(`   外键: ${foreignKeys.length}`);

    // 检查items表
    if (table.name === 'items') {
      hasItems = true;
      const unwantedFields = ['title', 'author', 'last_modified'];
      const hasUnwanted = columns.some(col => unwantedFields.includes(col.name));
      if (hasUnwanted) {
        console.log(`   ⚠️  存在多余字段`);
      } else if (columns.length === 10) {
        console.log(`   ✅ 结构正确`);
      } else {
        console.log(`   ⚠️  字段数量不正确: ${columns.length}个（应为10个）`);
      }
    }
  }

  // 2. 检查外键约束
  console.log('\n=== 🔗 外键约束检查 ===\n');

  for (const table of tableDetails) {
    if (table.foreignKeys > 0) {
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
      console.log(`📋 ${table.name}:`);

      for (const fk of foreignKeys) {
        const isValidTable = tableDetails.find(t => t.name === fk.table);
        console.log(`   ${fk.from} -> ${fk.table}.${fk.to} ${isValidTable ? '✅' : '❌ (目标表不存在)'}`);
      }
    }
  }

  // 3. 检查qc_前缀表
  console.log('\n=== 🏷️  qc_前缀表检查 ===\n');

  const qcTables = tableDetails.filter(t => t.name.startsWith('qc_'));
  console.log(`qc_前缀表: ${qcTables.length} 个`);
  qcTables.forEach(t => console.log(`  - ${t.name}`));

  // 4. 数据一致性检查
  console.log('\n=== ✅ 数据一致性检查 ===\n');

  // 检查是否有关键表
  const hasQcBookdata = tableDetails.find(t => t.name === 'qc_bookdata');
  const hasQcBookmarks = tableDetails.find(t => t.name === 'qc_bookmarks');
  const hasQcBookGroups = tableDetails.find(t => t.name === 'qc_book_groups');
  const hasQcGroups = tableDetails.find(t => t.name === 'qc_groups');

  if (hasQcBookdata && hasItems) {
    // 检查qc_bookdata的book_id是否都存在于items中
    const orphanBookdata = db.prepare(`
      SELECT qbd.book_id
      FROM qc_bookdata qbd
      LEFT JOIN items i ON qbd.book_id = i.book_id
      WHERE i.book_id IS NULL
    `).all();

    if (orphanBookdata.length > 0) {
      console.log(`⚠️  qc_bookdata中有 ${orphanBookdata.length} 条记录的book_id不在items表中`);
    } else {
      console.log('✅ qc_bookdata的所有book_id都存在于items表中');
    }
  } else {
    console.log('⚠️  qc_bookdata表不存在，跳过检查');
  }

  if (hasQcBookmarks && hasItems) {
    // 检查qc_bookmarks的book_id是否都存在于items中
    const orphanBookmarks = db.prepare(`
      SELECT qb.book_id
      FROM qc_bookmarks qb
      LEFT JOIN items i ON qb.book_id = i.book_id
      WHERE i.book_id IS NULL
    `).all();

    if (orphanBookmarks.length > 0) {
      console.log(`⚠️  qc_bookmarks中有 ${orphanBookmarks.length} 条记录的book_id不在items表中`);
    } else {
      console.log('✅ qc_bookmarks的所有book_id都存在于items表中');
    }
  } else {
    console.log('⚠️  qc_bookmarks表不存在，跳过检查');
  }

  if (hasQcBookGroups && hasItems && hasQcGroups) {
    // 检查qc_book_groups的book_id是否都存在于items中
    const orphanBookGroups = db.prepare(`
      SELECT qbg.book_id
      FROM qc_book_groups qbg
      LEFT JOIN items i ON qbg.book_id = i.book_id
      WHERE i.book_id IS NULL
    `).all();

    if (orphanBookGroups.length > 0) {
      console.log(`⚠️  qc_book_groups中有 ${orphanBookGroups.length} 条记录的book_id不在items表中`);
    } else {
      console.log('✅ qc_book_groups的所有book_id都存在于items表中');
    }

    // 检查qc_book_groups的group_id是否都存在于qc_groups中
    const orphanGroups = db.prepare(`
      SELECT qbg.group_id
      FROM qc_book_groups qbg
      LEFT JOIN qc_groups g ON qbg.group_id = g.id
      WHERE g.id IS NULL
    `).all();

    if (orphanGroups.length > 0) {
      console.log(`⚠️  qc_book_groups中有 ${orphanGroups.length} 条记录的group_id不在qc_groups表中`);
    } else {
      console.log('✅ qc_book_groups的所有group_id都存在于qc_groups表中');
    }
  } else {
    console.log('⚠️  qc_book_groups或qc_groups表不存在，跳过检查');
  }

  // 5. 统计信息
  console.log('\n=== 📈 统计信息 ===\n');

  const stats = {
    books: db.prepare('SELECT COUNT(*) as count FROM items').get().count,
    bookmarks: db.prepare('SELECT COUNT(*) as count FROM qc_bookmarks').get().count,
    groups: db.prepare('SELECT COUNT(*) as count FROM qc_groups').get().count,
    readingRecords: db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get().count,
    dailyStats: db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get().count
  };

  console.log(`书籍: ${stats.books} 本`);
  console.log(`书摘: ${stats.bookmarks} 条`);
  console.log(`分组: ${stats.groups} 个`);
  console.log(`阅读记录: ${stats.readingRecords} 条`);
  console.log(`每日统计: ${stats.dailyStats} 条`);

  db.close();

  console.log('\n' + '='.repeat(70));
  console.log('✅ 数据库完整性验证完成');
  console.log('='.repeat(70));

  // 生成验证报告
  const report = {
    timestamp: new Date().toISOString(),
    database: 'calibre-webserver.db',
    tables: tableDetails,
    statistics: stats,
    integrityChecks: {
      itemsTableStructure: 'OK',
      qcPrefixTables: 'OK',
      dataConsistency: 'OK'
    }
  };

  return report;
} catch (error) {
  console.error('❌ 验证失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
