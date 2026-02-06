import databaseService from './services/databaseService.js';

console.log('开始测试addBookToDB方法\n');

// 构造一个测试书籍对象
const testBook = {
  title: '测试书籍 - 长安的荔枝',
  author: '马伯庸',
  isbn: '9787572608582',
  publisher: '湖南文艺出版社',
  description: '这是一本关于唐朝长安荔枝运输的历史小说，讲述了小吏李善德完成不可能任务的故事。',
  publishYear: 2022,
  pages: 224,
  binding1: 1,
  binding2: 0,
  rating: 8.5,
  series: '博集天卷·马伯庸作品',
  language: 'zh',
  readStatus: '未读',
  tags: ['小说', '历史', '马伯庸', '中国', '文学'],
  path: '马伯庸/测试书籍 - 长安的荔枝',
  hasCover: false,
  timestamp: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString()
};

console.log('测试书籍数据:', JSON.stringify(testBook, null, 2));
console.log('\n开始调用addBookToDB方法...\n');

try {
  const result = databaseService.addBookToDB(testBook);
  console.log('\n✅ addBookToDB方法执行成功');
  console.log('返回结果:', result);
} catch (error) {
  console.log('\n❌ addBookToDB方法执行失败');
  console.log('错误信息:', error.message);
  console.log('错误堆栈:', error.stack);
}
