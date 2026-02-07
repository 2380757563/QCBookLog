import axios from 'axios';

console.log('🔍 测试API返回的书籍数据\n');

try {
  const response = await axios.get('http://localhost:7401/api/books/93');
  const book = response.data;
  
  console.log('📚 书籍ID:', book.id);
  console.log('📖 书名:', book.title);
  console.log('✍️ 作者:', book.author);
  console.log('🏢 出版社:', book.publisher);
  console.log('📅 pubdate:', book.pubdate);
  console.log('📅 publishYear:', book.publishYear);
  console.log('📄 页数:', book.pages);
  console.log('💰 标准价格:', book.standardPrice);
  console.log('🛒 购入价格:', book.purchasePrice);
  console.log('📅 购入日期:', book.purchaseDate);
  
  console.log('\n🔍 所有字段:');
  console.log(Object.keys(book).sort());
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  if (error.response) {
    console.error('响应数据:', error.response.data);
  }
}
