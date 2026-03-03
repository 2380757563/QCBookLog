const http = require('http');

const BASE_URL = 'http://localhost:7401';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body });
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testScenario1() {
  console.log('\n🧪 测试场景1：更新部分字段（只更新价格信息）');
  console.log('=' .repeat(60));

  const updateData = {
    purchasePrice: 88,
    standardPrice: 98
  };

  console.log('📝 发送更新请求:', JSON.stringify(updateData, null, 2));
  const updateResponse = await makeRequest('PUT', '/api/books/95', updateData);
  console.log('📝 更新响应状态码:', updateResponse.statusCode);

  if (updateResponse.statusCode === 200) {
    console.log('✅ 更新成功，等待2秒后查询...');
    await sleep(2000);

    const getResponse = await makeRequest('GET', '/api/books/95');
    console.log('📚 书籍数据:');
    const book = getResponse.data;
    console.log('  id:', book.id);
    console.log('  title:', book.title);
    console.log('  purchasePrice:', book.purchasePrice);
    console.log('  standardPrice:', book.standardPrice);
    console.log('  binding1:', book.binding1);
    console.log('  paper1:', book.paper1);

    const success = book.purchasePrice === 88 && book.standardPrice === 98;
    if (success) {
      console.log('✅ 部分字段更新成功！');
    } else {
      console.log('❌ 部分字段更新失败！');
    }
  } else {
    console.log('❌ 更新失败');
  }
}

async function testScenario2() {
  console.log('\n🧪 测试场景2：更新所有字段');
  console.log('=' .repeat(60));

  const updateData = {
    title: '测试书籍-完整更新',
    author: '完整作者',
    isbn: '9787222222222',
    binding1: 3,
    binding2: 2,
    paper1: 4,
    edge1: 3,
    edge2: 3,
    purchasePrice: 128,
    standardPrice: 168,
    note: '这是完整测试备注',
    pages: 450,
    publishYear: 2024
  };

  console.log('📝 发送更新请求:', JSON.stringify(updateData, null, 2));
  const updateResponse = await makeRequest('PUT', '/api/books/95', updateData);
  console.log('📝 更新响应状态码:', updateResponse.statusCode);

  if (updateResponse.statusCode === 200) {
    console.log('✅ 更新成功，等待2秒后查询...');
    await sleep(2000);

    const getResponse = await makeRequest('GET', '/api/books/95');
    console.log('📚 书籍数据:');
    const book = getResponse.data;
    console.log('  title:', book.title);
    console.log('  author:', book.author);
    console.log('  isbn:', book.isbn);
    console.log('  binding1:', book.binding1);
    console.log('  binding2:', book.binding2);
    console.log('  paper1:', book.paper1);
    console.log('  edge1:', book.edge1);
    console.log('  edge2:', book.edge2);
    console.log('  purchasePrice:', book.purchasePrice);
    console.log('  standardPrice:', book.standardPrice);
    console.log('  note:', book.note);
    console.log('  pages:', book.pages);
    console.log('  publishYear:', book.publishYear);

    const checks = [
      book.title === '测试书籍-完整更新',
      book.author === '完整作者',
      book.isbn === '9787222222222',
      book.binding1 === 3,
      book.binding2 === 2,
      book.paper1 === 4,
      book.edge1 === 3,
      book.edge2 === 3,
      book.purchasePrice === 128,
      book.standardPrice === 168,
      book.note === '这是完整测试备注',
      book.pages === 450,
      book.publishYear === 2024
    ];

    const success = checks.every(c => c);
    if (success) {
      console.log('✅ 所有字段更新成功！');
    } else {
      console.log('❌ 部分字段更新失败！');
      checks.forEach((check, i) => {
        if (!check) {
          console.log(`  ❌ 检查项 ${i + 1} 失败`);
        }
      });
    }
  } else {
    console.log('❌ 更新失败');
  }
}

async function testScenario3() {
  console.log('\n🧪 测试场景3：清空字段（设置为0或空字符串）');
  console.log('=' .repeat(60));

  const updateData = {
    binding1: 0,
    binding2: 0,
    paper1: 0,
    edge1: 0,
    edge2: 0,
    purchasePrice: 0,
    standardPrice: 0,
    note: ''
  };

  console.log('📝 发送更新请求:', JSON.stringify(updateData, null, 2));
  const updateResponse = await makeRequest('PUT', '/api/books/95', updateData);
  console.log('📝 更新响应状态码:', updateResponse.statusCode);

  if (updateResponse.statusCode === 200) {
    console.log('✅ 更新成功，等待2秒后查询...');
    await sleep(2000);

    const getResponse = await makeRequest('GET', '/api/books/95');
    console.log('📚 书籍数据:');
    const book = getResponse.data;
    console.log('  binding1:', book.binding1);
    console.log('  binding2:', book.binding2);
    console.log('  paper1:', book.paper1);
    console.log('  edge1:', book.edge1);
    console.log('  edge2:', book.edge2);
    console.log('  purchasePrice:', book.purchasePrice);
    console.log('  standardPrice:', book.standardPrice);
    console.log('  note:', book.note);

    const checks = [
      book.binding1 === 0,
      book.binding2 === 0,
      book.paper1 === 0,
      book.edge1 === 0,
      book.edge2 === 0,
      book.purchasePrice === 0,
      book.standardPrice === 0,
      book.note === ''
    ];

    const success = checks.every(c => c);
    if (success) {
      console.log('✅ 字段清空成功！');
    } else {
      console.log('❌ 部分字段清空失败！');
    }
  } else {
    console.log('❌ 更新失败');
  }
}

async function main() {
  console.log('🚀 开始全面测试书籍编辑功能');
  console.log('=' .repeat(60));

  try {
    await testScenario1();
    await testScenario2();
    await testScenario3();

    console.log('\n🎉 所有测试场景完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

main();
