const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始清理旧的三级目录...\n');

async function cleanupOldDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let cleanedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);

      const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory()) continue;

        const subEntryPath = path.join(entryPath, subEntry.name);

        const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

        if (subSubEntries.some(e => e.isDirectory())) {
          console.log(`\n📁 发现旧的三级目录: ${entry.name}/${subEntry.name}`);

          for (const subSubEntry of subSubEntries) {
            if (!subSubEntry.isDirectory()) continue;

            const bookPath = path.join(subEntryPath, subSubEntry.name);

            console.log(`  📖 书籍目录: ${subSubEntry.name}`);

            const newAuthorName = `${entry.name.trim()}、${subEntry.name.trim()}`.replace(/[\/\\]/g, '');
            const newBookPath = path.join(BOOK_DIR, newAuthorName, subSubEntry.name);

            console.log(`  🔄 检查新路径是否存在: ${newAuthorName}/${subSubEntry.name}`);

            try {
              await fs.promises.access(newBookPath);
              console.log(`  ✅ 新路径已存在，删除旧目录`);

              await fs.promises.rm(bookPath, { recursive: true, force: true });
              console.log(`  🗑️ 旧目录已删除`);
              cleanedCount++;
            } catch (e) {
              console.log(`  ℹ️ 新路径不存在，跳过`);
            }
          }

          try {
            await fs.promises.rmdir(subEntryPath);
            console.log(`  🗑️ 删除空目录: ${subEntry.name}`);
          } catch (e) {
            console.log(`  ℹ️ 目录 ${subEntry.name} 不为空，保留`);
          }
        }
      }

      try {
        const remainingEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
        if (remainingEntries.length === 0) {
          await fs.promises.rmdir(entryPath);
          console.log(`🗑️ 删除空目录: ${entry.name}`);
        }
      } catch (e) {
        console.log(`ℹ️ 目录 ${entry.name} 不为空，保留`);
      }
    }

    console.log(`\n🎉 清理完成！`);
    console.log(`✅ 清理书籍数: ${cleanedCount}`);
  } catch (error) {
    console.error('❌ 清理失败:', error);
  }
}

cleanupOldDirectories();
