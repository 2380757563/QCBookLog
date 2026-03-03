import { readFileSync, writeFileSync } from 'fs';

const testBook = {
  title: '测试书籍-默认载体类型',
  author: '测试作者',
  isbn: '9787111111111',
  publisher: '测试出版社',
  publishYear: 2024,
  description: '这是一本测试书籍，用于验证默认载体类型是否为1（实体书）',
  tags: ['测试', '载体类型'],
  rating: 4.5,
  hasCover: false
};

writeFileSync('test_book.json', JSON.stringify(testBook, null, 2));
console.log('✅ 测试书籍数据已保存到 test_book.json');