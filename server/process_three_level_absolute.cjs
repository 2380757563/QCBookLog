const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始处理三级目录...\n');

async function processThreeLevelDirectories() {
  try {
    const fixes = [
      {
        oldPath: 'D:\\下载\\docs-xmnote-master\\QC-booklog\\server\\data\\calibre\\周新霞 主编 \\ 姜富海、林鸿飞、王姜永 编著\\一剪光影：华语影坛当代剪辑师访谈录',
        newPath: 'D:\\下载\\docs-xmnote-master\\QC-booklog\\server\\data\\calibre\\周新霞 主编 、 姜富海、林鸿飞、王姜永 编著\\一剪光影：华语影坛当代剪辑师访谈录'
      },
      {
        oldPath: 'D:\\下载\\docs-xmnote-master\\QC-booklog\\server\\data\\calibre\\罗杰·伊伯特（Roger Ebert） \\ 李尚 & 李尚\\伟大的电影：终章',
        newPath: 'D:\\下载\\docs-xmnote-master\\QC-booklog\\server\\data\\calibre\\罗杰·伊伯特（Roger Ebert） 、 李尚 & 李尚\\伟大的电影：终章'
      }
    ];

    let processedCount = 0;

    for (const fix of fixes) {
      console.log(`\n📖 处理书籍`);
      console.log(`   旧路径: ${fix.oldPath}`);
      console.log(`   新路径: ${fix.newPath}`);

      try {
        await fs.promises.access(fix.oldPath);
        console.log(`   ✅ 旧路径存在`);

        await fs.promises.mkdir(path.dirname(fix.newPath), { recursive: true });
        await fs.promises.rename(fix.oldPath, fix.newPath);
        console.log(`   ✅ 已移动到新路径`);
        processedCount++;

        try {
          await fs.promises.rmdir(path.dirname(fix.oldPath));
          console.log(`   🗑️ 已删除中间目录`);
        } catch (e) {
          console.log(`   ℹ️ 中间目录不为空，保留`);
        }

        try {
          await fs.promises.rmdir(path.dirname(path.dirname(fix.oldPath)));
          console.log(`   🗑️ 已删除父目录`);
        } catch (e) {
          console.log(`   ℹ️ 父目录不为空，保留`);
        }
      } catch (e) {
        console.log(`   ℹ️ 旧路径不存在或已修复: ${e.message}`);
      }
    }

    console.log(`\n🎉 处理完成！`);
    console.log(`✅ 处理书籍数: ${processedCount}`);
  } catch (error) {
    console.error('❌ 处理失败:', error);
  }
}

processThreeLevelDirectories();
