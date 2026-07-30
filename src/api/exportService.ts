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
  { key: 'book_type', label: '书籍类型' },
  { key: 'binding1', label: '装帧（一级）' },
  { key: 'binding2', label: '装帧（二级）' },
  { key: 'paper1', label: '纸张类型' },
  { key: 'edge1', label: '刷边位置' },
  { key: 'edge2', label: '刷边工艺' },
  { key: 'series', label: '丛书' },
  { key: 'readStatus', label: '阅读状态' },
  { key: 'readCompleteDate', label: '完成阅读日期' },
  { key: 'rating', label: '评分' },
  { key: 'personal_rating', label: '个人评分' },
  { key: 'personal_rating_date', label: '个人评分日期' },
  { key: 'purchaseDate', label: '购买日期' },
  { key: 'purchasePrice', label: '购买价格' },
  { key: 'standardPrice', label: '定价' },
  { key: 'tags', label: '标签' },
  { key: 'groups', label: '分组' },
  { key: 'coverUrl', label: '封面' },
  { key: 'note', label: '备注' },
  { key: 'description', label: '简介' },
  { key: 'source', label: '数据来源' },
  { key: 'favorite', label: '收藏' },
  { key: 'favorite_date', label: '收藏日期' },
  { key: 'wants', label: '想读' },
  { key: 'wants_date', label: '想读日期' },
  { key: 'total_reading_time', label: '累计阅读时长' },
  { key: 'read_pages', label: '已读页数' },
  { key: 'reading_count', label: '阅读次数' },
  { key: 'last_read_date', label: '最后阅读日期' },
  { key: 'last_read_duration', label: '最后阅读时长' },
  { key: 'createTime', label: '创建时间' },
  { key: 'updateTime', label: '更新时间' },
];

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'excel';

/**
 * 导出进度
 */
