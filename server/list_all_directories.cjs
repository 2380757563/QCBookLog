const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始列出所有目录...\n');

async function listAllDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);
      console.log(`\n📁 目录: "${entry.name}"`);
      console.log(`   完整路径: ${entryPath}`);
      console.log(`   字符编码: ${Buffer.from(entry.name).toString('hex')}`);

      try {
        const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isDirectory()) continue;

          const subEntryPath = path.join(entryPath, subEntry.name);
          console.log(`  📂 子目录: "${subEntry.name}"`);
          console.log(`     完整路径: ${subEntryPath}`);
          console.log(`     字符编码: ${Buffer.from(subEntry.name).toString('hex')}`);

          try {
            const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

            for (const subSubEntry of subSubEntries) {
              if (subSubEntry.isDirectory()) {
                console.log(`    📖 孙目录: "${subSubEntry.name}"`);
                console.log(`       完整路径: ${path.join(subEntryPath, subSubEntry.name)}`);
                console.log(`       字符编码: ${Buffer.from(subSubEntry.name).toString('hex')}`);
                console.log(`       ⚠️ 发现三级目录！`);
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

    console.log(`\n✅ 列出完成！`);
  } catch (error) {
    console.error('❌ 列出失败:', error);
  }
}

listAllDirectories();
