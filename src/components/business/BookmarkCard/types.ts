export interface BookmarkCardProps {
  /**
   * 书摘数据
   */
  bookmark: {
    id: string;
    content: string;
    note?: string;
    pageNum?: string;
    tags: string[];
    bookTitle?: string;
    createTime: string;
    updateTime: string;
  };
  /**
   * 是否显示书籍标题
   */
  showBookTitle?: boolean;
  /**
   * 是否显示操作按钮
   */
  showActions?: boolean;
}

export interface BookmarkCardEmits {
  /**
   * 点击书摘卡片事件
   */
  (e: 'click', bookmarkId: string): void;
  /**
   * 编辑书摘事件
   */
  (e: 'edit', bookmarkId: string): void;
  /**
   * 删除书摘事件
   */
  (e: 'delete', bookmarkId: string): void;
}
