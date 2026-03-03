const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始处理特定的三级目录...\n');

async function processSpecificDirectories() {
  try {
    const fixes = [
      {
        oldPath: path.join(BOOK_DIR, '周新霞 主编 ', ' 姜富海、林鸿飞、王姜永 编著', '一剪光影：华语影坛当代剪辑师访谈录'),
        newPath: path.join(BOOK_DIR, '周新霞 主编 、 姜富海、林鸿飞、王姜永 编著', '一剪光影：华语影坛当代剪辑师访谈录')
      },
      {
        oldPath: path.join(BOOK_DIR, '罗杰·伊伯特（Roger Ebert） ', ' 李尚 & 李尚', '伟大的电影：终章'),
        newPath: path.join(BOOK_DIR, '罗杰·伊伯特（Roger Ebert） 、 李尚 & 李尚', '伟大的电影：终章')
      }
    ];

    let fixedCount = 0;

    for (const fix of fixes) {
      console.log(`\n📁 检查路径: ${fix.oldPath}`);

      try {
        await fs.promises.access(fix.oldPath);
        console.log(`  ✅ 旧路径存在`);

        await fs.promises.mkdir(path.dirname(fix.newPath), { recursive: true });
        await fs.promises.rename(fix.oldPath, fix.newPath);
        console.log(`  ✅ 已移动到: ${fix.newPath}`);
        fixedCount++;

        try {
          await fs.promises.rmdir(path.dirname(fix.oldPath));
          console.log(`  🗑️ 已删除中间目录`);
        } catch (e) {
          console.log(`  ℹ️ 中间目录不为空，保留`);
        }

        try {
          await fs.promises.rmdir(path.dirname(path.dirname(fix.oldPath)));
          console.log(`  🗑️ 已删除父目录`);
        } catch (e) {
          console.log(`  ℹ️ 父目录不为空，保留`);
        }
      } catch (e) {
        console.log(`  ℹ️ 旧路径不存在或已修复: ${e.message}`);
      }
    }

    console.log(`\n🎉 处理完成！`);
    console.log(`✅ 处理书籍数: ${fixedCount}`);
  } catch (error) {
    console.error('❌ 处理失败:', error);
  }
}

processSpecificDirectories();
