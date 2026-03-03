const path = require('path');

console.log('📚 开始测试路径生成逻辑...\n');

const testCases = [
  {
    author: '周新霞 主编 / 姜富海、林鸿飞、王姜永 编著',
    title: '一剪光影：华语影坛当代剪辑师访谈录',
    expected: '周新霞 主编  姜富海、林鸿飞、王姜永 编著/一剪光影：华语影坛当代剪辑师访谈录'
  },
  {
    author: '刘慈欣',
    title: '三体',
    expected: '刘慈欣/三体'
  },
  {
    author: '罗杰·伊伯特（Roger Ebert） / 李尚 & 李尚',
    title: '伟大的电影：终章',
    expected: '罗杰·伊伯特（Roger Ebert）  李尚 & 李尚/伟大的电影：终章'
  },
  {
    author: '  多余空格的作者  ',
    title: '  多余空格的书名  ',
    expected: '多余空格的作者/多余空格的书名'
  },
  {
    author: '反斜杠\\测试作者',
    title: '反斜杠\\测试书名',
    expected: '反斜杠测试作者/反斜杠测试书名'
  },
  {
    author: '正斜杠/测试作者',
    title: '正斜杠/测试书名',
    expected: '正斜杠测试作者/正斜杠测试书名'
  }
];

function generatePath(author, title) {
  const cleanAuthor = (author || '未知作者').replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
  const cleanTitle = (title || '未知书名').replace(/[\/\\]/g, '').replace(/\s+/g, ' ').trim();
  return `${cleanAuthor}/${cleanTitle}`;
}

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = generatePath(testCase.author, testCase.title);
  const isCorrect = result === testCase.expected;

  console.log(`📖 测试用例: ${testCase.title}`);
  console.log(`   作者: ${testCase.author}`);
  console.log(`   期望路径: ${testCase.expected}`);
  console.log(`   实际路径: ${result}`);
  console.log(`   结果: ${isCorrect ? '✅ 通过' : '❌ 失败'}`);

  if (isCorrect) {
    passed++;
  } else {
    failed++;
  }
  console.log('');
}

console.log(`\n📊 测试结果:`);
console.log(`   ✅ 通过: ${passed}/${testCases.length}`);
console.log(`   ❌ 失败: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log(`\n🎉 所有测试用例都通过！`);
} else {
  console.log(`\n⚠️ 有 ${failed} 个测试用例失败`);
}

process.exit(failed === 0 ? 0 : 1);
