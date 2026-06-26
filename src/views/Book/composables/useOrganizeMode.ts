/**
 * 整理模式 Composable
 *
 * 职责:
 * - 整理模式开关（startOrganizeMode/exitOrganizeMode）
 * - 选中状态（书籍/分组）
 * - 批量操作：置顶/移到开头/移到末尾/移至分组/修改状态/删除
 * - 状态选择器弹窗（showStatusSelector/newStatus）
 *
 * 依赖:
 * - bookService (updateBook/deleteBook/updateReadingState)
 * - bookStore (Pinia) - 共享 allBooks
 * - readerStore - currentReaderId
 * - useBookGroups - 暴露 moveToGroup
 */
import { ref } from 'vue';
import { bookService } from '@/services/book';
import { useBookStore } from '@/store/book';
import { useReaderStore } from '@/store/reader';
import type { Book } from '@/services/book/types';

export type ReadStatusLabel = '未读' | '在读' | '已读';

export interface UseOrganizeModeOptions {
  /** 触发 moveToGroup 弹窗的回调（由 useBookGroups 提供） */
  onMoveToGroup: () => void;
  /** 完成批量操作后重新加载数据的回调 */
  onReload: () => Promise<void> | void;
  /** 外部 filteredBooks（用于 selectAllBooks/invertSelection） */
  filteredBooks: import('vue').ComputedRef<Book[]>;
  /** 外部 sortedGroups */
  sortedGroups: import('vue').ComputedRef<{ id: string }[]>;
  /** 外部 currentGroupId ref（删除分组后需清空） */
  currentGroupId: import('vue').Ref<string>;
}

const READ_STATUS_MAP: Record<ReadStatusLabel, number> = {
  '未读': 0,
  '在读': 1,
  '已读': 2
};

