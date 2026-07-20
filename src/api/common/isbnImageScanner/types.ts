/**
 * ISBN图片扫描服务的类型定义
 */

/**
 * ISBN类型枚举
 */
export enum ISBNType {
  ISBN_10 = 'ISBN-10',
  ISBN_13 = 'ISBN-13',
  UNKNOWN = 'UNKNOWN'
}

/**
 * ISBN验证结果枚举
 */
export enum ISBNValidationResult {
  VALID = 'VALID',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_CHECKSUM = 'INVALID_CHECKSUM',
  UNKNOWN_TYPE = 'UNKNOWN_TYPE'
}

/**
 * ISBN扫描结果接口
 */
export interface ISBNScanResult {
  /** 原始条码值 */
  rawValue: string;
  /** ISBN类型 */
  isbnType: ISBNType;
  /** 验证结果 */
  validationResult: ISBNValidationResult;
  /** 错误信息（如果有） */
  error?: string;
  /** 处理后的ISBN值（仅当验证通过时） */
  processedIsbn?: string;
  /** 扫描耗时（毫秒） */
  processingTime?: number;
}

/**
 * 图片扫描选项接口
 */
export interface ImageScanOptions {
  /** 是否启用图片预处理 */
  enablePreprocessing?: boolean;
  /** 最大图片宽度（预处理时） */
  maxWidth?: number;
  /** 最大图片高度（预处理时） */
  maxHeight?: number;
  /** 是否只返回有效的ISBN */
  onlyValidIsbn?: boolean;
}

/**
 * ISBN图片扫描服务接口
 */
export interface ISBNImageScannerService {
  /**
   * 从图片文件扫描ISBN
   * @param file 图片文件
   * @param options 扫描选项
   * @returns 扫描结果
   */
  scanFromFile(file: File, options?: ImageScanOptions): Promise<ISBNScanResult>;
  
  /**
   * 从Base64图片扫描ISBN
   * @param base64 Base64图片数据
   * @param options 扫描选项
   * @returns 扫描结果
   */
  scanFromBase64(base64: string, options?: ImageScanOptions): Promise<ISBNScanResult>;
  
  /**
   * 从图片URL扫描ISBN
   * @param url 图片URL
   * @param options 扫描选项
   * @returns 扫描结果
   */
  scanFromUrl(url: string, options?: ImageScanOptions): Promise<ISBNScanResult>;
  
  /**
   * 验证ISBN格式
   * @param isbn ISBN值
   * @returns 验证结果
   */
  validateISBN(isbn: string): {
    isbnType: ISBNType;
    validationResult: ISBNValidationResult;
    processedIsbn?: string;
  };
}