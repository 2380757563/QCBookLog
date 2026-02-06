/**
 * 图片管理工具
 * 用于通过后端API管理图片，替代localStorage存储
 */

import { bookApi } from '@/services/apiClient';

/**
 * 从URL下载图片数据，支持可配置超时和指数退避重试机制
 * @param url 图片URL（支持绝对URL和相对路径）
 * @param options 下载选项
 * @returns Promise<Blob> 图片Blob数据
 */
const downloadImageAsBlob = async (url: string, options?: {
  timeout?: number;
  maxRetries?: number;
  retryDelayBase?: number;
}): Promise<Blob> => {
  // 默认配置
  const config = {
    timeout: 10000, // 默认10秒超时
    maxRetries: 3, // 默认最大3次重试
    retryDelayBase: 1000, // 基础重试延迟1秒
    ...options
  };

  // 检查URL是否是相对路径
  let fetchUrl = url;
  
  // 只有绝对URL才检查是否是doubanio.com域名
  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    // 只有豆瓣图片使用后端代理，其他图片直接使用原始URL
    if (urlObj.hostname.includes('doubanio.com')) {

      // 提取coverId（格式：/view/subject/l/public/s35302086.jpg → s35302086）
      const coverId = urlObj.pathname.split('/').pop()?.replace('.jpg', '') || '';
      fetchUrl = `/api/douban/cover/${coverId}`;
    }
  }
  
  // 指数退避重试机制
  for (let retryCount = 0; retryCount <= config.maxRetries; retryCount++) {
    try {

      // 创建AbortController用于超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, config.timeout);
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*'
        },
        signal: controller.signal
      });
      
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`图片下载失败: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();

      return blob;
    } catch (error) {
      // 清除超时定时器（如果存在）
      // 由于timeoutId在try块内定义，这里不需要额外清除
      
      // 检查是否是最后一次重试
      if (retryCount >= config.maxRetries) {
        console.error(`❌ 图片下载失败，已达到最大重试次数(${config.maxRetries})，最终错误:`, error);
        // 创建一个默认的空白图片作为占位符
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = 120;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 设置背景色
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 设置文字样式
            ctx.fillStyle = '#999999';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // 绘制文字
            ctx.fillText('无封面', canvas.width / 2, canvas.height / 2);
          }
          // 转换为Blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // 如果转换失败，使用一个简单的空白GIF
              const blankGif = 'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
              const blob = new Blob([atob(blankGif)], { type: 'image/gif' });
              resolve(blob);
            }
          }, 'image/jpeg', 0.8);
        });
      } else {
        // 计算指数退避延迟时间
        const delay = config.retryDelayBase * Math.pow(2, retryCount) + Math.random() * 500; // 添加随机抖动
        console.warn(`⚠️ 第${retryCount + 1}次下载失败:`, error, `将在${Math.round(delay)}ms后重试...`);
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 理论上不会到达这里，但为了类型安全，返回一个默认Blob
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999999';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('无封面', canvas.width / 2, canvas.height / 2);
    }
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        const blankGif = 'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        const blob = new Blob([atob(blankGif)], { type: 'image/gif' });
        resolve(blob);
      }
    }, 'image/jpeg', 0.8);
  });
};

/**
 * 将Blob转换为Base64字符串
 * @param blob 图片Blob数据
 * @returns Promise<string> Base64字符串
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 获取图片URL（统一使用Calibre格式）
 * @param coverUrl 完整的图片URL（由后端生成）
 * @returns string 完整的图片URL
 */
export const getImageUrl = (coverUrl?: string | null): string | null => {
  // 如果没有提供coverUrl，返回null
  if (!coverUrl) {
    return null;
  }

  // 检查是否是阿里云OSS URL
  if (coverUrl.startsWith('https://data-isbn.oss-cn-hangzhou.aliyuncs.com/')) {
    // 提取图片路径
    const imagePath = coverUrl.replace('https://data-isbn.oss-cn-hangzhou.aliyuncs.com/', '');
    // 使用代理端点
    return `/api/aliyun-oss-image/${imagePath}`;
  }

  // 检查是否是豆瓣图片URL
  if (coverUrl.includes('doubanio.com')) {
    // 提取coverId（格式：/view/subject/l/public/s35302086.jpg → s35302086）
    const coverIdMatch = coverUrl.match(/\/public\/(s\d+)\.jpg/i);
    if (coverIdMatch && coverIdMatch[1]) {
      const coverId = coverIdMatch[1];
      // 使用后端中转接口
      return `/api/douban/cover/${coverId}`;
    }
  }

  // 其他URL（包括Calibre格式）直接使用
  return coverUrl;
};

/**
 * 上传图片到服务器
 * @param bookId 书籍ID
 * @param imageData 图片数据（Base64字符串或Blob）
 * @returns Promise<void> 上传成功
 */
export const uploadImageToServer = async (bookId: number, imageData: string | Blob): Promise<void> => {

  try {
    let blobData: Blob;

    // 如果是Base64字符串，转换为Blob
    if (typeof imageData === 'string') {
      // 检查是否是Base64字符串
      if (imageData.startsWith('data:')) {
        const parts = imageData.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }

        blobData = new Blob([uInt8Array], { type: contentType });
      } else {
        // 如果是URL，下载图片
        blobData = await downloadImageAsBlob(imageData);
      }
    } else {
      // 已经是Blob对象
      blobData = imageData;
    }

    // 创建FormData对象
    const formData = new FormData();
    formData.append('cover', blobData, 'cover.jpg');

    // 调用API上传图片
    const response = await fetch(`/api/books/${bookId}/cover`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `图片上传失败: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 图片上传失败:', error);
    throw error;
  }
};

/**
 * 下载图片并上传到服务器
 * @param bookId 书籍ID
 * @param url 图片URL
 * @returns Promise<void> 上传成功
 */
export const downloadAndUploadImage = async (bookId: number, url: string): Promise<void> => {

  try {
    // 下载图片
    const blob = await downloadImageAsBlob(url);

    // 上传到服务器
    await uploadImageToServer(bookId, blob);
  } catch (error) {
    console.error('❌ 下载并上传图片失败:', error);
    throw error;
  }
};

/**
 * 删除服务器上的图片
 * @param bookId 书籍ID
 * @returns Promise<void>
 */
export const deleteImageFromServer = async (bookId: number): Promise<void> => {

  try {
    await bookApi.deleteCover(bookId);

  } catch (error) {
    console.error('❌ 删除服务器图片失败:', error);
    throw error;
  }
};

/**
 * 图片管理工具对象
 */
export const localImageStorage = {
  getImageUrl,
  uploadImageToServer,
  downloadAndUploadImage,
  deleteImageFromServer
};
