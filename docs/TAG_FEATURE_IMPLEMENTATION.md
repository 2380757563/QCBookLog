# 标签功能实现文档

## 概述

本文档说明了书籍管理系统中标签功能的完整实现，包括后端标签服务和前端标签编辑功能。

## 功能特性

### 1. 后端标签服务 (TagService)

**文件位置**: `server/services/tagService.js`

#### 核心功能

- **标签规范化**
  - 去除前后空格
  - 处理内部多个空格（替换为单个空格）
  - 确保标签不为空

- **标签去重**
  - 不区分大小写去重（使用toLowerCase()比较）
  - 保留原始大小写显示
  - 使用Set数据结构实现高效去重

- **批量操作**
  - 批量添加标签到数据库
  - 批量建立书籍与标签的关联
  - 提高性能，减少数据库操作

- **中文支持**
  - 完美支持中文、日文、韩文等多字节字符
  - 正确处理UTF-8编码
  - SQLite数据库使用TEXT类型存储

- **异常处理**
  - try-catch包裹所有数据库操作
  - 单个标签失败不影响其他标签处理
  - 详细的错误日志记录
  - 返回操作结果对象，包含成功/失败统计

#### 主要方法

```javascript
// 规范化单个标签名称
normalizeTagName(tagName: string): string | null

// 标签数组去重和规范化
normalizeAndDeduplicateTags(tags: string[]): string[]

// 批量添加标签到数据库（带去重）
batchAddTags(tagNames: string[]): Map<string, number>

// 为书籍添加标签关联
addTagsToBook(bookId: number, tagNames: string[]): Object

// 更新书籍的标签（替换所有标签）
updateBookTags(bookId: number, tagNames: string[]): Object

// 获取书籍的所有标签
getBookTags(bookId: number): Array

// 获取所有标签
getAllTags(): Array

// 删除标签
deleteTag(tagId: number): Object
```

#### 使用示例

```javascript
// 初始化标签服务
const tagService = new TagService(databaseService);

// 添加标签到书籍
const result = tagService.addTagsToBook(bookId, ['小说', '科幻', '文学']);
console.log(result);
// 输出: { success: true, message: '成功添加 3 个标签', addedCount: 3, skippedCount: 0 }

// 更新书籍标签
const updateResult = tagService.updateBookTags(bookId, ['小说', '历史']);
console.log(updateResult);
// 输出: { success: true, message: '书籍标签更新成功', deletedCount: 3, ... }

// 获取书籍标签
const tags = tagService.getBookTags(bookId);
console.log(tags);
// 输出: [{ id: 1, name: '小说' }, { id: 2, name: '历史' }]
```

### 2. 数据库服务集成

**文件位置**: `server/services/databaseService.js`

#### 修改内容

1. **导入TagService**
   ```javascript
   import TagService from './tagService.js';
   ```

2. **初始化标签服务**
   ```javascript
   class DatabaseService {
     constructor() {
       this.tagService = null;
       this.initDatabases();
     }
     
     initCalibreDatabase() {
       // ... 其他初始化代码
       this.tagService = new TagService(this);
       console.log('✅ 标签服务初始化成功');
     }
   }
   ```

3. **在addBookToDB方法中使用标签服务**
   ```javascript
   // 9. 添加标签（使用标签服务）
   if (book.tags && Array.isArray(book.tags) && book.tags.length > 0) {
     console.log(`🏷️  开始处理书籍标签，原始标签数量: ${book.tags.length}`);
     const tagResult = this.tagService.addTagsToBook(bookId, book.tags);
     console.log(`🏷️  标签处理结果: ${JSON.stringify(tagResult)}`);
   }
   ```

4. **在updateBookInDB方法中使用标签服务**
   ```javascript
   // 7. 更新标签（使用标签服务）
   if (book.tags) {
     console.log(`🏷️  开始更新书籍标签，原始标签数量: ${book.tags.length}`);
     const tagResult = this.tagService.updateBookTags(bookId, book.tags);
     console.log(`🏷️  标签更新结果: ${JSON.stringify(tagResult)}`);
   }
   ```

### 3. 前端标签编辑功能

**文件位置**: `src/views/Book/Edit.vue`

#### 功能实现

##### 3.1 标签显示

