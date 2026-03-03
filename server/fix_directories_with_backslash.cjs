const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始修复包含反斜杠的目录...\n');

async function fixDirectoriesWithBackslash() {
  try {
    const oldPaths = [
      path.join(BOOK_DIR, '周新霞 主编 ', ' 姜富海、林鸿飞、王姜永 编著', '一剪光影：华语影坛当代剪辑师访谈录'),
      path.join(BOOK_DIR, '罗杰·伊伯特（Roger Ebert） ', ' 李尚 & 李尚', '伟大的电影：终章')
    ];

    const newPaths = [
      path.join(BOOK_DIR, '周新霞 主编 、 姜富海、林鸿飞、王姜永 编著', '一剪光影：华语影坛当代剪辑师访谈录'),
      path.join(BOOK_DIR, '罗杰·伊伯特（Roger Ebert） 、 李尚 & 李尚', '伟大的电影：终章')
    ];

    for (let i = 0; i < oldPaths.length; i++) {
      console.log(`\n📁 检查路径: ${oldPaths[i]}`);

      try {
        await fs.promises.access(oldPaths[i]);
        console.log(`  ✅ 旧路径存在`);

        await fs.promises.mkdir(path.dirname(newPaths[i]), { recursive: true });
        await fs.promises.rename(oldPaths[i], newPaths[i]);
        console.log(`  ✅ 已移动到: ${newPaths[i]}`);

        try {
          await fs.promises.rmdir(path.dirname(oldPaths[i]));
          console.log(`  🗑️ 已删除中间目录`);
        } catch (e) {
          console.log(`  ℹ️ 中间目录不为空，保留`);
        }

        try {
          await fs.promises.rmdir(path.dirname(path.dirname(oldPaths[i])));
          console.log(`  🗑️ 已删除父目录`);
        } catch (e) {
          console.log(`  ℹ️ 父目录不为空，保留`);
        }
      } catch (e) {
        console.log(`  ℹ️ 旧路径不存在或已修复: ${e.message}`);
      }
    }

    console.log(`\n🎉 修复完成！`);
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixDirectoriesWithBackslash();
