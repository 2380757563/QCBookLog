const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始处理三级目录（使用 Glob）...\n');

async function processThreeLevelDirectoriesWithGlob() {
  try {
    const glob = require('glob');
    const threeLevelPaths = glob.sync('**/*/*/*', { cwd: BOOK_DIR, absolute: true });

    console.log(`📊 找到 ${threeLevelPaths.length} 个三级路径:\n`);

    for (const bookPath of threeLevelPaths) {
      const relativePath = path.relative(BOOK_DIR, bookPath);
      const pathParts = relativePath.split(/[\/\\]/);

      console.log(`📖 书籍路径: ${relativePath}`);

      if (pathParts.length >= 3) {
        const newAuthorName = `${pathParts[0]}、${pathParts[1]}`;
        const newBookPath = path.join(BOOK_DIR, newAuthorName, pathParts[pathParts.length - 1]);

        console.log(`  🔄 新路径: ${newAuthorName}/${pathParts[pathParts.length - 1]}`);

        try {
          await fs.promises.mkdir(path.join(BOOK_DIR, newAuthorName), { recursive: true });
          await fs.promises.rename(bookPath, newBookPath);
          console.log(`  ✅ 移动成功`);

          try {
            await fs.promises.rmdir(path.join(BOOK_DIR, pathParts[0], pathParts[1]));
            console.log(`  🗑️ 已删除中间目录`);
          } catch (e) {
            console.log(`  ℹ️ 中间目录不为空，保留`);
          }

          try {
            await fs.promises.rmdir(path.join(BOOK_DIR, pathParts[0]));
            console.log(`  🗑️ 已删除父目录`);
          } catch (e) {
            console.log(`  ℹ️ 父目录不为空，保留`);
          }
        } catch (e) {
          console.log(`  ❌ 移动失败: ${e.message}`);
        }
      }
    }

    console.log(`\n🎉 处理完成！`);
  } catch (error) {
    console.error('❌ 处理失败:', error);
  }
}

processThreeLevelDirectoriesWithGlob();
