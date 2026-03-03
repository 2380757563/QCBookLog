const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始修复三级目录结构...\n');

async function fixDirectoryStructure() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let fixedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 检查目录: ${entry.name}`);

      const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

      let hasBookDirs = false;
      let hasSubDirs = false;

      for (const subEntry of subEntries) {
        if (subEntry.isDirectory()) {
          const subEntryPath = path.join(entryPath, subEntry.name);
          const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

          if (subSubEntries.some(e => e.isDirectory())) {
            hasSubDirs = true;
            console.log(`  📖 发现三级目录: ${entry.name}/${subEntry.name}`);

            for (const subSubEntry of subSubEntries) {
              if (!subSubEntry.isDirectory()) continue;

              const bookPath = path.join(subEntryPath, subSubEntry.name);

              const newAuthorName = `${entry.name}、${subEntry.name}`.replace(/[\/\\]/g, '');
              const newBookPath = path.join(BOOK_DIR, newAuthorName, subSubEntry.name);

              console.log(`  🔄 修复为: ${newAuthorName}/${subSubEntry.name}`);

              try {
                await fs.promises.mkdir(path.join(BOOK_DIR, newAuthorName), { recursive: true });
                await fs.promises.rename(bookPath, newBookPath);
                console.log(`  ✅ 目录修复成功`);
                fixedCount++;
              } catch (e) {
                console.log(`  ❌ 修复失败: ${e.message}`);
              }
            }

            try {
              await fs.promises.rmdir(subEntryPath);
            } catch (e) {
              console.log(`  ℹ️ 中间目录 ${subEntry.name} 不为空，保留`);
            }
          } else {
            hasBookDirs = true;
          }
        }
      }

      if (hasSubDirs) {
        try {
          const remainingEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
          if (remainingEntries.length === 0) {
            await fs.promises.rmdir(entryPath);
            console.log(`  🗑️ 空目录已删除: ${entry.name}`);
          }
        } catch (e) {
          console.log(`  ℹ️ 目录 ${entry.name} 不为空，保留`);
        }
      } else {
        skippedCount++;
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
