/**
 * 书籍分组管理 Composable
 *
 * 职责:
 * - 分组列表加载（loadGroups/retryLoadGroups）
 * - 分组点击/筛选（handleGroupClick/backToAllBooks）
 * - 分组编辑（editGroup/saveGroup/deleteGroup/updateName）
 * - 分组移动（moveToGroup/handleGroupConfirm）
 * - 弹窗状态（showAddGroup/showGroupSelector）
 * - 派生计算（sortedGroups/groupBooksMap/groupThumbnailBooksMap/currentGroup/groupBooks）
 *
 * 依赖:
 * - bookService (getAllGroups/updateGroup/addGroup/deleteGroup/getBooksPaginated/getAllBooks)
 * - bookStore (Pinia) - 共享 allBooks
 * - readerStore - currentReaderId
 */
import { ref, computed } from 'vue';
import { bookService } from '@/services/book';
import { useBookStore } from '@/store/book';
import { useReaderStore } from '@/store/reader';
import type { Book, BookGroup } from '@/services/book/types';

export interface UseBookGroupsOptions {
  /** 外部 displayBooks ref（与分页/全量模式联动） */
  displayBooks: import('vue').Ref<Book[]>;
  /** 外部 usePagination computed */
  usePagination: import('vue').ComputedRef<boolean>;
  /** 外部 pageSize ref */
  pageSize: import('vue').Ref<number>;
  /** 外部 hasMoreBooks ref */
  hasMoreBooks: import('vue').Ref<boolean>;
  /** 外部 currentPage ref */
  currentPage: import('vue').Ref<number>;
  /** 外部 isLoading ref（加载分组书籍时使用） */
  isLoading: import('vue').Ref<boolean>;
  /** 外部 selectedBookIds ref（移动分组时使用） */
  selectedBookIds: import('vue').Ref<number[]>;
  /** 外部 selectedGroupIds ref（移动分组时使用） */
  selectedGroupIds: import('vue').Ref<string[]>;
}

