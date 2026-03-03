const testAdd = async () => {
  console.log('========================================');
  console.log('📚 测试添加已存在的书籍');
  console.log('========================================\n');

  // 使用一个已存在的 ISBN
  const addData = {
    title: '黄金时代',
    author: '王小波',
    publisher: '北京十月文艺出版社',
    isbn: '9787530220290'
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
    console.log('\n返回的书籍 ID:', result.id);
    console.log('返回的书籍标题:', result.title);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAdd();