export function useOrganizeMode(options: UseOrganizeModeOptions) {
  const {
    onMoveToGroup,
    onReload,
    filteredBooks,
    sortedGroups,
    currentGroupId
  } = options;

  const bookStore = useBookStore();
  const readerStore = useReaderStore();

  // ============ 状态 ============
  const isOrganizeMode = ref(false);
  const selectedBookIds = ref<number[]>([]);
  const selectedGroupIds = ref<string[]>([]);
  const showStatusSelector = ref(false);
  const newStatus = ref<ReadStatusLabel>('未读');

  // ============ 模式开关 ============
  const startOrganizeMode = () => {
    isOrganizeMode.value = true;
    selectedBookIds.value = [];
    selectedGroupIds.value = [];
    document.body.classList.add('organize-mode-active');
  };

  const exitOrganizeMode = () => {
    isOrganizeMode.value = false;
    selectedBookIds.value = [];
    selectedGroupIds.value = [];
    document.body.classList.remove('organize-mode-active');
  };

  // ============ 选中切换 ============
  const toggleBookSelection = (bookId: number) => {
    const index = selectedBookIds.value.indexOf(bookId);
    if (index > -1) {
      selectedBookIds.value.splice(index, 1);
    } else {
      selectedBookIds.value.push(bookId);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    const index = selectedGroupIds.value.indexOf(groupId);
    if (index > -1) {
      selectedGroupIds.value.splice(index, 1);
    } else {
      selectedGroupIds.value.push(groupId);
    }
  };

  const selectAllBooks = () => {
    selectedBookIds.value = filteredBooks.value.map(book => book.id);
  };

  const selectAllGroups = () => {
    selectedGroupIds.value = sortedGroups.value.map(group => group.id);
  };

  const invertSelection = () => {
    const allBookIds = filteredBooks.value.map(book => book.id);
    selectedBookIds.value = allBookIds.filter(id => !selectedBookIds.value.includes(id));
    const allGroupIds = sortedGroups.value.map(group => group.id);
    selectedGroupIds.value = allGroupIds.filter(id => !selectedGroupIds.value.includes(id));
  };

  // ============ 批量操作 ============
  /** 置顶：把所有选中书籍的 updateTime 设为当前最新时间 */
  const pinToTop = async () => {
    if (selectedBookIds.value.length === 0) {
      alert('请先选择书籍');
      return;
    }
    try {
      const now = new Date().toISOString();
      for (const bookId of selectedBookIds.value) {
        const book = bookStore.getBookById(bookId);
        if (book) {
          const result = await bookService.updateBook({ ...book, updateTime: now });
          bookStore.updateBook(result);
        }
      }
      selectedBookIds.value = [];
      await onReload();
    } catch (error) {
      console.error('置顶失败:', error);
      alert('置顶失败，请重试');
    }
  };

  /** 移到开头：调整 createTime/updateTime 让选中书排在最前 */
  const moveToStart = async () => {
    if (selectedBookIds.value.length === 0) {
      alert('请先选择书籍');
      return;
    }
    try {
      const allBooks = bookStore.allBooks;
      const selectedBooks = selectedBookIds.value
        .map(id => bookStore.getBookById(id))
        .filter((book): book is Book => book !== undefined);
      const otherBooks = allBooks.filter(b => !selectedBookIds.value.includes(b.id));

      const baseTime = new Date('2020-01-01').getTime();
      const now = Date.now();

      for (let i = 0; i < otherBooks.length; i++) {
        const book = otherBooks[i];
        const updateTime = new Date(baseTime + i * 1000).toISOString();
        const updatedBook = { ...book, createTime: updateTime, updateTime };
        await bookService.updateBook(updatedBook);
        bookStore.updateBook(updatedBook);
      }
      for (let i = 0; i < selectedBooks.length; i++) {
        const book = selectedBooks[i];
        const offset = selectedBooks.length - i;
        const updateTime = new Date(now + offset * 1000).toISOString();
        const updatedBook = { ...book, createTime: updateTime, updateTime };
        await bookService.updateBook(updatedBook);
        bookStore.updateBook(updatedBook);
      }
      selectedBookIds.value = [];
      await onReload();
    } catch (error) {
      console.error('移到开头失败:', error);
      alert('移到开头失败，请重试');
    }
  };

  /** 移到末尾：调整 createTime/updateTime 让选中书排在最后 */
  const moveToEnd = async () => {
    if (selectedBookIds.value.length === 0) {
      alert('请先选择书籍');
      return;
    }
    try {
      const allBooks = bookStore.allBooks;
      const selectedBooks = selectedBookIds.value
        .map(id => bookStore.getBookById(id))
        .filter((book): book is Book => book !== undefined);
      const otherBooks = allBooks.filter(b => !selectedBookIds.value.includes(b.id));

      const baseTime = new Date('2020-01-01').getTime();
      const now = Date.now();

      for (let i = 0; i < otherBooks.length; i++) {
        const book = otherBooks[i];
        const updateTime = new Date(now + (otherBooks.length - i) * 1000).toISOString();
        const updatedBook = { ...book, createTime: updateTime, updateTime };
        await bookService.updateBook(updatedBook);
        bookStore.updateBook(updatedBook);
      }
      for (let i = 0; i < selectedBooks.length; i++) {
        const book = selectedBooks[i];
        const updateTime = new Date(baseTime + i * 1000).toISOString();
        const updatedBook = { ...book, createTime: updateTime, updateTime };
        await bookService.updateBook(updatedBook);
        bookStore.updateBook(updatedBook);
      }
      selectedBookIds.value = [];
      await onReload();
    } catch (error) {
      console.error('移到末尾失败:', error);
      alert('移到末尾失败，请重试');
    }
  };

  const moveToGroup = () => {
    if (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0) {
      return;
    }
    onMoveToGroup();
  };

  /** 打开状态选择器 */
  const changeStatus = () => {
    if (selectedBookIds.value.length === 0) {
      alert('请先选择书籍');
      return;
    }
    showStatusSelector.value = true;
  };

  /** 确认修改状态 */
  const confirmChangeStatus = async () => {
    try {
      const now = new Date().toISOString();
      let successCount = 0;
      for (const bookId of selectedBookIds.value) {
        const book = bookStore.getBookById(bookId);
        if (!book) continue;
        try {
          const readStateNumber = READ_STATUS_MAP[newStatus.value] ?? 0;
          const readingStateData = {
            read_state: readStateNumber,
            read_date: newStatus.value === '已读' ? now : undefined
          };
          const updatedReadingState = await bookService.updateReadingState(
            bookId,
            readingStateData,
            readerStore.currentReaderId
          );
          const updatedBook = {
            ...book,
            readStatus: newStatus.value,
            readCompleteDate: updatedReadingState.read_date || undefined,
            updateTime: now
          };
          bookStore.updateBook(updatedBook);
          successCount++;
        } catch (error) {
          console.error(`更新书籍 ${bookId} 状态失败:`, error);
        }
      }
      showStatusSelector.value = false;
      selectedBookIds.value = [];
      if (successCount === 0) {
        alert('修改状态失败，请重试');
      }
      await onReload();
    } catch (error) {
      console.error('修改状态失败:', error);
      alert('修改状态失败，请重试');
    }
  };

  /** 批量删除（书籍 + 分组） */
  const deleteSelected = async () => {
    if (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0) return;

    const bookCount = selectedBookIds.value.length;
    const groupCount = selectedGroupIds.value.length;
    let confirmMessage = '';
    if (bookCount > 0 && groupCount > 0) {
      confirmMessage = `确定要删除选中的 ${bookCount} 本书和 ${groupCount} 个分组吗？`;
    } else if (bookCount > 0) {
      confirmMessage = `确定要删除选中的 ${bookCount} 本书吗？`;
    } else {
      confirmMessage = `确定要删除选中的 ${groupCount} 个分组吗？`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      // 仅删除数据库中存在的书籍
      const validBookIds = selectedBookIds.value.filter(bookId =>
        bookStore.allBooks.some(book => book.id === bookId)
      );

      if (validBookIds.length < selectedBookIds.value.length) {
        const skippedCount = selectedBookIds.value.length - validBookIds.length;
        alert(`注意：发现 ${skippedCount} 个书籍ID在当前数据库中不存在，已跳过这些书籍。\n\n这通常发生在切换数据库后，建议刷新页面重新加载书籍列表。`);
      }

      let successCount = 0;
      let failCount = 0;
      for (const bookId of validBookIds) {
        try {
          await bookService.deleteBook(bookId);
          bookStore.deleteBook(bookId);
          successCount++;
        } catch (error) {
          console.error(`删除书籍 ${bookId} 失败:`, error);
          failCount++;
        }
      }

      // 删除分组
      for (const groupId of selectedGroupIds.value) {
        try {
          await bookService.deleteGroup(groupId);
        } catch (error) {
          console.error(`删除分组 ${groupId} 失败:`, error);
        }
      }

      // 若当前分组被删除，则返回全部书籍
      if (currentGroupId.value && selectedGroupIds.value.includes(currentGroupId.value)) {
        currentGroupId.value = '';
      }

      if (failCount > 0) {
        alert(`删除完成：成功删除 ${successCount} 本书，失败 ${failCount} 本。`);
      }
      exitOrganizeMode();
    } catch (error) {
      console.error('删除失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`删除失败：${errorMessage}`);
      exitOrganizeMode();
    }
  };

  return {
    isOrganizeMode,
    selectedBookIds,
    selectedGroupIds,
    showStatusSelector,
    newStatus,
    startOrganizeMode,
    exitOrganizeMode,
    toggleBookSelection,
    toggleGroupSelection,
    selectAllBooks,
    selectAllGroups,
    invertSelection,
    pinToTop,
    moveToStart,
    moveToEnd,
    moveToGroup,
    changeStatus,
    confirmChangeStatus,
    deleteSelected
  };
}
