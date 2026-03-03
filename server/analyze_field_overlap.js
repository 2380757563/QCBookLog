/**
 * 数据库字段分析工具
 * 比较 talebook 数据库中的 qcbookdata 表和 calibre 数据库中的 books 表的字段
 */

import Database from 'better-sqlite3';
import path from 'path';

// 数据库路径
const projectRoot = path.resolve('.');
const talebookPath = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const calibrePath = path.join(projectRoot, 'data/calibre/metadata.db');

console.log('🔍 开始分析数据库表结构...\n');

try {
  // 连接数据库
  console.log('📁 连接 Calibre 数据库:', calibrePath);
  const calibreDb = new Database(calibrePath, { readonly: true });
  
  console.log('📁 连接 Talebook 数据库:', talebookPath);
  const talebookDb = new Database(talebookPath, { readonly: true });

  // 获取 books 表的字段
  console.log('\n📖 分析 Calibre books 表字段:');
  const booksColumns = calibreDb.prepare('PRAGMA table_info(books)').all();
  console.log(`   发现 ${booksColumns.length} 个字段:`);
  booksColumns.forEach(col => {
    console.log(`     • ${col.name} (${col.type}) - PK:${col.pk}, NOTNULL:${col.notnull}`);
  });

  // 获取 qc_bookdata 表的字段
  console.log('\n📚 分析 Talebook qc_bookdata 表字段:');
  const qcBookdataColumns = talebookDb.prepare('PRAGMA table_info(qc_bookdata)').all();
  console.log(`   发现 ${qcBookdataColumns.length} 个字段:`);
  qcBookdataColumns.forEach(col => {
    console.log(`     • ${col.name} (${col.type}) - PK:${col.pk}, NOTNULL:${col.notnull}`);
  });

  // 分析重复字段
  console.log('\n🔍 识别重复字段:');
  const booksFieldNames = new Set(booksColumns.map(col => col.name));
  const qcBookdataFieldNames = new Set(qcBookdataColumns.map(col => col.name));
  
  const commonFields = [];
  const uniqueToBooks = [];
  const uniqueToQcBookdata = [];
  
  // 找出共同字段
  for (const fieldName of booksFieldNames) {
    if (qcBookdataFieldNames.has(fieldName)) {
      commonFields.push(fieldName);
    } else {
      uniqueToBooks.push(fieldName);
    }
  }
  
  // 找出只在 qc_bookdata 中的字段
  for (const fieldName of qcBookdataFieldNames) {
    if (!booksFieldNames.has(fieldName)) {
      uniqueToQcBookdata.push(fieldName);
    }
  }
  
  if (commonFields.length > 0) {
    console.log(`   🔄 发现 ${commonFields.length} 个重复字段:`);
    commonFields.forEach(field => {
      const bookCol = booksColumns.find(col => col.name === field);
      const qcCol = qcBookdataColumns.find(col => col.name === field);
      console.log(`     • ${field}: books.${bookCol.type} ↔ qc_bookdata.${qcCol.type}`);
    });
  } else {
    console.log('   ✅ 没有发现重复字段');
  }
  
  console.log(`\n📋 books 表独有字段 (${uniqueToBooks.length}):`);
  uniqueToBooks.forEach(field => {
    const col = booksColumns.find(col => col.name === field);
    console.log(`     • ${field} (${col.type})`);
  });
  
  console.log(`\n📋 qc_bookdata 表独有字段 (${uniqueToQcBookdata.length}):`);
  uniqueToQcBookdata.forEach(field => {
    const col = qcBookdataColumns.find(col => col.name === field);
    console.log(`     • ${field} (${col.type})`);
  });

  // 分析字段类型差异
  console.log('\n🔍 分析字段类型差异:');
  const fieldAnalysis = [];
  for (const field of commonFields) {
    const bookCol = booksColumns.find(col => col.name === field);
    const qcCol = qcBookdataColumns.find(col => col.name === field);
    
    fieldAnalysis.push({
      field: field,
      bookType: bookCol.type,
      qcType: qcCol.type,
      sameType: bookCol.type.toLowerCase() === qcCol.type.toLowerCase(),
      bookNullable: bookCol.notnull === 0,
      qcNullable: qcCol.notnull === 0
    });
  }
  
  fieldAnalysis.forEach(analysis => {
    const typeMatch = analysis.sameType ? '✅' : '⚠️ ';
    const nullMatch = analysis.bookNullable === analysis.qcNullable ? '✅' : '⚠️ ';
    console.log(`   ${typeMatch}${nullMatch} ${analysis.field}: ${analysis.bookType} ↔ ${analysis.qcType} (books nullable: ${analysis.bookNullable}, qc nullable: ${analysis.qcNullable})`);
  });

  // 关闭数据库连接
  calibreDb.close();
  talebookDb.close();
  
  console.log('\n✅ 数据库分析完成！');
  
  // 输出分析结果摘要
  console.log('\n📋 分析摘要:');
  console.log(`   • Calibre books 表字段数: ${booksColumns.length}`);
  console.log(`   • Talebook qc_bookdata 表字段数: ${qcBookdataColumns.length}`);
  console.log(`   • 重复字段数: ${commonFields.length}`);
  console.log(`   • books 独有字段数: ${uniqueToBooks.length}`);
  console.log(`   • qc_bookdata 独有字段数: ${uniqueToQcBookdata.length}`);
  
  // 输出可能的重复字段（基于语义相似性）
  console.log('\n🔍 基于语义的潜在重复字段分析:');
  const semanticMatches = [];
  
  // 创建字段映射，基于语义相似性
  const semanticMap = {
    'title': ['title'],
    'pages': ['page_count', 'pages'],
    'price': ['standard_price', 'purchase_price', 'price'],
    'purchase': ['purchase_date', 'purchase_price'],
    'binding': ['binding1', 'binding2', 'binding'],
    'note': ['note', 'notes', 'comment', 'comments'],
    'author': ['author'],
    'publisher': ['publisher'],
    'pubdate': ['pubdate', 'publish_date', 'publication_date', 'publish_year'],
    'timestamp': ['timestamp', 'created_at', 'updated_at'],
    'id': ['id', 'book_id', 'uuid']
  };
  
  for (const [semanticGroup, fields] of Object.entries(semanticMap)) {
    const bookFields = booksColumns.filter(col => fields.includes(col.name));
    const qcFields = qcBookdataColumns.filter(col => fields.includes(col.name));
    
    if (bookFields.length > 0 && qcFields.length > 0) {
      semanticMatches.push({
        category: semanticGroup,
        bookFields: bookFields.map(col => col.name),
        qcFields: qcFields.map(col => col.name)
      });
    }
  }
  
  if (semanticMatches.length > 0) {
    console.log(`   发现 ${semanticMatches.length} 个语义相关的字段组合:`);
    semanticMatches.forEach(match => {
      console.log(`     • ${match.category}: books[${match.bookFields.join(', ')}] ↔ qc_bookdata[${match.qcFields.join(', ')}]`);
    });
  } else {
    console.log('   未发现语义相关的字段组合');
  }

} catch (error) {
  console.error('\n❌ 分析失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}