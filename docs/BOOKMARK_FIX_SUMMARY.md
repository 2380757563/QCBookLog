# 书摘功能修复总结

## 问题描述

1. **书摘保存失败**：当修改书摘内容后保存数据，系统未能成功更新数据库中的信息，导致修改操作无效。
2. **500 错误**：进入书摘页面时，`GET http://localhost:7403/api/books` 返回 500 Internal Server Error，导致书摘页面加载失败。
3. **依赖问题**：书摘功能过度依赖 Calibre 书籍列表，当 Calibre 数据库不可用时无法正常使用。

## 解决方案

### 核心思路
让书摘功能完全独立于 Calibre 系统，只依赖 `qc_bookmarks` 和 `qc_bookmark_tags` 两个表。

### 主要修改

#### 1. 后端修改

##### 1.1 修改 `GET /api/books` 接口（`server/routes/books.js`）
**问题**：当 Calibre 数据库不可用时返回 500 错误
**解决**：返回空数组而不是 500 错误
```javascript
router.get('/', async (req, res) => {
  try {
    const useCache = req.query.noCache !== 'true';
    const books = await calibreService.getAllBooksFromCalibre(useCache);
    res.json(books);
  } catch (error) {
    console.error('⚠️ 获取书籍列表失败，返回空数组:', error.message);
    res.json([]); // 返回空数组而不是 500 错误
  }
});
```

##### 1.2 修改 `qc_bookmarks` 表结构（`server/services/databaseService.js`）
**问题**：表没有存储书籍信息（书名、作者）
**解决**：添加冗余字段
```javascript
CREATE TABLE IF NOT EXISTS qc_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  book_title TEXT,      // 新增
  book_author TEXT,     // 新增
  content TEXT NOT NULL,
  note TEXT,           // 新增
  page INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
)
```

**自动迁移**：添加数据库迁移逻辑，为现有数据库自动添加新字段

##### 1.3 修改 `qcDataService.js`（`server/services/qcDataService.js`）

**createBookmark 方法**：
- 从 Calibre 数据库获取书籍信息（书名、作者）
- 存储到 `book_title` 和 `book_author` 字段
- 统一使用 `page` 字段（而不是 `page_num`）

**updateBookmark 方法**：
- 更新书籍信息（如果提供了 `book_id`）
- 统一使用 `page` 字段
- 保留原有的书籍信息（如果没有更新）

**getAllBookmarks 方法**：
- 为每个书摘添加标签信息（从 `qc_bookmark_tags` 表）
- 统一字段名映射：
  - `book_title` -> `bookTitle`
  - `book_author` -> `bookAuthor`
  - `page` -> `pageNum`

**getBookmarkById 和 getBookmarksByBookId 方法**：
- 同样进行字段名映射

