export interface BookCardProps {
  /**
   * 书籍数据
   */
  book: {
    id: number;
    title: string;
    author: string;
    coverUrl?: string;
    localCoverData?: string;
    readStatus: '未读' | '在读' | '已读';
    rating?: number;
    tags: string[];
    groups: string[];
  };
  /**
   * 布局类型
   */
  layout?: 'grid' | 'list';
  /**
   * 是否显示操作按钮
   */
  showActions?: boolean;
}

export interface BookCardEmits {
  /**
   * 点击书籍卡片事件
   */
  (e: 'click', bookId: number): void;
  /**
   * 编辑书籍事件
   */
  (e: 'edit', bookId: number): void;
  /**
   * 删除书籍事件
   */
  (e: 'delete', bookId: number): void;
  /**
   * 查看书摘事件
   */
  (e: 'viewBookmarks', bookId: number): void;
}
