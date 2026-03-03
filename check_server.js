const checkServerDb = async () => {
  try {
    // 获取服务器配置
    const response = await fetch('http://localhost:7401/api/config');
    const config = await response.json();
    console.log('服务器配置:', JSON.stringify(config, null, 2));
    
    // 检查数据库状态
    const statusResponse = await fetch('http://localhost:7401/api/health');
    const status = await statusResponse.json();
    console.log('\n服务器状态:', JSON.stringify(status, null, 2));
  } catch (e) {
    console.error('错误:', e.message);
  }
};

checkServerDb();
