/**
 * 数据导入服务
 * 支持导入多种格式：JSON、CSV、Excel、ZIP
 */

import type { Book } from '@/services/book/types';
import type { Bookmark } from '@/store/bookmark/types';
import { bookService } from '@/services/book';
import { readingGoalsService } from './readingGoalsService';
import { readingHeatmapService } from './readingHeatmapService';
import { wishlistService } from './wishlistService';
import JSZip from 'jszip';

/**
 * 导入格式类型
 */
export type ImportFormat = 'json' | 'csv' | 'excel' | 'zip';

/**
 * ZIP导入结果
 */
export interface ZipImportResult {
  success: boolean;
  metadata?: {
    books: number;
    groups: number;
    tags: number;
    bookmarks: number;
    heatmapYears: number;        // 热力图年份数量
    heatmapDays: number;         // 热力图总天数
    readingGoals: number;         // 年度阅读目标数量
    exportTime: string;
    version: string;
    appName: string;
    includeCovers: boolean;
    includeBookmarks: boolean;
    includeGroups: boolean;
    includeTags: boolean;
    includeHeatmap: boolean;
    includeReadingGoals: boolean;
    coverFormat: string;
  };
  books?: Book[];
  covers?: Map<string, Blob>;
  groups?: any[];
  tags?: any[];
  bookmarks?: Bookmark[];
  heatmap?: Record<string, any>;   // 热力图数据
  readingGoals?: any[];             // 年度阅读目标数据
  message: string;
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
  warnings: string[];
}

/**
 * 导入错误
 */
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

/**
 * 导入选项
 */
export interface ImportOptions {
  format: ImportFormat;
  skipDuplicates: boolean;
  updateExisting: boolean;
  fieldMapping?: Record<string, string>; // 字段映射
}

/**
 * 导入服务类
 */
class ImportService {
  /**
   * 从文件导入
   */
  async importFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
    console.log('📁 开始导入文件:', file.name, file.type);

    // 如果是ZIP格式，单独处理
    if (options.format === 'zip') {
      return this.importFromZip(file, options);
    }

    // 根据文件类型选择解析方法
    const content = await this.readFileContent(file);

    let books: any[];

    switch (options.format) {
      case 'json':
        books = this.parseJSON(content);
        break;
      case 'csv':
        books = this.parseCSV(content);
        break;
      case 'excel':
        books = this.parseCSV(content); // Excel实际上也是CSV格式
        break;
      default:
        throw new Error(`不支持的导入格式: ${options.format}`);
    }

