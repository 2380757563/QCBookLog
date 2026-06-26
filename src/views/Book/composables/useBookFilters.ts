/**
 * 书籍筛选逻辑 Composable
 *
 * 职责:
 * - 集中管理筛选条件状态 (filterConditions)
 * - 计算可用标签/出版社/作者
 * - 提供 save/load/clear 操作
 * - 提供 hasActiveFilters 计算属性
 *
 * 依赖:
 * - bookStore (Pinia) - 提供 allBooks
 *
 * 由 /home/project/QCBookLog/src/views/Book/index.vue 拆分而来
 */
import { ref, computed, watch } from 'vue';
import { useBookStore } from '@/store/book';
import type { Book } from '@/services/book/types';

/** 筛选条件数据结构 */
export interface BookFilterConditions {
  tags: string[];
  readStatus: '' | '未读' | '在读' | '已读';
  book_type: number | null;
  binding1: number | null;
  binding2: number | null;
  paper1: number | null;
  edge1: number | null;
  edge2: number | null;
  publisher: string;
  author: string;
  favorite: number | null;
  wants: number | null;
}

const STORAGE_KEY = 'bookFilterConditions';
const SAVE_DEBOUNCE_MS = 300; // localStorage 防抖，避免高频写入造成卡顿

/** 初始空筛选条件 */
const emptyConditions = (): BookFilterConditions => ({
  tags: [],
  readStatus: '',
  book_type: null,
  binding1: null,
  binding2: null,
  paper1: null,
  edge1: null,
  edge2: null,
  publisher: '',
  author: '',
  favorite: null,
  wants: null,
});

