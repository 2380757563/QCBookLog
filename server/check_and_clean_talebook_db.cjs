/**
 * 检查并清理 talebook/calibre-webserver.db 中的重复功能表
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(70));
console.log('🧹 清理 talebook/calibre-webserver.db 重复功能表');
console.log('='.repeat(70));

const dbPath = path.join(process.cwd(), '../data/talebook/calibre-webserver.db');
console.log(`\n数据库路径: ${dbPath}\n`);

if (!fs.existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// 1. 获取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`📊 数据库中共有 ${tables.length} 个表:\n`);
tables.forEach(table => console.log(`  - ${table.name}`));

// 2. 识别重复功能表
console.log('\n' + '='.repeat(70));
console.log('🔍 识别重复功能表');
console.log('='.repeat(70));

const tableNames = tables.map(t => t.name);

// 定义重复功能表映射
const duplicateTables = {
  activity: ['activitys', 'qc_activitys', 'qc_activities'],
  bookmark: ['bookmarks', 'qc_bookmarks'],
  group: ['groups', 'qc_groups'],
  'item-group': ['item_groups', 'qc_item_groups', 'qc_book_groups'],
  'reading-record': ['reading_records', 'qc_reading_records'],
  'reading-stats': ['daily_reading_stats', 'qc_daily_reading_stats'],
  'bookmark-tag': ['bookmark_tags', 'qc_bookmark_tags']
};

const tablesToDelete = [];
const tablesToKeep = [];

console.log('\n重复功能表分析:\n');

for (const [func, tableList] of Object.entries(duplicateTables)) {
  const existing = tableList.filter(name => tableNames.includes(name));
  
  if (existing.length > 0) {
    const qcTables = existing.filter(name => name.startsWith('qc_'));
    const nonQcTables = existing.filter(name => !name.startsWith('qc_'));

    console.log(`\n${func.toUpperCase()}功能:`);
    console.log(`  存在的表: ${existing.join(', ')}`);
    console.log(`  qc_前缀表: ${qcTables.join(', ') || '无'}`);
    console.log(`  非qc_前缀表: ${nonQcTables.join(', ') || '无'}`);

    if (nonQcTables.length > 0) {
      console.log(`  ⚠️  需要删除: ${nonQcTables.join(', ')}`);
      tablesToDelete.push(...nonQcTables);
    }

    if (qcTables.length > 0) {
      tablesToKeep.push(...qcTables);
    }
  }
}

// 3. 删除重复表
if (tablesToDelete.length === 0) {
  console.log('\n\n✅ 没有发现需要删除的重复功能表');
  db.close();
  process.exit(0);
}

console.log('\n' + '='.repeat(70));
console.log('🗑️  开始删除重复表');
console.log('='.repeat(70));

// 创建备份目录
const backupDir = path.join(process.cwd(), '../data/talebook/backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 备份数据库
const backupPath = path.join(backupDir, 'calibre-webserver_before_cleanup.db');
const buffer = fs.readFileSync(dbPath);
fs.writeFileSync(backupPath, buffer);
console.log(`\n✅ 数据库已备份到: ${backupPath}`);

// 删除表
console.log('\n开始删除表...\n');

for (const tableName of tablesToDelete) {
  try {
    // 先检查表是否存在
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    
    if (tableExists) {
      // 获取记录数
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
      
      // 删除表
      db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      console.log(`✅ 已删除: ${tableName} (${rowCount} 条记录)`);
    } else {
      console.log(`⚠️  表不存在: ${tableName}`);
    }
  } catch (error) {
    console.log(`❌ 删除失败: ${tableName} - ${error.message}`);
  }
}

// 4. 验证清理结果
console.log('\n' + '='.repeat(70));
console.log('✅ 清理后验证');
console.log('='.repeat(70));

const finalTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`\n清理后数据库中共有 ${finalTables.length} 个表:\n`);
finalTables.forEach(table => console.log(`  - ${table.name}`));

// 5. 生成报告
console.log('\n' + '='.repeat(70));
console.log('📋 清理报告');
console.log('='.repeat(70));

console.log(`
✅ 已完成操作:
1. ✅ 备份数据库到: ${backupPath}
2. ✅ 删除 ${tablesToDelete.length} 个重复功能表
3. ✅ 保留 ${tablesToKeep.length} 个 qc_前缀表

🗑️  已删除的表:
${tablesToDelete.map(t => `   - ${t}`).join('\n')}

💾  保留的表:
${tablesToKeep.map(t => `   - ${t}`).join('\n')}

📊 数据库状态:
- 数据库文件: ${dbPath}
- 原始表数: ${tables.length}
- 清理后表数: ${finalTables.length}
- 删除表数: ${tablesToDelete.length}
`);

db.close();
console.log('\n' + '='.repeat(70));
console.log('✅ 数据库清理完成');
console.log('='.repeat(70));
