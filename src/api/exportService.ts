/**
 * 数据导出服务
 * 支持多种导出格式：CSV、Excel
 */

import { useBookStore } from '@/stores/book';
import { bookService } from '@/api/book';
import type { Book, BookGroup, Tag } from '@/api/book/types';
import ExcelJS from 'exceljs';

/**
 * 导出字段配置
 */
export interface ExportField {
  key: keyof Book;
  label: string;
  description?: string;
  required?: boolean;
}

/**
 * 导出的书籍字段列表
 */
export const EXPORT_FIELDS: ExportField[] = [
  { key: 'isbn', label: 'ISBN', required: true },
  { key: 'title', label: '书名', required: true },
  { key: 'author', label: '作者', required: true },
  { key: 'publisher', label: '出版社' },
  { key: 'publishYear', label: '出版年份' },
  { key: 'pages', label: '页数' },
  { key: 'binding1', label: '装帧（一级）' },
  { key: 'binding2', label: '装帧（二级）' },
  { key: 'series', label: '丛书' },
  { key: 'readStatus', label: '阅读状态' },
  { key: 'readCompleteDate', label: '完成阅读日期' },
  { key: 'rating', label: '评分' },
  { key: 'purchaseDate', label: '购买日期' },
  { key: 'purchasePrice', label: '购买价格' },
  { key: 'standardPrice', label: '定价' },
  { key: 'tags', label: '标签' },
  { key: 'groups', label: '分组' },
  { key: 'coverUrl', label: '封面' },
  { key: 'note', label: '备注' },
  { key: 'description', label: '简介' },
  { key: 'createTime', label: '创建时间' },
  { key: 'updateTime', label: '更新时间' },
];

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'excel';

/**
 * 导出选项
 */
export interface ExportOptions {
  format: ExportFormat;
  selectedFields: string[];
  compression?: boolean;
}

/**
 * ZIP导出选项
 */
export interface ZipExportOptions {
  includeCovers?: boolean;
  includeBookmarks?: boolean;
  includeGroups?: boolean;
  includeHeatmap?: boolean;
  includeReadingGoals?: boolean;
}

/**
 * 导出服务类
 */
