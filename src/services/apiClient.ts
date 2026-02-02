/**
 * API客户端服务
 * 负责与后端服务器通信
 */

// API客户端配置
// 使用相对路径，通过Vite代理转发到后端
const API_BASE_URL = '/api';

/**
 * 通用API请求方法
 * @param url API路径
 * @param options 请求选项
 * @param responseType 响应类型 ('json' | 'blob')
 * @returns Promise<any> 响应数据
 */
async function apiRequest(url: string, options: RequestInit = {}, responseType: 'json' | 'blob' = 'json'): Promise<any> {
  try {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log('🌐 API请求:', fullUrl);
    console.log('📦 请求方法:', options.method);
    console.log('📦 请求头:', options.headers);

    if (options.body) {
      try {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        console.log('📦 请求体:', bodyStr);
      } catch (e) {
        console.log('📦 请求体:', options.body);
      }
    }

    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    console.log('📦 响应状态:', response.status, response.statusText);

    // 检查响应状态
    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status}`;

      try {
        const errorData = await response.json();
        console.log('❌ 错误响应数据:', errorData);

        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (jsonError) {
        // 如果无法解析JSON，使用默认错误信息
        console.error('无法解析错误响应:', jsonError);
      }

      throw new Error(errorMessage);
    }
    
    // 处理空响应
    if (response.status === 204) {
      return null;
    }
    
    // 根据响应类型处理
    if (responseType === 'blob') {
      return response.blob();
    }
    
    return response.json();
  } catch (error) {
    console.error('API请求失败:', error);
    if (error instanceof Error) {
      // 保留原始错误信息
      throw error;
    }
    // 转换为Error对象
    throw new Error(String(error));
  }
}

/**
 * 通用API客户端
 * 提供标准的HTTP方法
 */
export const apiClient = {
  get: (url: string) => apiRequest(url),
  post: (url: string, data?: any) => apiRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),
  put: (url: string, data?: any) => apiRequest(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  }),
  delete: (url: string) => apiRequest(url, {
    method: 'DELETE'
  })
};

/**
 * 书籍API
 */
export const bookApi = {
  /**
   * 获取所有书籍
   * @param readerId 读者ID（可选，默认为0）
   */
  getAll: (readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiRequest(`/books${queryString}`);
  },

  /**
   * 根据ID获取书籍
   * @param id 书籍ID
   */
  getById: (id: number) => apiRequest(`/books/${id}`),

  /**
   * 创建书籍
   * @param book 书籍数据
   */
  create: (book: any) => apiRequest('/books', {
    method: 'POST',
    body: JSON.stringify(book)
  }),

  /**
   * 更新书籍
   * @param id 书籍ID
   * @param book 书籍数据
   */
  update: (id: number, book: any) => apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(book)
  }),

  /**
   * 删除书籍
   * @param id 书籍ID
   */
  delete: (id: number) => apiRequest(`/books/${id}`, {
    method: 'DELETE'
  }),

  /**
   * 搜索书籍
   * @param params 搜索参数
   */
  search: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/books/search?${queryString}`);
  },

  /**
   * 上传书籍封面
   * @param id 书籍ID
   * @param file 封面文件
   */
  uploadCover: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('cover', file);

    return apiRequest(`/books/${id}/cover`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },

  /**
   * 删除书籍封面
   * @param id 书籍ID
   */
  deleteCover: (id: number) => apiRequest(`/books/${id}/cover`, {
    method: 'DELETE'
  }),

  /**
   * 导入书籍数据
   * @param books 书籍数据数组
   */
  import: (books: any[]) => apiRequest('/books/import', {
    method: 'POST',
    body: JSON.stringify({ books })
  }),

  /**
   * 导出书籍数据
   */
  export: () => apiRequest('/books/export', {
    method: 'GET'
  }, 'blob'),

  /**
   * 获取书籍的阅读状态
   * @param id 书籍ID
   * @param readerId 读者ID（可选，默认为0）
   */
  getReadingState: (id: number, readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiRequest(`/books/${id}/reading-state${queryString}`);
  },

  /**
   * 更新书籍的阅读状态
   * @param id 书籍ID
   * @param readingState 阅读状态数据
   * @param readerId 读者ID（可选，默认为0）
   */
  updateReadingState: (id: number, readingState: any, readerId?: number) => {
    const queryString = readerId ? `?readerId=${readerId}` : '';
    return apiRequest(`/books/${id}/reading-state${queryString}`, {
      method: 'PUT',
      body: JSON.stringify(readingState)
    });
  },

  /**
   * 更新书籍的阅读进度
   * @param id 书籍ID
   * @param readPages 已读页数
   */
  updateReadingProgress: (id: number, readPages: number) => {
    return apiRequest(`/books/${id}/reading-progress`, {
      method: 'PUT',
      body: JSON.stringify({ readPages })
    });
  }
};

/**
 * 分组API
 */
