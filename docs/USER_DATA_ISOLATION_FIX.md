# 用户数据隔离和前端状态修复报告

## 问题概述

本次修复解决了两个关键的用户数据隔离问题：

### 问题1：用户数据关联错误
**现象**：admin用户对书籍101执行"喜欢"操作时，系统错误地将该记录关联到id=0的默认用户而非admin用户。

**根本原因**：后端API在更新阅读状态时，硬编码了 `readerId = 0`，导致所有用户的操作都被关联到默认用户。

### 问题2：前端状态显示错误
**现象**：从默认用户切换到admin用户后，尽管admin用户对书籍98没有任何记录，前端仍显示默认用户的标记状态(喜欢和待读按钮处于激活状态)。

**根本原因**：前端页面没有监听用户切换事件，导致切换用户后不会重新获取当前用户的书籍标记数据。

---

## 修复详情

### 后端修复

#### 1. 修复 book-controller.js
**文件**: `server/routes/books/controllers/book-controller.js`

**修改位置**: 第252-283行

**修改内容**:
```javascript
// 修改前：硬编码 readerId = 0
databaseService.updateReadingState(bookId, readingState, 0);

// 修改后：从查询参数获取 readerId
const readerId = parseInt(req.query.readerId) || 0;
databaseService.updateReadingState(bookId, readingState, readerId);
```

**影响范围**:
- 书籍编辑API (`PUT /api/books/:id`)
- 阅读状态更新（favorite、wants、personal_rating）

#### 2. 验证 books.js
**文件**: `server/routes/books.js`

**状态**: ✅ 已正确实现
- 第267行已正确从查询参数获取 `readerId`
- 第337行正确传递 `readerId` 到 `updateReadingState`

---

### 前端修复

#### 1. 修复 Edit.vue
**文件**: `src/views/Book/Edit.vue`

**修改内容**:
1. 提取书籍数据加载逻辑为独立函数 `loadBookData()`
2. 添加用户切换监听器：
```typescript
watch(() => readerStore.currentReaderId, async (newReaderId, oldReaderId) => {
  if (newReaderId !== oldReaderId && isEdit.value) {
    console.log('👤 用户切换，重新加载书籍数据:', { oldReaderId, newReaderId });
    await loadBookData();
  }
});
```

**影响范围**:
- 书籍编辑页面的标记状态（喜欢、待读、个人评分）
- 阅读状态显示

#### 2. 修复 Detail.vue
**文件**: `src/views/Book/Detail.vue`

**修改内容**:
1. 修改 `getBookById` 调用，传递 `readerId` 参数
2. 添加用户切换监听器：
```typescript
watch(() => readerStore.currentReaderId, async (newReaderId, oldReaderId) => {
  if (newReaderId !== oldReaderId && book.value) {
    console.log('👤 用户切换，重新加载阅读状态:', { oldReaderId, newReaderId });
    await loadReadingState();
  }
});
```

**影响范围**:
- 书籍详情页面的阅读状态显示

#### 3. 修复 Reading.vue
**文件**: `src/views/Book/Reading.vue`

**修改内容**:
1. 导入 `useReaderStore`
2. 修改 `getBookById` 调用，传递 `readerId` 参数

**影响范围**:
- 阅读页面的书籍信息加载

---

## 数据流程

### 修复前
```
用户操作 → 前端API调用 → 后端API (readerId=0 硬编码) → 数据库
                                    ↓
                            所有用户数据混淆
```

### 修复后
```
用户操作 → 前端API调用(readerId参数) → 后端API (从query获取readerId) → 数据库
                                            ↓
                                    正确的用户数据隔离
```

---

## 测试验证

### 测试脚本
创建了测试脚本 `server/test_user_isolation.js`，用于验证：

1. ✅ 获取不同用户的书籍列表
2. ✅ 检查同一书籍在不同用户下的标记状态
3. ✅ 测试更新书籍标记状态
4. ✅ 验证用户数据隔离效果

### 运行测试
```bash
cd server
node test_user_isolation.js
```

### 预期结果
- 不同用户对同一书籍的标记状态应该相互独立
- 用户切换后，前端应正确显示当前用户的标记状态
- 数据库中的 `reading_state` 表应正确记录不同用户的标记数据

---

## 受影响的数据库表

### reading_state 表
**字段**:
- `book_id`: 书籍ID
- `reader_id`: 读者ID（关键隔离字段）
- `favorite`: 是否喜欢 (0/1)
- `wants`: 是否待读 (0/1)
- `personal_rating`: 个人评分

**修复后**:
- 所有标记操作都会正确关联到 `reader_id`
- 不同用户的标记数据完全隔离

---

## API接口变更

### 书籍更新API
**接口**: `PUT /api/books/:id`

**新增参数**:
- `readerId` (query参数): 当前用户ID，默认为0

**示例**:
```
PUT /api/books/101?readerId=1
Content-Type: application/json

{
  "favorite": 1,
  "favorite_date": "2026-03-07T12:00:00.000Z"
}
```

### 书籍查询API
**接口**: `GET /api/books/:id`

**新增参数**:
- `readerId` (query参数): 当前用户ID，默认为0

**示例**:
```
GET /api/books/101?readerId=1
```

---

## 注意事项

1. **向后兼容**: 所有API接口保持向后兼容，`readerId` 参数可选，默认值为0
2. **前端适配**: 所有需要用户隔离的前端页面都已添加用户切换监听
3. **数据迁移**: 无需数据迁移，现有数据不受影响
4. **性能影响**: 用户切换时会重新加载数据，但影响可控

---

## 后续建议

1. **统一用户认证**: 建议实现统一的用户认证中间件，自动注入 `readerId`
2. **缓存优化**: 考虑为不同用户的数据实现独立的缓存策略
3. **测试覆盖**: 增加自动化测试用例，覆盖用户数据隔离场景
4. **文档更新**: 更新API文档，明确标注需要 `readerId` 的接口

---

## 修复文件清单

### 后端文件
- ✅ `server/routes/books/controllers/book-controller.js` - 修复阅读状态更新逻辑

### 前端文件
- ✅ `src/views/Book/Edit.vue` - 添加用户切换监听
- ✅ `src/views/Book/Detail.vue` - 添加用户切换监听
- ✅ `src/views/Book/Reading.vue` - 传递用户ID参数

### 测试文件
- ✅ `server/test_user_isolation.js` - 用户数据隔离测试脚本

---

## 总结

本次修复彻底解决了用户数据隔离问题：

1. **后端修复**: 确保所有用户操作正确关联到当前登录用户ID
2. **前端修复**: 实现用户切换时的状态自动刷新机制
3. **测试验证**: 提供完整的测试脚本验证修复效果

修复后，不同用户对同一书籍的标记操作将完全隔离，前端状态显示也将随用户切换正确更新。
