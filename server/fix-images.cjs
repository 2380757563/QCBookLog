const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = '/app/data/qc-booklog.db';
const db = new sqlite3(dbPath);

console.log('🔧 开始修复图片数据...');

const images = db.prepare('SELECT id, image_data FROM qc_user_images').all();

console.log(`找到 ${images.length} 张图片需要检查`);

let fixedCount = 0;

images.forEach(image => {
  const imageData = image.image_data;
  
  if (!imageData.startsWith('data:')) {
    console.log(`修复图片 ID: ${image.id}`);
    
    let mimeType = 'image/jpeg';
    if (imageData.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    } else if (imageData.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png';
    } else if (imageData.startsWith('R0lGOD')) {
      mimeType = 'image/gif';
    } else if (imageData.startsWith('UklGR')) {
      mimeType = 'image/webp';
    }
    
    const fullDataUrl = `data:${mimeType};base64,${imageData}`;
    
    db.prepare('UPDATE qc_user_images SET image_data = ? WHERE id = ?').run(fullDataUrl, image.id);
    fixedCount++;
  }
});

console.log(`✅ 修复完成！共修复 ${fixedCount} 张图片`);

db.close();
