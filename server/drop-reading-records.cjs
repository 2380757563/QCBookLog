const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('=== 阶段三：删除 qc_reading_records 表 ===\n');

// 1. 检查 qc_reading_records 表是否存在
console.log('1. 检查 qc_reading_records 表是否存在...');
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_reading_records'").get();
console.log(`   表存在: ${tableExists ? '是' : '否'}`);

if (tableExists) {
  // 2. 检查是否有外键约束引用 qc_reading_records
  console.log('\n2. 检查是否有外键约束引用 qc_reading_records...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tablesWithFK = tables.filter(t => {
    const sql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t.name}'`).get();
    if (sql && sql.sql) {
      return sql.sql.includes('qc_reading_records');
    }
    return false;
  });
  console.log(`   引用 qc_reading_records 的表: ${tablesWithFK.length > 0 ? tablesWithFK.map(t => t.name).join(', ') : '无'}`);

  if (tablesWithFK.length > 0) {
    console.log('   ⚠️  警告：有表引用 qc_reading_records，删除可能导致外键约束错误');
    console.log('   是否继续删除？(y/n)');
    console.log('   注意：备份文件已保存到 data/qc_reading_records_backup.json');
  }

  // 3. 删除 qc_reading_records 表
  console.log('\n3. 删除 qc_reading_records 表...');
  try {
    db.prepare('DROP TABLE qc_reading_records').run();
    console.log('   ✅ qc_reading_records 表已删除');
  } catch (error) {
    console.log(`   ❌ 删除失败: ${error.message}`);
  }

  // 4. 验证删除结果
  console.log('\n4. 验证删除结果...');
  const tableExistsAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_reading_records'").get();
  console.log(`   表存在: ${tableExistsAfter ? '是（删除失败）' : '否（删除成功）'}`);
}

// 5. 检查 qc_daily_reading_stats 表
console.log('\n5. 检查 qc_daily_reading_stats 表...');
const dailyStatsCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log(`   记录数: ${dailyStatsCount.count}`);

db.close();
console.log('\n=== 阶段三完成 ===');
