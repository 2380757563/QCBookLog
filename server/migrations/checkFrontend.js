const checkFrontend = async () => {
  console.log('========================================');
  console.log('📚 检查前端数据一致性');
  console.log('========================================\n');

  try {
    // 1. 检查 API 返回的书籍列表
    console.log('步骤 1: 检查 API 返回的书籍列表');
    console.log('----------------------------------------');
    
    const listResponse = await fetch('http://localhost:7401/api/books?noCache=true');
    const listResult = await listResponse.json();
    
    console.log('API 返回书籍总数:', listResult.length);
    console.log('前5本书籍:');
    listResult.slice(0, 5).forEach((b, i) => {
      console.log(`  ${i+1}. ID=${b.id}, 标题="${b.title}", last_modified=${b.last_modified}`);
    });

    // 2. 检查最新添加的书籍
    console.log('\n步骤 2: 检查最新添加的书籍（活着）');
    console.log('----------------------------------------');
    
    const newBook = listResult.find(b => b.title === '活着');
    if (newBook) {
      console.log('✅ 找到书籍:');
      console.log('  ID:', newBook.id);
      console.log('  标题:', newBook.title);
      console.log('  作者:', newBook.author);
      console.log('  ISBN:', newBook.isbn);
      console.log('  last_modified:', newBook.last_modified);
    } else {
      console.log('❌ 未找到书籍');
    }

    // 3. 检查数据库连接状态
    console.log('\n步骤 3: 检查数据库连接状态');
    console.log('----------------------------------------');
    
    const statusResponse = await fetch('http://localhost:7401/api/config/status');
    const statusResult = await statusResponse.json();
    console.log('数据库状态:', JSON.stringify(statusResult, null, 2));

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

checkFrontend();