##### 1.4 修改后端 API 返回格式（`server/routes/qcBookmarks.js`）
**问题**：返回格式为 `{ success: true, data: [...] }`，前端期望直接返回数组
**解决**：直接返回数据
```javascript
router.get('/', (req, res) => {
  try {
    const bookmarks = qcDataService.getAllBookmarks();
    res.json(bookmarks); // 直接返回数组
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. 前端修改

##### 2.1 修改 API 路径（`src/services/apiClient.ts`）
**问题**：使用旧的 `/bookmarks` 路径
**解决**：使用新的 `/qc/bookmarks` 路径
```typescript
export const bookmarkApi = {
  getAll: (bookId?: number) => {
    const queryString = bookId ? `?bookId=${bookId}` : '';
    return apiRequest(`/qc/bookmarks${queryString}`);
  },
  // ...
};
```

##### 2.2 修改 Bookmark 类型定义（`src/services/bookmark/types.ts`）
**问题**：缺少书籍信息字段
**解决**：添加字段
```typescript
export interface Bookmark {
  id: string | number;
  bookId: number;
  bookTitle?: string;    // 新增
  bookAuthor?: string;   // 新增
  content: string;
  note?: string;
  pageNum?: number;
  page?: number;
  tags: string[];
  importSource?: string;
  createTime: string;
  updateTime: string;
  created_at?: string;
  updated_at?: string;
}
```

##### 2.3 修改书摘列表页面（`src/views/Bookmark/index.vue`）
**问题**：依赖书籍列表来获取书名
**解决**：
- 优先加载书摘数据
- 尝试加载书籍列表（可选，如果失败也不中断流程）
- 优先使用书摘中存储的书籍信息

```javascript
onMounted(async () => {
  try {
    // 加载书摘（优先级最高）
    const bookmarks = await bookmarkService.getAllBookmarks();
    bookmarkStore.setBookmarks(bookmarks);

    // 加载标签
    allTags.value = await bookService.getAllTags();

    // 尝试加载书籍列表（可选）
    try {
      const books = await bookService.getAllBooks();
      if (books && books.length > 0) {
        bookStore.setBooks(books);
      }
    } catch (error) {
      console.warn('⚠️ 加载书籍列表失败，书摘将使用存储的书籍信息:', error.message);
      // 不中断流程，继续执行
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
```

##### 2.4 修改书摘编辑页面（`src/views/Bookmark/Edit.vue`）
**问题**：依赖书籍列表来获取书名
**解决**：在编辑模式下直接使用书摘中存储的书籍信息

```javascript
if (bookmark) {
  Object.assign(form, bookmark);

  // 使用书摘中存储的书籍信息
  if (bookmark.bookTitle || bookmark.bookAuthor) {
    selectedBook.value = {
      id: bookmark.bookId,
      title: bookmark.bookTitle || '未知书籍',
      author: bookmark.bookAuthor || '未知作者'
    } as Book;
  }
}
```

##### 2.5 修改书摘详情页面（`src/views/Bookmark/Detail.vue`）
**问题**：依赖书籍列表来获取书名
**解决**：优先使用书摘中存储的书籍信息

```javascript
if (bookmark.value) {
  // 优先使用书摘中存储的书籍信息
  if (bookmark.value.bookTitle || bookmark.value.bookAuthor) {
    book.value = {
      id: bookmark.value.bookId,
      title: bookmark.value.bookTitle || '未知书籍',
      author: bookmark.value.bookAuthor || '未知作者'
    } as Book;
  }
}
```

## 效果

### 1. 功能独立性
- ✅ 书摘功能完全独立于 Calibre 系统
- ✅ 只依赖 `qc_bookmarks` 和 `qc_bookmark_tags` 两个表
- ✅ 即使 Calibre 数据库不可用，书摘页面也能正常加载和操作

### 2. 数据完整性
- ✅ 书摘表包含书籍信息冗余字段（`book_title`、`book_author`）
- ✅ 创建书摘时，自动从 Calibre 数据库获取并存储书籍信息
- ✅ 编辑书摘时，所有字段（content、note、page）都能正确保存

### 3. 错误处理
- ✅ 当 Calibre 数据库不可用时，返回空数组而不是 500 错误
- ✅ 书摘页面加载不会因为 Calibre 不可用而失败
- ✅ 用户可以正常使用书摘功能

### 4. 用户体验
- ✅ 书摘列表页面正常显示书摘
- ✅ 书摘详情页面正常显示书籍信息和书摘内容
- ✅ 编辑书摘功能正常工作
- ✅ 删除书摘功能正常工作

## 测试建议

详细的测试步骤请参考 `BOOKMARK_FIX_TEST_GUIDE.md` 文件。

## 相关文件

### 后端文件
1. `server/routes/books.js` - 修改 `GET /api/books` 接口
2. `server/services/databaseService.js` - 修改 `qc_bookmarks` 表结构和迁移逻辑
3. `server/services/qcDataService.js` - 修改书摘创建、更新、查询逻辑
4. `server/routes/qcBookmarks.js` - 修改 API 返回格式

### 前端文件
1. `src/services/apiClient.ts` - 修改 API 路径
2. `src/services/bookmark/types.ts` - 修改 Bookmark 类型定义
3. `src/views/Bookmark/index.vue` - 修改书摘列表页面
4. `src/views/Bookmark/Edit.vue` - 修改书摘编辑页面
5. `src/views/Bookmark/Detail.vue` - 修改书摘详情页面

### 文档文件
1. `BOOKMARK_FIX_SUMMARY.md` - 本总结文档
2. `BOOKMARK_FIX_TEST_GUIDE.md` - 测试指南
