const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始检查特定目录...\n');

async function checkSpecificDirectories() {
  try {
    const checks = [
      '周新霞 主编 \\ 姜富海、林鸿飞、王姜永 编著\\一剪光影：华语影坛当代剪辑师访谈录',
      '罗杰·伊伯特（Roger Ebert） \\ 李尚 & 李尚\\伟大的电影：终章'
    ];

    for (const check of checks) {
      console.log(`\n📁 检查路径: ${check}`);
      const fullPath = path.join(BOOK_DIR, check);
      console.log(`   完整路径: ${fullPath}`);

      try {
        await fs.promises.access(fullPath);
        console.log(`   ✅ 路径存在`);

        const files = await fs.promises.readdir(fullPath);
        console.log(`   文件列表: ${files.join(', ')}`);
      } catch (e) {
        console.log(`   ❌ 路径不存在: ${e.message}`);
      }
    }

    console.log(`\n✅ 检查完成！`);
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkSpecificDirectories();
