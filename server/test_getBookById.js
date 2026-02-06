import databaseService from './services/databaseService.js';

console.log('开始测试getBookById方法\n');

try {
  // 使用存在的书籍ID 1
  const book1 = databaseService.getBookById(1);
  console.log('\n=== 书籍1的数据 ===');
  console.log('ID:', book1?.id);
  console.log('书名:', book1?.title);
  console.log('ISBN:', book1?.isbn);
  console.log('描述:', book1?.description ? book1.description.substring(0, 100) + '...' : '无');
  console.log('标签:', book1?.tags);
  console.log('作者:', book1?.author);
  console.log('出版社:', book1?.publisher);

  if (!book1) {
    console.log('\n❌ 书籍1不存在');
  } else {
    console.log('\n完整数据:', JSON.stringify(book1, null, 2));
    console.log('\n✅ 测试通过！');
  }
} catch (error) {
  console.log('\n❌ 测试失败:', error.message);
  console.log('错误堆栈:', error.stack);
}
