/**
 * 数据导入服务
 * 支持导入多种格式：JSON、CSV、Excel、ZIP
 */

import type { Book } from '@/api/book/types';
import type { Bookmark } from '@/stores/bookmark/types';
import { bookService } from '@/api/book';
import { readingGoalsService } from './readingGoalsService';
import { readingHeatmapService } from './readingHeatmapService';
import { wishlistService } from './wishlistService';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { normalizeIsbn } from '@/utils/isbnUtils';

/**
 * 导入格式类型
 */
export type ImportFormat = 'json' | 'csv' | 'excel' | 'zip';

/**
 * ZIP导入结果
 */
export interface ZipImportResult {
  success: boolean;
  /** 是否是整库备份(full-library-backup), 此类 ZIP 必须走 /api/backup/library/restore */
  isFullLibraryBackup?: boolean;
  metadata?: {
    version: string;
    type?: string;
    exportTime: string;
    appName: string;
    books: number;
    groups: number;
    tags: number;
    bookmarks: number;
    heatmapYears: number;        // 热力图年份数量
    heatmapDays: number;         // 热力图总天数
    readingGoals: number;         // 年度阅读目标数量
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
 * 整库恢复结果
 */
export interface LibraryRestoreResult {
  success: boolean;
  message: string;
  metadata?: {
    version: string;
    exportTime: string;
    backupId: string;
  };
  log?: string[];
  error?: string;
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

    // 如果是ZIP格式，单独处理
    if (options.format === 'zip') {
      return this.importFromZip(file, options);
    }

    let books: any[];

    // Excel 格式: 区分真 xlsx 二进制和"伪 xlsx"(文本内容)
    if (options.format === 'excel') {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      if (this.isRealXlsx(arrayBuffer)) {
        // 真 .xlsx 二进制,使用 ExcelJS 解析(支持封面图片)
        books = await this.parseExcel(arrayBuffer);
      } else {
        // 伪 .xlsx(实际是文本),回退到 CSV 解析
        const text = await this.readFileContent(file);
        books = this.parseCSV(text);
      }
    } else {
      // JSON / CSV: 文本读取
      const content = await this.readFileContent(file);
      switch (options.format) {
        case 'json':
          books = this.parseJSON(content);
          break;
        case 'csv':
          books = this.parseCSV(content);
          break;
        default:
          throw new Error(`不支持的导入格式: ${options.format}`);
      }
    }

    return await this.importBooks(books, options);
  }

  /**
   * 导入ZIP压缩包（完善版）
   */
  async importFromZip(file: File, options: ImportOptions): Promise<ImportResult> {

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

      }

      // ===== 2. 导入分组数据 =====
      if (metadata.includeGroups !== false) {
        const groupsFile = zip.file('groups.json');
        if (groupsFile) {
          try {
            const groupsContent = await groupsFile.async('string');
            const groupsData = JSON.parse(groupsContent);

            if (groupsData.groups && Array.isArray(groupsData.groups)) {

              // 获取现有分组列表，避免重复
              const existingGroups = await bookService.getAllGroups();
              const existingGroupNames = new Set(existingGroups.map(g => g.name));

              let importedCount = 0;
              for (const group of groupsData.groups) {
                // 检查分组是否已存在（按名称）
                if (existingGroupNames.has(group.name)) {

                  continue;
                }

                try {
                  await bookService.addGroup(group);

                  importedCount++;
                } catch (e) {

                }
              }

            }
          } catch (e) {

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

              // TODO: 实现书签的批量导入

            }
          } catch (e) {

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
              let dayCount = 0;
              Object.values(heatmapData.heatmap).forEach((dataset: any) => {
                dayCount += ((dataset as any).data?.length || 0) as number;
              });

              // 使用 readingHeatmapService 导入热力图数据
              for (const [, dataset] of Object.entries(heatmapData.heatmap)) {
                if ((dataset as any).data && Array.isArray((dataset as any).data)) {
                  for (const day of (dataset as any).data) {
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

            }
          } catch (e) {

          }
        } else {

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

              // 使用 readingGoalsService 导入阅读目标数据
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

          }
        } else {

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

      // ===== 8. 提取封面文件 =====
      const coversFolder = zip.folder('covers');
      const coversMap = new Map<string, Blob>();

      if (coversFolder) {

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

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 检查文件列表
      void Object.keys(zip.files);

      // ===== 检查是否是整库备份(full-library-backup)格式 =====
      // 特征: 根目录有 backup-metadata.json 且 type 为 'full-library-backup'
      //       包含 qcbooklog.db / talebook.db / calibre-library/ 三个核心目录
      const backupMetaFile = zip.file('backup-metadata.json');
      if (backupMetaFile) {
        try {
          const backupMetaContent = await backupMetaFile.async('string');
          const backupMeta = JSON.parse(backupMetaContent);
          if (backupMeta && backupMeta.type === 'full-library-backup') {
            // 整库备份: 统计关键文件
            const calibreFolder = zip.folder('calibre-library');
            const calibreBookFiles = calibreFolder
              ? Object.values(calibreFolder.files).filter(f => !f.dir && /\/cover\.(jpg|jpeg|png)$/i.test(f.name)).length
              : 0;
            return {
              success: true,
              isFullLibraryBackup: true,
              message: `检测到整库备份(v${backupMeta.version || '?'}, 导出时间: ${backupMeta.exportTime || '?'})。此格式将走专用恢复流程。`,
              metadata: {
                version: backupMeta.version || '2.1',
                type: 'full-library-backup',
                exportTime: backupMeta.exportTime || '',
                appName: backupMeta.appName || 'QC-booklog',
                books: calibreBookFiles,  // 整库备份里没有 books 数量字段, 用封面文件数估算
                groups: 0,
                tags: 0,
                bookmarks: 0,
                heatmapYears: 0,
                heatmapDays: 0,
                readingGoals: 0,
                includeCovers: calibreBookFiles > 0,
                includeBookmarks: false,
                includeGroups: false,
                includeTags: false,
                includeHeatmap: false,
                includeReadingGoals: false,
                coverFormat: 'jpg'
              }
            };
          }
        } catch (e) {
          console.warn('⚠️ 解析 backup-metadata.json 失败,继续按普通 ZIP 处理:', e);
        }
      }

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
   * 整库恢复(上传整库备份 ZIP, 后端会替换 calibre / talebook / qcbooklog 三个数据库)
   * 后端会先备份当前数据,再原子替换文件,然后触发 watch 重启
   * @param file File 整库备份 ZIP 文件
   * @param onProgress 进度回调 (msg, percent)
   * @returns Promise<LibraryRestoreResult>
   */
  async restoreLibrary(
    file: File,
    onProgress?: (msg: string, percent: number) => void
  ): Promise<LibraryRestoreResult> {
    try {
      console.log('🚀 启动整库恢复,文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      if (onProgress) onProgress('准备上传...', 5);

      // 1) 先做客户端预检(避免无效上传)
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const backupMetaFile = zip.file('backup-metadata.json');
      if (!backupMetaFile) {
        return {
          success: false,
          message: 'ZIP 中未找到 backup-metadata.json,不是合法的整库备份文件',
          error: 'INVALID_FORMAT'
        };
      }
      const metaContent = await backupMetaFile.async('string');
      const meta = JSON.parse(metaContent);
      if (meta.type !== 'full-library-backup') {
        return {
          success: false,
          message: `此备份类型为 ${meta.type},不是整库备份`,
          error: 'NOT_FULL_LIBRARY_BACKUP'
        };
      }

      // 2) 上传到后端 (multipart/form-data)
      const formData = new FormData();
      formData.append('file', file, file.name);

      if (onProgress) onProgress('上传中...', 20);

      // 用 XHR 以支持上传进度
      const result = await new Promise<LibraryRestoreResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/backup/library/restore', true);
        xhr.timeout = 30 * 60 * 1000; // 30 分钟
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            // 上传阶段占 20%~80%
            const uploadPct = 20 + Math.floor((e.loaded / e.total) * 60);
            onProgress(`上传中... (${(e.loaded / 1024 / 1024).toFixed(1)} / ${(e.total / 1024 / 1024).toFixed(1)} MB)`, uploadPct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          } else {
            let msg = `恢复失败 (HTTP ${xhr.status})`;
            try {
              const data = JSON.parse(xhr.responseText);
              msg = data.error || msg;
            } catch (e) { /* ignore */ }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('网络错误,恢复失败'));
        xhr.ontimeout = () => reject(new Error('恢复超时,请重试'));
        xhr.send(formData);
      });

      if (onProgress) onProgress('处理中...', 90);
      console.log('✅ 整库恢复完成:', result);
      return result;
    } catch (e) {
      console.error('❌ 整库恢复失败:', e);
      return {
        success: false,
        message: '整库恢复失败: ' + ((e as Error)?.message || String(e)),
        error: 'RESTORE_FAILED'
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
   * 读取文件为 ArrayBuffer(用于二进制 xlsx)
   */
  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 检测是否为真实 .xlsx 二进制(头 2 字节为 0x50 0x4B 即 "PK",即 ZIP 容器)
   */
  private isRealXlsx(arrayBuffer: ArrayBuffer): boolean {
    if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
    const view = new Uint8Array(arrayBuffer, 0, 4);
    // ZIP 魔数: PK\x03\x04
    return view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
  }

  /**
   * 解析真实 .xlsx 二进制(使用 ExcelJS)
   * 支持:多 sheet、单元格类型转换、嵌入图片(按行匹配)
   */
  private async parseExcel(arrayBuffer: ArrayBuffer): Promise<any[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // 取第一个有数据的 sheet
      const worksheet = workbook.worksheets.find(ws => ws.rowCount > 0);
      if (!worksheet) {
        throw new Error('Excel文件中没有可用的工作表');
      }

      console.log(`📊 Excel 工作表: ${worksheet.name}, 行数: ${worksheet.rowCount}, 列数: ${worksheet.columnCount}`);

      // 1. 解析表头(第 1 行)
      const headerRow = worksheet.getRow(1);
      const headers: { original: string; mapped: string; colIndex: number }[] = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const original = String(cell.value ?? '').trim();
        if (!original) return;
        const mapped = this.mapFieldName(original);
        headers.push({ original, mapped, colIndex: colNumber });
      });

      if (headers.length === 0) {
        throw new Error('Excel文件表头为空');
      }

      console.log(`📋 识别到 ${headers.length} 个字段:`, headers.map(h => h.mapped).join(', '));

      // 2. 提取所有图片,按行索引分组(行号 0-based,row 0 是表头)
      const imageByRow = new Map<number, { buffer: ArrayBuffer; extension: string; mime: string }>();
      try {
        const images = worksheet.getImages();
        for (const img of images) {
          const rowIndex = img.range?.tl?.row;
          if (typeof rowIndex !== 'number') continue;
          // 实际运行时 getImages 返回 string id,getImage 接受 number/string
          const image = workbook.getImage(img.imageId as unknown as number);
          if (!image || !image.buffer) continue;
          // Buffer 可能是 Node Buffer 或 Uint8Array,统一转 ArrayBuffer
          const buf: any = image.buffer;
          let arrayBuf: ArrayBuffer;
          if (buf instanceof ArrayBuffer) {
            arrayBuf = buf;
          } else if (typeof buf?.byteOffset === 'number' && typeof buf?.byteLength === 'number') {
            // Uint8Array/Buffer 共享底层 ArrayBuffer
            arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          } else {
            // 兜底:当作 Uint8Array-like
            arrayBuf = new Uint8Array(buf).buffer;
          }
          const ext = (image.extension || 'jpeg').toLowerCase();
          const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          imageByRow.set(rowIndex, { buffer: arrayBuf, extension: ext, mime });
        }
        console.log(`🖼️  Excel 中发现 ${images.length} 张图片,按行匹配 ${imageByRow.size} 行`);
      } catch (imgErr) {
        console.warn('⚠️ 提取 Excel 图片时出错(继续按无图片处理):', imgErr);
      }

      // 3. 解析数据行
      const data: any[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头

        const rowData: any = {};
        for (const h of headers) {
          const cell = row.getCell(h.colIndex);
          rowData[h.mapped] = this.normalizeExcelCellValue(cell, h.mapped);
        }

        // 4. 匹配该行的图片(行号 rowNumber - 1)
        const img = imageByRow.get(rowNumber - 1);
        if (img) {
          rowData._coverBlob = new Blob([img.buffer], { type: img.mime });
        }

        data.push(rowData);
      });

      console.log(`✅ Excel 解析完成: ${data.length} 行数据,${data.filter(d => d._coverBlob).length} 行带封面`);
      return data;
    } catch (e) {
      console.error('❌ Excel 解析失败:', e);
      throw new Error('Excel 解析失败: ' + (e as Error).message);
    }
  }

  /**
   * 规范化 Excel 单元格值为统一类型
   * ExcelJS 会自动识别 number / boolean / Date,这里主要是处理:
   * - 数字字段保留数字
   * - tags/groups 数组拆分
   * - null/空 处理
   */
  private normalizeExcelCellValue(cell: ExcelJS.Cell, fieldName: string): any {
    const v = cell.value;

    // 空值
    if (v === null || v === undefined || v === '') return null;

    // 富文本/超链接/公式: 取实际值
    let raw: any = v;
    if (typeof v === 'object') {
      if (v && 'result' in v) raw = v.result;          // 公式
      else if (v && 'richText' in v) {
        // 富文本(优先判断,避免被 hyperlink 误判)
        raw = (v.richText || []).map((r: any) => r.text).join('');
      }
      else if (v && 'text' in v && !(v instanceof Date)) raw = v.text;  // 富文本/超链接
      else if (v && 'hyperlink' in v) raw = (v as any).text ?? (v as any).hyperlink;
      else if (v instanceof Date) raw = v;
      else {
        raw = String(v);
      }
    }

    // null 处理
    if (raw === null || raw === undefined || raw === '') return null;

    // 数字字段: 保证 number
    if (['rating', 'purchasePrice', 'standardPrice', 'pages', 'publishYear'].includes(fieldName)) {
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
      return isNaN(num) ? null : num;
    }

    // 数组字段
    if (fieldName === 'tags' || fieldName === 'groups') {
      if (Array.isArray(raw)) {
        return raw.map((s: any) => String(s).trim()).filter((s: string) => s);
      }
      return String(raw).split(/[,;，；]/).map(s => s.trim()).filter(s => s);
    }

    // 日期: 转为 ISO
    if (['createTime', 'updateTime', 'purchaseDate', 'readCompleteDate'].includes(fieldName)) {
      if (raw instanceof Date) {
        return isNaN(raw.getTime()) ? null : raw.toISOString();
      }
      return String(raw);
    }

    // 默认字符串
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
    return String(raw);
  }

  /**
   * 解析JSON格式
   * JSON 数据可能使用任意字段名(中英文、驼峰等),需要归一化到内部标准字段
   */
  private parseJSON(content: string): any[] {
    try {
      const data = JSON.parse(content);

      // 处理两种JSON格式
      // 格式1: { books: [...] }
      // 格式2: [...]
      let rawBooks: any[];
      if (data.books && Array.isArray(data.books)) {
        rawBooks = data.books;
      } else if (Array.isArray(data)) {
        rawBooks = data;
      } else {
        throw new Error('JSON格式不正确，必须是数组或包含books字段的对象');
      }

      // 字段名归一化(与 CSV / Excel 保持一致)
      return rawBooks.map(book => {
        const mapped: any = {};
        for (const key of Object.keys(book || {})) {
          const canonical = this.mapFieldName(key);
          // 同名字段被多个 key 映射时,优先保留已有值(例如 "ISBN" 和 "isbn" 都映射到 isbn)
          if (mapped[canonical] === undefined || mapped[canonical] === null || mapped[canonical] === '') {
            mapped[canonical] = book[key];
          }
        }
        return mapped;
      });
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
  /**
   * 公共方法:导入已解析的书籍数组(用于 UI 层先做重复预检 + 弹窗,再导入)
   */
  async importParsedBooks(books: any[], options: ImportOptions): Promise<ImportResult> {
    return this.importBooks(books, options);
  }

  /**
   * 公共方法:解析文件(不做导入)
   * 用于 UI 先展示预览、做 ISBN 重复预检,确认后调用 importParsedBooks
   */
  async parseFileOnly(file: File, format: ImportFormat): Promise<any[]> {
    if (format === 'zip') {
      // ZIP 走完整流程(包括元数据校验),不暴露单独的 parse
      throw new Error('ZIP 格式请使用 importFromFile');
    }

    if (format === 'excel') {
      const ab = await this.readFileAsArrayBuffer(file);
      if (this.isRealXlsx(ab)) {
        return await this.parseExcel(ab);
      } else {
        const text = await this.readFileContent(file);
        return this.parseCSV(text);
      }
    }

    const content = await this.readFileContent(file);
    if (format === 'json') return this.parseJSON(content);
    if (format === 'csv') return this.parseCSV(content);
    throw new Error(`不支持的格式: ${format}`);
  }

  private async importBooks(books: any[], options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      total: books.length,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: []
    };

    // 收集所有有效的书籍
    const validBooks: Omit<Book, 'id' | 'createTime' | 'updateTime'>[] = [];

    // 批量 ISBN 重复预检：一次性查出所有 ISBN 的重复情况，避免每行单独查询
    let duplicateMap: Record<string, any[]> = {};
    if (options.skipDuplicates) {
      try {
        const isbnList = books
          .map(b => normalizeIsbn(b?.isbn))
          .filter(Boolean);
        if (isbnList.length > 0) {
          duplicateMap = await bookService.findDuplicates(isbnList);
        }
      } catch (e) {
        console.warn('⚠️ [importBooks] 批量ISBN预检失败，按无重复处理:', (e as any)?.message || e);
        duplicateMap = {};
      }
    }

    for (let i = 0; i < books.length; i++) {
      const row = books[i];

      try {
        // 验证必填字段: ISBN 和 书名
        if (!row.isbn || (typeof row.isbn === 'string' && !row.isbn.trim())) {
          result.errors.push({
            row: i + 1,
            field: 'isbn',
            message: 'ISBN 为必填字段',
            data: row
          });
          continue;
        }
        if (!row.title || (typeof row.title === 'string' && !row.title.trim())) {
          result.errors.push({
            row: i + 1,
            field: 'title',
            message: '书名 为必填字段',
            data: row
          });
          continue;
        }

        // 验证ISBN格式
        if (!this.isValidISBN(row.isbn)) {
          result.warnings.push(`第 ${i + 1} 行: ISBN格式可能不正确 (${row.isbn})`);
        }

        // 检查重复（基于批量预检结果）
        if (options.skipDuplicates) {
          const normalized = normalizeIsbn(row.isbn);
          if (normalized && duplicateMap[normalized] && duplicateMap[normalized].length > 0) {
            result.skipped++;
            result.warnings.push(`第 ${i + 1} 行: ISBN已存在，已跳过 (${row.isbn})`);
            continue;
          }
        }

        // 构造书籍对象
        const book = this.constructBook(row);
        validBooks.push(book);

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

        await bookService.batchAddBooks(validBooks);

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
}

/**
 * 导入服务单例
 */
export const importService = new ImportService();
