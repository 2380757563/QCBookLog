const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始修复包含反斜杠的目录名...\n');

async function fixBackslashInDirNames() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let fixedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);

      if (entry.name.includes('\\') || entry.name.includes('/')) {
        console.log(`\n📁 发现包含路径分隔符的目录: "${entry.name}"`);

        const newName = entry.name.replace(/[\/\\]/g, '、');
        const newPath = path.join(BOOK_DIR, newName);

        console.log(`  🔄 重命名为: "${newName}"`);

        try {
          await fs.promises.rename(entryPath, newPath);
          console.log(`  ✅ 重命名成功`);
          fixedCount++;
        } catch (e) {
          console.log(`  ❌ 重命名失败: ${e.message}`);
        }
      }
    }

    console.log(`\n🎉 修复完成！`);
    console.log(`✅ 修复目录数: ${fixedCount}`);
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixBackslashInDirNames();