class ExportService {
  /**
   * 导出书籍数据
   */
  async exportBooks(options: ExportOptions): Promise<Blob> {
    const bookStore = useBookStore();
    const books = bookStore.allBooks;

    // 获取所有分组数据，用于将分组ID转换为分组名称
    let groupsMap = new Map<string, string>();
    try {
      const groups = await bookService.getAllGroups();

      groups.forEach(group => {
        groupsMap.set(String(group.id), group.name);

      });
    } catch (e) {

    }

    // 根据选中的字段过滤数据
    const filteredBooks = this.filterFields(books, options.selectedFields);

    // 根据格式生成数据
    switch (options.format) {
      case 'csv':
        return this.exportAsCSV(filteredBooks, options.selectedFields, groupsMap);
      case 'excel':
        return await this.exportAsExcel(filteredBooks, options.selectedFields, groupsMap);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 导出整库备份（完整备份：Calibre书库 + Talebook数据库）
   */
  async exportLibrary(options: ZipExportOptions): Promise<Blob> {

    try {
      // 调用后端备份 API
      const response = await fetch('/api/backup/library', {
        method: 'GET',
        headers: {
          'Accept': 'application/zip'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '导出失败');
      }

      // 获取 Blob
      const blob = await response.blob();
      console.log('✅ 整库备份导出完成，大小:', this.formatFileSize(blob.size));
      return blob;
    } catch (error) {
      console.error('❌ 导出整库备份失败:', error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }

  /**
   * 根据选中的字段过滤数据（保持原始数据格式）
   */
  private filterFields(books: any[], selectedFields: string[]): any[] {

    return books.map((book, index) => {
      const filtered: any = {};
      selectedFields.forEach(field => {
        if (field === 'rating') {
          filtered[field] = book[field] || 0;
        } else if (field === 'coverUrl') {
          filtered[field] = book[field] || '';
        } else {
          filtered[field] = book[field];
        }
      });

      // 调试：打印前3本书籍的原始数据
      if (index < 3) {
        if (selectedFields.includes('tags')) {
          console.log(`🏷️ 书籍[${index}] 原始tags:`, filtered.tags, '(类型:', typeof filtered.tags, ')');
        }
        if (selectedFields.includes('groups')) {
          console.log(`📁 书籍[${index}] 原始groups:`, filtered.groups, '(类型:', typeof filtered.groups, ')');
        }
      }

      return filtered;
    });
  }

  /**
   * 导出为CSV格式
   */
  private exportAsCSV(books: any[], selectedFields: string[], groupsMap?: Map<string, string>): Blob {

    // 生成表头
    const headers = selectedFields.join(',');

    // 生成数据行
    const rows = books.map((book, index) => {
      return selectedFields.map(field => {
        let value = book[field];

        // 处理tags和groups字段
        if (field === 'tags') {
          if (Array.isArray(value) && value.length > 0) {
            value = value.join(', ');
            if (index < 3) {

            }
          } else {
            value = '';
            if (index < 3) {

            }
          }
        } else if (field === 'groups') {
          if (Array.isArray(value) && value.length > 0) {
            if (groupsMap && groupsMap.size > 0) {
              const groupNames = value
                .map((groupId: any) => {
                  const groupIdStr = String(groupId);
                  const name = groupsMap.get(groupIdStr);
                  if (index < 3) {

                  }
                  return name || groupIdStr;
                })
                .filter(name => name);
              value = groupNames.join(', ');
              if (index < 3) {

              }
            } else {
              value = value.join(', ');
              if (index < 3) {

              }
            }
          } else {
            value = '';
            if (index < 3) {

            }
          }
        }

        // 处理null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // 处理字符串，转义特殊字符
        if (typeof value === 'string') {
          // 包含逗号、引号或换行符需要用引号包裹
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = value.replace(/"/g, '""'); // 转义引号
            return `"${value}"`;
          }
          return value;
        }

        // 处理日期
        if (field === 'createTime' || field === 'updateTime' || field === 'purchaseDate' || field === 'readCompleteDate') {
          return value;
        }

        return String(value);
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    // 添加BOM以支持Excel中文显示
    const bom = '\uFEFF';
    return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * 导出为Excel格式（支持图片嵌入）
   */
  private async exportAsExcel(books: any[], selectedFields: string[], groupsMap?: Map<string, string>): Promise<Blob> {

    // 创建 workbook 和 worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('书籍数据');

    // 检查是否包含封面字段
    const hasCover = selectedFields.includes('coverUrl');
    const coverColumnIndex = hasCover ? selectedFields.indexOf('coverUrl') + 1 : -1;

    // 添加表头
    worksheet.columns = selectedFields.map((field, index) => ({
      header: this.getFieldLabel(field),
      key: field,
      width: hasCover && index === coverColumnIndex - 1 ? 20 : 20 // 封面列宽度
    }));

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据行
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const row: any = {};

      for (const field of selectedFields) {
        if (field === 'tags') {
          // tags 已经是名称数组，直接使用
          if (Array.isArray(book[field])) {
            row[field] = book[field].join(', ');
            if (i < 3) {

            }
          } else {
            row[field] = '';
            if (i < 3) {

            }
          }
        } else if (field === 'groups') {
          // groups 存储的是 ID 数组，需要转换为名称数组
          if (Array.isArray(book[field])) {
            if (groupsMap && groupsMap.size > 0) {
              const groupNames = book[field]
                .map((groupId: any) => {
                  const groupIdStr = String(groupId);
                  const name = groupsMap.get(groupIdStr);
                  if (i < 3) {
                    console.log(`  📁 Excel分组ID: ${groupId} (类型: ${typeof groupId}) -> ${name || '未找到'}`);
                  }
                  return name || groupIdStr;
                })
                .filter(name => name); // 过滤空值
              row[field] = groupNames.join(', ');
              if (i < 3) {

              }
            } else {
              row[field] = book[field].join(', ');
              if (i < 3) {

              }
            }
          } else {
            row[field] = '';
            if (i < 3) {

            }
          }
        } else if (field === 'rating') {
          row[field] = book[field] || 0;
        } else if (field === 'coverUrl') {
          row[field] = book[field] || '';
        } else {
          row[field] = book[field];
        }
      }

      const worksheetRow = worksheet.addRow(row);

      // 如果包含封面字段且书籍有封面，则嵌入图片
      if (hasCover && coverColumnIndex > 0 && book.coverUrl) {
        try {
          // 获取图片数据
          let imageBuffer: ArrayBuffer | null = null;

          // 检查是否是外部 URL
          const isExternalUrl = book.coverUrl.startsWith('http://') ||
                              book.coverUrl.startsWith('https://');

          if (!isExternalUrl) {
            // 从本地 URL 获取图片
            const response = await fetch(book.coverUrl);
            if (response.ok) {
              imageBuffer = await response.arrayBuffer();
            }
          }

          // 如果成功获取到图片，则嵌入到单元格中
          if (imageBuffer) {
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: 'jpeg'
            });

            // 获取封面列的字母
            const columnLetter = this.getColumnLetter(coverColumnIndex);
            const rowIndex = worksheetRow.number;

            // 调整行高以适应图片
            worksheet.getRow(rowIndex).height = 100;

            // 添加图片到单元格
            worksheet.addImage(imageId, {
              tl: { col: coverColumnIndex - 1, row: rowIndex - 1 },
              ext: { width: 80, height: 100 }
            });
          }
        } catch (error) {

        }
      }
    }

    // 生成 Blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /**
   * 获取字段标签
   */
  private getFieldLabel(field: string): string {
    const fieldConfig = EXPORT_FIELDS.find(f => f.key === field);
    return fieldConfig ? fieldConfig.label : field;
  }

  /**
   * 将列号转换为列字母 (1 -> A, 2 -> B, etc.)
   */
  private getColumnLetter(columnNumber: number): string {
    let temp = 0;
    let letter = '';

    while (columnNumber > 0) {
      temp = (columnNumber - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      columnNumber = Math.floor((columnNumber - temp - 1) / 26);
    }

    return letter;
  }

  /**
   * 下载文件
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 生成导出文件名
   */
  generateFilename(format: ExportFormat, withDate: boolean = true): string {
    const datePart = withDate ? new Date().toISOString().slice(0, 10) : '';
    return `books_export_${datePart}.${format === 'excel' ? 'xlsx' : format}`;
  }

  /**
   * 生成ZIP导出文件名
   */
  generateZipFilename(withDate: boolean = true): string {
    const datePart = withDate ? new Date().toISOString().slice(0, 10) : '';
    return `library_export_${datePart}.zip`;
  }
}

/**
 * 导出服务单例
 */
export const exportService = new ExportService();
