/**
 * 图像增强工具类
 * 用于提高扫描图像的质量和清晰度
 */

/**
 * 图像增强选项
 */
export interface ImageEnhanceOptions {
  // 锐化强度 (0-1)
  sharpen?: number;
  // 对比度增强 (0-100)
  contrast?: number;
  // 亮度调整 (-100-100)
  brightness?: number;
  // 去噪强度 (0-10)
  denoise?: number;
  // 二值化阈值 (0-255)
  binarizeThreshold?: number;
}

/**
 * 应用图像增强到 Canvas
 * @param canvas 原始 Canvas
 * @param options 增强选项
 * @returns 增强后的 Canvas
 */
export function applyImageEnhancement(
  canvas: HTMLCanvasElement,
  options: ImageEnhanceOptions = {}
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  // 创建新的 Canvas 用于增强处理
  const enhancedCanvas = document.createElement('canvas');
  enhancedCanvas.width = canvas.width;
  enhancedCanvas.height = canvas.height;
  const enhancedCtx = enhancedCanvas.getContext('2d');
  if (!enhancedCtx) {
    return canvas;
  }

  // 获取原始图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 应用亮度调整
  if (options.brightness !== undefined && options.brightness !== 0) {
    adjustBrightness(data, options.brightness);
  }

  // 应用对比度调整
  if (options.contrast !== undefined && options.contrast !== 0) {
    adjustContrast(data, options.contrast);
  }

  // 应用锐化
  if (options.sharpen && options.sharpen > 0) {
    const sharpenedData = applySharpening(
      data,
      canvas.width,
      canvas.height,
      options.sharpen
    );
    imageData.data.set(sharpenedData);
  }

  // 应用去噪
  if (options.denoise !== undefined && options.denoise > 0) {
    const denoisedData = applyDenoise(
      data,
      canvas.width,
      canvas.height,
      options.denoise
    );
    imageData.data.set(denoisedData);
  }

  // 应用二值化（用于条码识别）
  if (options.binarizeThreshold !== undefined) {
    applyBinarization(data, options.binarizeThreshold);
  }

  // 将处理后的图像绘制到新 Canvas
  enhancedCtx.putImageData(imageData, 0, 0);

  return enhancedCanvas;
}

/**
 * 调整亮度
 */
function adjustBrightness(data: Uint8ClampedArray, brightness: number): void {
  const factor = brightness * 2.55; // 转换为 0-255 范围
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + factor));     // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor)); // B
  }
}

/**
 * 调整对比度
 */
function adjustContrast(data: Uint8ClampedArray, contrast: number): void {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
  }
}

/**
 * 应用锐化滤镜
 */
function applySharpening(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data);
  
  // 锐化卷积核 (3x3)
  //  0  -1   0
  // -1   5  -1
  //  0  -1   0
  const kernel = [
    0, -1 * amount, 0,
    -1 * amount, 1 + 4 * amount, -1 * amount,
    0, -1 * amount, 0
  ];

  // 边缘处理：保持边缘像素不变
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        result[idx] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  return result;
}

/**
 * 应用去噪滤镜（中值滤波）
 */
function applyDenoise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data);
  const windowSize = Math.min(5, 1 + Math.floor(intensity / 2)); // 1-5 的窗口大小

  // 只对边缘附近的像素应用去噪，提高性能
  for (let y = windowSize; y < height - windowSize; y++) {
    for (let x = windowSize; x < width - windowSize; x++) {
      for (let c = 0; c < 3; c++) {
        // 收集窗口内的像素值
        const values: number[] = [];
        for (let wy = -windowSize; wy <= windowSize; wy++) {
          for (let wx = -windowSize; wx <= windowSize; wx++) {
            const idx = ((y + wy) * width + (x + wx)) * 4 + c;
            values.push(data[idx]);
          }
        }

        // 排序并取中值
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];

        // 应用部分去噪效果（根据强度混合原始值和中值）
        const idx = (y * width + x) * 4 + c;
        result[idx] = Math.floor(data[idx] * (1 - intensity / 10) + median * (intensity / 10));
      }
    }
  }

  return result;
}

/**
 * 应用二值化（黑白）
 */
