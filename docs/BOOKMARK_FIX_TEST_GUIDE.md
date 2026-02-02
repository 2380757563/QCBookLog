# 书摘功能修复测试指南

## 问题描述
当修改书摘内容后保存数据，系统未能成功更新数据库中的信息，导致修改操作无效。
同时，当进入书摘页面时，`GET /api/books` 接口返回 500 错误，导致书摘页面加载失败。

## 问题根本原因
1. 书摘页面在加载时会调用 `GET /api/books` 接口，当 Calibre 数据库不可用时返回 500 错误
2. 书摘系统依赖于 Calibre 书籍列表来显示书籍信息（书名、作者等）
3. 书摘表 `qc_bookmarks` 没有存储书籍的冗余信息（书名、作者）

## 解决方案

### 1. 后端修改

#### 1.1 修改 `GET /api/books` 接口
**文件**: `server/routes/books.js`

当 Calibre 数据库不可用时，返回空数组而不是 500 错误：
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

#### 1.2 修改 `qc_bookmarks` 表结构
**文件**: `server/services/databaseService.js`

添加书籍信息冗余字段：
```javascript
CREATE TABLE IF NOT EXISTS qc_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  book_title TEXT,      // 新增
  book_author TEXT,     // 新增
  content TEXT NOT NULL,
  note TEXT,
  page INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
)
```

自动迁移逻辑：
```javascript
// 自动迁移：添加冗余字段（如果不存在）
const bookmarkColumns = this.talebookDb.prepare("PRAGMA table_info(qc_bookmarks)").all();
const bookmarkColumnNames = bookmarkColumns.map(col => col.name);

if (!bookmarkColumnNames.includes('book_title')) {
  db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN book_title TEXT').run();
  console.log('✅ 已为 qc_bookmarks 表添加 book_title 列');
}
if (!bookmarkColumnNames.includes('book_author')) {
  db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN book_author TEXT').run();
  console.log('✅ 已为 qc_bookmarks 表添加 book_author 列');
}
if (!bookmarkColumnNames.includes('note')) {
  db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN note TEXT').run();
  console.log('✅ 已为 qc_bookmarks 表添加 note 列');
}
```

#### 1.3 修改 `qcDataService.js` 创建和更新书摘逻辑
**文件**: `server/services/qcDataService.js`

