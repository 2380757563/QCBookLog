import { IndexedDB } from './IndexedDB';
import { IDBConfig } from './types';

// 数据库配置
const config: IDBConfig = {
  name: 'xmnote-db',
  version: 1,
  stores: [
    {
      name: 'books',
      keyPath: 'id',
      indexes: [
        { name: 'isbn', keyPath: 'isbn', options: { unique: true } },
        { name: 'title', keyPath: 'title' },
        { name: 'author', keyPath: 'author' },
        { name: 'publisher', keyPath: 'publisher' },
        { name: 'readStatus', keyPath: 'readStatus' },
        { name: 'createTime', keyPath: 'createTime' },
        { name: 'updateTime', keyPath: 'updateTime' }
      ]
    },
    {
      name: 'bookmarks',
      keyPath: 'id',
      indexes: [
        { name: 'bookId', keyPath: 'bookId' },
        { name: 'tags', keyPath: 'tags', options: { multiEntry: true } },
        { name: 'createTime', keyPath: 'createTime' },
        { name: 'updateTime', keyPath: 'updateTime' }
      ]
    },
    {
      name: 'groups',
      keyPath: 'id',
      indexes: [
        { name: 'name', keyPath: 'name' },
        { name: 'parentId', keyPath: 'parentId' },
        { name: 'sort', keyPath: 'sort' }
      ]
    },
    {
      name: 'tags',
      keyPath: 'id',
      indexes: [
        { name: 'name', keyPath: 'name' },
        { name: 'type', keyPath: 'type' },
        { name: 'color', keyPath: 'color' }
      ]
    },
    {
      name: 'backupRecords',
      keyPath: 'id',
      indexes: [
        { name: 'type', keyPath: 'type' },
        { name: 'scope', keyPath: 'scope' },
        { name: 'createTime', keyPath: 'createTime' }
      ]
    }
  ]
};

// 创建数据库实例
export const db = new IndexedDB(config);

// 导出对象存储名称
export const STORE_NAMES = {
  BOOKS: 'books',
  BOOKMARKS: 'bookmarks',
  GROUPS: 'groups',
  TAGS: 'tags',
  BACKUP_RECORDS: 'backupRecords'
} as const;
