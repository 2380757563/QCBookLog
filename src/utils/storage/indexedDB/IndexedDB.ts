import { IDBConfig, IDBQueryOptions, IDBTransactionOptions } from './types';

export class IndexedDB {
  private db: IDBDatabase | null = null;
  private config: IDBConfig;
  private onUpgradeNeeded: ((db: IDBDatabase, oldVersion: number, newVersion: number) => void) | null = null;

  constructor(config: IDBConfig) {
    this.config = config;
  }

  /**
   * 打开数据库连接
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
        this.onUpgradeNeeded?.(db, event.oldVersion, event.newVersion || 1);
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event: Event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * 设置升级回调
   */
  setOnUpgradeNeeded(callback: (db: IDBDatabase, oldVersion: number, newVersion: number) => void): void {
    this.onUpgradeNeeded = callback;
  }

  /**
   * 创建对象存储
   */
  private createStores(db: IDBDatabase): void {
    this.config.stores.forEach(storeConfig => {
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement || false
        });

        // 创建索引
        if (storeConfig.indexes) {
          storeConfig.indexes.forEach(indexConfig => {
            store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
          });
        }
      }
    });
  }

  /**
   * 获取对象存储
   */
  private async getStore(
    storeName: string,
    options: IDBTransactionOptions = {}
  ): Promise<IDBObjectStore> {
    const db = await this.open();
    const transaction = db.transaction(storeName, options.mode || 'readonly', options.durability ? { durability: options.durability } : {});
    return transaction.objectStore(storeName);
  }

  /**
   * 添加数据
   */
  async add<T>(storeName: string, data: T): Promise<T> {
    const store = await this.getStore(storeName, { mode: 'readwrite' });
    
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      
      request.onsuccess = (event: Event) => {
        resolve(data);
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 批量添加数据
   */
  async bulkAdd<T>(storeName: string, dataList: T[]): Promise<T[]> {
    const store = await this.getStore(storeName, { mode: 'readwrite' });
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let completed = 0;
      
      const handleSuccess = (data: T) => {
        results.push(data);
        completed++;
        if (completed === dataList.length) {
          resolve(results);
        }
      };
      
      const handleError = (error: any) => {
        reject(error);
      };
      
      dataList.forEach(data => {
        const request = store.add(data);
        request.onsuccess = () => handleSuccess(data);
        request.onerror = (event: Event) => handleError((event.target as IDBRequest).error);
      });
    });
  }

  /**
   * 更新数据
   */
  async put<T>(storeName: string, data: T): Promise<T> {
    const store = await this.getStore(storeName, { mode: 'readwrite' });
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      
      request.onsuccess = (event: Event) => {
        resolve(data);
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 通过主键获取数据
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const store = await this.getStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = (event: Event) => {
        resolve((event.target as IDBRequest).result as T);
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 查询数据
   */
  async query<T>(storeName: string, options: IDBQueryOptions = {}): Promise<T[]> {
    const store = await this.getStore(storeName);
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
      
      if (options.index) {
        const index = store.index(options.index);
        cursorRequest = index.openCursor(options.range, options.direction);
      } else {
        cursorRequest = store.openCursor(options.range, options.direction);
      }
      
      cursorRequest.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        
        if (cursor) {
          // 处理偏移量
          if (options.offset && results.length < options.offset) {
            cursor.continue();
            return;
          }
          
          results.push(cursor.value as T);
          
          // 处理限制
          if (options.limit && results.length >= options.limit) {
            resolve(results);
            return;
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      cursorRequest.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 获取所有数据
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    return this.query<T>(storeName);
  }

  /**
   * 删除数据
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const store = await this.getStore(storeName, { mode: 'readwrite' });
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 清空对象存储
   */
  async clear(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, { mode: 'readwrite' });
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 删除数据库
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.name);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event: Event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
}
