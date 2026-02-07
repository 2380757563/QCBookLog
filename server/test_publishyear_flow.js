import axios from 'axios';

console.log('🔍 详细测试：追踪publishYear从API到数据库的完整流程\n');

// 测试数据
const testBook = {
  title: '测试书籍-追踪publishYear',
  author: '测试作者-追踪',
  publisher: '测试出版社-追踪',
  isbn: '9787123456789',
  description: '这是一本测试书籍，用于追踪publishYear的传递流程',
  pages: 300,
  binding1: 1,
  binding2: 0,
  book_type: 1,
  rating: 4.5,
  series: '测试丛书',
  language: 'zh',
  purchasePrice: 59.9,
  standardPrice: 69.9,
  purchaseDate: '2024-01-01',
  note: '测试备注',
  tags: ['测试', '书籍'],
  groups: [],
  path: '测试作者-追踪/测试书籍-追踪publishYear',
  hasCover: false,
  publishYear: 2024
};

console.log('📝 步骤1: 准备发送的请求数据');
console.log('  publishYear:', testBook.publishYear, '(类型:', typeof testBook.publishYear + ')');
console.log('  完整数据:', JSON.stringify(testBook, null, 2));

try {
  console.log('\n📥 步骤2: 发送POST请求到 /api/books');
  const response = await axios.post('http://localhost:7401/api/books', testBook);
  
  console.log('✅ 步骤3: API响应成功');
  console.log('  返回的书籍ID:', response.data.id);
  console.log('  返回的pubdate:', response.data.pubdate);
  console.log('  返回的publishYear:', response.data.publishYear);
  
  // 等待数据库写入完成
  console.log('\n⏳ 步骤4: 等待2秒，确保数据库写入完成');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 获取书籍详情
  console.log('\n📚 步骤5: 从数据库获取书籍详情');
  const bookDetail = await axios.get(`http://localhost:7401/api/books/${response.data.id}`);
  
  console.log('  书名:', bookDetail.data.title);
  console.log('  作者:', bookDetail.data.author);
  console.log('  pubdate:', bookDetail.data.pubdate, '(类型:', typeof bookDetail.data.pubdate + ')');
  console.log('  publishYear:', bookDetail.data.publishYear, '(类型:', typeof bookDetail.data.publishYear + ')');
  
  // 验证结果
  console.log('\n🔍 步骤6: 验证结果');
  if (bookDetail.data.pubdate) {
    const yearMatch = String(bookDetail.data.pubdate).match(/\d{4}/);
    if (yearMatch) {
      const extractedYear = parseInt(yearMatch[0]);
      console.log('  从pubdate提取的年份:', extractedYear);
      
      if (extractedYear === testBook.publishYear) {
        console.log('✅ 成功！出版年份已正确写入数据库');
        console.log('  期望值:', testBook.publishYear);
        console.log('  实际值:', extractedYear);
      } else {
        console.log('❌ 失败！出版年份不匹配');
        console.log('  期望值:', testBook.publishYear);
        console.log('  实际值:', extractedYear);
      }
    } else {
      console.log('❌ 失败！无法从pubdate中提取年份');
    }
  } else {
    console.log('❌ 失败！pubdate为空');
  }
  
  // 检查其他字段
  console.log('\n📊 步骤7: 检查其他关键字段');
  console.log('  ISBN:', bookDetail.data.isbn);
  console.log('  页数:', bookDetail.data.pages);
  console.log('  标准价格:', bookDetail.data.standardPrice);
  console.log('  购入日期:', bookDetail.data.purchaseDate);
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  if (error.response) {
    console.error('  响应状态:', error.response.status);
    console.error('  响应数据:', error.response.data);
  }
}

console.log('\n✅ 测试完成');