export function useBookGroups(options: UseBookGroupsOptions) {
  const {
    displayBooks,
    usePagination,
    pageSize,
    hasMoreBooks,
    currentPage,
    isLoading,
    selectedBookIds,
    selectedGroupIds
  } = options;

  const bookStore = useBookStore();
  const readerStore = useReaderStore();

  // ============ 状态 ============
  const groups = ref<BookGroup[]>([]);
  const isLoadingGroups = ref(false);
  const loadGroupsError = ref<string | null>(null);
  const currentGroupId = ref('');

  // 弹窗状态
  const showAddGroup = ref(false);
  const showGroupSelector = ref(false);
  const selectedGroupId = ref('');
  const groupName = ref('');
  const editingGroup = ref<BookGroup | null>(null);

  // 分组名称内联编辑
  const editingGroupId = ref<string | null>(null);
  const editingGroupName = ref('');

  // ============ 计算属性 ============
  const sortedGroups = computed(() => [...groups.value].sort((a, b) => a.sort - b.sort));

  const currentGroup = computed(() => {
    if (!currentGroupId.value) return null;
    return groups.value.find(g => g.id === currentGroupId.value) || null;
  });

  /** 完整分组 → 书籍 映射（用于详情） */
  const groupBooksMap = computed(() => {
    const map = new Map<string, Book[]>();
    groups.value.forEach(group => {
      const groupBookList = bookStore.allBooks.filter(
        book => book.groups && book.groups.includes(group.id)
      );
      map.set(group.id, groupBookList);
    });
    return map;
  });

  /** 分组缩略图书籍映射（与 groupBooksMap 一致，可未来扩展占位逻辑） */
  const groupThumbnailBooksMap = computed(() => groupBooksMap.value);

  // ============ 工具方法 ============
  const groupBooks = (groupId: string): Book[] =>
    groupThumbnailBooksMap.value.get(groupId) || [];

  // ============ 加载与重试 ============
  const loadGroups = async () => {
    if (isLoadingGroups.value) return;
    isLoadingGroups.value = true;
    loadGroupsError.value = null;
    try {
      const groupsData = await bookService.getAllGroups();
      groups.value = groupsData || [];
    } catch (error) {
      console.error('加载分组失败:', error);
      loadGroupsError.value = '加载分组失败';
      groups.value = [];
    } finally {
      isLoadingGroups.value = false;
    }
  };

  const retryLoadGroups = () => {
    loadGroupsError.value = null;
    loadGroups();
  };

  // ============ 分组点击/筛选 ============
  const handleGroupClick = async (groupId: string) => {
    currentGroupId.value = groupId;

    if (!usePagination.value) return;

    const group = groups.value.find(g => g.id === groupId);
    if (!group || group.bookCount === 0) return;

    // 检查已加载的书籍中是否有该分组的书籍
    const loadedGroupBooks = bookStore.allBooks.filter(
      (b: Book) => b.groups && b.groups.includes(groupId)
    );

    if (loadedGroupBooks.length < group.bookCount) {
      // 需要加载全量书籍
      isLoading.value = true;
      try {
        const allBooks = await bookService.getAllBooks(readerStore.currentReaderId);
        bookStore.setBooks(allBooks);
        const groupBookList = allBooks.filter(b => b.groups && b.groups.includes(groupId));
        displayBooks.value = groupBookList.slice(0, pageSize.value);
        hasMoreBooks.value = groupBookList.length > pageSize.value;
        currentPage.value = 1;
      } catch (error) {
        console.error('加载分组书籍失败:', error);
      } finally {
        isLoading.value = false;
      }
    } else {
      // 已有全量数据
      const groupBookList = bookStore.allBooks.filter(
        b => b.groups && b.groups.includes(groupId)
      );
      displayBooks.value = groupBookList.slice(0, pageSize.value);
      hasMoreBooks.value = groupBookList.length > pageSize.value;
      currentPage.value = 1;
    }
  };

  const backToAllBooks = async () => {
    currentGroupId.value = '';

    if (!usePagination.value) return;

    isLoading.value = true;
    try {
      const result = await bookService.getBooksPaginated({
        page: 1,
        pageSize: pageSize.value,
        readerId: readerStore.currentReaderId
      });
      displayBooks.value = result.list;
      hasMoreBooks.value = result.hasMore;
      currentPage.value = result.page;
    } catch (error) {
      console.error('加载书籍失败:', error);
    } finally {
      isLoading.value = false;
    }
  };

  // ============ 分组编辑 ============
  const editGroup = (group: BookGroup) => {
    editingGroup.value = group;
    groupName.value = group.name;
    showAddGroup.value = true;
  };

  const saveGroup = async (name?: string) => {
    // 兼容两种调用方式：
    // 1) 旧的内部调用（无参） - 读 groupName ref
    // 2) GroupEditDialog 触发（@save 事件） - name 作为参数传入
    const finalName = (name ?? groupName.value).trim();
    if (!finalName) return;

    try {
      if (editingGroup.value) {
        const updated = await bookService.updateGroup({
          ...editingGroup.value,
          name: finalName
        });
        const index = groups.value.findIndex(g => g.id === updated.id);
        if (index !== -1) groups.value[index] = updated;
      } else {
        const newGroup = await bookService.addGroup({
          name: finalName,
          sort: groups.value.length,
          parentId: null
        });
        groups.value.push(newGroup);
      }
      showAddGroup.value = false;
      groupName.value = '';
      editingGroup.value = null;
      await loadGroups();
    } catch (error) {
      console.error('保存分组失败:', error);
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await bookService.deleteGroup(id);
      groups.value = groups.value.filter(g => g.id !== id);
    } catch (error) {
      console.error('删除分组失败:', error);
    }
  };

  // 内联编辑分组名称
  const startEditGroupName = (groupId: string, currentName: string) => {
    editingGroupId.value = groupId;
    editingGroupName.value = currentName;
  };

  const cancelEditGroupName = () => {
    editingGroupId.value = null;
    editingGroupName.value = '';
  };

  const saveGroupName = async (groupId: string) => {
    if (!editingGroupName.value.trim()) {
      cancelEditGroupName();
      return;
    }
    try {
      const group = groups.value.find(g => g.id === groupId);
      if (group) {
        const updated = await bookService.updateGroup({
          ...group,
          name: editingGroupName.value.trim()
        });
        const index = groups.value.findIndex(g => g.id === updated.id);
        if (index !== -1) groups.value[index] = updated;
      }
    } catch (error) {
      console.error('保存分组名称失败:', error);
      alert('保存分组名称失败，请重试');
    } finally {
      cancelEditGroupName();
    }
  };

  // 兼容旧 API（由 BookGroupCard 双击触发）
  const handleUpdateGroupName = async (groupId: string, newName: string) => {
    try {
      const group = groups.value.find(g => g.id === groupId);
      if (group) {
        const updated = await bookService.updateGroup({ ...group, name: newName });
        const index = groups.value.findIndex(g => g.id === updated.id);
        if (index !== -1) groups.value[index] = updated;
      }
    } catch (error) {
      console.error('更新分组名称失败:', error);
      alert('更新分组名称失败，请重试');
    }
  };

  // ============ 分组移动（整理模式） ============
  const moveToGroup = () => {
    showGroupSelector.value = true;
  };

  const handleGroupConfirm = async (groupId: string) => {
    if (
      !groupId ||
      (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0)
    ) {
      return;
    }

    try {
      // 1. 选中的书籍：加入目标分组
      for (const bookId of selectedBookIds.value) {
        const book = bookStore.getBookById(bookId);
        if (book && !book.groups.includes(groupId)) {
          const updatedBook = {
            ...book,
            groups: [...book.groups, groupId],
            updateTime: new Date().toISOString()
          };
          await bookService.updateBook(updatedBook);
          bookStore.updateBook(updatedBook);
        }
      }

      // 2. 选中的分组内的所有书籍：加入目标分组
      for (const sourceGroupId of selectedGroupIds.value) {
        if (sourceGroupId === groupId) continue;
        const sourceGroupBooks = groupBooksMap.value.get(sourceGroupId) || [];
        for (const book of sourceGroupBooks) {
          if (!book.groups.includes(groupId)) {
            const updatedBook = {
              ...book,
              groups: [...book.groups, groupId],
              updateTime: new Date().toISOString()
            };
            await bookService.updateBook(updatedBook);
            bookStore.updateBook(updatedBook);
          }
        }
      }
      showGroupSelector.value = false;
    } catch (error) {
      console.error('移动到分组失败:', error);
    }
  };

  /**
   * 多选模式下的"确认分组"处理（与 handleGroupConfirm 单选添加不同，此函数同时支持加入与移除）
   * - groupIds: 用户在分组选择弹窗中最终勾选的分组 ID 数组（期望的"目标状态"）
   * - 对每本书的处理：
   *   1) 新勾选且原本不在该分组的 -> 加入分组
   *   2) 原本在该分组但被取消勾选的 -> 从分组中移除
   * - 这样既支持"加入新分组"，也支持"从原分组移除"
   * - 系统支持一本书同时属于多个分组（book.groups 是数组）
   */
  const handleGroupConfirmMulti = async (groupIds: string[]) => {
    if (
      !groupIds ||
      (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0)
    ) {
      return;
    }

    const targetGroupIds = new Set(groupIds);

    try {
      // 1. 选中的书籍：将它们的 groups 同步为"当前已选中的目标分组集合"
      for (const bookId of selectedBookIds.value) {
        const book = bookStore.getBookById(bookId);
        if (!book) continue;
        const nextGroups = Array.from(
          new Set([
            ...book.groups.filter(g => targetGroupIds.has(g)),
            ...Array.from(targetGroupIds),
          ])
        );
        // 仅在有变化时才写库
        if (!arraysEqual(nextGroups, book.groups)) {
          const updatedBook = {
            ...book,
            groups: nextGroups,
            updateTime: new Date().toISOString(),
          };
          await bookService.updateBook(updatedBook);
          bookStore.updateBook(updatedBook);
        }
      }

      // 2. 选中的分组：将其内所有书籍的 groups 同步为"目标分组集合"
      for (const sourceGroupId of selectedGroupIds.value) {
        const sourceGroupBooks = groupBooksMap.value.get(sourceGroupId) || [];
        for (const book of sourceGroupBooks) {
          const nextGroups = Array.from(
            new Set([
              ...book.groups.filter(g => targetGroupIds.has(g)),
              ...Array.from(targetGroupIds),
            ])
          );
          if (!arraysEqual(nextGroups, book.groups)) {
            const updatedBook = {
              ...book,
              groups: nextGroups,
              updateTime: new Date().toISOString(),
            };
            await bookService.updateBook(updatedBook);
            bookStore.updateBook(updatedBook);
          }
        }
      }
      showGroupSelector.value = false;
    } catch (error) {
      console.error('更新分组失败:', error);
    }
  };

  /**
   * 计算已选书籍的"共同所在分组"（所有已选书籍都在的分组）。
   * - 用于初始化 GroupSelectorDialog 的勾选状态
   * - 没有任何已选书籍时返回空数组
   */
  const getCommonGroupsForSelectedBooks = (bookIds: number[], groupIds: string[]): string[] => {
    if (bookIds.length === 0 && groupIds.length === 0) return [];

    // 1) 直接选中的书籍
    const directBooks = bookIds
      .map(id => bookStore.getBookById(id))
      .filter((b): b is Book => b !== undefined);

    // 2) 通过选中分组展开出来的书籍
    for (const gid of groupIds) {
      const groupBookList = groupBooksMap.value.get(gid) || [];
      directBooks.push(...groupBookList);
    }

    if (directBooks.length === 0) return [];

    // 找出所有书籍都包含的分组 ID
    const allGroupSets = directBooks.map(b => new Set(b.groups || []));
    const first = allGroupSets[0];
    const common: string[] = [];
    first.forEach(gid => {
      if (allGroupSets.every(s => s.has(gid))) {
        common.push(gid);
      }
    });
    return common;
  };

  /**
   * 计算每个分组中所选书籍的数量（key: groupId -> 该分组包含的所选书籍数）
   * - 用于 GroupSelectorDialog 显示"分组旁橙色徽章"
   * - 直接选中的书籍 + 通过选中分组展开的书籍 都纳入计算
   */
  const getSelectedCountPerGroup = (
    bookIds: number[],
    selectedGroups: string[]
  ): Record<string, number> => {
    const result: Record<string, number> = {};

    // 1) 收集所有相关书籍
    const relatedBooks: Book[] = [];
    for (const id of bookIds) {
      const b = bookStore.getBookById(id);
      if (b) relatedBooks.push(b);
    }
    for (const gid of selectedGroups) {
      const list = groupBooksMap.value.get(gid) || [];
      relatedBooks.push(...list);
    }

    // 2) 统计每个分组命中的本数
    for (const book of relatedBooks) {
      if (!book.groups) continue;
      for (const gid of book.groups) {
        result[gid] = (result[gid] || 0) + 1;
      }
    }
    return result;
  };

  /**
   * 从指定分组中移出若干书籍（仅修改 group 字段，其他属性不变）
   * - 用于 GroupManageDialog "移出分组" 操作
   * - 仅影响传入的 bookIds
   */
  const removeBooksFromGroup = async (groupId: string, bookIds: number[]) => {
    if (!groupId || !bookIds || bookIds.length === 0) return;

    try {
      for (const bookId of bookIds) {
        const book = bookStore.getBookById(bookId);
        if (!book || !book.groups || !book.groups.includes(groupId)) continue;
        const nextGroups = book.groups.filter(g => g !== groupId);
        const updatedBook: Book = {
          ...book,
          groups: nextGroups,
          updateTime: new Date().toISOString(),
        };
        await bookService.updateBook(updatedBook);
        bookStore.updateBook(updatedBook);
      }
      // 移出后需要重新加载分组（bookCount 可能变化）
      await loadGroups();
    } catch (error) {
      console.error('从分组中移出书籍失败:', error);
      throw error;
    }
  };

  return {
    // 状态
    groups,
    isLoadingGroups,
    loadGroupsError,
    currentGroupId,
    showAddGroup,
    showGroupSelector,
    selectedGroupId,
    groupName,
    editingGroup,
    editingGroupId,
    editingGroupName,
    // 计算
    sortedGroups,
    currentGroup,
    groupBooksMap,
    groupThumbnailBooksMap,
    // 方法
    groupBooks,
    loadGroups,
    retryLoadGroups,
    handleGroupClick,
    backToAllBooks,
    editGroup,
    saveGroup,
    deleteGroup,
    startEditGroupName,
    cancelEditGroupName,
    saveGroupName,
    handleUpdateGroupName,
    moveToGroup,
    handleGroupConfirm,
    handleGroupConfirmMulti,
    getCommonGroupsForSelectedBooks,
    getSelectedCountPerGroup,
    removeBooksFromGroup
  };
}

/** 数组相等比较（顺序无关） */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}
