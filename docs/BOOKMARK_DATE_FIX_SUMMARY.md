# 书摘日期显示问题修复总结

## 问题描述

1. **书摘详情页显示"添加于 未知日期"**
   - 数据库中有准确的日期信息（`created_at` 字段）
   - 前端读取错误，导致无法正确显示日期

2. **书摘详情页和列表页日期不一致**
   - 数据库字段：`created_at`、`updated_at`
   - 前端期望：`createTime`、`updateTime`
   - 字段名不匹配导致日期无法正确读取

## 问题根本原因

后端返回的书摘数据中，日期字段存在两种命名方式：
- 数据库原始字段：`created_at`、`updated_at`
- 前端期望字段：`createTime`、`updateTime`

在 `qcDataService.js` 的不同方法中，字段映射不一致：
- `getAllBookmarks()` 方法：**有**进行字段映射 ✅
- `getBookmarkById()` 方法：**没有**进行字段映射 ❌
- `createBookmark()` 方法：**没有**进行字段映射 ❌
- `updateBookmark()` 方法：**没有**进行字段映射 ❌
- `getBookmarksByBookId()` 方法：**没有**进行字段映射 ❌

## 解决方案

在 `qcDataService.js` 的所有返回书摘数据的方法中，统一添加字段映射：
```javascript
{
  ...otherFields,
  created_at: bookmark.created_at,
  updated_at: bookmark.updated_at,
  // 添加 createTime 和 updateTime 字段（兼容前端）
  createTime: bookmark.created_at,
  updateTime: bookmark.updated_at
}
```

### 1. 修改 `getBookmarkById()` 方法
**文件**: `server/services/qcDataService.js`

添加字段映射：
```javascript
const result = {
  id: bookmark.id,
  book_id: bookmark.book_id,
  bookTitle: bookmark.book_title,
  bookAuthor: bookmark.book_author,
  bookId: bookmark.book_id,
  content: bookmark.content,
  note: bookmark.note,
  page: bookmark.page,
  pageNum: bookmark.page,
  tags: [],
  created_at: bookmark.created_at,
  updated_at: bookmark.updated_at,
  // 添加 createTime 和 updateTime 字段（兼容前端）
  createTime: bookmark.created_at,
  updateTime: bookmark.updated_at
};
```

### 2. 修改 `createBookmark()` 方法
**文件**: `server/services/qcDataService.js`

添加字段映射：
```javascript
return {
  id: bookmarkId,
  book_id: bookmarkData.book_id,
  bookTitle: bookTitle,
  bookAuthor: bookAuthor,
  ...bookmarkData,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // 添加 createTime 和 updateTime 字段（兼容前端）
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString()
};
```

### 3. 修改 `updateBookmark()` 方法
**文件**: `server/services/qcDataService.js`

添加字段映射：
```javascript
return {
  id: bookmarkId,
  book_id: bookId,
  bookTitle: bookTitle,
  bookAuthor: bookAuthor,
  ...bookmarkData,
  created_at: bookmarkData.created_at || currentBookmark.created_at,
  updated_at: new Date().toISOString(),
  // 添加 createTime 和 updateTime 字段（兼容前端）
  createTime: bookmarkData.created_at || currentBookmark.created_at,
  updateTime: new Date().toISOString()
};
```

### 4. 修改 `getBookmarksByBookId()` 方法
**文件**: `server/services/qcDataService.js`

添加字段映射：
```javascript
return bookmarks.map(bookmark => ({
  ...bookmark,
  bookTitle: bookmark.book_title,
  bookAuthor: bookmark.book_author,
  pageNum: bookmark.page,
  // 添加 createTime 和 updateTime 字段（兼容前端）
  createTime: bookmark.created_at,
  updateTime: bookmark.updated_at
}));
```

## 前端日期格式化

**文件**: `src/views/Bookmark/Detail.vue`

`formatDate` 函数会检查日期有效性：
```javascript
const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return '未知日期';
  }

  const date = new Date(dateStr);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.warn('无效的日期字符串:', dateStr);
    return '未知日期';
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
```

当 `bookmark.createTime` 为 `undefined` 或无效值时，`formatDate()` 函数会返回"未知日期"。

## 测试步骤

### 1. 测试书摘详情页日期显示
1. 进入书摘列表页面
2. 点击某条书摘进入详情页
3. 检查"添加于"日期是否正确显示
4. 日期格式应为：`2024-01-07`

### 2. 测试书摘创建后日期显示
1. 进入书摘编辑页面（新增模式）
2. 填写书摘内容并保存
3. 进入书摘详情页
4. 检查"添加于"日期是否正确显示

### 3. 测试书摘编辑后更新日期
1. 编辑某条书摘
2. 修改书摘内容并保存
3. 检查是否更新了更新时间（如果显示的话）

### 4. 测试书摘列表页日期显示
1. 进入书摘列表页面
2. 检查每条书摘的日期显示（如果列表页显示日期）

## 验证要点

- [ ] 书摘详情页正确显示"添加于"日期
- [ ] 日期格式为 `YYYY-MM-DD`
- [ ] 创建的书摘有正确的创建日期
- [ ] 编辑的书摘有正确的更新日期
- [ ] 所有页面日期显示一致

## 数据库字段映射表

| 数据库字段 | 前端期望字段 | 说明 |
|-----------|--------------|------|
| `created_at` | `createTime` | 创建时间 |
| `updated_at` | `updateTime` | 更新时间 |
| `book_title` | `bookTitle` | 书籍标题 |
| `book_author` | `bookAuthor` | 书籍作者 |
| `page` | `pageNum` | 页码 |

## 相关文件

### 后端文件
1. `server/services/qcDataService.js`
   - `getBookmarkById()` 方法
   - `createBookmark()` 方法
   - `updateBookmark()` 方法
   - `getBookmarksByBookId()` 方法

### 前端文件
1. `src/views/Bookmark/Detail.vue` - 书摘详情页
2. `src/views/Bookmark/index.vue` - 书摘列表页

## 总结

通过统一后端所有返回书摘数据的方法，添加 `createTime` 和 `updateTime` 字段映射，解决了日期显示问题。现在所有书摘相关页面都能正确显示日期信息。

主要改进：
1. 在 `getBookmarkById()` 方法中添加了字段映射
2. 在 `createBookmark()` 方法中添加了字段映射
3. 在 `updateBookmark()` 方法中添加了字段映射
4. 在 `getBookmarksByBookId()` 方法中添加了字段映射
5. 确保所有方法返回的数据格式一致

这样前端可以统一使用 `bookmark.createTime` 和 `bookmark.updateTime` 字段来访问日期信息，无需关心底层数据库字段名。
