import sqlite3 from 'sqlite3';

// 打开数据库连接
const db = new sqlite3.Database('../data/calibre-webserver.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

// 查询items表的结构
db.all(`PRAGMA table_info(items)`, [], (err, rows) => {
  if (err) {
    console.error('Error querying table structure:', err.message);
    return;
  }
  
  console.log('=== items表结构 ===');
  rows.forEach(row => {
    console.log(`${row.cid}: ${row.name} (${row.type}) ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''} DEFAULT ${row.dflt_value}`);
  });
  
  // 关闭数据库连接
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      return;
    }
    console.log('Database connection closed.');
  });
});