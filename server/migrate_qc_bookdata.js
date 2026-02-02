/**
 * qc_bookdata表迁移脚本
 * 添加缺失的 purchase_price 和 note 列
 */

import Database from 'better-sqlite3';
import path from 'path';
import { readConfigSync } from './services/dataService.js';

console.log('🔄 开始迁移 qc_bookdata 表...\n');

// 读取配置
const config = readConfigSync();
const talebookPath = config.talebookPath || path.join(process.cwd(), '../data/talebook.db');

console.log('📂 Talebook 数据库路径:', talebookPath);

try {
  // 连接数据库
  const db = new Database(talebookPath);
  console.log('✅ 数据库连接成功\n');

  // 获取现有列
  const columns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const columnNames = columns.map(c => c.name);

  console.log('📋 当前列:', columnNames.join(', '));
  console.log('');

  // 检查并添加 purchase_price 列
  if (!columnNames.includes('purchase_price')) {
    console.log('➕ 添加 purchase_price 列...');
    db.prepare('ALTER TABLE qc_bookdata ADD COLUMN purchase_price REAL DEFAULT 0').run();
    console.log('✅ purchase_price 列添加成功');
  } else {
    console.log('✅ purchase_price 列已存在');
  }

  // 检查并添加 note 列
  if (!columnNames.includes('note')) {
    console.log('➕ 添加 note 列...');
    db.prepare('ALTER TABLE qc_bookdata ADD COLUMN note TEXT').run();
    console.log('✅ note 列添加成功');
  } else {
    console.log('✅ note 列已存在');
  }

  console.log('');

  // 验证表结构
  const finalColumns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  console.log('📋 迁移后的表结构:');
  finalColumns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });

  // 统计数据
  const count = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
  console.log(`\n📊 qc_bookdata 表中有 ${count.count} 条记录`);

  // 检查是否有数据没有 purchase_price
  const missingPrice = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE purchase_price IS NULL OR purchase_price = 0').get();
  if (missingPrice.count > 0) {
    console.log(`⚠️  有 ${missingPrice.count} 条记录的 purchase_price 为空或0`);
    console.log('   如果需要，可以使用 standard_price 更新 purchase_price:');
    console.log(`   UPDATE qc_bookdata SET purchase_price = standard_price WHERE purchase_price = 0;`);
  } else {
    console.log('✅ 所有记录都有 purchase_price 值');
  }

  // 检查是否有数据没有 note
  const missingNote = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE note IS NULL OR note = \'\'').get();
  if (missingNote.count > 0) {
    console.log(`⚠️  有 ${missingNote.count} 条记录的 note 为空`);
  } else {
    console.log('✅ 所有记录都有 note 值');
  }

  // 关闭数据库连接
  db.close();
  console.log('\n✅ 数据库连接已关闭');
  console.log('\n🎉 迁移完成！');
} catch (error) {
  console.error('\n❌ 迁移失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}
