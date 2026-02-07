console.log('🔍 测试前端发送的数据格式...');

// 模拟前端发送的数据（添加书籍时）
const frontendData = {
  isbn: '9787221186553',
  title: '一剪光影：华语影坛当代剪辑师访谈录',
  author: '周新霞 主编 / 姜富海、林鸿飞、王姜永 编著',
  publisher: '贵州人民出版社',
  publishYear: undefined, // 前端可能没有设置这个字段
  pages: undefined,
  binding1: 1,
  binding2: 0,
  book_type: 1,
  coverUrl: '',
  purchaseDate: '',
  purchasePrice: undefined,
  standardPrice: undefined,
  readStatus: '未读',
  readCompleteDate: '',
  rating: undefined,
  tags: [],
  groups: [],
  series: '',
  calibreTags: [],
  note: '',
  description: '测试描述'
};

console.log('\n📥 前端发送的数据:');
console.log('  publishYear:', frontendData.publishYear, '类型:', typeof frontendData.publishYear);

// 模拟后端处理逻辑
const pubdate = frontendData.publishYear ? `${frontendData.publishYear}-01-01` : new Date().toISOString();
console.log('  转换后的pubdate:', pubdate);

console.log('\n❌ 问题分析:');
console.log('  如果前端没有设置publishYear，后端会使用当前时间作为pubdate');
console.log('  这导致出版年份信息丢失');

console.log('\n✅ 解决方案:');
console.log('  1. 前端在添加书籍时，应该从ISBN搜索结果中获取publishYear');
console.log('  2. 如果用户手动输入了出版年份，应该正确传递给后端');
console.log('  3. 后端在处理publishYear时，应该检查是否为有效值');