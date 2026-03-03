const fs = require('fs');
const path = require('path');

const bookDir = 'd:/下载/docs-xmnote-master/QC-booklog/moni/book';

console.log('=== 检查 moni/book 目录 ===');

const dirs = fs.readdirSync(bookDir, { withFileTypes: true });
const bookDirs = dirs.filter(d => d.isDirectory());

console.log('书籍目录数:', bookDirs.length);

// 检查最新的目录
bookDirs.slice(-5).forEach(d => {
  const dirPath = path.join(bookDir, d.name);
  const files = fs.readdirSync(dirPath);
  const hasCover = files.includes('cover.jpg');
  console.log(`  ${d.name}: 封面=${hasCover ? '✅' : '❌'}, 文件=${files.join(', ')}`);
});

// 检查测试作者目录
const testAuthorDir = path.join(bookDir, '测试作者');
if (fs.existsSync(testAuthorDir)) {
  console.log('\n=== 测试作者目录 ===');
  const files = fs.readdirSync(testAuthorDir);
  files.forEach(f => {
    const subPath = path.join(testAuthorDir, f);
    if (fs.statSync(subPath).isDirectory()) {
      const subFiles = fs.readdirSync(subPath);
      console.log(`  ${f}: ${subFiles.join(', ')}`);
    }
  });
}
