/**
 * 测试qc_bookdata表的字段
 * 验证所有字段都能正确读写
 */

import Database from 'better-sqlite3';
import path from 'path';
import { readConfigSync } from './services/dataService.js';

console.log('🧪 测试 qc_bookdata 表字段...\n');

// 读取配置
const config = readConfigSync();
const talebookPath = config.talebookPath || path.join(process.cwd(), 'data/talebook/calibre-webserver.db');

console.log('📂 Talebook 数据库路径:', talebookPath);

try {
  // 连接数据库
  const db = new Database(talebookPath);
  console.log('✅ 数据库连接成功\n');

  // 获取一个实际存在的书籍ID
  const existingBook = db.prepare('SELECT book_id FROM items LIMIT 1').get();
  const testBookId = existingBook ? existingBook.book_id : 999999;
  console.log(`📖 使用书籍ID: ${testBookId}\n`);

  // 测试数据
  console.log('📝 测试1: 插入完整数据...');
  const insertData = {
    book_id: testBookId,
    page_count: 480,
    standard_price: 78.00,
    purchase_price: 65.50,
    purchase_date: '2025-01-07T10:30:00.000Z',
    binding1: 1,
    binding2: 0,
    note: '这是一本测试书籍的备注信息\n支持多行文本'
  };

  console.log('   插入数据:', JSON.stringify(insertData, null, 2));

  db.prepare(`
    INSERT OR REPLACE INTO qc_bookdata
    (book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    insertData.book_id,
    insertData.page_count,
    insertData.standard_price,
    insertData.purchase_price,
    insertData.purchase_date,
    insertData.binding1,
    insertData.binding2,
    insertData.note
  );
  console.log('✅ 插入成功\n');

  // 2. 测试读取数据
  console.log('📖 测试2: 读取数据...');
  const readData = db.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(testBookId);

  if (!readData) {
    console.error('❌ 读取失败：未找到数据');
    process.exit(1);
  }

  console.log('   读取的数据:', JSON.stringify(readData, null, 2));

  // 3. 验证所有字段
  console.log('\n🔍 测试3: 验证字段值...');
  const validations = [
    { field: 'page_count', expected: 480, actual: readData.page_count },
    { field: 'standard_price', expected: 78.00, actual: readData.standard_price },
    { field: 'purchase_price', expected: 65.50, actual: readData.purchase_price },
    { field: 'purchase_date', expected: '2025-01-07T10:30:00.000Z', actual: readData.purchase_date },
    { field: 'binding1', expected: 1, actual: readData.binding1 },
    { field: 'binding2', expected: 0, actual: readData.binding2 },
    { field: 'note', expected: insertData.note, actual: readData.note }
  ];

  let allValid = true;
  validations.forEach(v => {
    const valid = v.actual === v.expected;
    const status = valid ? '✅' : '❌';
    console.log(`   ${status} ${v.field}:`);
    console.log(`      预期: ${JSON.stringify(v.expected)}`);
    console.log(`      实际: ${JSON.stringify(v.actual)}`);
    if (!valid) allValid = false;
  });

  // 4. 测试更新数据
  console.log('\n📝 测试4: 更新数据...');
  const updateData = {
    page_count: 500,
    standard_price: 88.00,
    purchase_price: 75.00,
    binding1: 2,
    binding2: 1,
    note: '更新后的备注信息'
  };

  db.prepare(`
    UPDATE qc_bookdata
    SET page_count = ?, standard_price = ?, purchase_price = ?,
        binding1 = ?, binding2 = ?, note = ?
    WHERE book_id = ?
  `).run(
    updateData.page_count,
    updateData.standard_price,
    updateData.purchase_price,
    updateData.binding1,
    updateData.binding2,
    updateData.note,
    testBookId
  );
  console.log('✅ 更新成功');

  // 5. 验证更新后的数据
  console.log('\n📖 测试5: 验证更新后的数据...');
  const updatedData = db.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(testBookId);
  console.log('   更新后的数据:', JSON.stringify(updatedData, null, 2));

  console.log('\n🔍 验证更新结果:');
  const updateValidations = [
    { field: 'page_count', expected: 500, actual: updatedData.page_count },
    { field: 'standard_price', expected: 88.00, actual: updatedData.standard_price },
    { field: 'purchase_price', expected: 75.00, actual: updatedData.purchase_price },
    { field: 'binding1', expected: 2, actual: updatedData.binding1 },
    { field: 'binding2', expected: 1, actual: updatedData.binding2 },
    { field: 'note', expected: updateData.note, actual: updatedData.note }
  ];

  updateValidations.forEach(v => {
    const valid = v.actual === v.expected;
    const status = valid ? '✅' : '❌';
    console.log(`   ${status} ${v.field}: ${v.actual}`);
    if (!valid) allValid = false;
  });

  // 6. 清理测试数据
  console.log('\n🧹 清理测试数据...');
  db.prepare('DELETE FROM qc_bookdata WHERE book_id = ?').run(testBookId);
  console.log('✅ 测试数据已清理');

  // 7. 统计实际书籍数据
  console.log('\n📊 统计实际书籍数据...');
  const count = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
  console.log(`   qc_bookdata 表共有 ${count.count} 条记录`);

  // 检查有多少记录有完整的数据
  const completeRecords = db.prepare(`
    SELECT COUNT(*) as count FROM qc_bookdata
    WHERE page_count > 0
      AND standard_price > 0
      AND purchase_price >= 0
      AND binding1 IS NOT NULL
      AND binding2 IS NOT NULL
  `).get();
  console.log(`   其中 ${completeRecords.count} 条有完整的扩展数据`);

  // 检查缺少 purchase_price 的记录
  const missingPurchasePrice = db.prepare(`
    SELECT COUNT(*) as count FROM qc_bookdata
    WHERE purchase_price IS NULL OR purchase_price = 0
  `).get();
  if (missingPurchasePrice.count > 0) {
    console.log(`   ⚠️  ${missingPurchasePrice.count} 条记录缺少 purchase_price`);
  } else {
    console.log('   ✅ 所有记录都有 purchase_price');
  }

  // 检查缺少 note 的记录
  const missingNote = db.prepare(`
    SELECT COUNT(*) as count FROM qc_bookdata
    WHERE note IS NULL OR note = ''
  `).get();
  if (missingNote.count > 0) {
    console.log(`   ⚠️  ${missingNote.count} 条记录缺少 note`);
  } else {
    console.log('   ✅ 所有记录都有 note');
  }

  // 关闭数据库连接
  db.close();
  console.log('\n✅ 数据库连接已关闭');

  if (allValid) {
    console.log('\n🎉 所有测试通过！');
    console.log('✅ qc_bookdata 表的所有字段都能正确读写');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败，请检查上述错误');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}
