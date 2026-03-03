/**
 * 测试书籍编辑功能
 * 验证所有字段是否能正确保存到数据库
 */

const http = require('http');

const BASE_URL = 'http://localhost:7401/api';

// 测试数据
const testBook = {
  title: '测试书籍-编辑功能验证',
  author: '测试作者',
  isbn: '9787111111111',
  publisher: '测试出版社',
  publishYear: 2024,
  pages: 300,
  binding1: 2, // 精装
  binding2: 1, // 硬壳精装（圆脊）
  paper1: 3, // 道林纸
  edge1: 2, // 多侧（书口+天头/地脚）
  edge2: 2, // 烫边（烫金/银）
  book_type: 1, // 实体书
  purchaseDate: new Date().toISOString(),
  purchasePrice: 58.00,
  standardPrice: 68.00,
  note: '这是一个测试备注，用于验证编辑功能是否正常工作',
  description: '这是一本测试书籍的简介',
  tags: ['测试标签1', '测试标签2'],
  groups: [],
  series: '测试丛书',
  language: 'zh',
  readStatus: '未读',
  rating: 4
};

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testBookEdit() {
  console.log('🧪 开始测试书籍编辑功能...\n');

  try {
    // 步骤1: 创建测试书籍
    console.log('📝 步骤1: 创建测试书籍');
    const createResult = await makeRequest('POST', '/books', testBook);
    
    if (createResult.statusCode !== 201) {
      console.error('❌ 创建书籍失败:', createResult);
      return;
    }
    
    const createdBook = createResult.data;
    console.log('✅ 书籍创建成功:', {
      id: createdBook.id,
      title: createdBook.title,
      binding1: createdBook.binding1,
      binding2: createdBook.binding2,
      paper1: createdBook.paper1,
      edge1: createdBook.edge1,
      edge2: createdBook.edge2,
      purchasePrice: createdBook.purchasePrice,
      standardPrice: createdBook.standardPrice,
      note: createdBook.note ? createdBook.note.substring(0, 30) + '...' : '无'
    });

    // 步骤2: 修改书籍数据
    console.log('\n📝 步骤2: 修改书籍数据');
    const updatedData = {
      ...createdBook,
      binding1: 1, // 改为平装
      binding2: 2, // 改为骑马钉装订
      paper1: 2, // 改为轻型纸
      edge1: 1, // 改为书口单侧
      edge2: 3, // 改为磨边（毛边）
      purchasePrice: 45.00,
      standardPrice: 55.00,
      note: '这是修改后的备注，验证编辑功能是否正常工作',
      pages: 350,
      publisher: '修改后的出版社'
    };

    const updateResult = await makeRequest('PUT', `/books/${createdBook.id}`, updatedData);
    
    if (updateResult.statusCode !== 200) {
      console.error('❌ 更新书籍失败:', updateResult);
      return;
    }
    
    const updatedBook = updateResult.data;
    console.log('✅ 书籍更新成功:', {
      id: updatedBook.id,
      title: updatedBook.title,
      binding1: updatedBook.binding1,
      binding2: updatedBook.binding2,
      paper1: updatedBook.paper1,
      edge1: updatedBook.edge1,
      edge2: updatedBook.edge2,
      purchasePrice: updatedBook.purchasePrice,
      standardPrice: updatedBook.standardPrice,
      note: updatedBook.note ? updatedBook.note.substring(0, 30) + '...' : '无',
      pages: updatedBook.pages,
      publisher: updatedBook.publisher
    });

    // 步骤3: 验证数据是否正确保存
    console.log('\n📝 步骤3: 验证数据是否正确保存');
    const getResult = await makeRequest('GET', `/books/${createdBook.id}`);
    
    if (getResult.statusCode !== 200) {
      console.error('❌ 获取书籍失败:', getResult);
      return;
    }
    
    const verifiedBook = getResult.data;
    
    // 验证关键字段
    const fieldsToVerify = [
      { name: 'binding1', expected: 1, actual: verifiedBook.binding1 },
      { name: 'binding2', expected: 2, actual: verifiedBook.binding2 },
      { name: 'paper1', expected: 2, actual: verifiedBook.paper1 },
      { name: 'edge1', expected: 1, actual: verifiedBook.edge1 },
      { name: 'edge2', expected: 3, actual: verifiedBook.edge2 },
      { name: 'purchasePrice', expected: 45.00, actual: verifiedBook.purchasePrice },
      { name: 'standardPrice', expected: 55.00, actual: verifiedBook.standardPrice },
      { name: 'pages', expected: 350, actual: verifiedBook.pages },
      { name: 'publisher', expected: '修改后的出版社', actual: verifiedBook.publisher }
    ];

    let allPassed = true;
    for (const field of fieldsToVerify) {
      const passed = field.actual === field.expected;
      allPassed = allPassed && passed;
      console.log(`${passed ? '✅' : '❌'} ${field.name}: ${field.actual} ${passed ? '==' : '!='} ${field.expected}`);
    }

    if (allPassed) {
      console.log('\n🎉 所有字段验证通过！编辑功能修复成功！');
    } else {
      console.log('\n⚠️ 部分字段验证失败，请检查');
    }

    // 步骤4: 清理测试数据
    console.log('\n📝 步骤4: 清理测试数据');
    const deleteResult = await makeRequest('DELETE', `/books/${createdBook.id}`);
    
    if (deleteResult.statusCode === 200) {
      console.log('✅ 测试数据清理完成');
    } else {
      console.warn('⚠️ 清理测试数据失败，请手动删除书籍ID:', createdBook.id);
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 运行测试
testBookEdit();