export const groupApi = {
  /**
   * 获取所有分组
   */
  getAll: () => apiRequest('/groups'),
  
  /**
   * 根据ID获取分组
   * @param id 分组ID
   */
  getById: (id: string) => apiRequest(`/groups/${id}`),
  
  /**
   * 创建分组
   * @param group 分组数据
   */
  create: (group: any) => apiRequest('/groups', {
    method: 'POST',
    body: JSON.stringify(group)
  }),
  
  /**
   * 更新分组
   * @param id 分组ID
   * @param group 分组数据
   */
  update: (id: string, group: any) => apiRequest(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(group)
  }),
  
  /**
   * 删除分组
   * @param id 分组ID
   */
  delete: (id: string) => apiRequest(`/groups/${id}`, {
    method: 'DELETE'
  }),
  
  /**
   * 更新分组排序
   * @param groups 分组数据数组
   */
  updateSort: (groups: any[]) => apiRequest('/groups/sort', {
    method: 'PUT',
    body: JSON.stringify({ groups })
  }),
  
  /**
   * 导入分组数据
   * @param groups 分组数据数组
   */
  import: (groups: any[]) => apiRequest('/groups/import', {
    method: 'POST',
    body: JSON.stringify({ groups })
  }),
  
  /**
   * 导出分组数据
   */
  export: () => apiRequest('/groups/export', {
    method: 'GET'
  }, 'blob')
};

/**
 * 标签API
 * 注意：不再使用 qc_tags 表，标签直接存储在 qc_bookmark_tags 表中
 */
export const tagApi = {
  /**
   * 获取所有书摘标签
   */
  getAll: () => apiRequest('/tags'),
  
  /**
   * 获取指定书摘的标签
   * @param bookmarkId 书摘ID
   */
  getByBookmarkId: (bookmarkId: string | number) => apiRequest(`/tags/bookmark/${bookmarkId}`),

  /**
   * 删除指定标签
   * @param tagName 标签名称
   */
  delete: (tagName: string) => apiRequest(`/tags/${encodeURIComponent(tagName)}`, {
    method: 'DELETE'
  })
};

/**
 * 书签API
 */
export const bookmarkApi = {
  /**
   * 获取所有书签
   * @param bookId 书籍ID
   */
  getAll: (bookId?: number) => {
    const queryString = bookId ? `?bookId=${bookId}` : '';
    return apiRequest(`/qc/bookmarks${queryString}`);
  },

  /**
   * 根据ID获取书签
   * @param id 书签ID
   */
  getById: (id: string) => apiRequest(`/qc/bookmarks/${id}`),

  /**
   * 创建书签
   * @param bookmark 书签数据
   */
  create: (bookmark: any) => apiRequest('/qc/bookmarks', {
    method: 'POST',
    body: JSON.stringify(bookmark)
  }),

  /**
   * 更新书签
   * @param id 书签ID
   * @param bookmark 书签数据
   */
  update: (id: string, bookmark: any) => apiRequest(`/qc/bookmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bookmark)
  }),

  /**
   * 删除书签
   * @param id 书签ID
   */
  delete: (id: string) => apiRequest(`/qc/bookmarks/${id}`, {
    method: 'DELETE'
  }),

  /**
   * 导入书签数据
   * @param bookmarks 书签数据数组
   */
  import: (bookmarks: any[]) => apiRequest('/bookmarks/import', {
    method: 'POST',
    body: JSON.stringify({ bookmarks })
  }),

  /**
   * 导出书签数据
   */
  export: () => apiRequest('/bookmarks/export', {
    method: 'GET'
  }, 'blob')
};

/**
 * 备份API
 */
export const backupApi = {
  /**
   * 获取所有备份
   */
  getAll: () => apiRequest('/backup'),
  
  /**
   * 创建备份
   */
  create: () => apiRequest('/backup', {
    method: 'POST'
  }),
  
  /**
   * 恢复备份
   * @param filename 备份文件名
   */
  restore: (filename: string) => apiRequest(`/backup/restore/${filename}`, {
    method: 'POST'
  }),
  
  /**
   * 删除备份
   * @param filename 备份文件名
   */
  delete: (filename: string) => apiRequest(`/backup/${filename}`, {
    method: 'DELETE'
  }),
  
  /**
   * 下载备份
   * @param filename 备份文件名
   */
  download: (filename: string) => apiRequest(`/backup/download/${filename}`, {
    method: 'GET'
  }, 'blob')
};

/**
 * 健康检查API
 */
export const healthApi = {
  check: () => apiRequest('/health')
};

/**
 * 版本信息API
 */
export const versionApi = {
  get: () => apiRequest('/version')
};

/**
 * DBR (Douban Book Rust) API
 */
export const dbrApi = {
  /**
   * 搜索书籍
   * @param params 搜索参数
   */
  search: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/dbr/search?${queryString}`);
  },
  
  /**
   * 根据ISBN获取书籍信息
   * @param isbn ISBN号码
   */
  getByIsbn: (isbn: string) => apiRequest(`/dbr/isbn/${isbn}`),
  
  /**
   * 根据ID获取书籍信息
   * @param id 书籍ID
   */
  getById: (id: string) => apiRequest(`/dbr/id/${id}`)
};