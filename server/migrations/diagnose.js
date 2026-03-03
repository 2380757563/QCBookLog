const diagnose = async () => {
  console.log('========================================');
  console.log('🔍 诊断用户问题');
  console.log('========================================\n');

  try {
    // 1. 检查数据库路径
    console.log('步骤 1: 检查当前连接的数据库');
    console.log('----------------------------------------');
    
    const configResponse = await fetch('http://localhost:7401/api/config');
    const configResult = await configResponse.json();
    console.log('当前配置:', JSON.stringify(configResult, null, 2));

    // 2. 检查书籍列表
    console.log('\n步骤 2: 检查书籍列表');
    console.log('----------------------------------------');
    
    const listResponse = await fetch('http://localhost:7401/api/books?noCache=true');
    const listResult = await listResponse.json();
    
    console.log('书籍总数:', listResult.length);
    console.log('\n按 last_modified 排序的前10本书籍:');
    listResult.slice(0, 10).forEach((b, i) => {
      console.log(`  ${i+1}. ID=${b.id}, 标题="${b.title}", last_modified=${b.last_modified}`);
    });

    // 3. 检查是否有重复的书籍
    console.log('\n步骤 3: 检查重复书籍');
    console.log('----------------------------------------');
    
    const titleCount = {};
    listResult.forEach(b => {
      titleCount[b.title] = (titleCount[b.title] || 0) + 1;
    });
    
    const duplicates = Object.entries(titleCount).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('发现重复书籍:');
      duplicates.forEach(([title, count]) => {
        console.log(`  "${title}": ${count} 本`);
        listResult.filter(b => b.title === title).forEach(b => {
          console.log(`    - ID=${b.id}, last_modified=${b.last_modified}`);
        });
      });
    } else {
      console.log('没有发现重复书籍');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

diagnose();
