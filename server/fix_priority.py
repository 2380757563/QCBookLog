#!/usr/bin/env python3
import sys

file_path = 'services/database/repositories/calibre/book-repository.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
modified = False

while i < len(lines):
    line = lines[i]
    
    if 'if (this.qcBooklogDb) {' in line and i > 330 and i < 350:
        j = i + 1
        brace_count = 1
        while j < len(lines) and brace_count > 0:
            if '{' in lines[j]:
                brace_count += lines[j].count('{')
            if '}' in lines[j]:
                brace_count -= lines[j].count('}')
            if brace_count == 0:
                break
            j += 1
        
        if j < len(lines) and 'book_type' in ''.join(lines[i:j+1]):
            new_lines.append('    if (this.talebookDb) {\n')
            new_lines.append('      try {\n')
            new_lines.append('        const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;\n')
            new_lines.append('        const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);\n')
            new_lines.append('        bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n')
            new_lines.append('        console.log(`✅ 从 Talebook 数据库获取了 ${bookTypes.length} 本书籍的载体类型`);\n')
            new_lines.append('      } catch (error) {\n')
            new_lines.append('        console.warn(\'⚠️ 从 Talebook 获取书籍类型信息失败:\', error.message);\n')
            new_lines.append('      }\n')
            new_lines.append('\n')
            new_lines.append('      if (bookTypeMap.size === 0 && this.qcBooklogDb) {\n')
            new_lines.append('        try {\n')
            new_lines.append('          const bookTypesQuery = `\n')
            new_lines.append('            SELECT m.calibre_book_id as id, bd.book_type\n')
            new_lines.append('            FROM qc_bookdata bd\n')
            new_lines.append('            JOIN qc_book_mapping m ON bd.mapping_id = m.id\n')
            new_lines.append('            WHERE m.calibre_book_id IN (${placeholders}) AND m.library_uuid = ?\n')
            new_lines.append('          `;\n')
            new_lines.append('          const currentLibraryUuid = this.getCurrentLibraryUuid ? this.getCurrentLibraryUuid() : null;\n')
            new_lines.append('          const bookTypes = this.qcBooklogDb.prepare(bookTypesQuery).all(...bookIds, currentLibraryUuid);\n')
            new_lines.append('          bookTypes.forEach(bt => bookTypeMap.set(bt.id, bt.book_type));\n')
            new_lines.append('          console.log(`✅ 从 QCBookLog 数据库获取了 ${bookTypes.length} 本书籍的载体类型（降级模式）`);\n')
            new_lines.append('        } catch (error) {\n')
            new_lines.append('          console.warn(\'⚠️ 从 QCBookLog 获取书籍类型失败:\', error.message);\n')
            new_lines.append('        }\n')
            new_lines.append('      }\n')
            new_lines.append('    }\n')
            i = j + 1
            modified = True
            continue
    
    new_lines.append(line)
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

if modified:
    print('✅ 修改成功：载体类型读取优先级已调整为 Talebook -> QCBookLog')
else:
    print('❌ 未找到需要修改的代码块')