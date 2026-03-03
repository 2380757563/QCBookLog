import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, 'services', 'database', 'repositories', 'calibre', 'book-repository.js');

let content = readFileSync(filePath, 'utf8');

const oldCode = '    if (this.qcBooklogDb) {\n      try {\n        const bookTypesQuery = `\n          SELECT m.calibre_book_id as id, bd.book_type\n          FROM qc_bookdata bd\n          JOIN qc_book_mapping m ON bd.mapping_id = m.id\n          WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ?\n        `;\n        const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;\n        const bookTypes = this.qcBooklogDb.prepare(bookTypesQuery).all(...bookIds, currentLibraryUuid);\n        bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n        console.log(`✅ 从 QCBookLog 数据库获取了 ${bookTypes.length} 本书籍的载体类型`);\n      } catch (error) {\n        console.warn(\'⚠️ 从 QCBookLog 获取书籍类型失败:\', error.message);\n      }\n\n      if (bookTypeMap.size === 0 && this.talebookDb) {\n        try {\n          const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;\n          const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);\n          bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n          console.log(`✅ 从 Talebook 数据库获取了 ${bookTypes.length} 本书籍的载体类型（降级模式）`);\n        } catch (error) {\n          console.warn(\'⚠️ 从 Talebook 获取书籍类型信息失败:\', error.message);\n        }\n      }\n    }';

const newCode = '    if (this.talebookDb) {\n      try {\n        const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;\n        const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);\n        bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n        console.log(`✅ 从 Talebook 数据库获取了 ${bookTypes.length} 本书籍的载体类型`);\n      } catch (error) {\n        console.warn(\'⚠️ 从 Talebook 获取书籍类型信息失败:\', error.message);\n      }\n\n      if (bookTypeMap.size === 0 && this.qcBooklogDb) {\n        try {\n          const bookTypesQuery = `\n            SELECT m.calibre_book_id as id, bd.book_type\n            FROM qc_bookdata bd\n            JOIN qc_book_mapping m ON bd.mapping_id = m.id\n            WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ?\n          `;\n          const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;\n          const bookTypes = this.qcBooklogDb.prepare(bookTypesQuery).all(...bookIds, currentLibraryUuid);\n          bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n          console.log(`✅ 从 QCBookLog 数据库获取了 ${bookTypes.length} 本书籍的载体类型（降级模式）`);\n        } catch (error) {\n          console.warn(\'⚠️ 从 QCBookLog 获取书籍类型失败:\', error.message);\n        }\n      }\n    }';

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ 修改成功：载体类型读取优先级已调整为 Talebook -> QCBookLog');
} else {
  console.log('❌ 未找到匹配的代码块');
  console.log('正在查找包含"从 QCBookLog 数据库获取了"的代码...');
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('从 QCBookLog 数据库获取了')) {
      console.log(`找到在第 ${i + 1} 行: ${lines[i]}`);
      console.log(`前一行: ${lines[i - 1]}`);
      console.log(`后一行: ${lines[i + 1]}`);
    }
  }
}