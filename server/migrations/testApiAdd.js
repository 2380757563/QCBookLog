const testAdd = async () => {
  console.log('========================================');
  console.log('📚 测试添加书籍 API');
  console.log('========================================\n');

  const addData = {
    title: '测试书籍_API_' + Date.now(),
    author: '测试作者',
    publisher: '测试出版社',
    isbn: '9999999999999'
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

    // 验证
    console.log('\n验证:');
    const verifyResponse = await fetch(`http://localhost:7401/api/books/${result.id}`);
    const verifyResult = await verifyResponse.json();
    console.log('验证结果:', JSON.stringify(verifyResult, null, 2).substring(0, 500));

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAdd();
