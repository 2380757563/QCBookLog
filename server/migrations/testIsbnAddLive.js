const testIsbnAdd = async () => {
  console.log('========================================');
  console.log('📚 测试 ISBN 添加书籍');
  console.log('========================================\n');

  const ISBN = '9787020024751'; // 活着

  console.log('步骤 1: 调用 DBR API 获取图书元数据');
  console.log('----------------------------------------');
  
  try {
    const dbrResponse = await fetch(`http://localhost:7401/api/douban/book/isbn/${ISBN}`);
    const dbrData = await dbrResponse.json();
    
    if (!dbrResponse.ok) {
      console.log('❌ DBR API 调用失败:', dbrData);
      return;
    }
    
    console.log('✅ 成功获取图书元数据:');
    console.log('  标题:', dbrData.title);
    console.log('  作者:', dbrData.author);
    console.log('  出版社:', dbrData.publisher);
    console.log('  ISBN:', dbrData.isbn13 || ISBN);

    console.log('\n步骤 2: 添加图书到书架');
    console.log('----------------------------------------');
    
    const addData = {
      title: dbrData.title,
      author: dbrData.author ? dbrData.author.join(' & ') : '未知',
      publisher: dbrData.publisher || '',
      pubdate: dbrData.pubdate || null,
      isbn: dbrData.isbn13 || ISBN,
      pages: dbrData.pages || 0,
      description: dbrData.summary || '',
      tags: dbrData.tags || [],
      rating: dbrData.rating?.average || 0
    };

    console.log('📤 发送添加请求...');
    console.log('  标题:', addData.title);
    console.log('  作者:', addData.author);
    console.log('  ISBN:', addData.isbn);

    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addData)
    });

    const result = await response.json();
    console.log('\n📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));

    console.log('\n步骤 3: 验证书籍是否添加成功');
    console.log('----------------------------------------');
    
    const verifyResponse = await fetch(`http://localhost:7401/api/books/${result.id}`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok) {
      console.log('✅ 书籍已添加到系统:');
      console.log('  ID:', verifyResult.id);
      console.log('  标题:', verifyResult.title);
      console.log('  last_modified:', verifyResult.last_modified);
    } else {
      console.log('❌ 书籍验证失败:', verifyResult);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testIsbnAdd();
