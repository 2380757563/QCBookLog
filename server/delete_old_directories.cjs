const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始删除旧的三级目录...\n');

async function deleteOldDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let deletedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 检查目录: "${entry.name}"`);

      const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory()) continue;

        const subEntryPath = path.join(entryPath, subEntry.name);
        console.log(`  📂 子目录: "${subEntry.name}"`);

        const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

        if (subSubEntries.some(e => e.isDirectory())) {
          console.log(`    ⚠️ 发现三级目录结构，删除旧目录`);

          try {
            await fs.promises.rm(subEntryPath, { recursive: true, force: true });
            console.log(`    ✅ 删除成功: "${subEntry.name}"`);
            deletedCount++;
          } catch (e) {
            console.log(`    ❌ 删除失败: ${e.message}`);
          }
        }
      }

      try {
        const remainingEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
        if (remainingEntries.length === 0) {
          await fs.promises.rmdir(entryPath);
          console.log(`  🗑️ 删除空目录: "${entry.name}"`);
        }
      } catch (e) {
        console.log(`  ℹ️ 目录 "${entry.name}" 不为空，保留`);
      }
    }

    console.log(`\n🎉 删除完成！`);
    console.log(`✅ 删除目录数: ${deletedCount}`);
  } catch (error) {
    console.error('❌ 删除失败:', error);
  }
}

deleteOldDirectories();
