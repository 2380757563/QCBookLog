/**
 * 验证清理后的数据库状态
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');

console.log('='.repeat(70));
console.log('验证清理后的数据库状态');
console.log('='.repeat(70));
console.log(`数据库路径: ${dbPath}\n`);

try {
  const db = new Database(dbPath);

  // 获取所有表
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📊 数据库中的所有表:\n');
  allTables.forEach(t => console.log(`  - ${t.name}`));
  console.log(`\n共 ${allTables.length} 个表\n`);

  // 检查 activities 表是否已删除
  const hasActivities = allTables.some(t => t.name === 'activities');
  console.log('✅ activities 表状态:');
  if (hasActivities) {
    console.log('   ❌ activities 表仍然存在，删除失败');
  } else {
    console.log('   ✅ activities 表已成功删除');
  }

  // 检查重复表是否都已删除
  console.log('\n✅ 重复表检查:');
  const duplicateTables = {
    'bookmarks': { exists: allTables.some(t => t.name === 'bookmarks'), shouldExist: false },
    'groups': { exists: allTables.some(t => t.name === 'groups'), shouldExist: false },
    'item_groups': { exists: allTables.some(t => t.name === 'item_groups'), shouldExist: false },
    'qc_bookmarks': { exists: allTables.some(t => t.name === 'qc_bookmarks'), shouldExist: true },
    'qc_groups': { exists: allTables.some(t => t.name === 'qc_groups'), shouldExist: true },
    'qc_book_groups': { exists: allTables.some(t => t.name === 'qc_book_groups'), shouldExist: true }
  };

  let allClean = true;
  for (const [tableName, info] of Object.entries(duplicateTables)) {
    if (info.exists === info.shouldExist) {
      console.log(`   ✅ ${tableName}: ${info.exists ? '存在' : '不存在'} (符合预期)`);
    } else {
      console.log(`   ❌ ${tableName}: ${info.exists ? '存在' : '不存在'} (不符合预期)`);
      allClean = false;
    }
  }

  // 检查 items 表
  console.log('\n✅ items 表检查:');
  const hasItems = allTables.some(t => t.name === 'items');
  if (!hasItems) {
    console.log('   ❌ items 表不存在');
    allClean = false;
  } else {
    const itemsColumns = db.prepare('PRAGMA table_info(items)').all();
    console.log(`   ✅ items 表存在，共 ${itemsColumns.length} 个字段`);
    const unwantedFields = ['title', 'author', 'last_modified'];
    const hasUnwanted = itemsColumns.some(col => unwantedFields.includes(col.name));
    if (hasUnwanted) {
      console.log(`   ❌ items 表存在多余字段`);
      allClean = false;
    } else {
      console.log(`   ✅ items 表结构正确，无多余字段`);
    }
  }

  // 检查 qc_ 前缀表
  console.log('\n✅ qc_ 前缀表统计:');
  const qcTables = allTables.filter(t => t.name.startsWith('qc_'));
  console.log(`   共 ${qcTables.length} 个 qc_ 前缀表`);
  qcTables.forEach(t => console.log(`   - ${t.name}`));

  db.close();

  console.log('\n' + '='.repeat(70));
  if (allClean) {
    console.log('🎉 所有验证通过！数据库清理成功');
  } else {
    console.log('⚠️  部分验证未通过，请检查上述错误');
  }
  console.log('='.repeat(70));

  process.exit(allClean ? 0 : 1);
} catch (error) {
  console.error('❌ 验证失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
