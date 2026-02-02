/**
 * ISBN图片扫描服务实现
 * 使用ZXing库从图片中识别ISBN条码
 */

import { BarcodeFormat, MultiFormatReader, BinaryBitmap, HybridBinarizer, HTMLCanvasElementLuminanceSource, DecodeHintType } from '@zxing/library';
import { resizeImage } from '@/utils/imageUtils';
import { autoEnhanceForBarcode, applyImageEnhancement } from '@/utils/imageEnhancer';
import {
  ISBNType,
  ISBNValidationResult,
  ISBNScanResult,
  ImageScanOptions,
  ISBNImageScannerService
} from './types';

/**
 * ISBN图片扫描服务实现类
 */
class ISBNImageScannerServiceImpl implements ISBNImageScannerService {
  private barcodeReader: MultiFormatReader;
  
  constructor() {
    // 初始化ZXing条码阅读器
    this.barcodeReader = new MultiFormatReader();
    // 设置解码提示，仅识别ISBN相关的条码格式
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.EAN_8
    ]);
    this.barcodeReader.setHints(hints);
  }
  
  /**
   * 验证ISBN-10格式
   * @param isbn ISBN-10值
   * @returns 是否有效
   */
  private validateISBN10(isbn: string): boolean {
    // ISBN-10格式：10位数字，最后一位可以是X
    const isbn10Regex = /^\d{9}[\dXx]$/;
    if (!isbn10Regex.test(isbn)) {
      return false;
    }
    
    // 计算校验和
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (i + 1) * parseInt(isbn[i], 10);
    }
    
    // 最后一位处理
    const lastChar = isbn[9];
    const lastDigit = lastChar === 'X' || lastChar === 'x' ? 10 : parseInt(lastChar, 10);
    
    return (sum + 10 * lastDigit) % 11 === 0;
  }
  
  /**
   * 验证ISBN-13格式
   * @param isbn ISBN-13值
   * @returns 是否有效
   */
  private validateISBN13(isbn: string): boolean {
    // ISBN-13格式：13位数字
    const isbn13Regex = /^\d{13}$/;
    if (!isbn13Regex.test(isbn)) {
      return false;
    }
    
    // 计算校验和
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = parseInt(isbn[12], 10);
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheckDigit;
  }
  
  /**
   * 验证ISBN格式（实现接口方法）
   */
  validateISBN(isbn: string): {
    isbnType: ISBNType;
    validationResult: ISBNValidationResult;
    processedIsbn?: string;
  } {
    // 清理ISBN，移除连字符和空格
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    
    // 检测ISBN类型
    if (cleanIsbn.length === 10) {
      if (this.validateISBN10(cleanIsbn)) {
        return {
          isbnType: ISBNType.ISBN_10,
          validationResult: ISBNValidationResult.VALID,
          processedIsbn: cleanIsbn
        };
      } else {
        return {
          isbnType: ISBNType.ISBN_10,
          validationResult: ISBNValidationResult.INVALID_CHECKSUM
        };
      }
    } else if (cleanIsbn.length === 13) {
      if (this.validateISBN13(cleanIsbn)) {
        return {
          isbnType: ISBNType.ISBN_13,
          validationResult: ISBNValidationResult.VALID,
          processedIsbn: cleanIsbn
        };
      } else {
        return {
          isbnType: ISBNType.ISBN_13,
          validationResult: ISBNValidationResult.INVALID_CHECKSUM
        };
      }
    } else {
      return {
        isbnType: ISBNType.UNKNOWN,
        validationResult: ISBNValidationResult.INVALID_FORMAT
      };
    }
  }
  
  /**
   * 图片预处理
   * @param base64 Base64图片数据
   * @param options 预处理选项
   * @returns 预处理后的Base64图片数据
   */
  private async preprocessImage(
    base64: string,
    options: ImageScanOptions
  ): Promise<string> {
    if (!options.enablePreprocessing) {
      return base64;
    }
    
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1080;
    
    try {
      // 先调整尺寸
      let processedBase64 = resizeImage(base64, maxWidth, maxHeight);
      
      // 创建Canvas进行图像增强
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = processedBase64;
      
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = (e) => {
          console.error('图片加载失败:', e);
          reject(new Error('图片加载失败'));
        };
      });
      
      // 创建Canvas
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('无法获取Canvas上下文，跳过图像增强');
        return processedBase64;
      }
      
      ctx.drawImage(image, 0, 0);
      
      try {
        // 应用自动图像增强（专门针对条码识别）
        const enhancedCanvas = autoEnhanceForBarcode(canvas);
        
        // 转换回Base64
        processedBase64 = enhancedCanvas.toDataURL('image/jpeg', 0.95);
      } catch (e) {
        console.warn('图像增强失败，使用原始图像:', e);
        // 图像增强失败时，返回调整尺寸后的原始图像
      }
      
      return processedBase64;
    } catch (e) {
      console.warn('图像预处理失败，返回原始图像:', e);
      // 预处理完全失败时，返回原始图像
      return base64;
    }
  }
  
  /**
   * 从Image对象扫描条码（带多级尝试）
   * @param image Image对象
   * @returns 扫描结果
   */
  private scanFromImage(image: HTMLImageElement): string {
    const strategyNames = [
      '原始图像',
      '自动增强',
      '提高对比度',
      '二值化'
    ];
    
    // 尝试多种预处理策略
    const strategies = [
      // 策略1: 原始图像
      () => {
        console.log('🔍 尝试策略1:', strategyNames[0]);
        return this.decodeWithCanvas(image, { });
      },
      // 策略2: 自动增强
      () => {
        console.log('🔍 尝试策略2:', strategyNames[1]);
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取Canvas上下文');
        ctx.drawImage(image, 0, 0);
        const enhanced = autoEnhanceForBarcode(canvas);
        return this.decodeWithCanvas(enhanced);
      },
      // 策略3: 提高对比度
      () => {
        console.log('🔍 尝试策略3:', strategyNames[2]);
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取Canvas上下文');
        ctx.drawImage(image, 0, 0);
        const enhanced = applyImageEnhancement(canvas, { contrast: 30, sharpen: 0.8 });
        return this.decodeWithCanvas(enhanced);
      },
      // 策略4: 二值化（高对比度）
      () => {
        console.log('🔍 尝试策略4:', strategyNames[3]);
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取Canvas上下文');
        ctx.drawImage(image, 0, 0);
        const enhanced = applyImageEnhancement(canvas, { 
          contrast: 50, 
          binarizeThreshold: 128 
        });
        return this.decodeWithCanvas(enhanced);
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]();
        console.log('✅ 策略成功:', strategyNames[i], '结果:', result);
        return result;
      } catch (e) {
        console.warn('⚠️ 策略失败:', strategyNames[i], (e as Error).message);
        // 继续尝试下一个策略
        continue;
      }
    }

    throw new Error('所有识别策略均失败，请确保图片清晰且包含完整的ISBN条码');
  }

  /**
   * 使用Canvas解码条码
   * @param canvas Canvas对象
   * @returns 扫描结果
   */
  private decodeWithCanvas(canvas: HTMLCanvasElement): string {
    // 1. 创建亮度源
    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
    // 2. 创建二进制位图
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    // 3. 解码条码
    const result = this.barcodeReader.decode(binaryBitmap);
    return result.getText();
  }
  
  /**
   * 从Base64图片扫描ISBN（实现接口方法）
   */
  async scanFromBase64(
    base64: string,
    options: ImageScanOptions = {}
  ): Promise<ISBNScanResult> {
    const startTime = Date.now();
    
    try {
      // 设置默认选项
      const scanOptions = {
        enablePreprocessing: true,
        maxWidth: 1200,
        maxHeight: 1600,
        onlyValidIsbn: true,
        ...options
      };
      
      // 图片预处理
      const processedBase64 = await this.preprocessImage(base64, scanOptions);
      
      // 创建Image对象
      const image = new Image();
      image.src = processedBase64;
      
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('图片加载失败'));
      });
      
      // 扫描条码
      const rawBarcode = await this.scanFromImage(image);
      
      // 验证ISBN
      const validationResult = this.validateISBN(rawBarcode);
      
      // 如果要求只返回有效ISBN，但结果无效，则抛出错误
      if (scanOptions.onlyValidIsbn && validationResult.validationResult !== ISBNValidationResult.VALID) {
        throw new Error(`识别到的条码不是有效的ISBN: ${rawBarcode}`);
      }
      
      // 构建扫描结果
      const endTime = Date.now();
      return {
        rawValue: rawBarcode,
        isbnType: validationResult.isbnType,
        validationResult: validationResult.validationResult,
        processedIsbn: validationResult.processedIsbn,
        processingTime: endTime - startTime
      };
      
    } catch (error) {
      const endTime = Date.now();
      return {
        rawValue: '',
        isbnType: ISBNType.UNKNOWN,
        validationResult: ISBNValidationResult.UNKNOWN_TYPE,
        error: error instanceof Error ? error.message : String(error),
        processingTime: endTime - startTime
      };
    }
  }
  
  /**
   * 从图片文件扫描ISBN（实现接口方法）
   */
  async scanFromFile(
    file: File,
    options: ImageScanOptions = {}
  ): Promise<ISBNScanResult> {
    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        rawValue: '',
        isbnType: ISBNType.UNKNOWN,
        validationResult: ISBNValidationResult.UNKNOWN_TYPE,
        error: '不支持的图片格式，仅支持JPG、PNG、GIF、WebP格式'
      };
    }
    
    // 检查文件大小（最大10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        rawValue: '',
        isbnType: ISBNType.UNKNOWN,
        validationResult: ISBNValidationResult.UNKNOWN_TYPE,
        error: '图片文件过大，最大支持10MB'
      };
    }
    
    // 将文件转换为Base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
    
    // 使用Base64扫描方法
    return this.scanFromBase64(base64, options);
  }
  
  /**
   * 从图片URL扫描ISBN（实现接口方法）
   */
  async scanFromUrl(
    url: string,
    options: ImageScanOptions = {}
  ): Promise<ISBNScanResult> {
    try {
      // 验证URL格式
      new URL(url);
      
      // 下载图片并转换为Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取Canvas上下文'));
            return;
          }
          
          ctx.drawImage(image, 0, 0, image.width, image.height);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        
        image.onerror = () => reject(new Error('图片下载失败'));
        image.src = url;
      });
      
      // 使用Base64扫描方法
      return this.scanFromBase64(base64, options);
      
    } catch (error) {
      return {
        rawValue: '',
        isbnType: ISBNType.UNKNOWN,
        validationResult: ISBNValidationResult.UNKNOWN_TYPE,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

/**
 * ISBN图片扫描服务单例
 */
export const isbnImageScannerService: ISBNImageScannerService = new ISBNImageScannerServiceImpl();

/**
 * 导出所有类型和服务
 */
export * from './types';
export default isbnImageScannerService;