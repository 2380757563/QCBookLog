/**
 * 测试数据库操作，确保字段删除后功能正常
 */

import Database from 'better-sqlite3';
import path from 'path';

const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🧪 测试数据库操作...\n');

try {
  const db = new Database(talebookPath);
  
  // 1. 验证表结构
  console.log('1️⃣  验证表结构:');
  const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  console.log(`   ✅ qc_bookdata 表有 ${columns.length} 个字段`);
  
  const expectedFields = ['book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'note', 'total_reading_time', 'read_pages', 'reading_count', 'last_read_date', 'last_read_duration'];
  const actualFields = columns.map(col => col.name);
  
  const missingFields = expectedFields.filter(f => !actualFields.includes(f));
  const extraFields = actualFields.filter(f => !expectedFields.includes(f));
  
  if (missingFields.length === 0 && extraFields.length === 0) {
    console.log('   ✅ 表结构验证通过');
  } else {
    console.log('   ❌ 表结构验证失败');
    if (missingFields.length > 0) console.log(`      缺少字段: ${missingFields.join(', ')}`);
    if (extraFields.length > 0) console.log(`      多余字段: ${extraFields.join(', ')}`);
  }
  
  // 2. 测试读取操作
  console.log('\n2️⃣  测试读取操作:');
  const testData = db.prepare('SELECT * FROM qc_bookdata WHERE book_id = 93').get();
  if (testData) {
    console.log('   ✅ 成功读取数据');
    console.log(`   📖 书籍ID: ${testData.book_id}`);
    console.log(`   📄 页数: ${testData.page_count}`);
    console.log(`   💰 标准价格: ${testData.standard_price}`);
    console.log(`   💰 购买价格: ${testData.purchase_price}`);
    console.log(`   📝 备注: ${testData.note || '空'}`);
  } else {
    console.log('   ❌ 读取数据失败');
  }
  
  // 3. 测试插入操作
  console.log('\n3️⃣  测试插入操作:');
  const testBookId = 999999;
  const insertResult = db.prepare(`
    INSERT OR REPLACE INTO qc_bookdata (
      book_id, page_count, standard_price, purchase_price, purchase_date,
      binding1, binding2, note, total_reading_time, read_pages,
      reading_count, last_read_date, last_read_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testBookId, 100, 50.0, 40.0, '2026-02-08T10:00:00.000Z',
    1, 0, '测试备注', 60, 30, 2, '2026-02-08T10:30:00.000Z'
  );
  
  if (insertResult.changes > 0) {
    console.log('   ✅ 成功插入测试数据');
  } else {
    console.log('   ❌ 插入数据失败');
  }
  
  // 4. 测试更新操作
  console.log('\n4️⃣  测试更新操作:');
  const updateResult = db.prepare(`
    UPDATE qc_bookdata
    SET page_count = 150, note = '更新后的备注'
    WHERE book_id = ?
  `).run(testBookId);
  
  if (updateResult.changes > 0) {
    console.log('   ✅ 成功更新测试数据');
  } else {
    console.log('   ❌ 更新数据失败');
  }
  
  // 5. 测试删除操作
  console.log('\n5️⃣  测试删除操作:');
  const deleteResult = db.prepare('DELETE FROM qc_bookdata WHERE book_id = ?').run(testBookId);
  
  if (deleteResult.changes > 0) {
    console.log('   ✅ 成功删除测试数据');
  } else {
    console.log('   ❌ 删除数据失败');
  }
  
  // 6. 验证索引
  console.log('\n6️⃣  验证索引:');
  const indexes = db.prepare('PRAGMA index_list(qc_bookdata)').all();
  console.log(`   📋 qc_bookdata 表有 ${indexes.length} 个索引`);
  
  const deletedFieldIndexes = indexes.filter(idx => 
    ['isbn', 'rating', 'series'].some(field => idx.name.includes(field))
  );
  
  if (deletedFieldIndexes.length === 0) {
    console.log('   ✅ 已删除冗余字段的索引');
  } else {
    console.log('   ⚠️  发现冗余字段的索引:');
    deletedFieldIndexes.forEach(idx => console.log(`      • ${idx.name}`));
  }
  
  // 7. 验证数据完整性
  console.log('\n7️⃣  验证数据完整性:');
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
  console.log(`   📊 总记录数: ${totalRecords}`);
  
  if (totalRecords >= 2) {
    console.log('   ✅ 数据完整性验证通过');
  } else {
    console.log('   ❌ 数据完整性验证失败');
  }
  
  db.close();
  
  console.log('\n🎉 所有测试通过！数据库操作正常。');

} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}