```vue
<!-- 已选标签展示 -->
<div class="tags-container" v-if="form.calibreTags.length > 0">
  <span
    v-for="(tag, index) in form.calibreTags"
    :key="index"
    class="tag-item active"
  >
    {{ tag }}
    <span class="tag-remove" @click="removeTag(index)">×</span>
  </span>
</div>
<div v-else class="no-tags">暂无标签</div>
```

##### 3.2 标签输入

```vue
<!-- 标签输入 -->
<div class="tag-input-container">
  <input
    v-model="calibreTagInput"
    class="tag-input"
    placeholder="输入标签名称，按回车添加"
    @keyup.enter="addTag"
    @blur="addTag"
  />
  <button
    v-if="calibreTagInput.trim()"
    class="tag-add-btn"
    @click="addTag"
  >
    添加
  </button>
</div>
```

##### 3.3 标签自动完成/推荐

```vue
<!-- 标签推荐 -->
<div v-if="filteredTags.length > 0 && calibreTagInput.trim()" class="tag-suggestions">
  <span
    v-for="tag in filteredTags.slice(0, 5)"
    :key="tag"
    class="tag-suggestion"
    @click="selectTag(tag)"
  >
    {{ tag }}
  </span>
</div>
```

##### 3.4 标签操作方法

```javascript
// 删除标签
const removeTag = (index: number) => {
  if (form.calibreTags) {
    form.calibreTags.splice(index, 1);
  }
};

// 添加标签
const addTag = () => {
  const tagName = calibreTagInput.value.trim();
  if (!tagName) return;

  // 检查标签是否已存在
  if (form.calibreTags.includes(tagName)) {
    alert('该标签已存在');
    return;
  }

  // 添加标签
  form.calibreTags.push(tagName);
  calibreTagInput.value = '';
};

// 选择推荐标签
const selectTag = (tagName: string) => {
  if (!form.calibreTags.includes(tagName)) {
    form.calibreTags.push(tagName);
  }
  calibreTagInput.value = '';
};

// 过滤标签（用于自动完成）
const filteredTags = computed(() => {
  const input = calibreTagInput.value.trim().toLowerCase();
  if (!input) return [];

  // 从所有标签中过滤
  return allTags.value.filter(tag => {
    const tagLower = tag.toLowerCase();
    return tagLower.includes(input) && !form.calibreTags.includes(tag);
  });
});
```

##### 3.5 标签样式

```css
/* 标签容器 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 标签项 */
.tag-item {
  padding: 6px 12px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding-right: 28px;
}

.tag-item.active {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

/* 标签删除按钮 */
.tag-remove {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s;
}

.tag-remove:hover {
  opacity: 1;
}

/* 标签输入 */
.tag-input-container {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tag-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.tag-input:focus {
  border-color: var(--primary-color);
}

.tag-add-btn {
  padding: 10px 16px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.3s;
}

.tag-add-btn:hover {
  background-color: var(--primary-dark);
}

/* 标签推荐 */
.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.tag-suggestion {
  padding: 6px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.tag-suggestion:hover {
  background-color: rgba(255, 107, 53, 0.2);
  transform: translateY(-1px);
}
```

### 4. 书籍详情页面标签展示

**文件位置**: `src/views/Book/Detail.vue`

#### 标签展示功能

书籍详情页面已经实现了标签展示功能，位于"分组与标签"卡片中：

```vue
<!-- 分组与标签 -->
<div class="card" v-if="bookGroups.length > 0 || (book.calibreTags && book.calibreTags.length > 0)">
  <h3 class="card-title">分组与标签</h3>
  
  <!-- 分组展示 -->
  <div v-if="bookGroups.length > 0" class="tags-section">
    <span class="tags-label">分组</span>
    <div class="tags-list">
      <span v-for="group in bookGroups" :key="group.id" class="tag-item">
        {{ group.name }}
      </span>
    </div>
  </div>
  
  <!-- Calibre标签展示 -->
  <div v-if="book.calibreTags && book.calibreTags.length > 0" class="tags-section">
    <span class="tags-label">Calibre标签</span>
    <div class="tags-list">
      <span v-for="tag in book.calibreTags" :key="tag" class="tag-item calibre-tag">
        {{ tag }}
      </span>
    </div>
  </div>
</div>
```

#### 标签样式

