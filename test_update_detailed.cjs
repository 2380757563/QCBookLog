const http = require('http');

const BASE_URL = 'localhost:7401';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7401,
      path: path,
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

async function testUpdate() {
  console.log('🧪 测试更新书籍ID 95...\n');

  const updateData = {
    title: '测试书籍-已更新v2',
    author: '测试作者',
    isbn: '9787111111111',
    binding1: 2,
    binding2: 1,
    paper1: 3,
    edge1: 2,
    edge2: 2,
    purchasePrice: 58.00,
    standardPrice: 68.00,
    note: '这是测试备注v2',
    pages: 300
  };

  console.log('📝 发送更新请求:', JSON.stringify(updateData, null, 2));
  const updateResult = await makeRequest('PUT', '/api/books/95', updateData);
  console.log('📝 更新响应状态码:', updateResult.statusCode);
  
  if (updateResult.statusCode === 200) {
    console.log('✅ 更新成功，等待2秒后查询...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📝 查询更新后的数据...');
    const getResult = await makeRequest('GET', '/api/books/95');
    
    if (getResult.statusCode === 200) {
      const book = getResult.data;
      console.log('📚 书籍数据:');
      console.log('  id:', book.id);
      console.log('  title:', book.title);
      console.log('  binding1:', book.binding1);
      console.log('  binding2:', book.binding2);
      console.log('  paper1:', book.paper1);
      console.log('  edge1:', book.edge1);
      console.log('  edge2:', book.edge2);
      console.log('  purchasePrice:', book.purchasePrice);
      console.log('  standardPrice:', book.standardPrice);
      console.log('  note:', book.note);
      console.log('  pages:', book.pages);
      
      const fieldsToVerify = [
        { name: 'binding1', expected: 2, actual: book.binding1 },
        { name: 'binding2', expected: 1, actual: book.binding2 },
        { name: 'paper1', expected: 3, actual: book.paper1 },
        { name: 'edge1', expected: 2, actual: book.edge1 },
        { name: 'edge2', expected: 2, actual: book.edge2 },
        { name: 'purchasePrice', expected: 58.00, actual: book.purchasePrice },
        { name: 'standardPrice', expected: 68.00, actual: book.standardPrice },
        { name: 'note', expected: '这是测试备注v2', actual: book.note },
        { name: 'pages', expected: 300, actual: book.pages }
      ];

      console.log('\n📊 验证结果:');
      let allPassed = true;
      for (const field of fieldsToVerify) {
        const passed = field.actual === field.expected;
        allPassed = allPassed && passed;
        console.log(`${passed ? '✅' : '❌'} ${field.name}: ${field.actual} ${passed ? '==' : '!='} ${field.expected}`);
      }

      if (allPassed) {
        console.log('\n🎉 所有字段验证通过！');
      } else {
        console.log('\n⚠️ 部分字段验证失败');
      }
    }
  }
}

testUpdate();
