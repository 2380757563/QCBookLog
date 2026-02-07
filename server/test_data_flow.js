console.log('🔍 检查前端在添加书籍时的数据流...');

// 模拟前端form数据
const formData = {
  isbn: '9787221186553',
  title: '一剪光影：华语影坛当代剪辑师访谈录',
  author: '周新霞 主编 / 姜富海、林鸿飞、王姜永 编著',
  publisher: '贵州人民出版社',
  publishYear: undefined, // 如果用户没有手动输入，且没有通过ISBN搜索获取
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

console.log('\n📥 前端form数据:');
console.log('  publishYear:', formData.publishYear, '类型:', typeof formData.publishYear);

// 模拟前端保存逻辑
const { calibreTags, ...saveData } = formData;
const finalSaveData = {
  ...saveData,
  binding1: saveData.binding1,
  binding2: saveData.binding2,
  purchasePrice: saveData.purchasePrice,
  standardPrice: saveData.standardPrice,
  note: saveData.note,
  purchaseDate: saveData.purchaseDate,
  publishYear: saveData.publishYear,
  groups: saveData.groups || []
};

console.log('\n💾 前端发送的finalSaveData:');
console.log('  publishYear:', finalSaveData.publishYear, '类型:', typeof finalSaveData.publishYear);

// 模拟bookService处理逻辑
const safeBookData = {
  ...finalSaveData,
  tags: Array.isArray(finalSaveData.tags) ? finalSaveData.tags.map(tag => String(tag)) : [],
  groups: Array.isArray(finalSaveData.groups) ? finalSaveData.groups.map(group => String(group)) : [],
  publishYear: typeof finalSaveData.publishYear === 'number' ? finalSaveData.publishYear : undefined,
  pages: finalSaveData.pages ? parseInt(finalSaveData.pages) : undefined,
  purchasePrice: typeof finalSaveData.purchasePrice === 'number' ? finalSaveData.purchasePrice : undefined,
  standardPrice: typeof finalSaveData.standardPrice === 'number' ? finalSaveData.standardPrice : undefined,
  rating: typeof finalSaveData.rating === 'number' ? finalSaveData.rating : undefined,
  book_type: typeof finalSaveData.book_type === 'number' ? finalSaveData.book_type : 1,
  binding1: typeof finalSaveData.binding1 === 'number' ? finalSaveData.binding1 : 0,
  binding2: typeof finalSaveData.binding2 === 'number' ? finalSaveData.binding2 : 0
};

console.log('\n📦 bookService处理的safeBookData:');
console.log('  publishYear:', safeBookData.publishYear, '类型:', typeof safeBookData.publishYear);

// 模拟后端处理逻辑
const pubdate = safeBookData.publishYear ? `${safeBookData.publishYear}-01-01` : new Date().toISOString();
console.log('\n🔧 后端转换后的pubdate:', pubdate);

console.log('\n❌ 问题分析:');
console.log('  如果前端没有设置publishYear，bookService会将其转换为undefined');
console.log('  后端接收到undefined后，会使用当前时间作为pubdate');
console.log('  这导致出版年份信息丢失');

console.log('\n✅ 解决方案:');
console.log('  1. 前端在添加书籍时，应该提示用户输入出版年份');
console.log('  2. 如果用户通过ISBN搜索，应该确保API返回的publishYear被正确设置');
console.log('  3. 后端在处理publishYear时，应该检查是否为有效值，避免使用当前时间');