/**
 * 书单（愿望清单）管理 Composable
 *
 * 职责:
 * - 加载/添加/移除愿望清单条目
 * - 维护 showAddWishlist 弹窗状态
 * - 维护 wishlist 列表状态
 *
 * 依赖:
 * - wishlistService (getWishlist/addToWishlist/removeFromWishlist)
 * - readerStore - currentReaderId
 */
import { ref } from 'vue';
import { wishlistService, type WishlistItem } from '@/api/wishlistService';
import { useReaderStore } from '@/stores/reader';

export function useWishlist() {
  const readerStore = useReaderStore();

  const wishlist = ref<WishlistItem[]>([]);
  const showAddWishlist = ref(false);

  /** 加载愿望清单 */
  const loadWishlist = async () => {
    try {
      const readerId = readerStore.currentReaderId;
      const data = await wishlistService.getWishlist(readerId);
      wishlist.value = data;
    } catch (error) {
      console.error('加载愿望清单失败:', error);
      wishlist.value = [];
    }
  };

  /** 添加条目到愿望清单 */
  const addToWishlist = async (isbn: string, title: string, author?: string) => {
    try {
      await wishlistService.addToWishlist({ isbn, title, author });
      await loadWishlist();
    } catch (error) {
      console.error('添加到愿望清单失败:', error);
      alert('添加到愿望清单失败，请重试');
    }
  };

  /** 从愿望清单移除 */
  const removeFromWishlist = async (isbn: string) => {
    try {
      await wishlistService.removeFromWishlist(isbn);
      await loadWishlist();
    } catch (error) {
      console.error('从愿望清单移除失败:', error);
      alert('移除失败，请重试');
    }
  };

  return {
    wishlist,
    showAddWishlist,
    loadWishlist,
    addToWishlist,
    removeFromWishlist
  };
}
