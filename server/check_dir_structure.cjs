const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始检查目录结构...\n');

async function checkDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 目录: "${entry.name}"`);

      try {
        const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isDirectory()) continue;

          const subEntryPath = path.join(entryPath, subEntry.name);
          console.log(`  📂 子目录: "${subEntry.name}"`);

          try {
            const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

            for (const subSubEntry of subSubEntries) {
              if (subSubEntry.isDirectory()) {
                console.log(`    📖 孙目录: "${subSubEntry.name}"`);
                console.log(`    ⚠️ 发现三级目录！`);
              } else {
                console.log(`    📄 文件: "${subSubEntry.name}"`);
              }
            }
          } catch (e) {
            console.log(`    ❌ 无法读取: ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`  ❌ 无法读取: ${e.message}`);
      }
    }

    console.log(`\n✅ 检查完成！`);
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkDirectories();
