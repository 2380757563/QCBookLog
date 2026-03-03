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

      try {
        const subEntries = await fs.promises.readdir(entryPath, { withFileTypes: true });

        for (const subEntry of subEntries) {
          if (!subEntry.isDirectory()) continue;

          const subEntryPath = path.join(entryPath, subEntry.name);

          try {
            const subSubEntries = await fs.promises.readdir(subEntryPath, { withFileTypes: true });

            for (const subSubEntry of subSubEntries) {
              if (!subSubEntry.isDirectory()) continue;

              const bookPath = path.join(subEntryPath, subSubEntry.name);
              const newAuthorName = `${entry.name.trim()}、${subEntry.name.trim()}`.replace(/[\/\\]/g, '');
              const newBookPath = path.join(BOOK_DIR, newAuthorName, subSubEntry.name);

              console.log(`\n📖 处理书籍: ${subSubEntry.name}`);
              console.log(`   原路径: ${entry.name}/${subEntry.name}/${subSubEntry.name}`);
              console.log(`   新路径: ${newAuthorName}/${subSubEntry.name}`);

              try {
                await fs.promises.mkdir(path.join(BOOK_DIR, newAuthorName), { recursive: true });
                await fs.promises.rename(bookPath, newBookPath);
                console.log(`   ✅ 移动成功`);
                processedCount++;

                try {
                  await fs.promises.rmdir(subEntryPath);
                  console.log(`   🗑️ 已删除中间目录`);
                } catch (e) {
                  console.log(`   ℹ️ 中间目录不为空，保留`);
                }

                try {
                  await fs.promises.rmdir(entryPath);
                  console.log(`   🗑️ 已删除父目录`);
                } catch (e) {
                  console.log(`   ℹ️ 父目录不为空，保留`);
                }
              } catch (e) {
                console.log(`   ❌ 移动失败: ${e.message}`);
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

    console.log(`\n🎉 处理完成！`);
    console.log(`✅ 处理书籍数: ${processedCount}`);
  } catch (error) {
    console.error('❌ 处理失败:', error);
  }
}

processDirectoriesWithBackslash();
