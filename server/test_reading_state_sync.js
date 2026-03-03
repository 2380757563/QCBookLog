/**
 * 测试阅读状态同步机制
 * 测试 QCBookLog 和 Talebook 数据库之间的数据同步
 */

import databaseService from './services/database/index.js';
import readingStateSyncService from './services/readingStateSyncService.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401';

console.log('🧪 测试阅读状态同步机制\n');

async function testSyncMechanism() {
  try {
    // 初始化数据库服务
    console.log('📋 步骤 0: 初始化数据库服务');
    await databaseService.init();
    console.log('  ✅ 数据库服务初始化完成\n');

    // 步骤 1: 检查数据库连接
    console.log('📋 步骤 1: 检查数据库连接');
    const qcBooklogAvailable = databaseService.isQcBooklogAvailable();
    const talebookAvailable = databaseService.isTalebookAvailable();
    console.log(`  QCBookLog 数据库: ${qcBooklogAvailable ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`  Talebook 数据库: ${talebookAvailable ? '✅ 可用' : '❌ 不可用'}`);

    if (!qcBooklogAvailable) {
      console.error('❌ QCBookLog 数据库不可用，测试终止');
      return;
    }

    // 步骤 2: 检查 qc_reading_state 表是否存在
    console.log('\n📋 步骤 2: 检查 qc_reading_state 表');
    const qcBooklogDb = databaseService.getQcBooklogDb();
    const tableExists = qcBooklogDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='qc_reading_state'
    `).get();

    if (tableExists) {
      console.log('  ✅ qc_reading_state 表存在');

      // 检查表结构
      const columns = qcBooklogDb.prepare(`PRAGMA table_info(qc_reading_state)`).all();
      console.log(`  📊 表包含 ${columns.length} 个字段:`);
      columns.forEach(col => {
        console.log(`    - ${col.name} (${col.type})`);
      });
    } else {
      console.error('  ❌ qc_reading_state 表不存在');
      return;
    }

    // 步骤 3: 获取一本书进行测试
    console.log('\n📋 步骤 3: 获取测试书籍');
    const booksResponse = await axios.get(`${API_BASE_URL}/api/books`);
    const books = booksResponse.data;

    if (books.length === 0) {
      console.error('  ❌ 没有可用的书籍');
      return;
    }

    const testBook = books[0];
    console.log(`  ✅ 选择书籍: [${testBook.id}] ${testBook.title}`);

    // 步骤 4: 测试更新阅读状态
    console.log('\n📋 步骤 4: 测试更新阅读状态');
    const readingStateData = {
      read_state: 1, // 在读
      favorite: 1,   // 收藏
      wants: 0,
      current_page: 10,
      total_pages: 100,
      current_chapter: 1,
      notes: '这是一本好书',
      rating: 5
    };

    try {
      const updateResponse = await axios.put(`${API_BASE_URL}/api/books/${testBook.id}/reading-state?readerId=0`, readingStateData);
      console.log('  ✅ 阅读状态更新成功');
      console.log(`    read_state: ${updateResponse.data.read_state}`);
      console.log(`    favorite: ${updateResponse.data.favorite}`);
      console.log(`    current_page: ${updateResponse.data.current_page}`);
      console.log(`    total_pages: ${updateResponse.data.total_pages}`);
      console.log(`    progress_percent: ${updateResponse.data.progress_percent}%`);
      console.log(`    sync_status: ${updateResponse.data.sync_status} (0=未同步, 1=已同步, 2=同步中, 3=同步失败)`);
    } catch (updateError) {
      console.error('  ❌ 更新阅读状态失败:', updateError.response?.data || updateError.message);
      return;
    }

    // 步骤 5: 检查 QCBookLog 数据库中的数据
    console.log('\n📋 步骤 5: 检查 QCBookLog 数据库中的数据');
    const qcState = qcBooklogDb.prepare(`
      SELECT * FROM qc_reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (qcState) {
      console.log('  ✅ QCBookLog 数据库中有记录');
      console.log(`    read_state: ${qcState.read_state}`);
      console.log(`    favorite: ${qcState.favorite}`);
      console.log(`    current_page: ${qcState.current_page}`);
      console.log(`    total_pages: ${qcState.total_pages}`);
      console.log(`    progress_percent: ${qcState.progress_percent}%`);
      console.log(`    sync_status: ${qcState.sync_status}`);
      console.log(`    last_sync_time: ${qcState.last_sync_time}`);
    } else {
      console.error('  ❌ QCBookLog 数据库中没有记录');
      return;
    }

    // 步骤 6: 检查 Talebook 数据库中的数据
    console.log('\n📋 步骤 6: 检查 Talebook 数据库中的数据');
    if (talebookAvailable) {
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
        console.log(`    favorite_date: ${talebookState.favorite_date}`);
        console.log(`    read_date: ${talebookState.read_date}`);
      } else {
        console.error('  ❌ Talebook 数据库中没有记录');
      }
    } else {
      console.log('  ⚠️ Talebook 数据库不可用，跳过检查');
    }

    // 步骤 7: 测试同步 API
    console.log('\n📋 步骤 7: 测试同步 API');
    try {
      const syncResponse = await axios.post(`${API_BASE_URL}/api/reading-state-sync/book/${testBook.id}`, {
        readerId: 0,
        direction: 'toTalebook'
      });
      console.log('  ✅ 同步 API 调用成功');
      console.log(`    ${syncResponse.data.data.message || '同步完成'}`);
    } catch (syncError) {
      console.error('  ❌ 同步 API 调用失败:', syncError.response?.data || syncError.message);
    }

    // 步骤 8: 再次检查同步状态
    console.log('\n📋 步骤 8: 检查同步后的状态');
    const qcStateAfterSync = qcBooklogDb.prepare(`
      SELECT * FROM qc_reading_state
      WHERE book_id = ? AND reader_id = ?
    `).get(testBook.id, 0);

    if (qcStateAfterSync) {
      console.log('  ✅ QCBookLog 数据库记录已更新');
      console.log(`    sync_status: ${qcStateAfterSync.sync_status}`);
      console.log(`    last_sync_time: ${qcStateAfterSync.last_sync_time}`);
      console.log(`    sync_error: ${qcStateAfterSync.sync_error || '无'}`);
    }

    // 步骤 9: 测试获取同步状态
    console.log('\n📋 步骤 9: 获取同步统计信息');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/api/reading-state-sync/status`);
      const stats = statsResponse.data.data;
      console.log('  ✅ 获取同步统计成功');
      console.log(`    总记录数: ${stats.syncStats.total}`);
      console.log(`    已同步: ${stats.syncStats.synced}`);
      console.log(`    未同步: ${stats.syncStats.notSynced}`);
      console.log(`    同步中: ${stats.syncStats.syncing}`);
      console.log(`    同步失败: ${stats.syncStats.failed}`);
      console.log(`    调度器状态: ${stats.scheduler.isRunning ? '运行中' : '已停止'}`);
      console.log(`    同步次数: ${stats.scheduler.syncCount}`);
      console.log(`    错误次数: ${stats.scheduler.errorCount}`);
    } catch (statsError) {
      console.error('  ❌ 获取同步统计失败:', statsError.response?.data || statsError.message);
    }

    // 步骤 10: 测试批量同步
    console.log('\n📋 步骤 10: 测试批量同步');
    try {
      const batchSyncResponse = await axios.post(`${API_BASE_URL}/api/reading-state-sync/all`, {
        readerId: 0
      });
      console.log('  ✅ 批量同步调用成功');
      console.log(`    ${batchSyncResponse.data.data.message}`);
      console.log(`    成功: ${batchSyncResponse.data.data.successCount} 条`);
      console.log(`    失败: ${batchSyncResponse.data.data.failCount} 条`);
    } catch (batchSyncError) {
      console.error('  ❌ 批量同步调用失败:', batchSyncError.response?.data || batchSyncError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

testSyncMechanism();