import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 测试分组创建和书籍状态修改功能...\n');

async function testGroupsAndReadingState() {
  try {
    // 步骤 1: 获取书籍列表
    console.log('📋 步骤 1: 获取书籍列表');
    const booksResponse = await axios.get(`${API_BASE_URL}/books`);
    const books = booksResponse.data;
    console.log(`  获取到 ${books.length} 本书`);
    
    if (books.length === 0) {
      console.log('❌ 没有书籍可以测试');
      return;
    }
    
    const testBook = books[0];
    console.log(`  选择书籍: [${testBook.id}] ${testBook.title}\n`);

    // 步骤 2: 创建分组
    console.log('📋 步骤 2: 创建分组');
    const timestamp = Date.now();
    const groupData = {
      name: `测试分组_${timestamp}`,
      description: '这是一个测试分组'
    };
    
    try {
      const createGroupResponse = await axios.post(`${API_BASE_URL}/groups`, groupData);
      console.log('  ✅ 分组创建成功:', createGroupResponse.data);
      const groupId = createGroupResponse.data.id;
      console.log(`  分组ID: ${groupId}\n`);

      // 步骤 3: 将书籍添加到分组
      console.log('📋 步骤 3: 将书籍添加到分组');
      try {
        const addBookResponse = await axios.post(`${API_BASE_URL}/qc/groups/${groupId}/books/${testBook.id}`);
        console.log('  ✅ 书籍添加到分组成功:', addBookResponse.data);
      } catch (addError) {
        console.error('  ❌ 添加书籍到分组失败:', addError.response?.data || addError.message);
      }

      // 步骤 4: 获取书籍的分组
      console.log('\n📋 步骤 4: 获取书籍的分组');
      try {
        const bookGroupsResponse = await axios.get(`${API_BASE_URL}/qc/groups/books/${testBook.id}`);
        console.log('  ✅ 获取书籍分组成功:', bookGroupsResponse.data);
      } catch (getGroupsError) {
        console.error('  ❌ 获取书籍分组失败:', getGroupsError.response?.data || getGroupsError.message);
      }

      // 步骤 5: 更新书籍状态
      console.log('\n📋 步骤 5: 更新书籍阅读状态');
      const readingStateData = {
        read_state: 1,
        favorite: 1,
        wants: 0
      };
      
      try {
        const updateStateResponse = await axios.put(`${API_BASE_URL}/books/${testBook.id}/reading-state?readerId=0`, readingStateData);
        console.log('  ✅ 书籍状态更新成功:', updateStateResponse.data);
      } catch (updateStateError) {
        console.error('  ❌ 更新书籍状态失败:', updateStateError.response?.data || updateStateError.message);
      }

      // 步骤 6: 获取书籍状态
      console.log('\n📋 步骤 6: 获取书籍阅读状态');
      try {
        const getStateResponse = await axios.get(`${API_BASE_URL}/books/${testBook.id}/reading-state?readerId=0`);
        console.log('  ✅ 获取书籍状态成功:', getStateResponse.data);
      } catch (getStateError) {
        console.error('  ❌ 获取书籍状态失败:', getStateError.response?.data || getStateError.message);
      }

      // 步骤 7: 获取所有分组
      console.log('\n📋 步骤 7: 获取所有分组');
      try {
        const allGroupsResponse = await axios.get(`${API_BASE_URL}/groups`);
        console.log('  ✅ 获取所有分组成功:', allGroupsResponse.data);
      } catch (getAllGroupsError) {
        console.error('  ❌ 获取所有分组失败:', getAllGroupsError.response?.data || getAllGroupsError.message);
      }

      // 步骤 8: 更新分组
      console.log('\n📋 步骤 8: 更新分组');
      const updateGroupData = {
        name: `测试分组_${timestamp}_已更新`,
        description: '这是一个更新后的测试分组'
      };
      
      try {
        const updateGroupResponse = await axios.put(`${API_BASE_URL}/groups/${groupId}`, updateGroupData);
        console.log('  ✅ 分组更新成功:', updateGroupResponse.data);
      } catch (updateGroupError) {
        console.error('  ❌ 更新分组失败:', updateGroupError.response?.data || updateGroupError.message);
      }

      // 步骤 9: 检查数据库中的数据
      console.log('\n📋 步骤 9: 检查数据库中的数据');
      
      const Database = (await import('better-sqlite3')).default;
      const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
      const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
      
      // 检查 QCBookLog 数据库中的分组
      const groups = qcBooklogDb.prepare('SELECT * FROM qc_groups WHERE id = ?').get(groupId);
      if (groups) {
        console.log('  QCBookLog qc_groups 表:');
        console.log(`    id: ${groups.id}`);
        console.log(`    name: ${groups.name}`);
        console.log(`    description: ${groups.description}`);
      } else {
        console.log('  ❌ QCBookLog qc_groups 表中未找到分组');
      }
      
      // 检查 QCBookLog 数据库中的书籍分组关联
      const bookGroups = qcBooklogDb.prepare('SELECT * FROM qc_book_groups WHERE book_id = ? AND group_id = ?').get(testBook.id, groupId);
      if (bookGroups) {
        console.log('  QCBookLog qc_book_groups 表:');
        console.log(`    book_id: ${bookGroups.book_id}`);
        console.log(`    group_id: ${bookGroups.group_id}`);
      } else {
        console.log('  ❌ QCBookLog qc_book_groups 表中未找到书籍分组关联');
      }
      
      // 检查 Talebook 数据库中的阅读状态
      const readingState = talebookDb.prepare('SELECT * FROM reading_state WHERE book_id = ? AND reader_id = ?').get(testBook.id, 0);
      if (readingState) {
        console.log('  Talebook reading_state 表:');
        console.log(`    book_id: ${readingState.book_id}`);
        console.log(`    reader_id: ${readingState.reader_id}`);
        console.log(`    read_state: ${readingState.read_state}`);
        console.log(`    favorite: ${readingState.favorite}`);
        console.log(`    wants: ${readingState.wants}`);
      } else {
        console.log('  ❌ Talebook reading_state 表中未找到阅读状态');
      }
      
      qcBooklogDb.close();
      talebookDb.close();

      console.log('\n' + '='.repeat(60));
      console.log('✅ 测试完成!');
      console.log('='.repeat(60));

    } catch (createGroupError) {
      console.error('❌ 创建分组失败:', createGroupError.response?.data || createGroupError.message);
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:');
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据:`, error.response.data);
    } else {
      console.error(`  错误信息: ${error.message}`);
    }
    process.exit(1);
  }
}

testGroupsAndReadingState();