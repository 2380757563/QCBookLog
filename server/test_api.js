import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 开始 API 测试...\n');

async function testApi() {
  try {
    // 步骤 1: 获取当前书籍列表
    console.log('📋 步骤 1: 获取当前书籍列表');
    const booksResponse = await axios.get(`${API_BASE_URL}/books`);
    const books = booksResponse.data;
    console.log(`  当前书籍数量: ${books.length}`);
    if (books.length > 0) {
      console.log(`  第一本书籍: [${books[0].id}] ${books[0].title}`);
    }

    // 步骤 2: 添加一本测试书籍
    console.log('\n📋 步骤 2: 添加一本测试书籍');
    const testBook = {
      title: 'API测试书籍',
      author: '测试作者',
      publisher: '测试出版社',
      publishYear: 2024,
      pages: 300,
      standardPrice: 45.00,
      purchasePrice: 38.50,
      purchaseDate: '2024-01-15',
      binding1: 1,
      binding2: 2,
      note: '这是一本测试书籍'
    };

    console.log(`  正在添加书籍: ${testBook.title}`);
    const addResponse = await axios.post(`${API_BASE_URL}/books`, testBook);
    const newBookId = addResponse.data.id;
    console.log(`  ✅ 书籍添加成功: [${newBookId}] ${testBook.title}`);

    // 步骤 3: 验证书籍已添加
    console.log('\n📋 步骤 3: 验证书籍已添加');
    const verifyResponse = await axios.get(`${API_BASE_URL}/books`);
    const verifyBooks = verifyResponse.data;
    const addedBook = verifyBooks.find(b => b.id === newBookId);
    
    if (addedBook) {
      console.log(`  ✅ 书籍验证成功: [${addedBook.id}] ${addedBook.title}`);
    } else {
      console.log(`  ❌ 书籍验证失败: 未找到 ID=${newBookId} 的书籍`);
    }

    // 步骤 4: 删除书籍
    console.log('\n📋 步骤 4: 删除书籍');
    console.log(`  正在删除书籍: [${newBookId}]`);
    await axios.delete(`${API_BASE_URL}/books/${newBookId}`);
    console.log(`  ✅ 书籍删除成功`);

    // 步骤 5: 验证书籍已删除
    console.log('\n📋 步骤 5: 验证书籍已删除');
    const finalResponse = await axios.get(`${API_BASE_URL}/books`);
    const finalBooks = finalResponse.data;
    const deletedBook = finalBooks.find(b => b.id === newBookId);
    
    if (!deletedBook) {
      console.log(`  ✅ 书籍删除验证成功: ID=${newBookId} 的书籍已不存在`);
    } else {
      console.log(`  ❌ 书籍删除验证失败: ID=${newBookId} 的书籍仍然存在`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ API 测试完成!');
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

testApi();