export interface ExportProgress {
  /** 0-100 整数 */
  percent: number;
  /** 当前阶段 */
  phase: 'parsing' | 'building' | 'covers' | 'packing' | 'downloading' | 'done';
  /** 当前阶段文案 */
  message: string;
  /** 当前条目索引 */
  current?: number;
  /** 总条目数 */
  total?: number;
}

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
  async exportBooks(
    options: ExportOptions,
    onProgress?: (p: ExportProgress) => void
  ): Promise<Blob> {
    const bookStore = useBookStore();
    const books = bookStore.allBooks;

    if (!Array.isArray(books) || books.length === 0) {
      throw new Error('当前没有书籍可导出，请确认书库中已有书籍');
    }

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
        return this.exportAsCSV(filteredBooks, options.selectedFields, groupsMap, onProgress);
      case 'excel':
        return await this.exportAsExcel(filteredBooks, options.selectedFields, groupsMap, onProgress);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  /**
   * 导出整库备份（完整备份：Calibre书库 + Talebook数据库 + QCBookLog数据库）
   * 使用后端异步任务模式，支持进度回调
   * @param options 导出选项
   * @param onProgress 进度回调 (current, total, currentFile)
   * @returns Promise<Blob>
   */
  async exportLibrary(
    options: ZipExportOptions,
    onProgress?: (p: ExportProgress) => void
  ): Promise<Blob> {
    try {
      console.log('📦 启动整库备份任务...');

      // 1) 启动任务
      const startResp = await fetch('/api/backup/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {})
      });
      if (!startResp.ok) {
        let msg = '启动整库备份失败';
        try {
          const data = await startResp.json();
          msg = data.error || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      const { jobId, total, filename } = await startResp.json();
      console.log(`📦 任务已启动: ${jobId}, 待处理 ${total} 个文件`);

      // 通知前端:开始打包(总数已知)
      if (onProgress) onProgress({ percent: 0, phase: 'packing', message: '准备打包...' });

      // 2) 轮询状态
      const pollInterval = 300; // 300ms
      const maxWaitMs = 30 * 60 * 1000; // 30 分钟超时
      const startedAt = Date.now();
      let lastPercent = -1;
      let lastCurrentFile = '';

      // 立即先做一次状态查询,避免空轮询
      while (true) {
        if (Date.now() - startedAt > maxWaitMs) {
          throw new Error('整库备份超时,请重试');
        }
        const statusResp = await fetch(`/api/backup/library/status/${encodeURIComponent(jobId)}`);
        if (statusResp.status === 404) {
          throw new Error('备份任务不存在或已过期');
        }
        if (!statusResp.ok) {
          throw new Error(`查询进度失败: HTTP ${statusResp.status}`);
        }
        const status = await statusResp.json();

        if (status.status === 'failed') {
          throw new Error(status.error || '备份失败');
        }

        // 按字节计算百分比
        const percent = status.totalBytes > 0
          ? Math.min(100, Math.floor((status.processedBytes / status.totalBytes) * 100))
          : 0;

        // 仅在变化时通知(减少无效渲染)
        if (percent !== lastPercent || status.currentFile !== lastCurrentFile) {
          lastPercent = percent;
          lastCurrentFile = status.currentFile;
          if (onProgress) {
            const message = status.status === 'completed'
              ? '准备下载...'
              : `正在打包字节 (${this.formatFileSize(status.processedBytes)} / ${this.formatFileSize(status.totalBytes)})...`;
            onProgress({
              percent,
              phase: status.status === 'completed' ? 'downloading' : 'packing',
              message,
              current: status.current,
              total: status.total
            });
          }
        }

        if (status.status === 'completed') {
          // 3) 下载备份文件
          if (onProgress) onProgress({ percent: 99, phase: 'downloading', message: '正在下载备份文件...' });
          const dlResp = await fetch(`/api/backup/library/download/${encodeURIComponent(jobId)}`);
          if (!dlResp.ok) {
            let msg = '下载备份文件失败';
            try {
              const data = await dlResp.json();
              msg = data.error || msg;
            } catch (e) {}
            throw new Error(msg);
          }
          const blob = await dlResp.blob();
          if (onProgress) onProgress({ percent: 100, phase: 'done', message: '备份完成' });
          console.log(`✅ 整库备份导出完成,文件: ${filename}, 大小: ${this.formatFileSize(blob.size)}`);
          return blob;
        }

        await new Promise(r => setTimeout(r, pollInterval));
      }
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
   * 将字段值格式化为人类可读的展示文本
   * CSV 与 Excel 导出共用，避免枚举值直接输出数字
   */
  private formatDisplayValue(value: any, field: string): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (field === 'book_type') {
      const map: Record<number, string> = { 0: '电子书', 1: '实体书' };
      return map[value] ?? String(value);
    }
    if (field === 'paper1') {
      const map: Record<number, string> = {
        0: '未指定', 1: '胶版纸（双胶纸）', 2: '轻型纸', 3: '道林纸',
        4: '铜版纸', 5: '牛皮纸', 6: '宣纸', 7: '进口特种纸'
      };
      return map[value] ?? String(value);
    }
    if (field === 'edge1') {
      const map: Record<number, string> = { 0: '无刷边', 1: '书口单侧', 2: '多侧（书口+天头/地脚）', 3: '全三边' };
      return map[value] ?? String(value);
    }
    if (field === 'edge2') {
      const map: Record<number, string> = { 0: '无细分', 1: '基础单色', 2: '烫边（烫金/银）', 3: '磨边（毛边）', 4: '彩绘艺术刷边', 5: '鎏金高端刷边' };
      return map[value] ?? String(value);
    }
    if (field === 'favorite' || field === 'wants') {
      return value === 1 ? '是' : '否';
    }
    if (field === 'total_reading_time' || field === 'last_read_duration') {
      const totalMinutes = Number(value);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      if (hours > 0) {
        return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
      }
      return `${minutes}分钟`;
    }

    return String(value);
  }

  /**
   * 根据选中的字段过滤数据（保持原始数据格式）
   */
  private filterFields(books: any[], selectedFields: string[]): any[] {
    // 解除 Pinia 响应式代理，避免后续深循环中反复触发 Proxy 行为
    const rawBooks = Array.isArray(books) ? books.map(book => ({ ...book })) : [];

    return rawBooks.map((book, index) => {
      const filtered: any = {};
      selectedFields.forEach(field => {
        if (field === 'rating') {
          filtered[field] = book[field] || 0;
        } else if (field === 'coverUrl') {
          filtered[field] = book[field] || '';
        } else if (field === 'favorite' || field === 'wants') {
          filtered[field] = book[field] ?? 0;
        } else if (field === 'book_type') {
          filtered[field] = book[field] ?? 1;
        } else {
          filtered[field] = book[field];
        }
      });

      return filtered;
    });
  }

  /**
   * 导出为CSV格式
   */
  private exportAsCSV(
    books: any[],
    selectedFields: string[],
    groupsMap?: Map<string, string>,
    onProgress?: (p: ExportProgress) => void
  ): Blob {
    // 生成表头
    const headers = selectedFields.join(',');
    let lastPercent = -1;

    // 生成数据行
    const rows = books.map((book, index) => {
      return selectedFields.map(field => {
        let value = book[field];

        // 枚举/可读性字段先转文本
        value = this.formatDisplayValue(value, field);

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

    // 每 1% 触发一次进度回调
    if (onProgress) {
      for (let i = 0; i < books.length; i++) {
        const percent = Math.floor((i / books.length) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress({
            percent,
            phase: 'building',
            message: `生成表格中 (${i + 1}/${books.length})...`,
            current: i + 1,
            total: books.length
          });
        }
      }
    }

    const csvContent = [headers, ...rows].join('\n');

    // 添加BOM以支持Excel中文显示
    const bom = '\uFEFF';
    return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * 导出为Excel格式（支持图片嵌入）
   */
  private async exportAsExcel(
    books: any[],
    selectedFields: string[],
    groupsMap?: Map<string, string>,
    onProgress?: (p: ExportProgress) => void
  ): Promise<Blob> {

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
    let lastRowPercent = -1;
    let lastProgressMessage = '';
    const reportProgress = (force: boolean, percent: number, phase: ExportProgress['phase'], message: string, current?: number, total?: number) => {
      if (!onProgress) return;
      if (force || percent !== lastRowPercent || message !== lastProgressMessage) {
        lastRowPercent = percent;
        lastProgressMessage = message;
        onProgress({ percent, phase, message, current, total });
      }
    };

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const row: any = {};

      // 行生成阶段进度 (0-70%)
      const rowPercent = Math.floor((i / books.length) * 70);
      reportProgress(false, rowPercent, 'building', `生成表格中 (${i + 1}/${books.length})...`, i + 1, books.length);

      await new Promise(r => setTimeout(r, 0));

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
          row[field] = this.formatDisplayValue(book[field], field);
        }
      }

      const worksheetRow = worksheet.addRow(row);

      // 如果包含封面字段且书籍有封面，则嵌入图片
      let coverCount = 0;
      let totalCovers = 0;
      if (hasCover) {
        totalCovers = books.filter(b => b.coverUrl).length;
      }
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

      // 封面阶段进度 (70-100%)
      if (hasCover && book.coverUrl) {
        coverCount++;
        const coverPercent = 70 + Math.floor((coverCount / totalCovers) * 30);
        reportProgress(false, coverPercent, 'covers', `下载封面中 (${coverCount}/${totalCovers})...`, coverCount, totalCovers);
      }
    }

    // 生成 Blob
    reportProgress(true, 100, 'done', '生成完成');
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
