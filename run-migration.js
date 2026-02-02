/**
 * 执行数据库迁移
 */

import migrate from './server/migrations/addReadingTables.js';

migrate()
  .then(() => {
    console.log('🎉 迁移成功完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  });
