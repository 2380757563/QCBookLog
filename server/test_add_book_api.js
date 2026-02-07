import axios from 'axios';

console.log('🔍 测试添加书籍时出版年份的写入功能...');

// 测试1：添加书籍时不设置publishYear
console.log('\n📝 测试1：添加书籍时不设置publishYear');
const bookWithoutPublishYear = {
  title: '测试书籍-无出版年份',
  author: '测试作者',
  publisher: '测试出版社',
  isbn: '9787123456789',
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
  path: '测试作者/测试书籍-无出版年份',
  hasCover: false
};

try {
  const response1 = await axios.post('http://localhost:7401/api/books', bookWithoutPublishYear);
  console.log('✅ 书籍添加成功，ID:', response1.data.id);
  console.log('  书名:', response1.data.title);
  console.log('  pubdate:', response1.data.pubdate);
  
  // 获取书籍详情
  const bookDetail1 = await axios.get(`http://localhost:7401/api/books/${response1.data.id}`);
  console.log('  从数据库获取的pubdate:', bookDetail1.data.pubdate);
  
  // 删除测试书籍
  await axios.delete(`http://localhost:7401/api/books/${response1.data.id}`);
  console.log('  测试书籍已删除');
} catch (error) {
  console.error('❌ 测试1失败:', error.message);
}

// 测试2：添加书籍时设置publishYear
console.log('\n📝 测试2：添加书籍时设置publishYear');
const bookWithPublishYear = {
  title: '测试书籍-有出版年份',
  author: '测试作者2',
  publisher: '测试出版社2',
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
  path: '测试作者2/测试书籍-有出版年份',
  hasCover: false,
  publishYear: 2024
};

try {
  const response2 = await axios.post('http://localhost:7401/api/books', bookWithPublishYear);
  console.log('✅ 书籍添加成功，ID:', response2.data.id);
  console.log('  书名:', response2.data.title);
  console.log('  pubdate:', response2.data.pubdate);
  
  // 获取书籍详情
  const bookDetail2 = await axios.get(`http://localhost:7401/api/books/${response2.data.id}`);
  console.log('  从数据库获取的pubdate:', bookDetail2.data.pubdate);
  
  // 从pubdate提取年份
  if (bookDetail2.data.pubdate) {
    const yearMatch = String(bookDetail2.data.pubdate).match(/\d{4}/);
    if (yearMatch) {
      const extractedYear = parseInt(yearMatch[0], 10);
      console.log('  从pubdate提取的年份:', extractedYear);
    }
  }
  
  // 删除测试书籍
  await axios.delete(`http://localhost:7401/api/books/${response2.data.id}`);
  console.log('  测试书籍已删除');
} catch (error) {
  console.error('❌ 测试2失败:', error.message);
}

console.log('\n✅ 测试完成');