/**
 * 增强版API客户端服务
 * 提供统一的请求拦截、错误处理、重试机制等功能
 */

// API基础配置
const API_BASE_URL = '/api';
const DEFAULT_TIMEOUT = 10000; // 10秒
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

/**
 * 请求配置接口
 */
interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

/**
 * API响应接口
 */
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

/**
 * 请求拦截器类型
 */
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * 响应拦截器类型
 */
type ResponseInterceptor = (response: Response, config: RequestConfig) => Response | Promise<Response>;

/**
 * 错误拦截器类型
 */
type ErrorInterceptor = (error: Error, config: RequestConfig) => void | Promise<void>;

/**
 * API客户端类
 */
class ApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * 添加请求拦截器
   */
  useRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  useResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 添加错误拦截器
   */
  useErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * 通用API请求方法
   */
  async request<T = any>(
    url: string,
    options: RequestConfig = {},
    responseType: 'json' | 'blob' | 'text' = 'json'
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      skipAuth = false,
      skipErrorToast = false,
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 应用请求拦截器
        let config: RequestConfig = {
          ...fetchOptions,
          timeout,
          retries,
          skipAuth,
          skipErrorToast
        };

        for (const interceptor of this.requestInterceptors) {
          config = await interceptor(config);
        }

        // 构建完整URL
        const fullUrl = `${API_BASE_URL}${url}`;

        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptionsWithSignal = {
          ...config,
          signal: controller.signal
        };

        // 发起请求
        const response = await fetch(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          ...fetchOptionsWithSignal
        });

        clearTimeout(timeoutId);

        // 应用响应拦截器
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse, config);
        }

        // 检查响应状态
        if (!response.ok) {
          await this.handleErrorResponse(response, config);
        }

        // 处理空响应
        if (response.status === 204) {
          return null as T;
        }

        // 根据响应类型处理
        if (responseType === 'blob') {
          return response.blob() as T;
        } else if (responseType === 'text') {
          return response.text() as T;
        }

        return response.json() as T;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是请求超时或网络错误，且还有重试次数，则重试
        const isRetriableError = this.isRetriableError(lastError);
        if (isRetriableError && attempt < retries) {
          await this.delay(RETRY_DELAY * (attempt + 1));
          continue;
        }

        // 不再重试，抛出错误
        break;
      }
    }

    // 所有重试都失败，应用错误拦截器
    for (const interceptor of this.errorInterceptors) {
      await interceptor(lastError!, options);
    }

    throw lastError;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetriableError(error: Error): boolean {
    const retryableErrors = [
      'Failed to fetch',
      'NetworkError',
      'timeout',
      'ECONNRESET',
      'ECONNREFUSED'
    ];

    return retryableErrors.some(msg => error.message.includes(msg));
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(response: Response, config: RequestConfig) {
    let errorMessage = `请求失败: ${response.status}`;

    try {
      const errorData = await response.json();

      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.details) {
        errorMessage = errorData.details;
      }
    } catch {
      // 如果无法解析JSON，使用默认错误信息
    }

    throw new Error(errorMessage);
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, config?: RequestConfig, responseType?: 'json' | 'blob' | 'text'): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' }, responseType);
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, config?: RequestConfig, responseType?: 'json' | 'blob' | 'text'): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, responseType);
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

// 添加默认的请求拦截器
apiClient.useRequestInterceptor((config) => {
  // 开发环境下记录请求日志
  if (import.meta.env.DEV) {
    console.log('🌐 [API Request]', {
      method: config.method,
      url: `${API_BASE_URL}${(config as any).url || ''}`,
      headers: config.headers,
      body: config.body
    });
  }

  return config;
});

// 添加默认的响应拦截器
apiClient.useResponseInterceptor((response, config) => {
  // 开发环境下记录响应日志
  if (import.meta.env.DEV) {
  }

  return response;
});

// 添加默认的错误拦截器
apiClient.useErrorInterceptor((error, config) => {
  // 记录错误日志
  console.error('❌ [API Error]', {
    message: error.message,
    method: config.method,
    url: (config as any).url
  });

  // 这里可以添加错误提示逻辑
  // if (!config.skipErrorToast) {
  //   showToast(error.message, 'error');
  // }
});

/**
 * 书籍API
 */
