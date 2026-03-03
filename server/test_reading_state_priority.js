/**
 * 测试阅读状态获取优先级
 * 验证优先从 Talebook 数据库获取，如果不存在则从 QCBookLog 数据库获取
 */

import databaseService from './services/database/index.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401';

console.log('🧪 测试阅读状态获取优先级\n');

async function testReadingStatePriority() {
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

    // 步骤 2: 检查 Talebook 数据库中的阅读状态
    console.log('📋 步骤 2: 检查 Talebook 数据库中的阅读状态');
    const talebookDb = databaseService.connectionManager.getTalebookDb();
    const talebookState = talebookDb.prepare(`
      SELECT * FROM reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (talebookState) {
      console.log('  ✅ Talebook 数据库中有记录');
      console.log(`    read_state: ${talebookState.read_state}`);
      console.log(`    favorite: ${talebookState.favorite}`);
      console.log(`    wants: ${talebookState.wants}`);
    } else {
      console.log('  ⚠️ Talebook 数据库中没有记录');
    }
    console.log();

    // 步骤 3: 检查 QCBookLog 数据库中的阅读状态
    console.log('📋 步骤 3: 检查 QCBookLog 数据库中的阅读状态');
    const qcBooklogDb = databaseService.getQcBooklogDb();
    const qcState = qcBooklogDb.prepare(`
      SELECT * FROM qc_reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (qcState) {
      console.log('  ✅ QCBookLog 数据库中有记录');
      console.log(`    read_state: ${qcState.read_state}`);
      console.log(`    favorite: ${qcState.favorite}`);
      console.log(`    wants: ${qcState.wants}`);
      console.log(`    current_page: ${qcState.current_page}`);
      console.log(`    total_pages: ${qcState.total_pages}`);
    } else {
      console.log('  ⚠️ QCBookLog 数据库中没有记录');
    }
    console.log();

    // 步骤 4: 测试 getReadingState 方法
    console.log('📋 步骤 4: 测试 getReadingState 方法');
    const readingState = databaseService.getReadingState(testBook.id, 0);
    console.log('  ✅ getReadingState 返回结果:');
    console.log(`    read_state: ${readingState.read_state}`);
    console.log(`    favorite: ${readingState.favorite}`);
    console.log(`    wants: ${readingState.wants}`);

    // 验证优先级
    if (talebookState) {
      console.log(`\n  📊 验证: Talebook 数据库有数据，应该返回 Talebook 的数据`);
      if (readingState.read_state === talebookState.read_state &&
          readingState.favorite === talebookState.favorite &&
          readingState.wants === talebookState.wants) {
        console.log('  ✅ 验证通过: 返回的是 Talebook 数据库的数据');
      } else {
        console.log('  ❌ 验证失败: 返回的不是 Talebook 数据库的数据');
      }
    } else if (qcState) {
      console.log(`\n  📊 验证: Talebook 数据库无数据，QCBookLog 有数据，应该返回 QCBookLog 的数据`);
      if (readingState.read_state === qcState.read_state &&
          readingState.favorite === qcState.favorite &&
          readingState.wants === qcState.wants) {
        console.log('  ✅ 验证通过: 返回的是 QCBookLog 数据库的数据');
      } else {
        console.log('  ❌ 验证失败: 返回的不是 QCBookLog 数据库的数据');
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

    // 步骤 5: 测试通过 API 获取阅读状态
    console.log('📋 步骤 5: 测试通过 API 获取阅读状态');
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

    // 步骤 6: 测试场景 - Talebook 数据库有数据，QCBookLog 数据库也有数据
    console.log('📋 步骤 6: 测试场景 - 两个数据库都有数据');
    if (talebookState && qcState) {
      console.log('  📊 当前状态:');
      console.log(`    Talebook read_state: ${talebookState.read_state}`);
      console.log(`    QCBookLog read_state: ${qcState.read_state}`);

      // 修改 QCBookLog 的数据，使其与 Talebook 不同
      const newReadState = talebookState.read_state === 1 ? 2 : 1;
      console.log(`\n  🔄 修改 QCBookLog 的 read_state 为 ${newReadState}`);
      qcBooklogDb.prepare(`
        UPDATE qc_reading_state SET read_state = ? WHERE book_id = ? AND reader_id = ?
      `).run(newReadState, testBook.id, 0);

      // 再次调用 getReadingState
      const newReadingState = databaseService.getReadingState(testBook.id, 0);
      console.log(`\n  📊 getReadingState 返回的 read_state: ${newReadingState.read_state}`);

      if (newReadingState.read_state === talebookState.read_state) {
        console.log('  ✅ 验证通过: 仍然返回 Talebook 数据库的数据（优先级正确）');
      } else {
        console.log('  ❌ 验证失败: 返回的不是 Talebook 数据库的数据');
      }

      // 恢复 QCBookLog 的数据
      qcBooklogDb.prepare(`
        UPDATE qc_reading_state SET read_state = ? WHERE book_id = ? AND reader_id = ?
      `).run(qcState.read_state, testBook.id, 0);
      console.log('  ✅ 已恢复 QCBookLog 的数据');
    } else {
      console.log('  ⚠️ 两个数据库不都有数据，跳过此测试');
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

testReadingStatePriority();