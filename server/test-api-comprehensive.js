import http from 'http';

const testCases = [
  {
    name: '测试1：更新喜欢、待读、个人评分',
    data: {
      favorite: 1,
      wants: 1,
      personal_rating: 8
    },
    expected: {
      favorite: 1,
      wants: 1,
      personal_rating: 8
    }
  },
  {
    name: '测试2：只更新喜欢',
    data: {
      favorite: 0
    },
    expected: {
      favorite: 0
    }
  },
  {
    name: '测试3：只更新个人评分',
    data: {
      personal_rating: 9.5
    },
    expected: {
      personal_rating: 9.5
    }
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.data);
    console.log(`\n${testCase.name}`);
    console.log('请求数据:', data);

    const options = {
      hostname: 'localhost',
      port: 7401,
      path: '/api/books/108',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(body);
          console.log('响应状态:', res.statusCode);
          
          let passed = true;
          for (const key in testCase.expected) {
            if (result[key] !== testCase.expected[key]) {
              console.log(`❌ ${key}: 期望 ${testCase.expected[key]}, 实际 ${result[key]}`);
              passed = false;
            } else {
              console.log(`✅ ${key}: ${result[key]}`);
            }
          }
          
          resolve(passed);
        } else {
          console.log('❌ 响应状态:', res.statusCode);
          console.log('响应内容:', body);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ 请求错误:', e.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('开始API测试');
  console.log('========================================');

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    const passed = await runTest(testCase);
    if (passed) {
      passedCount++;
    } else {
      failedCount++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');
  console.log(`通过: ${passedCount}`);
  console.log(`失败: ${failedCount}`);
  console.log(`总计: ${testCases.length}`);
  console.log('========================================');
}

main().catch(console.error);
