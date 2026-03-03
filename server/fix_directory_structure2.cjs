const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始修复三级目录结构...\n');

async function fixDirectoryStructure() {
  try {
    const authorDirs = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let fixedCount = 0;
    let skippedCount = 0;

    for (const authorDir of authorDirs) {
      if (!authorDir.isDirectory()) continue;

      const authorPath = path.join(BOOK_DIR, authorDir.name);
      console.log(`\n📁 检查作者目录: ${authorDir.name}`);

      const subDirs = await fs.promises.readdir(authorPath, { withFileTypes: true });

      for (const subDir of subDirs) {
        if (!subDir.isDirectory()) continue;

        const subDirPath = path.join(authorPath, subDir.name);
        const bookDirs = await fs.promises.readdir(subDirPath, { withFileTypes: true });

        if (bookDirs.length > 0) {
          for (const bookDir of bookDirs) {
            if (!bookDir.isDirectory()) continue;

            const bookPath = path.join(subDirPath, bookDir.name);

            console.log(`  📖 发现三级目录书籍: ${authorDir.name}/${subDir.name}/${bookDir.name}`);

            const newAuthorName = `${authorDir.name}、${subDir.name}`.replace(/[\/\\]/g, '');
            const newBookPath = path.join(BOOK_DIR, newAuthorName, bookDir.name);

            console.log(`  🔄 修复为: ${newAuthorName}/${bookDir.name}`);

            try {
              await fs.promises.mkdir(path.join(BOOK_DIR, newAuthorName), { recursive: true });
              await fs.promises.rename(bookPath, newBookPath);
              console.log(`  ✅ 目录修复成功`);
              fixedCount++;

              try {
                await fs.promises.rmdir(subDirPath);
              } catch (e) {
                console.log(`  ℹ️ 中间目录 ${subDir.name} 不为空，保留`);
              }
            } catch (e) {
              console.log(`  ❌ 修复失败: ${e.message}`);
            }
          }
        }
      }

      try {
        const remainingDirs = await fs.promises.readdir(authorPath, { withFileTypes: true });
        if (remainingDirs.length === 0) {
          await fs.promises.rmdir(authorPath);
          console.log(`  🗑️ 空作者目录已删除: ${authorDir.name}`);
        }
      } catch (e) {
        console.log(`  ℹ️ 作者目录 ${authorDir.name} 不为空，保留`);
      }
    }

    console.log(`\n🎉 修复完成！`);
    console.log(`✅ 修复书籍数: ${fixedCount}`);
    console.log(`⏭️ 跳过书籍数: ${skippedCount}`);
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixDirectoryStructure();
