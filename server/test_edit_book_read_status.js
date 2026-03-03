import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 测试编辑书籍页面的阅读状态显示...\n');

async function testEditBookReadStatus() {
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

    // 步骤 2: 更新书籍阅读状态为"在读"
    console.log('📋 步骤 2: 更新书籍阅读状态为"在读"');
    const readingStateData = {
      read_state: 1, // 1 = 在读
      favorite: 0,
      wants: 0
    };
    
    try {
      const updateStateResponse = await axios.put(`${API_BASE_URL}/books/${testBook.id}/reading-state?readerId=0`, readingStateData);
      console.log('  ✅ 书籍状态更新成功:', updateStateResponse.data);
      console.log(`    read_state: ${updateStateResponse.data.read_state}`);
      console.log(`    readStatus 应该是: '在读'\n`);
    } catch (updateStateError) {
      console.error('  ❌ 更新书籍状态失败:', updateStateError.response?.data || updateStateError.message);
      return;
    }

    // 步骤 3: 获取书籍详情（模拟编辑书籍页面）
    console.log('📋 步骤 3: 获取书籍详情（模拟编辑书籍页面）');
    try {
      const bookDetailResponse = await axios.get(`${API_BASE_URL}/books/${testBook.id}`);
      const bookDetail = bookDetailResponse.data;
      console.log('  ✅ 获取书籍详情成功');
      console.log(`    书籍ID: ${bookDetail.id}`);
      console.log(`    书名: ${bookDetail.title}`);
      console.log(`    readStatus: ${bookDetail.readStatus}`);
      console.log(`    readCompleteDate: ${bookDetail.readCompleteDate || '无'}\n`);

      // 验证阅读状态是否正确
      if (bookDetail.readStatus === '在读') {
        console.log('✅ 阅读状态显示正确！');
      } else {
        console.log(`❌ 阅读状态显示错误！期望: '在读', 实际: '${bookDetail.readStatus}'`);
      }
    } catch (getBookError) {
      console.error('  ❌ 获取书籍详情失败:', getBookError.response?.data || getBookError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成!');
    console.log('='.repeat(60));

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

testEditBookReadStatus();