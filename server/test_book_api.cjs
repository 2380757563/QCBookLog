const http = require('http');

http.get('http://localhost:7401/api/books/4', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('原始响应:', data);
    const result = JSON.parse(data);
    console.log('解析结果:', JSON.stringify(result, null, 2));
  });
});