/** 防抖工具（避免重复声明） */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useBookFilters() {
  const bookStore = useBookStore();

  // 筛选条件
  const filterConditions = ref<BookFilterConditions>(emptyConditions());

  // 可用的标签列表
  const availableTags = computed(() => {
    const tagSet = new Set<string>();
    bookStore.allBooks.forEach((book: Book) => {
      if (book.tags && Array.isArray(book.tags)) {
        book.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  });

  // 可用的出版社列表
  const availablePublishers = computed(() => {
    const publisherSet = new Set<string>();
    bookStore.allBooks.forEach((book: Book) => {
      if (book.publisher) {
        publisherSet.add(book.publisher);
      }
    });
    return Array.from(publisherSet).sort();
  });

  // 可用的作者列表
  const availableAuthors = computed(() => {
    const authorSet = new Set<string>();
    bookStore.allBooks.forEach((book: Book) => {
      if (book.author) {
        authorSet.add(book.author);
      }
    });
    return Array.from(authorSet).sort();
  });

  // 是否有任何筛选条件激活
  const hasActiveFilters = computed(() => {
    const c = filterConditions.value;
    return (
      c.tags.length > 0 ||
      c.readStatus !== '' ||
      c.book_type !== null ||
      c.binding1 !== null ||
      c.binding2 !== null ||
      c.paper1 !== null ||
      c.edge1 !== null ||
      c.edge2 !== null ||
      c.publisher.trim() !== '' ||
      c.author.trim() !== '' ||
      c.favorite !== null ||
      c.wants !== null
    );
  });

  // 筛选条件 → 标签展示
  // 输出数组，每项形如 { key, label, removable, remove }
  // 用于在书库标题左侧以 chip 形式展示当前应用的筛选条件
  // key    唯一标识（如 'tags:xxx' / 'book_type' / 'publisher'）
  // label  展示文字（如 '标签：小说' / '电子书' / '出版社：xxx'）
  // remove 移除该筛选的回调
  const activeFilterChips = computed<Array<{ key: string; label: string; remove: () => void }>>(() => {
    const chips: Array<{ key: string; label: string; remove: () => void }> = [];
    const c = filterConditions.value;

    // 标签（多选）
    c.tags.forEach(tag => {
      chips.push({
        key: `tag:${tag}`,
        label: `标签：${tag}`,
        remove: () => {
          c.tags = c.tags.filter(t => t !== tag);
          saveFilterConditions();
        },
      });
    });

    // 阅读状态
    if (c.readStatus) {
      chips.push({
        key: 'readStatus',
        label: `阅读状态：${c.readStatus}`,
        remove: () => {
          c.readStatus = '';
          saveFilterConditions();
        },
      });
    }

    // 书籍种类
    if (c.book_type !== null) {
      const typeMap: Record<number, string> = { 0: '电子书', 1: '实体书' };
      chips.push({
        key: 'book_type',
        label: `种类：${typeMap[c.book_type] ?? `类型#${c.book_type}`}`,
        remove: () => {
          c.book_type = null;
          saveFilterConditions();
        },
      });
    }

    // 装帧 1
    if (c.binding1 !== null) {
      const binding1Map: Record<number, string> = {
        0: '电子书', 1: '平装', 2: '精装', 3: '特殊装帧', 4: '套装',
      };
      chips.push({
        key: 'binding1',
        label: `装帧：${binding1Map[c.binding1] ?? `装帧#${c.binding1}`}`,
        remove: () => {
          c.binding1 = null;
          saveFilterConditions();
        },
      });
    }

    // 装帧 2
    if (c.binding2 !== null) {
      // binding2 的标签需要结合 binding1 才能正确显示（与 AdvancedFilterDialog 中 BINDING2_OPTIONS_MAP 对齐）
      const BINDING2_OPTIONS_MAP: Record<number, Record<number, string>> = {
        0: { 0: '无细分（默认）', 1: '精校版', 2: '魔改版', 3: '原版' },
        1: { 0: '无细分（默认）', 1: '无线胶装（胶装）', 2: '骑马钉装订', 3: '活页装订', 4: '锁线胶装（线胶装）' },
        2: {
          0: '无细分（默认）',
          1: '硬壳精装（圆脊）',
          2: '硬壳精装（方脊）',
          3: '布面精装',
          4: 'PU 皮面精装',
          5: '真皮精装（头层牛皮）',
          6: '真皮精装（羊皮）',
          7: '仿皮（人造革）精装'
        },
        3: { 0: '无细分（默认）', 1: '线装', 2: '经折装' },
        4: { 0: '无细分（默认）', 1: '套装精装', 2: '套装平装', 3: '套装其他' }
      };
      const label = c.binding1 !== null
        ? (BINDING2_OPTIONS_MAP[c.binding1]?.[c.binding2] ?? `装帧#${c.binding2}`)
        : `装帧#${c.binding2}`;
      chips.push({
        key: 'binding2',
        label: `装帧细节：${label}`,
        remove: () => {
          c.binding2 = null;
          saveFilterConditions();
        },
      });
    }

    // 纸张
    if (c.paper1 !== null) {
      const paperMap: Record<number, string> = {
        0: '未指定', 1: '胶版纸（双胶纸）', 2: '轻型纸', 3: '道林纸',
        4: '铜版纸', 5: '牛皮纸', 6: '宣纸', 7: '进口特种纸',
      };
      chips.push({
        key: 'paper1',
        label: `纸张：${paperMap[c.paper1] ?? `纸张#${c.paper1}`}`,
        remove: () => {
          c.paper1 = null;
          saveFilterConditions();
        },
      });
    }

    // 刷边 1
    if (c.edge1 !== null) {
      const edge1Map: Record<number, string> = {
        0: '无刷边', 1: '书口单侧', 2: '多侧（书口+天头/地脚）', 3: '全三边',
      };
      chips.push({
        key: 'edge1',
        label: `刷边位置：${edge1Map[c.edge1] ?? `刷边#${c.edge1}`}`,
        remove: () => {
          c.edge1 = null;
          saveFilterConditions();
        },
      });
    }

    // 刷边 2
    if (c.edge2 !== null) {
      const edge2Map: Record<number, string> = {
        0: '无细分', 1: '基础单色', 2: '多色', 3: '金色', 4: '银色',
        5: '烫金', 6: '烫银',
      };
      chips.push({
        key: 'edge2',
        label: `刷边工艺：${edge2Map[c.edge2] ?? `刷边#${c.edge2}`}`,
        remove: () => {
          c.edge2 = null;
          saveFilterConditions();
        },
      });
    }

    // 出版社
    if (c.publisher.trim() !== '') {
      chips.push({
        key: 'publisher',
        label: `出版社：${c.publisher}`,
        remove: () => {
          c.publisher = '';
          saveFilterConditions();
        },
      });
    }

    // 作者
    if (c.author.trim() !== '') {
      chips.push({
        key: 'author',
        label: `作者：${c.author}`,
        remove: () => {
          c.author = '';
          saveFilterConditions();
        },
      });
    }

    // 收藏
    if (c.favorite !== null) {
      chips.push({
        key: 'favorite',
        label: '收藏',
        remove: () => {
          c.favorite = null;
          saveFilterConditions();
        },
      });
    }

    // 想读
    if (c.wants !== null) {
      chips.push({
        key: 'wants',
        label: '想读',
        remove: () => {
          c.wants = null;
          saveFilterConditions();
        },
      });
    }

    return chips;
  });

  // 切换单个标签（弹窗内使用）
  const toggleTagFilter = (tag: string) => {
    const index = filterConditions.value.tags.indexOf(tag);
    if (index === -1) {
      filterConditions.value.tags.push(tag);
    } else {
      filterConditions.value.tags.splice(index, 1);
    }
    saveFilterConditions();
  };

  // 直接设置 tags 数组（用于 quick filter 同步）
  const setTags = (tags: string[]) => {
    filterConditions.value.tags = [...tags];
    saveFilterConditions();
  };

  // 重置所有筛选
  const clearFilterConditions = () => {
    filterConditions.value = emptyConditions();
    saveFilterConditions();
  };

  // 保存到 localStorage
  const saveFilterConditions = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filterConditions.value));
    } catch (e) {
      console.error('保存筛选条件失败', e);
    }
  };

  // 从 localStorage 加载
  const loadFilterConditions = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const c = JSON.parse(saved);
      filterConditions.value = {
        tags: c.tags || [],
        readStatus: c.readStatus || '',
        book_type: c.book_type !== undefined ? c.book_type : null,
        binding1: c.binding1 || null,
        binding2: c.binding2 || null,
        paper1: c.paper1 || null,
        edge1: c.edge1 || null,
        edge2: c.edge2 || null,
        publisher: c.publisher || '',
        author: c.author || '',
        favorite: c.favorite !== undefined ? c.favorite : null,
        wants: c.wants !== undefined ? c.wants : null,
      };
    } catch (e) {
      console.error('⚠️ 加载筛选条件失败:', e);
    }
  };

  // 自动持久化（兜底 + 防抖，避免高频写入导致主线程阻塞）
  // 注意：显式调用 saveFilterConditions() 时仍会立即写入
  // 兜底用防抖版，避免在快速操作（输入搜索/勾选标签）时反复写入造成卡顿
  const debouncedSave = debounce(() => saveFilterConditions(), SAVE_DEBOUNCE_MS);
  watch(
    filterConditions,
    () => debouncedSave(),
    { deep: true }
  );

  return {
    // 状态
    filterConditions,
    // 计算属性
    availableTags,
    availablePublishers,
    availableAuthors,
    hasActiveFilters,
    activeFilterChips,
    // 方法
    toggleTagFilter,
    setTags,
    clearFilterConditions,
    saveFilterConditions,
    loadFilterConditions,
  };
}
