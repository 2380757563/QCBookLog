const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始手动修复三级目录...\n');

async function manualFixThreeLevel() {
  try {
    const fixes = [
      {
        oldAuthorDir: '周新霞 主编 ',
        oldSubDir: ' 姜富海、林鸿飞、王姜永 编著',
        oldBookDir: '一剪光影：华语影坛当代剪辑师访谈录',
        newAuthorDir: '周新霞 主编 、 姜富海、林鸿飞、王姜永 编著',
        newBookDir: '一剪光影：华语影坛当代剪辑师访谈录'
      },
      {
        oldAuthorDir: '罗杰·伊伯特（Roger Ebert） ',
        oldSubDir: ' 李尚 & 李尚',
        oldBookDir: '伟大的电影：终章',
        newAuthorDir: '罗杰·伊伯特（Roger Ebert） 、 李尚 & 李尚',
        newBookDir: '伟大的电影：终章'
      }
    ];

    let fixedCount = 0;

    for (const fix of fixes) {
      console.log(`\n📁 处理书籍: ${fix.oldBookDir}`);
      console.log(`   原路径: ${fix.oldAuthorDir}/${fix.oldSubDir}/${fix.oldBookDir}`);
      console.log(`   新路径: ${fix.newAuthorDir}/${fix.newBookDir}`);

      const oldBookPath = path.join(BOOK_DIR, fix.oldAuthorDir, fix.oldSubDir, fix.oldBookDir);
      const newBookPath = path.join(BOOK_DIR, fix.newAuthorDir, fix.newBookDir);

      try {
        await fs.promises.access(oldBookPath);
        console.log(`   ✅ 旧路径存在`);

        await fs.promises.mkdir(path.join(BOOK_DIR, fix.newAuthorDir), { recursive: true });
        await fs.promises.rename(oldBookPath, newBookPath);
        console.log(`   ✅ 已移动到新路径`);
        fixedCount++;

        try {
          await fs.promises.rmdir(path.join(BOOK_DIR, fix.oldAuthorDir, fix.oldSubDir));
          console.log(`   🗑️ 已删除中间目录`);
        } catch (e) {
          console.log(`   ℹ️ 中间目录不为空，保留`);
        }

        try {
          await fs.promises.rmdir(path.join(BOOK_DIR, fix.oldAuthorDir));
          console.log(`   🗑️ 已删除父目录`);
        } catch (e) {
          console.log(`   ℹ️ 父目录不为空，保留`);
        }
      } catch (e) {
        console.log(`   ℹ️ 旧路径不存在或已修复: ${e.message}`);
      }
    }

    console.log(`\n🎉 修复完成！`);
    console.log(`✅ 修复书籍数: ${fixedCount}`);
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

manualFixThreeLevel();
