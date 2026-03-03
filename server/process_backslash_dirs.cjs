const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始处理包含反斜杠的目录...\n');

async function processDirectoriesWithBackslash() {
  try {
    const entries = await fs.promises.readdir(BOOK_DIR, { withFileTypes: true });
    let processedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(BOOK_DIR, entry.name);

      if (entry.name.includes('\\')) {
        console.log(`\n📁 发现包含反斜杠的目录: "${entry.name}"`);

        const newName = entry.name.replace(/\\/g, '、');
        const newPath = path.join(BOOK_DIR, newName);

        console.log(`  🔄 重命名为: "${newName}"`);

        try {
          await fs.promises.rename(entryPath, newPath);
          console.log(`  ✅ 重命名成功`);
          processedCount++;
        } catch (e) {
          console.log(`  ❌ 重命名失败: ${e.message}`);
        }
      }
    }

    console.log(`\n🎉 处理完成！`);
    console.log(`✅ 处理目录数: ${processedCount}`);
  } catch (error) {
    console.error('❌ 处理失败:', error);
  }
}

processDirectoriesWithBackslash();
