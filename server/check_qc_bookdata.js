import sqlite3 from 'sqlite3';

// 打开数据库连接
const db = new sqlite3.Database('../data/calibre-webserver.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

// 查询qc_bookdata表中的所有记录
db.all(`SELECT * FROM qc_bookdata`, [], (err, rows) => {
  if (err) {
    console.error('Error querying qc_bookdata table:', err.message);
    return;
  }
  
  console.log('=== qc_bookdata表数据 ===');
  if (rows.length === 0) {
    console.log('No records found in qc_bookdata table.');
  } else {
    rows.forEach(row => {
      console.log(`book_id: ${row.book_id}, page_count: ${row.page_count}, standard_price: ${row.standard_price}, purchase_date: ${row.purchase_date}`);
    });
  }
  
  // 关闭数据库连接
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      return;
    }
    console.log('Database connection closed.');
  });
});