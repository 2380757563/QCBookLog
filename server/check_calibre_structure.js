import databaseService from './services/databaseService.js';

async function checkCalibreStructure() {
  try {
    console.log('=== Calibre数据库books表结构 ===');
    const booksStructure = databaseService.calibreDb.prepare('PRAGMA table_info(books)').all();
    booksStructure.forEach(col => {
      console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    console.log('\n=== Calibre数据库相关表 ===');
    const tables = databaseService.calibreDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    tables.forEach(table => {
      console.log(table.name);
    });
    
    // 检查是否有pages相关的表或字段
    console.log('\n=== 检查页数相关字段 ===');
    const hasPages = booksStructure.some(col => col.name.toLowerCase().includes('page'));
    console.log(`books表是否包含页数字段: ${hasPages}`);
    
    // 检查是否有series相关的表
    const seriesTables = tables.filter(table => table.name.toLowerCase().includes('series'));
    console.log('\n=== 丛书系列相关表 ===');
    seriesTables.forEach(table => {
      console.log(table.name);
    });
    
    if (seriesTables.length > 0) {
      console.log(`\n=== ${seriesTables[0]}表结构 ===`);
      const seriesStructure = databaseService.calibreDb.prepare(`PRAGMA table_info(${seriesTables[0]})`).all();
      seriesStructure.forEach(col => {
        console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    console.log('\n=== 检查tags表结构 ===');
    const tagsStructure = databaseService.calibreDb.prepare('PRAGMA table_info(tags)').all();
    tagsStructure.forEach(col => {
      console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
  } catch (error) {
    console.error('检查数据库结构失败:', error.message);
  }
}

checkCalibreStructure();
