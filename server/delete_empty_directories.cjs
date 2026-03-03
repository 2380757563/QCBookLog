const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始删除空目录...\n');

async function deleteEmptyDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let deletedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);

      try {
        const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isDirectory()) continue;

          const subEntryPath = path.join(entryPath, subEntry.name);

          try {
            const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

            if (subSubEntries.length === 0) {
              console.log(`\n📁 发现空目录: ${entry.name}/${subEntry.name}`);

              try {
                await fs.promises.rmdir(subEntryPath);
                console.log(`  ✅ 已删除空目录`);
                deletedCount++;
              } catch (e) {
                console.log(`  ❌ 删除失败: ${e.message}`);
              }
            }
          } catch (e) {
            console.log(`  ❌ 无法读取 ${subEntry.name}: ${e.message}`);
          }
        }

        try {
          const remainingEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
          if (remainingEntries.length === 0) {
            await fs.promises.rmdir(entryPath);
            console.log(`  🗑️ 已删除空父目录: ${entry.name}`);
          }
        } catch (e) {
          console.log(`  ℹ️ 父目录 ${entry.name} 不为空，保留`);
        }
      } catch (e) {
        console.log(`❌ 无法读取 ${entry.name}: ${e.message}`);
      }
    }

    console.log(`\n🎉 删除完成！`);
    console.log(`✅ 删除目录数: ${deletedCount}`);
  } catch (error) {
    console.error('❌ 删除失败:', error);
  }
}

deleteEmptyDirectories();
