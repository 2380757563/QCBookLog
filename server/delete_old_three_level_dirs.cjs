const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始删除旧的三级目录...\n');

async function deleteOldThreeLevelDirectories() {
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

            if (subSubEntries.some(e => e.isDirectory())) {
              console.log(`\n📁 发现三级目录: ${entry.name}/${subEntry.name}`);

              try {
                await fs.promises.rm(subEntryPath, { recursive: true, force: true });
                console.log(`  ✅ 已删除三级目录`);
                deletedCount++;
              } catch (e) {
                console.log(`  ❌ 删除失败: ${e.message}`);
              }

              try {
                await fs.promises.rmdir(entryPath);
                console.log(`  🗑️ 已删除父目录`);
              } catch (e) {
                console.log(`  ℹ️ 父目录不为空，保留`);
              }
            }
          } catch (e) {
            console.log(`  ❌ 无法读取 ${subEntry.name}: ${e.message}`);
          }
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

deleteOldThreeLevelDirectories();
