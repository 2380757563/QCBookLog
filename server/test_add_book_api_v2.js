import axios from 'axios';

console.log('🔍 测试添加书籍时出版年份的接收情况...');

// 测试：添加书籍时设置publishYear
console.log('\n📝 测试：添加书籍时设置publishYear');
const bookWithPublishYear = {
  title: '测试书籍-有出版年份2',
  author: '测试作者3',
  publisher: '测试出版社3',
  isbn: '9787987654321',
  description: '这是一本测试书籍',
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
  path: '测试作者3/测试书籍-有出版年份2',
  hasCover: false,
  publishYear: 2024
};

try {
  console.log('📥 发送的请求体:', JSON.stringify(bookWithPublishYear, null, 2));
  const response = await axios.post('http://localhost:7401/api/books', bookWithPublishYear);
  console.log('✅ 书籍添加成功，ID:', response.data.id);
  console.log('  书名:', response.data.title);
  console.log('  pubdate:', response.data.pubdate);
  console.log('  publishYear:', response.data.publishYear);
  
  // 等待一下，确保数据库写入完成
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 获取书籍详情
  const bookDetail = await axios.get(`http://localhost:7401/api/books/${response.data.id}`);
  console.log('\n📚 从数据库获取的书籍详情:');
  console.log('  pubdate:', bookDetail.data.pubdate);
  console.log('  publishYear:', bookDetail.data.publishYear);
  
  // 从pubdate提取年份
  if (bookDetail.data.pubdate) {
    const yearMatch = String(bookDetail.data.pubdate).match(/\d{4}/);
    if (yearMatch) {
      const extractedYear = parseInt(yearMatch[0], 10);
      console.log('  从pubdate提取的年份:', extractedYear);
    }
  }
  
  // 删除测试书籍
  await axios.delete(`http://localhost:7401/api/books/${response.data.id}`);
  console.log('\n🗑️ 测试书籍已删除');
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  if (error.response) {
    console.error('  响应数据:', error.response.data);
  }
}

console.log('\n✅ 测试完成');