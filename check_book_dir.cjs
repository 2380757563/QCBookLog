const path = require('path');

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db';
const bookDir = path.dirname(dbPath);

console.log('数据库路径:', dbPath);
console.log('书库目录:', bookDir);

// 检查目录是否存在
const fs = require('fs');
if (fs.existsSync(bookDir)) {
  console.log('✅ 书库目录存在');
  const files = fs.readdirSync(bookDir);
  console.log('目录内容:', files.slice(0, 10));
} else {
  console.log('❌ 书库目录不存在');
}
