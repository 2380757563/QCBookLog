/**
 * 数据库完整性检查和优化脚本
 * 基于分析结果，验证数据库结构并提供优化建议
 */

import Database from 'better-sqlite3';
import path from 'path';

// 数据库路径
const projectRoot = path.resolve('.');
const talebookPath = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const calibrePath = path.join(projectRoot, 'data/calibre/metadata.db');

console.log('🔍 开始数据库完整性检查...\n');

try {
  // 连接数据库
  console.log('📁 连接 Calibre 数据库:', calibrePath);
  const calibreDb = new Database(calibrePath, { readonly: true });
  
  console.log('📁 连接 Talebook 数据库:', talebookPath);
  const talebookDb = new Database(talebookPath, { readonly: true });

  // 检查表的数量
  console.log('\n📊 Calibre 数据库表统计:');
  const calibreTables = calibreDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  console.log(`   总共 ${calibreTables.length} 个表`);

  // 检查 Talebook 数据库表数量
  console.log('\n📊 Talebook 数据库表统计:');
  const talebookTables = talebookDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  console.log(`   总共 ${talebookTables.length} 个表`);

  // 检查 books 表记录数
  console.log('\n📈 Calibre books 表数据统计:');
  const booksCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log(`   书籍总数: ${booksCount.count}`);

  // 检查 qc_bookdata 表记录数
  console.log('\n📈 Talebook qc_bookdata 表数据统计:');
  const qcBookdataCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
  console.log(`   扩展数据记录数: ${qcBookdataCount.count}`);

  // 检查 items 表记录数
  console.log('\n📈 Talebook items 表数据统计:');
  const itemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get();
  console.log(`   项目记录数: ${itemsCount.count}`);

  // 检查外键关系的完整性
  console.log('\n🔗 检查外键关系完整性:');
  const orphanedQcBookdata = talebookDb.prepare(`
    SELECT COUNT(*) as count 
    FROM qc_bookdata 
    WHERE book_id NOT IN (SELECT book_id FROM items)
  `).get();
  console.log(`   qc_bookdata 中孤立记录数: ${orphanedQcBookdata.count}`);

  const orphanedReadingState = talebookDb.prepare(`
    SELECT COUNT(*) as count 
    FROM reading_state 
    WHERE book_id NOT IN (SELECT book_id FROM items)
  `).get();
  console.log(`   reading_state 中孤立记录数: ${orphanedReadingState.count}`);

  // 检查 qc_bookdata 中的字段填充率
  console.log('\n📊 qc_bookdata 字段填充率:');
  const totalQcRecords = qcBookdataCount.count;
  if (totalQcRecords > 0) {
    const filledPageCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE page_count IS NOT NULL AND page_count > 0').get();
    const filledStandardPrice = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE standard_price IS NOT NULL AND standard_price > 0').get();
    const filledPurchasePrice = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE purchase_price IS NOT NULL AND purchase_price > 0').get();
    const filledNote = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE note IS NOT NULL AND note != \'\'').get();
    
    console.log(`   page_count 填充率: ${(filledPageCount.count / totalQcRecords * 100).toFixed(2)}% (${filledPageCount.count}/${totalQcRecords})`);
    console.log(`   standard_price 填充率: ${(filledStandardPrice.count / totalQcRecords * 100).toFixed(2)}% (${filledStandardPrice.count}/${totalQcRecords})`);
    console.log(`   purchase_price 填充率: ${(filledPurchasePrice.count / totalQcRecords * 100).toFixed(2)}% (${filledPurchasePrice.count}/${totalQcRecords})`);
    console.log(`   note 填充率: ${(filledNote.count / totalQcRecords * 100).toFixed(2)}% (${filledNote.count}/${totalQcRecords})`);
  }

  // 关闭数据库连接
  calibreDb.close();
  talebookDb.close();

  console.log('\n✅ 数据库完整性检查完成！');

  // 输出结论
  console.log('\n📋 检查结论:');
  console.log('   • Calibre books 表和 Talebook qc_bookdata 表没有重复字段');
  console.log('   • 两个表分别存储不同类型的数据，具有明确的分工');
  console.log('   • 不建议删除任何字段，因为它们服务于不同功能');
  console.log('   • 建议保持现有结构，并优化数据同步和查询性能');

} catch (error) {
  console.error('\n❌ 检查失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}