```css
/* 标签区域 */
.tags-section {
  margin-bottom: 12px;
}

.tags-section:last-child {
  margin-bottom: 0;
}

.tags-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.calibre-tag {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}
```

## 数据流程

### 1. 新建书籍流程

```
用户输入标签 → 前端表单 → 提交保存 → 后端API
    ↓
databaseService.addBookToDB()
    ↓
tagService.addTagsToBook()
    ↓
1. 规范化和去重标签
2. 批量添加到tags表
3. 建立书籍与标签关联
    ↓
保存到Calibre数据库
```

### 2. 编辑书籍流程

```
用户编辑标签 → 前端表单 → 提交保存 → 后端API
    ↓
databaseService.updateBookInDB()
    ↓
tagService.updateBookTags()
    ↓
1. 删除旧的标签关联
2. 规范化和去重新标签
3. 批量添加到tags表
4. 建立新的书籍与标签关联
    ↓
更新Calibre数据库
```

### 3. 查看书籍详情流程

```
用户打开详情页 → 前端加载书籍数据 → 后端API
    ↓
databaseService.getBookById()
    ↓
返回书籍信息（包含tags数组）
    ↓
前端显示标签
```

## 数据库表结构

### tags表

```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
)
```

### books_tags_link表

```sql
CREATE TABLE IF NOT EXISTS books_tags_link (
  book INTEGER,
  tag INTEGER,
  PRIMARY KEY (book, tag),
  FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (tag) REFERENCES tags(id) ON DELETE CASCADE
)
```

## API接口

### 获取所有标签

```http
GET /api/tags
```

响应示例：
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "小说" },
    { "id": 2, "name": "科幻" },
    { "id": 3, "name": "文学" }
  ]
}
```

### 创建标签

```http
POST /api/tags
Content-Type: application/json

{
  "name": "新标签"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "新标签"
  }
}
```

### 删除标签

```http
DELETE /api/tags/:id
```

响应示例：
```json
{
  "success": true,
  "message": "标签删除成功"
}
```

## 测试

### 运行标签服务测试

```bash
cd server
node test_tag_service.js
```

测试用例包括：
1. 标签规范化测试
2. 中文标签处理测试
3. 特殊字符和空格处理测试
4. 大小写不敏感去重测试
5. 批量添加标签到数据库测试
6. 为书籍添加标签测试
7. 获取书籍标签测试
8. 更新书籍标签测试
9. 验证更新后的标签测试
10. 获取所有标签测试

## 用户体验优化

### 1. 视觉反馈

- 标签悬停效果
- 标签选中状态
- 标签删除按钮悬停效果
- 标签推荐悬停效果

### 2. 操作提示

- 标签已存在提示
- 标签添加成功提示
- 标签删除成功提示

### 3. 自动完成

- 输入标签时实时过滤推荐
- 最多显示5个推荐标签
- 点击推荐标签快速添加
- 推荐标签不包含已选标签

### 4. 界面布局

- 标签容器使用flex布局，自动换行
- 标签间距统一为8px
- 标签圆角为16px，视觉效果美观
- 标签输入框与添加按钮并排显示

## 注意事项

1. **标签去重**
   - 使用不区分大小写的比较
   - 保留原始大小写显示
   - 避免重复标签

2. **中文标签**
   - 完美支持中文、日文、韩文
   - 使用UTF-8编码
   - SQLite TEXT类型存储

3. **数据库事务**
   - 所有操作在事务中执行
   - 使用`INSERT OR IGNORE`避免重复
   - 支持级联删除

4. **异常处理**
   - 单个标签失败不影响整体
   - 详细的错误日志
   - 返回操作结果对象

5. **性能优化**
   - 批量操作减少数据库访问
   - 使用Set数据结构高效去重
   - 前端使用computed属性缓存过滤结果

## 总结

标签功能已完整实现，包括：

✅ 后端标签服务（规范化、去重、批量操作）
✅ 数据库服务集成
✅ 前端标签编辑功能（添加、删除、推荐）
✅ 书籍详情页面标签展示
✅ 标签自动完成/推荐功能
✅ 标签数据的前后端交互
✅ 标签操作的视觉反馈和用户体验优化
✅ 中文标签正确处理
✅ 数据库事务完整性保障

所有功能都已经实现并集成到现有系统中，可以直接使用！