创建书摘时自动获取并存储书籍信息：
```javascript
createBookmark(bookmarkData) {
  // 从 Calibre 数据库获取书籍信息（如果提供了 book_id）
  let bookTitle = bookmarkData.book_title || null;
  let bookAuthor = bookmarkData.book_author || null;

  if (bookmarkData.book_id && (!bookTitle || !bookAuthor)) {
    try {
      const bookInfo = this.db.prepare(`
        SELECT b.title,
          (SELECT GROUP_CONCAT(a.name, ' & ')
           FROM authors a
           JOIN books_authors_link bal ON a.id = bal.author
           WHERE bal.book = b.id) as author
        FROM books b
        WHERE b.id = ?
      `).get(bookmarkData.book_id);

      if (bookInfo) {
        bookTitle = bookInfo.title || bookTitle;
        bookAuthor = bookInfo.author || bookAuthor;
      }
    } catch (error) {
      console.warn('⚠️ 获取书籍信息失败:', error.message);
    }
  }

  const query = `
    INSERT INTO qc_bookmarks (book_id, book_title, book_author, content, note, page, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  // ...
}
```

#### 1.4 修改后端 API 返回格式
**文件**: `server/routes/qcBookmarks.js`

直接返回数据而不是包装在 `success` 和 `data` 字段中：
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

### 2. 前端修改

#### 2.1 修改 API 路径
**文件**: `src/services/apiClient.ts`

使用新的书摘 API 路径（`/qc/bookmarks`）：
```typescript
export const bookmarkApi = {
  getAll: (bookId?: number) => {
    const queryString = bookId ? `?bookId=${bookId}` : '';
    return apiRequest(`/qc/bookmarks${queryString}`);
  },
  getById: (id: string) => apiRequest(`/qc/bookmarks/${id}`),
  create: (bookmark: any) => apiRequest('/qc/bookmarks', {
    method: 'POST',
    body: JSON.stringify(bookmark)
  }),
  update: (id: string, bookmark: any) => apiRequest(`/qc/bookmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bookmark)
  }),
  delete: (id: string) => apiRequest(`/qc/bookmarks/${id}`, {
    method: 'DELETE'
  }),
  // ...
};
```

#### 2.2 修改书摘列表页面
**文件**: `src/views/Bookmark/index.vue`

优先使用书摘中存储的书籍信息：
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

const allBookmarks = computed(() => {
  const bookmarks = bookmarkStore.allBookmarks;
  return validBookmarks.map(b => {
    // 优先使用书摘中存储的书籍信息
    let bookTitle = b.bookTitle;
    if (!bookTitle) {
      const book = bookStore.allBooks.find(book => book.id === b.bookId);
      bookTitle = book?.title || '未知书籍';
    }
    return {
      ...b,
      bookTitle: bookTitle
    };
  });
});
```

#### 2.3 修改书摘编辑页面
**文件**: `src/views/Bookmark/Edit.vue`

在编辑模式下直接使用书摘中的书籍信息：
```javascript
onMounted(async () => {
  try {
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
    }

    // 编辑模式
    if (isEdit.value) {
      const bookmark = await bookmarkService.getBookmarkById(bookmarkId);
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
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
```

#### 2.4 修改书摘详情页面
**文件**: `src/views/Bookmark/Detail.vue`

优先使用书摘中存储的书籍信息：
```javascript
if (bookmark.value) {
  // 优先使用书摘中存储的书籍信息
  if (bookmark.value.bookTitle || bookmark.value.bookAuthor) {
    book.value = {
      id: bookmark.value.bookId,
      title: bookmark.value.bookTitle || '未知书籍',
      author: bookmark.value.bookAuthor || '未知作者'
    } as Book;
  } else {
    // 尝试从缓存或 API 中获取书籍信息
    // ...
  }
}
```

#### 2.5 修改 Bookmark 类型定义
**文件**: `src/services/bookmark/types.ts`

添加书籍信息字段：
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

## 测试步骤

### 1. 测试数据库迁移
1. 启动后端服务器
2. 检查控制台日志，确认是否成功添加了 `book_title`、`book_author` 和 `note` 字段
3. 使用数据库工具（如 DB Browser for SQLite）检查 `qc_bookmarks` 表结构

### 2. 测试书摘创建
1. 进入书摘页面
2. 点击"添加第一条书摘"
3. 选择一本书（或手动输入书籍信息）
4. 输入书摘内容、页码、笔记等信息
5. 添加标签
6. 点击"保存"
7. 检查数据库中的 `qc_bookmarks` 表，确认：
   - `book_title` 和 `book_author` 字段有值
   - `content`、`note`、`page` 字段正确保存
   - `qc_bookmark_tags` 表中有对应的标签记录

### 3. 测试书摘编辑
1. 进入书摘列表页面
2. 点击某条书摘的编辑按钮
3. 修改书摘内容、页码、笔记等信息
4. 点击"保存"
5. 检查数据库，确认修改已保存

### 4. 测试书摘显示（不依赖 Calibre）
1. 停止或禁用 Calibre 数据库
2. 刷新书摘列表页面
3. 确认页面正常加载
4. 确认书摘中的书籍信息正确显示（从 `book_title` 和 `book_author` 字段读取）

### 5. 测试书摘详情
1. 点击某条书摘进入详情页
2. 确认书籍信息正确显示
3. 确认书摘内容、笔记、页码等信息正确显示
4. 确认标签正确显示

### 6. 测试书摘删除
1. 在书摘列表页面点击某条书摘的删除按钮
2. 确认删除确认弹窗
3. 确认删除
4. 检查数据库，确认记录已被删除

## 验证要点

### 数据完整性
- [ ] `qc_bookmarks` 表包含 `book_title`、`book_author`、`note` 字段
- [ ] 创建书摘时，`book_title` 和 `book_author` 自动填充
- [ ] 编辑书摘时，所有字段（content、note、page）都能正确保存

### 功能独立性
- [ ] 书摘功能不依赖 Calibre 数据库
- [ ] 即使 Calibre 数据库不可用，书摘页面也能正常加载
- [ ] 书摘功能只依赖 `qc_bookmarks` 和 `qc_bookmark_tags` 两个表

### 用户体验
- [ ] 书摘列表页面正常显示书摘
- [ ] 书摘详情页面正常显示书籍信息和书摘内容
- [ ] 编辑书摘功能正常工作
- [ ] 删除书摘功能正常工作

## 总结

通过以上修改，书摘功能已经完全独立于 Calibre 系统，只依赖 `qc_bookmarks` 和 `qc_bookmark_tags` 两个表。当 Calibre 数据库不可用时，书摘页面也能正常加载和操作。

主要改进：
1. 在 `qc_bookmarks` 表中添加了书籍信息冗余字段（`book_title`、`book_author`）
2. 创建和更新书摘时，自动从 Calibre 数据库获取并存储书籍信息
3. 修改了后端和前端 API 返回格式，确保数据正确传输
4. 修改了前端页面，优先使用书摘中存储的书籍信息，不依赖书籍列表
5. 修改了 `GET /api/books` 接口，当 Calibre 不可用时返回空数组而不是 500 错误
