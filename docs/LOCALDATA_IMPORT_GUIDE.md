# LocalStorage 数据迁移指南

本文档说明如何将 LocalStorage 中的阅读数据迁移到数据库。

## 迁移内容

需要迁移的数据包括：
- ✅ 阅读目标（今年读多少本）
- ✅ 阅读热力图（每日阅读记录）
- ✅ 愿望清单（想买的书）

**重要说明**：迁移完成后，所有数据将存储在数据库中，不再使用 LocalStorage。整库备份将自动包含这些数据。

## 方法一：从浏览器导出（推荐）

### 步骤 1：打开浏览器开发者工具

1. 在 Chrome/Edge 中，按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
2. 切换到 **Console** 标签

### 步骤 2：导出 LocalStorage 数据

在控制台中运行以下命令：

```javascript
// 导出所有相关数据
const exportData = {
  readingGoal: localStorage.getItem('readingGoal') ? JSON.parse(localStorage.getItem('readingGoal')) : null,
  heatmap: localStorage.getItem('heatmapData') ? JSON.parse(localStorage.getItem('heatmapData')) : null,
  wishlist: localStorage.getItem('wishlist') ? JSON.parse(localStorage.getItem('wishlist')) : null
};

// 下载为 JSON 文件
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'localdata-export.json';
a.click();
URL.revokeObjectURL(url);

console.log('✅ 数据导出完成！请下载 localdata-export.json 文件');
```

### 步骤 3：导入到数据库

下载 `localdata-export.json` 文件后，在项目根目录运行：

```bash
node import-localdata.js data/localdata-export.json
```

### 步骤 4：清理 LocalStorage（可选）

迁移成功后，可以在浏览器控制台运行以下命令清理 LocalStorage：

```javascript
// 清理已迁移的数据
localStorage.removeItem('readingGoal');
localStorage.removeItem('heatmapData');
localStorage.removeItem('wishlist');

console.log('✅ LocalStorage 已清理');
```

---

## 验证迁移结果

### 检查数据库

```bash
# 查看阅读目标
node -e "import databaseService from './server/services/databaseService.js'; const db = databaseService.talebookDb; console.log(db.prepare('SELECT * FROM reading_goals').all());"

# 查看热力图数据
node -e "import databaseService from './server/services/databaseService.js'; const db = databaseService.talebookDb; console.log(db.prepare('SELECT * FROM reading_heatmap LIMIT 10').all());"

# 查看愿望清单
node -e "import databaseService from './server/services/databaseService.js'; const db = databaseService.talebookDb; console.log(db.prepare('SELECT * FROM wishlist').all());"
```

### 在前端验证

1. 打开阅读页面，检查阅读目标是否正确
2. 查看热力图，确认数据完整
3. 打开书籍页面的书单 Tab，查看愿望清单

---

## 故障排除

### 迁移失败

1. 检查数据库连接：确保 Talebook 数据库可用
2. 检查数据格式：确保导出的 JSON 文件格式正确
3. 查看错误日志：控制台会显示详细的错误信息

### 数据不完整

1. 确认导出时 LocalStorage 中有数据
2. 检查是否导入了正确的文件
3. 手动添加缺失的数据

---

## 备份建议

在执行迁移前，建议先备份：

1. **备份数据库文件**：
   ```bash
   cp data/calibre-webserver.db data/calibre-webserver.db.backup
   ```

2. **导出 LocalStorage 数据**（如上述步骤 2）

3. **备份书库数据**：使用应用的整库备份功能

迁移成功后，可以删除这些备份文件。
