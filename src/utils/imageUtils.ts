/**
 * 图片工具类
 * 用于处理图片下载、转换和存储等操作
 */

/**
 * 将外部图片URL转换为Base64格式，支持超时处理
 * @param url 图片URL
 * @param timeout 超时时间（毫秒），默认5000ms
 * @returns Promise<string> Base64格式的图片数据
 */
export const imageUrlToBase64 = (url: string, timeout: number = 5000): Promise<string> => {

  // 移除URL中的反引号，确保URL格式正确
  const cleanUrl = url.replace(/[`]/g, '');

  return new Promise((resolve, reject) => {

    // 创建图片对象
    const img = new Image();
    
    // 设置超时定时器
    const timeoutId = setTimeout(() => {
      console.error('⏱️ 图片加载超时:', cleanUrl);
      // 超时后直接返回URL，让浏览器尝试加载
      resolve(cleanUrl);
    }, timeout);

    // 图片加载成功
    img.onload = () => {
      clearTimeout(timeoutId);


      try {

        // 创建Canvas元素
        const canvas = document.createElement('canvas');

        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('❌ 无法获取Canvas上下文');
          // 获取上下文失败，返回URL
          resolve(cleanUrl);
          return;
        }
        
        // 优化：设置最大尺寸，避免超大图片
        const maxWidth = 800;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;
        
        // 计算新尺寸，保持宽高比
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);

        } else {

        }
        
        // 设置Canvas尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制图片到Canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        try {

          // 将Canvas转换为Base64格式，使用优化的压缩质量
          const base64 = canvas.toDataURL('image/jpeg', 0.8);

          console.log('🔍 Base64数据前缀:', base64.substring(0, 100) + '...');
          
          resolve(base64);
        } catch (canvasError) {
          // 如果Canvas转换失败（可能是因为CORS限制），则直接返回URL作为Base64数据
          // 这种情况下，图片将直接通过URL加载，而不是Base64数据

          resolve(cleanUrl);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Canvas处理失败:', error);
        // 如果整体处理失败，直接返回URL
        resolve(cleanUrl);
      }
    };

    // 图片加载失败
    img.onerror = (event) => {
      clearTimeout(timeoutId);
      console.error('💥 图片加载失败事件:', event);
      console.error('📝 错误详情:', event);
      // 如果图片加载失败，直接返回URL，让浏览器尝试加载
      resolve(cleanUrl);
    };

    // 设置图片URL，开始加载
    img.src = cleanUrl;

  });
};

/**
 * 检查图片URL是否有效，支持超时处理
 * @param url 图片URL
 * @param timeout 超时时间（毫秒），默认3000ms
 * @returns Promise<boolean> 是否有效
 */
export const isImageUrlValid = (url: string, timeout: number = 3000): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // 设置超时
    const timeoutId = setTimeout(() => {

      clearTimeout(timeoutId);
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };
    
    img.src = url;
  });
};

/**
 * 生成本地占位图片
 * @param width 宽度，默认120
 * @param height 高度，默认180
 * @returns Promise<string> Base64格式的占位图片
 */
export const generatePlaceholderImage = (width: number = 120, height: number = 180): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
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
    
    // 转换为Base64
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } else {
        // 如果转换失败，使用一个简单的空白GIF
        const blankGif = 'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        resolve(`data:image/gif;base64,${blankGif}`);
      }
    }, 'image/jpeg', 0.8);
  });
};

/**
 * 带重试机制的图片URL转换为Base64
 * @param url 图片URL
 * @param maxRetries 最大重试次数，默认3次
 * @param timeout 单次超时时间（毫秒），默认5000ms
 * @returns Promise<string> Base64格式的图片数据
 */
export const imageUrlToBase64WithRetry = async (url: string, maxRetries: number = 3, timeout: number = 5000): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let i = 1; i <= maxRetries; i++) {
    try {

      return await imageUrlToBase64(url, timeout);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 指数退避策略，增加重试间隔
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 1000;

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ 所有${maxRetries}次尝试均失败:`, lastError?.message);
  throw lastError || new Error(`图片转换失败: ${url}`);
};

/**
 * 下载并处理书籍封面图片
 * @param bookId 书籍ID
 * @param url 封面图片URL
 * @returns Promise<void> 上传成功
 */
export const downloadBookCover = async (bookId: number, coverUrl?: string): Promise<void> => {

  if (!coverUrl) {

    return;
  }

  try {
    // 清理URL，移除反引号等特殊字符
    const cleanUrl = coverUrl.replace(/[`]/g, '');

    // 导入图片管理工具
    const { downloadAndUploadImage } = await import('./localImageStorage');

    // 下载并上传到服务器

    await downloadAndUploadImage(bookId, cleanUrl);

  } catch (error) {
    console.error(`❌ 处理封面图片失败: ${coverUrl}`, error);
    console.error('❌ 错误详情:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

/**
 * 获取图片的适当尺寸版本
 * @param base64 Base64格式的图片数据
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @returns Promise<string> 调整尺寸后的Base64图片数据
 */
export const resizeImage = (base64: string, maxWidth: number = 800, maxHeight: number = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // 计算新尺寸，保持宽高比
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
          
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // 创建Canvas并绘制调整后的图片
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为Base64格式
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(resizedBase64);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('调整图片尺寸失败'));
    };
    
    img.src = base64;
  });
};

/**
 * 清理无效的图片数据
 * @param base64 Base64格式的图片数据
 * @returns boolean 是否为有效的Base64图片数据
 */
export const isValidBase64Image = (base64: string): boolean => {
  if (typeof base64 !== 'string') {
    return false;
  }
  
  // 检查Base64格式前缀
  const base64Regex = /^data:image\/(jpeg|png|gif|webp);base64,/;
  return base64Regex.test(base64);
};
