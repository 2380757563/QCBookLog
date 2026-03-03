const fs = require('fs');
const path = require('path');

const BOOK_DIR = path.join(__dirname, 'data', 'calibre');

console.log('📚 开始检查特定目录...\n');

async function checkSpecificDirectory() {
  try {
    const specificPath = path.join(BOOK_DIR, '周新霞 主编 ', ' 姜富海、林鸿飞、王姜永 编著');
    console.log(`检查路径: ${specificPath}`);

    try {
      const files = await fs.promises.readdir(specificPath, { withFileTypes: true });
      console.log(`\n找到 ${files.length} 个项目:`);

      for (const file of files) {
        if (file.isDirectory()) {
          console.log(`  📖 目录: ${file.name}`);
        } else {
          console.log(`  📄 文件: ${file.name}`);
        }
      }
    } catch (e) {
      console.log(`❌ 无法读取目录: ${e.message}`);
    }
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkSpecificDirectory();
