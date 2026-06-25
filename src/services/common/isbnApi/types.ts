export interface BookSearchResult {
  source: string; // 数据源
  title: string; // 书名
  author: string; // 作者
  isbn: string; // ISBN
  publisher?: string; // 出版社
  publishYear?: number; // 出版年份
  pages?: number; // 页数
  binding?: string; // 装帧
  binding1?: number; // 装帧类型: 0=电子书, 1=平装, 2=精装, 3=特殊装帧, 4=套装
  binding2?: number; // 装帧细分类型
  book_type?: number; // 书籍载体类型: 0=电子书, 1=实体书
  coverUrl?: string; // 封面图片URL
  localCoverData?: string; // 本地存储的封面图片数据
  description?: string; // 描述
  price?: string; // 价格
  rating?: number; // 评分（0-5）
  series?: string; // 丛书名称
  tags?: string[]; // 标签数组
  rawHtml?: string; // 原始HTML数据（仅DBR源）
  sourceUrl?: string; // 数据源URL（仅DBR源）
}