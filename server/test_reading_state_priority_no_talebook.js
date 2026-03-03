/**
 * 测试阅读状态获取优先级 - Talebook 无数据场景
 * 验证当 Talebook 数据库没有数据时，从 QCBookLog 数据库获取
 */

import databaseService from './services/database/index.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401';

console.log('🧪 测试阅读状态获取优先级 - Talebook 无数据场景\n');

async function testReadingStatePriorityNoTalebook() {
  try {
    // 初始化数据库服务
    console.log('📋 步骤 0: 初始化数据库服务');
    await databaseService.init();
    console.log('  ✅ 数据库服务初始化完成\n');

    // 步骤 1: 获取一本书进行测试
    console.log('📋 步骤 1: 获取测试书籍');
    const booksResponse = await axios.get(`${API_BASE_URL}/api/books`);
    const books = booksResponse.data;

    if (books.length === 0) {
      console.error('  ❌ 没有可用的书籍');
      return;
    }

    const testBook = books[0];
    console.log(`  ✅ 选择书籍: [${testBook.id}] ${testBook.title}\n`);

    const talebookDb = databaseService.connectionManager.getTalebookDb();
    const qcBooklogDb = databaseService.getQcBooklogDb();

    // 步骤 2: 备份 Talebook 数据库中的阅读状态
    console.log('📋 步骤 2: 备份 Talebook 数据库中的阅读状态');
    const originalTalebookState = talebookDb.prepare(`
      SELECT * FROM reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (originalTalebookState) {
      console.log('  ✅ 已备份 Talebook 数据');
      console.log(`    read_state: ${originalTalebookState.read_state}`);
      console.log(`    favorite: ${originalTalebookState.favorite}`);
    } else {
      console.log('  ⚠️ Talebook 数据库中没有记录，跳过测试');
      return;
    }
    console.log();

    // 步骤 3: 删除 Talebook 数据库中的阅读状态
    console.log('📋 步骤 3: 删除 Talebook 数据库中的阅读状态');
    talebookDb.prepare(`
      DELETE FROM reading_state WHERE book_id = ? AND reader_id = ?
    `).run(testBook.id, 0);
    console.log('  ✅ 已删除 Talebook 数据库中的记录\n');

    // 步骤 4: 检查 QCBookLog 数据库中的阅读状态
    console.log('📋 步骤 4: 检查 QCBookLog 数据库中的阅读状态');
    const qcState = qcBooklogDb.prepare(`
      SELECT * FROM qc_reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (qcState) {
      console.log('  ✅ QCBookLog 数据库中有记录');
      console.log(`    read_state: ${qcState.read_state}`);
      console.log(`    favorite: ${qcState.favorite}`);
      console.log(`    wants: ${qcState.wants}`);
    } else {
      console.log('  ⚠️ QCBookLog 数据库中没有记录');
    }
    console.log();

    // 步骤 5: 测试 getReadingState 方法
    console.log('📋 步骤 5: 测试 getReadingState 方法');
    const readingState = databaseService.getReadingState(testBook.id, 0);
    console.log('  ✅ getReadingState 返回结果:');
    console.log(`    read_state: ${readingState.read_state}`);
    console.log(`    favorite: ${readingState.favorite}`);
    console.log(`    wants: ${readingState.wants}`);

    // 验证优先级
    if (qcState) {
      console.log(`\n  📊 验证: Talebook 数据库无数据，QCBookLog 有数据，应该返回 QCBookLog 的数据`);
      if (readingState.read_state === qcState.read_state &&
          readingState.favorite === qcState.favorite &&
          readingState.wants === qcState.wants) {
        console.log('  ✅ 验证通过: 返回的是 QCBookLog 数据库的数据');
      } else {
        console.log('  ❌ 验证失败: 返回的不是 QCBookLog 数据库的数据');
        console.log(`     期望: read_state=${qcState.read_state}, favorite=${qcState.favorite}, wants=${qcState.wants}`);
        console.log(`     实际: read_state=${readingState.read_state}, favorite=${readingState.favorite}, wants=${readingState.wants}`);
      }
    } else {
      console.log(`\n  📊 验证: 两个数据库都没有数据，应该返回默认值`);
      if (readingState.read_state === 0 &&
          readingState.favorite === 0 &&
          readingState.wants === 0) {
        console.log('  ✅ 验证通过: 返回的是默认值');
      } else {
        console.log('  ❌ 验证失败: 返回的不是默认值');
      }
    }
    console.log();

    // 步骤 6: 测试通过 API 获取阅读状态
    console.log('📋 步骤 6: 测试通过 API 获取阅读状态');
    try {
      const apiResponse = await axios.get(`${API_BASE_URL}/api/books/${testBook.id}/reading-state?readerId=0`);
      const apiState = apiResponse.data;
      console.log('  ✅ API 返回结果:');
      console.log(`    read_state: ${apiState.read_state}`);
      console.log(`    favorite: ${apiState.favorite}`);
      console.log(`    wants: ${apiState.wants}`);

      // 验证 API 返回的数据与 getReadingState 一致
      if (apiState.read_state === readingState.read_state &&
          apiState.favorite === readingState.favorite &&
          apiState.wants === readingState.wants) {
        console.log('  ✅ 验证通过: API 返回的数据与 getReadingState 一致');
      } else {
        console.log('  ❌ 验证失败: API 返回的数据与 getReadingState 不一致');
      }
    } catch (apiError) {
      console.error('  ❌ API 调用失败:', apiError.response?.data || apiError.message);
    }
    console.log();

    // 步骤 7: 恢复 Talebook 数据库中的阅读状态
    console.log('📋 步骤 7: 恢复 Talebook 数据库中的阅读状态');
    talebookDb.prepare(`
      INSERT INTO reading_state (
        book_id, reader_id, favorite, wants, read_state,
        online_read, download, favorite_date, wants_date, read_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      originalTalebookState.book_id,
      originalTalebookState.reader_id,
      originalTalebookState.favorite,
      originalTalebookState.wants,
      originalTalebookState.read_state,
      originalTalebookState.online_read,
      originalTalebookState.download,
      originalTalebookState.favorite_date,
      originalTalebookState.wants_date,
      originalTalebookState.read_date
    );
    console.log('  ✅ 已恢复 Talebook 数据库中的记录\n');

    // 步骤 8: 再次验证恢复后的优先级
    console.log('📋 步骤 8: 再次验证恢复后的优先级');
    const restoredReadingState = databaseService.getReadingState(testBook.id, 0);
    console.log('  ✅ getReadingState 返回结果:');
    console.log(`    read_state: ${restoredReadingState.read_state}`);
    console.log(`    favorite: ${restoredReadingState.favorite}`);
    console.log(`    wants: ${restoredReadingState.wants}`);

    if (restoredReadingState.read_state === originalTalebookState.read_state &&
        restoredReadingState.favorite === originalTalebookState.favorite &&
        restoredReadingState.wants === originalTalebookState.wants) {
      console.log('  ✅ 验证通过: 恢复后返回的是 Talebook 数据库的数据');
    } else {
      console.log('  ❌ 验证失败: 恢复后返回的不是 Talebook 数据库的数据');
    }
    console.log();

    console.log('='.repeat(60));
    console.log('✅ 所有测试完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

testReadingStatePriorityNoTalebook();