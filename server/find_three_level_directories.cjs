const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始查找所有三级目录...\n');

async function findAllThreeLevelDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    const threeLevelDirs = [];

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

            for (const subSubEntry of subSubEntries) {
              if (subSubEntry.isDirectory()) {
                threeLevelDirs.push({
                  authorDir: entry.name,
                  subDir: subEntry.name,
                  bookDir: subSubEntry.name,
                  fullPath: path.join(subEntryPath, subSubEntry.name)
                });
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

    console.log(`📊 找到 ${threeLevelDirs.length} 个三级目录:\n`);

    for (const dir of threeLevelDirs) {
      console.log(`📖 ${dir.authorDir}/${dir.subDir}/${dir.bookDir}`);
      console.log(`   完整路径: ${dir.fullPath}\n`);
    }

    return threeLevelDirs;
  } catch (error) {
    console.error('❌ 查找失败:', error);
    return [];
  }
}

findAllThreeLevelDirectories();