function applyBinarization(data: Uint8ClampedArray, threshold: number): void {
  for (let i = 0; i < data.length; i += 4) {
    // 计算灰度值
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const binary = gray > threshold ? 255 : 0;
    
    data[i] = binary;     // R
    data[i + 1] = binary; // G
    data[i + 2] = binary; // B
  }
}

/**
 * 自动增强图像（适用于条码识别）
 */
export function autoEnhanceForBarcode(
  canvas: HTMLCanvasElement
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 计算平均亮度
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avgBrightness = totalBrightness / (data.length / 4);

  // 根据亮度自动调整
  const brightnessAdjust = avgBrightness < 100 ? 20 : avgBrightness > 180 ? -15 : 0;
  
  // 自动计算二值化阈值（使用Otsu方法简化版）
  const threshold = calculateOtsuThreshold(data);

  return applyImageEnhancement(canvas, {
    brightness: brightnessAdjust,
    contrast: 15,
    sharpen: 0.6,
    denoise: 2,
    binarizeThreshold: threshold
  });
}

/**
 * 计算Otsu阈值（用于自动二值化）
 */
function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  // 计算直方图
  const histogram = new Array(256).fill(0);
  let pixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
    pixelCount++;
  }

  // Otsu算法：找到最大化类间方差的阈值
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    let w0 = 0; // 前景像素比例
    let w1 = 0; // 背景像素比例
    let u0 = 0; // 前景平均灰度
    let u1 = 0; // 背景平均灰度

    for (let i = 0; i < 256; i++) {
      if (i <= t) {
        w0 += histogram[i];
        u0 += i * histogram[i];
      } else {
        w1 += histogram[i];
        u1 += i * histogram[i];
      }
    }

    if (w0 === 0 || w1 === 0) continue;

    w0 /= pixelCount;
    w1 /= pixelCount;
    u0 /= w0 * pixelCount;
    u1 /= w1 * pixelCount;

    const variance = w0 * w1 * (u0 - u1) * (u0 - u1);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * 检测图像质量
 */
export interface ImageQualityMetrics {
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
  overallScore: number;
}

export function detectImageQuality(
  canvas: HTMLCanvasElement
): ImageQualityMetrics {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      brightness: 50,
      contrast: 50,
      sharpness: 50,
      noise: 50,
      overallScore: 50
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // 1. 计算平均亮度
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avgBrightness = totalBrightness / (data.length / 4);
  const brightnessScore = Math.min(100, Math.max(0, (avgBrightness / 255) * 100));

  // 2. 计算对比度（使用标准差）
  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += Math.pow(gray - avgBrightness, 2);
  }
  const stdDev = Math.sqrt(variance / (data.length / 4));
  const contrastScore = Math.min(100, (stdDev / 128) * 100);

  // 3. 计算锐度（使用Laplacian算子）
  let laplacianSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // 4邻域差分
      const grayTop = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
      const grayBottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
      const grayLeft = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
      const grayRight = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      
      const laplacian = Math.abs(4 * gray - grayTop - grayBottom - grayLeft - grayRight);
      laplacianSum += laplacian;
      laplacianCount++;
    }
  }
  const avgLaplacian = laplacianSum / laplacianCount;
  const sharpnessScore = Math.min(100, (avgLaplacian / 50) * 100);

  // 4. 估算噪声（使用局部方差）
  let noiseSum = 0;
  let noiseCount = 0;
  const step = 5; // 采样间隔，提高性能
  for (let y = 5; y < height - 5; y += step) {
    for (let x = 5; x < width - 5; x += step) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // 3x3 邻域
      let sum = 0;
      let count = 0;
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          const nIdx = ((y + ny) * width + (x + nx)) * 4;
          sum += (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          count++;
        }
      }
      const localMean = sum / count;
      noiseSum += Math.abs(gray - localMean);
      noiseCount++;
    }
  }
  const avgNoise = noiseSum / noiseCount;
  const noiseScore = Math.min(100, (1 - avgNoise / 50) * 100);

  // 综合评分（加权平均）
  const overallScore = (
    brightnessScore * 0.2 +
    contrastScore * 0.25 +
    sharpnessScore * 0.35 +
    noiseScore * 0.2
  );

  return {
    brightness: Math.round(brightnessScore),
    contrast: Math.round(contrastScore),
    sharpness: Math.round(sharpnessScore),
    noise: Math.round(noiseScore),
    overallScore: Math.round(overallScore)
  };
}
