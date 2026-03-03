const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始修复三级目录结构...\n');

async function fixThreeLevelDirectories() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let fixedCount = 0;

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
          console.log(`    ⚠️ 发现三级目录结构！`);

          for (const subSubEntry of subSubEntries) {
            if (!subSubEntry.isDirectory()) continue;

            const bookPath = path.join(subEntryPath, subSubEntry.name);
            const newAuthorName = `${entry.name.trim()}、${subEntry.name.trim()}`.replace(/[\/\\]/g, '');
            const newBookPath = path.join(BOOK_DIR, newAuthorName, subSubEntry.name);

            console.log(`    📖 书籍: "${subSubEntry.name}"`);
            console.log(`    🔄 新路径: "${newAuthorName}/${subSubEntry.name}"`);

            try {
              await fs.promises.mkdir(path.join(BOOK_DIR, newAuthorName), { recursive: true });
              await fs.promises.rename(bookPath, newBookPath);
              console.log(`    ✅ 移动成功`);
              fixedCount++;
            } catch (e) {
              console.log(`    ❌ 移动失败: ${e.message}`);
            }
          }

          try {
            await fs.promises.rmdir(subEntryPath);
            console.log(`  🗑️ 删除中间目录: "${subEntry.name}"`);
          } catch (e) {
            console.log(`  ℹ️ 中间目录不为空，保留`);
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

    console.log(`\n🎉 修复完成！`);
    console.log(`✅ 修复书籍数: ${fixedCount}`);
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixThreeLevelDirectories();
