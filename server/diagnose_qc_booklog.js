import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fsSync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🔍 诊断 QCBookLog 数据库初始化问题...\n');

try {
  // 检查数据库文件是否存在
  console.log('📋 步骤 1: 检查数据库文件');
  const dbExists = fsSync.existsSync(QC_BOOKLOG_DB_PATH);
  console.log(`  数据库文件存在: ${dbExists}`);
  console.log(`  数据库路径: ${QC_BOOKLOG_DB_PATH}`);

  if (dbExists) {
    // 如果文件存在，检查表
    console.log('\n📋 步骤 2: 检查现有表');
    const db = new Database(QC_BOOKLOG_DB_PATH);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`  表数量: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('  ⚠️ 数据库文件存在但没有表');
      console.log('  💡 可能原因: 数据库文件被创建但表结构未初始化');
      console.log('  💡 解决方案: 删除数据库文件并重新启动应用');
    } else {
      console.log('  表列表:');
      tables.forEach(table => {
        console.log(`    - ${table.name}`);
      });
    }
    
    db.close();
  } else {
    console.log('\n  ℹ️ 数据库文件不存在');
    console.log('  💡 这意味着应用启动时会自动创建数据库和表结构');
  }

  console.log('\n✅ 诊断完成');

} catch (error) {
  console.error('❌ 诊断失败:', error.message);
  process.exit(1);
}