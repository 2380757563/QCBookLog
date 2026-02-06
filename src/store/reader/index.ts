import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export interface Reader {
  id: number;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  admin?: boolean;
  active: boolean;
}

export const useReaderStore = defineStore('reader', () => {
  // 当前读者ID（默认为0：默认读者）
  const currentReaderId = ref<number>(0);

  // 读者列表
  const readers = ref<Reader[]>([]);

  // 是否已加载
  const loaded = ref<boolean>(false);

  // 当前读者信息（计算属性）
  const currentReader = computed<Reader>(() => {
    const reader = readers.value.find(r => r.id === currentReaderId.value);
    return reader || {
      id: 0,
      username: 'default',
      name: '默认读者',
      active: true
    };
  });

  /**
   * 从本地存储加载当前读者ID
   */
  const loadCurrentReaderId = () => {
    try {
      const saved = localStorage.getItem('currentReaderId');
      if (saved !== null) {
        const id = parseInt(saved, 10);
        if (!isNaN(id)) {
          currentReaderId.value = id;

        }
      }
    } catch (error) {
      console.error('❌ 加载读者ID失败:', error);
    }
  };

  /**
   * 保存当前读者ID到本地存储
   */
  const saveCurrentReaderId = () => {
    try {
      localStorage.setItem('currentReaderId', currentReaderId.value.toString());

    } catch (error) {
      console.error('❌ 保存读者ID失败:', error);
    }
  };

  /**
   * 加载读者列表
   */
  const loadReaders = async () => {
    try {

      const response = await axios.get<Reader[]>('/api/readers');
      readers.value = response.data;
      loaded.value = true;

      // 如果当前读者ID不在读者列表中，重置为默认读者
      if (!readers.value.some(r => r.id === currentReaderId.value)) {

        currentReaderId.value = 0;
        saveCurrentReaderId();
      }
    } catch (error) {
      console.error('❌ 加载读者列表失败:', error);
      // 加载失败时，使用默认读者
      readers.value = [{
        id: 0,
        username: 'default',
        name: '默认读者',
        active: true
      }];
      loaded.value = true;
    }
  };

  /**
   * 切换当前读者
   */
  const setCurrentReader = (readerId: number) => {

    currentReaderId.value = readerId;
    saveCurrentReaderId();
  };

  /**
   * 初始化Store
   */
  const init = async () => {

    loadCurrentReaderId();
    await loadReaders();

  };

  return {
    // State
    currentReaderId,
    readers,
    loaded,

    // Getters
    currentReader,

    // Actions
    loadReaders,
    setCurrentReader,
    init
  };
});
