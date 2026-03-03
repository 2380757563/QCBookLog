const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始分析目录结构...\n');

async function analyzeDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 目录: "${entry.name}"`);
      console.log(`   完整路径: ${entryPath}`);

      try {
        const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });
        console.log(`   子目录数量: ${subEntries.filter(e => e.isDirectory()).length}`);

        for (const subEntry of subEntries) {
          if (!subEntry.isDirectory()) continue;

          const subEntryPath = path.join(entryPath, subEntry.name);
          console.log(`     📂 子目录: "${subEntry.name}"`);

          try {
            const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });
            console.log(`       子子目录数量: ${subSubEntries.filter(e => e.isDirectory()).length}`);

            for (const subSubEntry of subSubEntries) {
              if (subSubEntry.isDirectory()) {
                console.log(`         📖 孙目录: "${subSubEntry.name}"`);
                console.log(`         ⚠️ 发现三级目录！`);
              }
            }
          } catch (e) {
            console.log(`       ❌ 无法读取: ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`   ❌ 无法读取: ${e.message}`);
      }
    }

    console.log(`\n✅ 分析完成！`);
  } catch (error) {
    console.error('❌ 分析失败:', error);
  }
}

analyzeDirectories();
