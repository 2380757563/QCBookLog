export interface IDBConfig {
  name: string;
  version: number;
  stores: IDBStoreConfig[];
}

export interface IDBStoreConfig {
  name: string;
  keyPath: string;
  indexes?: IDBIndexConfig[];
  autoIncrement?: boolean;
}

export interface IDBIndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export interface IDBQueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export interface IDBTransactionOptions {
  mode?: IDBTransactionMode;
  durability?: IDBTransactionDurability;
}
