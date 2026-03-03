const testAdd = async () => {
  console.log('========================================');
  console.log('📚 测试添加书籍 API（验证 last_modified）');
  console.log('========================================\n');

  const addData = {
    title: '测试书籍_last_modified_' + Date.now(),
    author: '测试作者',
    publisher: '测试出版社',
    isbn: '9999999999998'
  };

  console.log('📤 发送添加请求...');
  console.log('数据:', JSON.stringify(addData, null, 2));

  try {
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addData)
    });

    const result = await response.json();
    console.log('\n📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));

    // 获取书籍列表验证排序
    console.log('\n验证书籍列表排序:');
    const listResponse = await fetch('http://localhost:7401/api/books?noCache=true');
    const listResult = await listResponse.json();
    
    console.log('前5本书籍:');
    listResult.slice(0, 5).forEach((b, i) => {
      console.log(`  ${i+1}. ID=${b.id}, 标题="${b.title}", last_modified=${b.last_modified}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAdd();