    return await this.importBooks(books, options);
  }

  /**
   * 导入ZIP压缩包（完善版）
   */
  async importFromZip(file: File, options: ImportOptions): Promise<ImportResult> {
    console.log('📦 开始解压ZIP文件:', file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      console.log('📦 ZIP文件包含的文件:', Object.keys(zip.files));

      // ===== 1. 读取元数据 =====
      const metadataFile = zip.file('metadata.json');
      let metadata: any = {
        version: '1.0',
        format: 'unknown',
        includeGroups: false,
        includeTags: false,
        includeBookmarks: false,
        includeCovers: false,
        includeHeatmap: false,
        includeReadingGoals: false
      };

      if (metadataFile) {
        const metadataContent = await metadataFile.async('string');
        metadata = JSON.parse(metadataContent);
        console.log('📋 导入包元数据:', metadata);
      }

      // ===== 2. 导入分组数据 =====
      if (metadata.includeGroups !== false) {
        const groupsFile = zip.file('groups.json');
        if (groupsFile) {
          try {
            const groupsContent = await groupsFile.async('string');
            const groupsData = JSON.parse(groupsContent);

            if (groupsData.groups && Array.isArray(groupsData.groups)) {
              console.log(`📁 发现 ${groupsData.groups.length} 个分组，开始导入...`);

              // 获取现有分组列表，避免重复
              const existingGroups = await bookService.getAllGroups();
              const existingGroupNames = new Set(existingGroups.map(g => g.name));

              let importedCount = 0;
              for (const group of groupsData.groups) {
                // 检查分组是否已存在（按名称）
                if (existingGroupNames.has(group.name)) {
                  console.log(`  ⏭️ 分组已存在，跳过: ${group.name}`);
                  continue;
                }

                try {
                  await bookService.addGroup(group);
                  console.log(`  ✓ 导入分组: ${group.name}`);
                  importedCount++;
                } catch (e) {
                  console.warn(`  ✗ 分组导入失败: ${group.name}`, e);
                }
              }

              console.log(`📁 分组导入完成，成功导入 ${importedCount}/${groupsData.groups.length} 个`);
            }
          } catch (e) {
            console.warn('⚠️ 分组导入失败:', e);
          }
        }
      }

      // ===== 4. 导入书签数据 =====
      if (metadata.includeBookmarks) {
        const bookmarksFile = zip.file('bookmarks.json');
        if (bookmarksFile) {
          try {
            const bookmarksContent = await bookmarksFile.async('string');
            const bookmarksData = JSON.parse(bookmarksContent);

            if (bookmarksData.bookmarks && Array.isArray(bookmarksData.bookmarks)) {
              console.log(`🔖 发现 ${bookmarksData.bookmarks.length} 个书签，开始导入...`);
              // TODO: 实现书签的批量导入
              console.log('  ⚠️ 书签导入功能待实现');
            }
          } catch (e) {
            console.warn('⚠️ 书签导入失败:', e);
          }
        }
      }

      // ===== 5. 导入热力图数据 =====
      if (metadata.includeHeatmap !== false) {
        const heatmapFile = zip.file('heatmap.json');
        if (heatmapFile) {
          try {
            const heatmapContent = await heatmapFile.async('string');
            const heatmapData = JSON.parse(heatmapContent);

            if (heatmapData.heatmap && typeof heatmapData.heatmap === 'object') {
              const yearCount = Object.keys(heatmapData.heatmap).length;
              let dayCount = 0;
              Object.values(heatmapData.heatmap).forEach((dataset: any) => {
                dayCount += dataset.data?.length || 0;
              });

              console.log(`📊 发现热力图数据: ${yearCount} 年, ${dayCount} 天，开始导入...`);

              // 使用 readingHeatmapService 导入热力图数据
              for (const [year, dataset] of Object.entries(heatmapData.heatmap)) {
                const yearNum = parseInt(year);
                if (dataset.data && Array.isArray(dataset.data)) {
                  for (const day of dataset.data) {
                    if (day.date && day.count > 0) {
                      try {
                        await readingHeatmapService.updateHeatmapData(day.date, day.count);
                      } catch (error) {
                        console.warn(`⚠️ 导入热力图数据失败 (${day.date}):`, error);
                      }
                    }
                  }
                }
              }

              console.log('📊 热力图数据导入成功');
            }
          } catch (e) {
            console.warn('⚠️ 热力图数据导入失败:', e);
          }
        } else {
          console.log('📊 未找到热力图数据文件');
        }
      }

      // ===== 6. 导入年度阅读目标 =====
      if (metadata.includeReadingGoals !== false) {
        const goalsFile = zip.file('readingGoals.json');
        if (goalsFile) {
          try {
            const goalsContent = await goalsFile.async('string');
            const goalsData = JSON.parse(goalsContent);

            if (goalsData.goals && Array.isArray(goalsData.goals)) {
              console.log(`🎯 发现 ${goalsData.goals.length} 个年度阅读目标，开始导入...`);

              // 使用 readingGoalsService 导入阅读目标数据
              const currentYear = new Date().getFullYear();

              for (const goal of goalsData.goals) {
                try {
                  // 先获取或创建该年度的目标
                  const existingGoal = await readingGoalsService.getReadingGoal(goal.year);
                  // 更新目标
                  await readingGoalsService.updateReadingGoal(
                    existingGoal.id,
                    goal.target,
                    goal.completed || 0
                  );
                  console.log(`✅ 年度阅读目标导入成功 (${goal.year}年, 目标: ${goal.target}本)`);
                } catch (error) {
                  console.warn(`⚠️ 导入年度阅读目标失败 (${goal.year}年):`, error);
                }
              }

              console.log(`🎯 年度阅读目标导入完成 (${goalsData.goals.length} 个)`);
            }
          } catch (e) {
            console.warn('⚠️ 年度阅读目标导入失败:', e);
          }
        } else {
          console.log('🎯 未找到年度阅读目标文件');
        }
      }

      // ===== 7. 导入书籍数据 =====
      const booksFile = zip.file('books.json');
      if (!booksFile) {
        // 兼容旧格式：查找 library.json
        const libraryFile = zip.file('library.json');
        if (!libraryFile) {
          throw new Error('ZIP文件中未找到books.json或library.json文件');
        }
      }

      const fileToUse = booksFile || zip.file('library.json');
      if (!fileToUse) {
        throw new Error('ZIP文件中未找到书籍数据文件');
      }

      const booksContent = await fileToUse.async('string');
      const libraryData = JSON.parse(booksContent);

      if (!libraryData.books || !Array.isArray(libraryData.books)) {
        throw new Error('书籍数据格式不正确，缺少books字段');
      }

      let books = libraryData.books;
      console.log(`📚 从ZIP中读取到 ${books.length} 本书籍`);

      // ===== 8. 提取封面文件 =====
      const coversFolder = zip.folder('covers');
      const coversMap = new Map<string, Blob>();

      if (coversFolder) {
        console.log('🖼️ 发现封面文件夹，开始提取...');
        for (const [path, zipEntry] of Object.entries(coversFolder.files)) {
          if (!zipEntry.dir && (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png'))) {
            const blob = await zipEntry.async('blob');
            // 获取文件名（不带路径）
            const fileName = path.split('/').pop() || path;
            // 去掉扩展名作为key（ISBN）
            const isbn = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
            coversMap.set(isbn, blob);
            console.log(`  ✓ 提取封面: ${fileName} (ISBN: ${isbn})`);
          }
        }
      }

      // ===== 9. 为每本书匹配封面 =====
      for (const book of books) {
        if (book.isbn) {
          // 直接通过ISBN匹配封面
          const blob = coversMap.get(book.isbn);
          if (blob) {
            book._coverBlob = blob;
            console.log(`  ✓ 为书籍 "${book.title}" 匹配到封面: ${book.isbn}.jpg`);
          }
        }
      }

      // ===== 10. 导入书籍 =====
      const result = await this.importBooks(books, options);

      result.warnings.push(`从ZIP文件成功导入 ${books.length} 本书籍`);

      return result;
    } catch (e) {
      console.error('❌ ZIP导入失败:', e);
      throw new Error('ZIP文件导入失败: ' + (e as Error).message);
    }
  }

  /**
   * 验证ZIP文件格式
   */
  async validateZipFile(file: File): Promise<ZipImportResult> {
    console.log('🔍 验证ZIP文件:', file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 检查文件列表
      const files = Object.keys(zip.files);
      console.log('📋 ZIP文件内容:', files);

      // 读取元数据
      let metadata: any = {
        books: 0,
        groups: 0,
        tags: 0,
        bookmarks: 0,
        heatmapYears: 0,
        heatmapDays: 0,
        readingGoals: 0,
        includeCovers: false,
        includeBookmarks: false,
        includeGroups: false,
        includeTags: false,
        includeHeatmap: false,
        includeReadingGoals: false
      };

      const metadataFile = zip.file('metadata.json');
      if (metadataFile) {
        const metadataContent = await metadataFile.async('string');
        metadata = JSON.parse(metadataContent);
      }

      // 读取书籍数据
      const booksFile = zip.file('books.json') || zip.file('library.json');
      if (!booksFile) {
        return {
          success: false,
          message: 'ZIP文件中未找到书籍数据文件'
        };
      }

      const booksContent = await booksFile.async('string');
      const libraryData = JSON.parse(booksContent);

      if (!libraryData.books || !Array.isArray(libraryData.books)) {
        return {
          success: false,
          message: '书籍数据格式不正确，缺少books字段'
        };
      }

      // 提取封面信息
      const coversFolder = zip.folder('covers');
      let covers = new Map<string, Blob>();
      if (coversFolder) {
        console.log('🔍 发现封面文件夹');
        metadata.includeCovers = true;

        for (const [path, zipEntry] of Object.entries(coversFolder.files)) {
          if (!zipEntry.dir && (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png'))) {
            const blob = await zipEntry.async('blob');
            // 获取文件名（不带路径）
            const fileName = path.split('/').pop() || path;
            // 去掉扩展名作为key（ISBN）
            const isbn = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
            covers.set(isbn, blob);
            console.log(`  ✓ 提取封面: ${fileName} (ISBN: ${isbn})`);
          }
        }
      }

      // 提取分组、标签、书签信息
      const groupsFile = zip.file('groups.json');
      if (groupsFile) {
        const groupsContent = await groupsFile.async('string');
        const groupsData = JSON.parse(groupsContent);
        metadata.groups = groupsData.groups?.length || 0;
        metadata.includeGroups = true;
      }

      const tagsFile = zip.file('tags.json');
      if (tagsFile) {
        const tagsContent = await tagsFile.async('string');
        const tagsData = JSON.parse(tagsContent);
        metadata.tags = tagsData.tags?.length || 0;
        metadata.includeTags = true;
      }

      const bookmarksFile = zip.file('bookmarks.json');
      if (bookmarksFile) {
        const bookmarksContent = await bookmarksFile.async('string');
        const bookmarksData = JSON.parse(bookmarksContent);
        metadata.bookmarks = bookmarksData.bookmarks?.length || 0;
        metadata.includeBookmarks = true;
      }

      // 验证热力图数据
      const heatmapFile = zip.file('heatmap.json');
      if (heatmapFile) {
        const heatmapContent = await heatmapFile.async('string');
        const heatmapData = JSON.parse(heatmapContent);
        if (heatmapData.heatmap && typeof heatmapData.heatmap === 'object') {
          metadata.heatmapYears = Object.keys(heatmapData.heatmap).length;
          Object.values(heatmapData.heatmap).forEach((dataset: any) => {
            metadata.heatmapDays += dataset.data?.length || 0;
          });
          metadata.includeHeatmap = true;
        }
      }

      // 验证年度阅读目标
      const goalsFile = zip.file('readingGoals.json');
      if (goalsFile) {
        const goalsContent = await goalsFile.async('string');
        const goalsData = JSON.parse(goalsContent);
        metadata.readingGoals = goalsData.goals?.length || 0;
        metadata.includeReadingGoals = true;
      }

      return {
        success: true,
        metadata: {
          books: metadata.books || libraryData.books.length,
          groups: metadata.groups,
          tags: metadata.tags,
          bookmarks: metadata.bookmarks,
          heatmapYears: metadata.heatmapYears,
          heatmapDays: metadata.heatmapDays,
          readingGoals: metadata.readingGoals,
          exportTime: metadata.exportTime || libraryData.exportTime,
          version: metadata.version || libraryData.version || '1.0',
          appName: metadata.appName || 'QC-booklog',
          includeCovers: metadata.includeCovers,
          includeBookmarks: metadata.includeBookmarks,
          includeGroups: metadata.includeGroups,
          includeTags: metadata.includeTags,
          includeHeatmap: metadata.includeHeatmap,
          includeReadingGoals: metadata.includeReadingGoals,
          coverFormat: metadata.coverFormat || 'isbn-based'
        },
        books: libraryData.books,
        covers,
        message: `验证成功，包含 ${libraryData.books.length} 本书籍`
      };
    } catch (e) {
      console.error('❌ ZIP验证失败:', e);
      return {
        success: false,
        message: 'ZIP文件验证失败: ' + (e as Error).message
      };
    }
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 解析JSON格式
   */
  private parseJSON(content: string): any[] {
    try {
      const data = JSON.parse(content);
      
      // 处理两种JSON格式
      // 格式1: { books: [...] }
      // 格式2: [...]
      if (data.books && Array.isArray(data.books)) {
        console.log('📋 识别为JSON格式1（包含books字段）');
        return data.books;
      } else if (Array.isArray(data)) {
        console.log('📋 识别为JSON格式2（直接数组）');
        return data;
      } else {
        throw new Error('JSON格式不正确，必须是数组或包含books字段的对象');
      }
    } catch (e) {
      console.error('❌ JSON解析失败:', e);
      throw new Error('JSON解析失败: ' + (e as Error).message);
    }
  }

  /**
   * 解析CSV格式
   */
  private parseCSV(content: string): any[] {
    try {
      // 移除BOM（如果存在）
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }

      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV文件为空或格式不正确');
      }

      // 解析表头
      const headers = this.parseCSVLine(lines[0]);
      console.log('📋 CSV表头:', headers);

      // 解析数据行
      const data: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        // 跳过空行
        if (values.length === 0 || (values.length === 1 && values[0] === '')) {
          continue;
        }

        const row: any = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            // 字段名映射（中英文转换）
            const mappedKey = this.mapFieldName(header);
            row[mappedKey] = this.parseCSVValue(values[index], mappedKey);
          }
        });

        data.push(row);
      }

      console.log(`📋 解析完成，共 ${data.length} 条数据`);
      return data;
    } catch (e) {
      console.error('❌ CSV解析失败:', e);
      throw new Error('CSV解析失败: ' + (e as Error).message);
    }
  }

  /**
   * 解析CSV行
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 转义引号
          current += '"';
          i++;
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 字段分隔符
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 添加最后一个字段
    result.push(current.trim());

    return result;
  }

  /**
   * 解析CSV值
   */
  private parseCSVValue(value: string, fieldName: string): any {
    if (!value || value === '') {
      return null;
    }

    // 数字类型字段
    if (['rating', 'purchasePrice', 'standardPrice', 'pages', 'publishYear'].includes(fieldName)) {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }

    // 数组类型字段（tags、groups）
    if (fieldName === 'tags' || fieldName === 'groups') {
      return value.split(',').map(s => s.trim()).filter(s => s);
    }

    // 日期类型字段
    if (['createTime', 'updateTime', 'purchaseDate', 'readCompleteDate'].includes(fieldName)) {
      return value;
    }

    // 字符串类型
    return value;
  }

  /**
   * 字段名映射（中英文转换）
   */
  private mapFieldName(fieldName: string): string {
    const fieldMapping: Record<string, string> = {
      // 英文映射
      'isbn': 'isbn',
      'title': 'title',
      'author': 'author',
      'publisher': 'publisher',
      'publishYear': 'publishYear',
      'pages': 'pages',
      'binding': 'binding',
      'series': 'series',
      'readStatus': 'readStatus',
      'readCompleteDate': 'readCompleteDate',
      'rating': 'rating',
      'purchaseDate': 'purchaseDate',
      'purchasePrice': 'purchasePrice',
      'standardPrice': 'standardPrice',
      'tags': 'tags',
      'groups': 'groups',
      'note': 'note',
      'description': 'description',
      'createTime': 'createTime',
      'updateTime': 'updateTime',
      // 中文映射
      'ISBN': 'isbn',
      '书名': 'title',
      '作者': 'author',
      '出版社': 'publisher',
      '出版年份': 'publishYear',
      '页数': 'pages',
      '装帧': 'binding',
      '丛书': 'series',
      '阅读状态': 'readStatus',
      '完成阅读日期': 'readCompleteDate',
      '评分': 'rating',
      '购买日期': 'purchaseDate',
      '购买价格': 'purchasePrice',
      '定价': 'standardPrice',
      '标签': 'tags',
      '分组': 'groups',
      '备注': 'note',
      '简介': 'description',
      '创建时间': 'createTime',
      '更新时间': 'updateTime',
    };

    return fieldMapping[fieldName] || fieldName;
  }

  /**
   * 导入书籍数据
   */
  private async importBooks(books: any[], options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      total: books.length,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    console.log('📚 开始导入书籍，总数:', books.length);

    // 收集所有有效的书籍
    const validBooks: Omit<Book, 'id' | 'createTime' | 'updateTime'>[] = [];

    for (let i = 0; i < books.length; i++) {
      const row = books[i];
      console.log(`\n📖 处理第 ${i + 1}/${books.length} 条数据`);

      try {
        // 验证必填字段
        if (!row.isbn) {
          result.errors.push({
            row: i + 1,
            field: 'isbn',
            message: 'ISBN为必填字段',
            data: row
          });
          continue;
        }

        // 验证ISBN格式
        if (!this.isValidISBN(row.isbn)) {
          result.warnings.push(`第 ${i + 1} 行: ISBN格式可能不正确 (${row.isbn})`);
        }

        // 检查重复（如果需要跳过重复项）
        if (options.skipDuplicates && await this.isDuplicate(row.isbn)) {
          result.skipped++;
          result.warnings.push(`第 ${i + 1} 行: ISBN已存在，已跳过 (${row.isbn})`);
          continue;
        }

        // 构造书籍对象
        const book = this.constructBook(row);
        validBooks.push(book);
        console.log('✅ 书籍数据准备完成:', book);
        result.imported++;

      } catch (e) {
        result.errors.push({
          row: i + 1,
          message: (e as Error).message,
          data: row
        });
      }
    }

    // 批量添加书籍到数据库
    if (validBooks.length > 0) {
      try {
        console.log('💾 开始保存书籍到数据库...');
        await bookService.batchAddBooks(validBooks);
        console.log('✅ 书籍保存成功!');
      } catch (e) {
        console.error('❌ 书籍保存失败:', e);
        result.errors.push({
          row: 0,
          message: '保存书籍到数据库失败: ' + (e as Error).message
        });
        result.success = false;
        return result;
      }
    }

    result.success = result.errors.length === 0;
    console.log('\n📊 导入完成:', result);

    return result;
  }

  /**
   * 构造书籍对象
   */
  private constructBook(row: any): Omit<Book, 'id' | 'createTime' | 'updateTime'> {
    // 设置默认值
    const now = new Date().toISOString();

    const book: any = {
      isbn: row.isbn,
      title: row.title || '',
      author: row.author || '',
      publisher: row.publisher || undefined,
      publishYear: row.publishYear || undefined,
      pages: row.pages || undefined,
      binding1: row.binding1 || 0,
      binding2: row.binding2 || 0,
      book_type: row.book_type || 1,
      series: row.series || undefined,
      readStatus: this.normalizeReadStatus(row.readStatus),
      readCompleteDate: row.readCompleteDate || undefined,
      rating: row.rating || 0,
      purchaseDate: row.purchaseDate || undefined,
      purchasePrice: row.purchasePrice || undefined,
      standardPrice: row.standardPrice || undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      groups: Array.isArray(row.groups) ? row.groups : [],
      note: row.note || undefined,
      description: row.description || undefined,
      // 不导入 coverUrl 和 coverFilename，这些是旧系统的路径
      // 保留 _coverBlob 用于后续上传
      _coverBlob: row._coverBlob || undefined,
      createTime: row.createTime || now,
      updateTime: row.updateTime || now
    };

    return book;
  }

  /**
   * 规范化阅读状态
   */
  private normalizeReadStatus(status: any): '未读' | '在读' | '已读' {
    if (!status) return '未读';

    const statusStr = String(status).toLowerCase();
    
    // 英文状态
    if (statusStr === 'unread' || statusStr === '未读') {
      return '未读';
    } else if (statusStr === 'reading' || statusStr === '在读') {
      return '在读';
    } else if (statusStr === 'read' || statusStr === '已读') {
      return '已读';
    }

    // 默认未读
    return '未读';
  }

  /**
   * 验证ISBN格式
   */
  private isValidISBN(isbn: string): boolean {
    // 简单验证：只检查是否为数字
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    return /^\d{10}$|^\d{13}$/.test(cleanIsbn);
  }

  /**
   * 检查ISBN是否重复
   */
  private async isDuplicate(isbn: string): Promise<boolean> {
    try {
      const allBooks = await bookService.getAllBooks();
      return allBooks.some(book => book.isbn === isbn);
    } catch (e) {
      console.error('检查ISBN重复失败:', e);
      return false;
    }
  }
}

/**
 * 导入服务单例
 */
export const importService = new ImportService();