export const bookApi = {
  getAll: (readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiClient.get(`/books${queryString}`);
  },

  getById: (id: number) => apiClient.get(`/books/${id}`),

  create: (book: any) => apiClient.post('/books', book),

  update: (id: number, book: any) => apiClient.put(`/books/${id}`, book),

  delete: (id: number) => apiClient.delete(`/books/${id}`),

  search: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/books/search?${queryString}`);
  },

  uploadCover: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('cover', file);

    return apiClient.post(`/books/${id}/cover`, formData, {
      headers: {} // 清除默认的 Content-Type，让浏览器自动设置
    });
  },

  deleteCover: (id: number) => apiClient.delete(`/books/${id}/cover`),

  import: (books: any[]) => apiClient.post('/books/import', { books }),

  export: () => apiClient.get('/books/export', undefined, 'blob'),

  getReadingState: (id: number, readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiClient.get(`/books/${id}/reading-state${queryString}`);
  },

  updateReadingState: (id: number, readingState: any, readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiClient.put(`/books/${id}/reading-state${queryString}`, readingState);
  },

  updateReadingProgress: (id: number, readPages: number) => {
    return apiClient.put(`/books/${id}/reading-progress`, { readPages });
  }
};

/**
 * 分组API
 */
export const groupApi = {
  getAll: () => apiClient.get('/groups'),

  getById: (id: string) => apiClient.get(`/groups/${id}`),

  create: (group: any) => apiClient.post('/groups', group),

  update: (id: string, group: any) => apiClient.put(`/groups/${id}`, group),

  delete: (id: string) => apiClient.delete(`/groups/${id}`),

  updateSort: (groups: any[]) => apiClient.put('/groups/sort', { groups }),

  import: (groups: any[]) => apiClient.post('/groups/import', { groups }),

  export: () => apiClient.get('/groups/export', undefined, 'blob')
};

/**
 * 标签API
 */
export const tagApi = {
  getAll: () => apiClient.get('/tags'),

  getByBookmarkId: (bookmarkId: string | number) => apiClient.get(`/tags/bookmark/${bookmarkId}`),

  delete: (tagName: string) => apiClient.delete(`/tags/${encodeURIComponent(tagName)}`)
};

/**
 * 书签API
 */
export const bookmarkApi = {
  getAll: (bookId?: number) => {
    const queryString = bookId ? `?bookId=${bookId}` : '';
    return apiClient.get(`/qc/bookmarks${queryString}`);
  },

  getById: (id: string) => apiClient.get(`/qc/bookmarks/${id}`),

  create: (bookmark: any) => apiClient.post('/qc/bookmarks', bookmark),

  update: (id: string, bookmark: any) => apiClient.put(`/qc/bookmarks/${id}`, bookmark),

  delete: (id: string) => apiClient.delete(`/qc/bookmarks/${id}`),

  import: (bookmarks: any[]) => apiClient.post('/bookmarks/import', { bookmarks }),

  export: () => apiClient.get('/bookmarks/export', undefined, 'blob')
};

/**
 * 备份API
 */
export const backupApi = {
  getAll: () => apiClient.get('/backup'),

  create: () => apiClient.post('/backup'),

  restore: (filename: string) => apiClient.post(`/backup/restore/${filename}`),

  delete: (filename: string) => apiClient.delete(`/backup/${filename}`),

  download: (filename: string) => apiClient.get(`/backup/download/${filename}`, undefined, 'blob')
};

/**
 * 健康检查API
 */
export const healthApi = {
  check: () => apiClient.get('/health')
};

/**
 * 版本信息API
 */
export const versionApi = {
  get: () => apiClient.get('/version')
};

/**
 * DBR (Douban Book Rust) API
 */
export const dbrApi = {
  search: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/dbr/search?${queryString}`);
  },

  getByIsbn: (isbn: string) => apiClient.get(`/dbr/isbn/${isbn}`),

  getById: (id: string) => apiClient.get(`/dbr/id/${id}`)
};

/**
 * 阅读活动API
 */
export const activityApi = {
  getAll: () => apiClient.get('/activities'),

  getByDate: (date: string) => apiClient.get(`/activities?date=${date}`),

  create: (activity: any) => apiClient.post('/activities', activity),

  update: (id: number, activity: any) => apiClient.put(`/activities/${id}`, activity),

  delete: (id: number) => apiClient.delete(`/activities/${id}`)
};

/**
 * 同步API
 */
export const syncApi = {
  calibreToTalebook: () => apiClient.post('/sync/calibre-to-talebook'),

  talebookToCalibre: () => apiClient.post('/sync/talebook-to-calibre'),

  getStatus: () => apiClient.get('/sync/status'),

  getLogs: () => apiClient.get('/sync/logs')
};

export default apiClient;
