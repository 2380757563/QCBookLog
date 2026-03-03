const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始扫描目录结构...\n');

async function scanDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 目录: "${entry.name}"`);
      console.log(`   路径: ${entryPath}`);

      const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (!subEntry.isDirectory()) continue;

        const subEntryPath = path.join(entryPath, subEntry.name);
        console.log(`  📂 子目录: "${subEntry.name}"`);

        const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

        for (const subSubEntry of subSubEntries) {
          if (subSubEntry.isDirectory()) {
            console.log(`    📖 孙目录: "${subSubEntry.name}"`);
            console.log(`    ⚠️ 发现三级目录结构！`);
          }
        }
      }
    }

    console.log(`\n✅ 扫描完成！`);
  } catch (error) {
    console.error('❌ 扫描失败:', error);
  }
}

scanDirectories();
