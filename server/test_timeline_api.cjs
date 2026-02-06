const http = require('http');

console.log('测试时间线API...');

http.get('http://localhost:7401/api/activities?startDate=2026-02-01&endDate=2026-02-02', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('成功:', result.success);
    console.log('数据条数:', result.data.length);
    console.log('\n前5条记录:');
    result.data.slice(0, 5).forEach((item, i) => {
      console.log(`${i+1}. ${item.type} - ${item.bookTitle || 'bookId:'+item.bookId} - ${item.createdAt}`);
    });
  });
});
