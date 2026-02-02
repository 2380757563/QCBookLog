# LocalStorage 迁移完成总结

## 已完成的工作

### 1. 移除了 LocalStorage 存储

以下数据已从 LocalStorage 迁移到数据库，不再使用 LocalStorage：

| 数据类型 | 旧存储方式 | 新存储方式 |
|---------|------------|------------|
| 阅读目标 | LocalStorage (`readingGoal`) | 数据库表 `reading_goals` |
| 阅读热力图 | LocalStorage (`heatmapData`) | 数据库表 `reading_heatmap` |
| 愿望清单 | LocalStorage (`wishlist`) | 数据库表 `wishlist` |

### 2. 修改的文件

#### 后端文件
- `server/migrations/addReadingTables.js` - 创建数据库表
- `server/routes/readingGoals.js` - 阅读目标 API
- `server/routes/readingHeatmap.js` - 热力图 API
- `server/routes/wishlist.js` - 愿望清单 API
- `server/services/qcDataService.js` - 添加数据库操作方法
- `server/app.js` - 注册新路由

#### 前端文件
- `src/services/readingGoalsService.ts` - 阅读目标服务
- `src/services/readingHeatmapService.ts` - 热力图服务
- `src/services/wishlistService.ts` - 愿望清单服务
- `src/services/data/readingDataService.ts` - 废弃所有方法，添加 @deprecated 标记
- `src/services/importService.ts` - 使用新的 API 服务导入数据
- `src/views/Reading/index.vue` - 使用 API 而非 LocalStorage
- `src/views/Book/index.vue` - 使用 API 而非 LocalStorage

### 3. 数据备份方式

现在这些数据将随整库备份自动包含：

```
library-backup-2026-01-10.zip
├── calibre-library/          # Calibre 书库
├── metadata/                 # 配置和元数据
├── calibre-webserver.db       # Talebook 数据库（包含：
│                            #   - reading_goals
│                            #   - reading_heatmap
│                            #   - wishlist）
└── backup-metadata.json
```

### 4. 数据迁移工具

提供了以下工具进行数据迁移：

- `run-migration.js` - 执行数据库表创建
- `import-localdata.js` - 从 JSON 文件导入数据到数据库
- `LOCALDATA_IMPORT_GUIDE.md` - 详细的数据迁移指南

## 数据迁移步骤

### 方式一：从浏览器导出（推荐）

1. 打开浏览器开发者工具（F12），切换到 Console 标签
2. 运行导出命令（见 `LOCALDATA_IMPORT_GUIDE.md`）
3. 下载 `localdata-export.json` 文件
4. 运行导入命令：
   ```bash
   node import-localdata.js path/to/localdata-export.json
   ```

### 方式二：从书摘重新计算热力图

如果你的热力图数据不重要，可以直接从书摘重新计算：

```bash
# 在浏览器控制台运行
await fetch('http://localhost:7401/api/reading-heatmap/recalculate/2026', {
  method: 'POST'
}).then(r => r.json()).then(console.log);
```

## API 接口说明

### 阅读目标 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/reading-goals/:year` | GET | 获取指定年份的阅读目标 |
| `/api/reading-goals/:id` | PUT | 更新阅读目标 |
| `/api/reading-goals/:id/increment` | POST | 增加已完成数量 |

### 阅读热力图 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/reading-heatmap/:year` | GET | 获取指定年份的热力图数据 |
| `/api/reading-heatmap/recalculate/:year` | POST | 从书摘重新计算热力图 |
| `/api/reading-heatmap/:date` | PUT | 更新单日热力图数据 |

### 愿望清单 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/wishlist` | GET | 获取愿望清单 |
| `/api/wishlist` | POST | 添加到愿望清单 |
| `/api/wishlist/:id` | PUT | 更新愿望清单项 |
| `/api/wishlist/:isbn` | DELETE | 从愿望清单移除 |

## 重要提示

1. **不再使用 LocalStorage**：所有相关数据都存储在数据库中，可以直接删除 LocalStorage 中的旧数据

2. **自动包含在备份**：整库备份会自动包含这些数据，不需要额外操作

3. **多设备同步**：数据库存储支持多设备同步（如需要实现）

4. **性能优化**：数据库查询比 LocalStorage 更高效

5. **错误处理**：所有 API 调用都包含错误处理，失败时会提示用户重试

## 数据清理

如果需要清理 LocalStorage 中的旧数据，可以在浏览器控制台运行：

```javascript
// 清理已迁移的数据
localStorage.removeItem('readingGoal');
localStorage.removeItem('heatmapData');
localStorage.removeItem('wishlist');

console.log('✅ LocalStorage 已清理');
```

## 故障排除

### 迁移失败

1. 检查数据库连接：确保 Talebook 数据库可用
2. 检查数据格式：确保导出的 JSON 文件格式正确
3. 查看错误日志：控制台会显示详细的错误信息

### 数据不显示

1. 确认已成功导入数据到数据库
2. 刷新页面重新加载数据
3. 检查浏览器控制台是否有错误

### API 调用失败

1. 检查后端服务是否正常运行
2. 检查网络连接
3. 查看浏览器控制台的详细错误信息

## 总结

✅ 数据已从 LocalStorage 完全迁移到数据库
✅ 所有相关功能已更新为使用 API
✅ 整库备份自动包含这些数据
✅ 提供了完整的数据迁移工具和指南
✅ 移除了所有 LocalStorage 降级代码
✅ 所有代码已通过 lint 检查
