/**
 * useDoulistUiSettings - 书单界面设置 Composable
 *
 * 集中管理书单页面的交互设置，持久化到 localStorage，
 * 与 useBookViewSettings 相同的单例共享模式。
 *
 * 设置项：
 *   - cardClickAction     : 'douban' | 'library'  书单卡片点击跳转目标（默认豆瓣页面）
 *   - editLibraryStatus   : boolean               是否可编辑在库书籍的阅读状态（默认不可）
 *   - swipeGesture        : boolean               右滑划掉此列 / 左滑加入书架（默认开启）
 */

import { ref } from 'vue';

export type DoulistCardClickAction = 'douban' | 'library';

const KEY_ACTION = 'doulistCardClickAction';
const KEY_EDIT_STATUS = 'doulistEditLibraryStatus';
const KEY_SWIPE = 'doulistSwipeGesture';

const DEFAULT_ACTION: DoulistCardClickAction = 'douban';
const DEFAULT_EDIT_STATUS = false;
const DEFAULT_SWIPE = true;

function isAction(v: unknown): v is DoulistCardClickAction {
  return v === 'douban' || v === 'library';
}

// 单例 ref（跨组件共享）
const cardClickAction = ref<DoulistCardClickAction>(DEFAULT_ACTION);
const editLibraryStatus = ref<boolean>(DEFAULT_EDIT_STATUS);
const swipeGesture = ref<boolean>(DEFAULT_SWIPE);
let initialized = false;

function loadFromStorage() {
  try {
    const a = localStorage.getItem(KEY_ACTION);
    if (isAction(a)) cardClickAction.value = a;

    const e = localStorage.getItem(KEY_EDIT_STATUS);
    if (e === '1') editLibraryStatus.value = true;
    else if (e === '0') editLibraryStatus.value = false;

    const s = localStorage.getItem(KEY_SWIPE);
    if (s === '1') swipeGesture.value = true;
    else if (s === '0') swipeGesture.value = false;
  } catch (err) {
    console.warn('[useDoulistUiSettings] 读取 localStorage 失败:', err);
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn('[useDoulistUiSettings] 写入 localStorage 失败:', err);
  }
}

export function useDoulistUiSettings() {
  if (!initialized) {
    loadFromStorage();
    initialized = true;
  }

  function setCardClickAction(action: DoulistCardClickAction) {
    cardClickAction.value = action;
    persist(KEY_ACTION, action);
  }

  function setEditLibraryStatus(enabled: boolean) {
    editLibraryStatus.value = enabled;
    persist(KEY_EDIT_STATUS, enabled ? '1' : '0');
  }

  function setSwipeGesture(enabled: boolean) {
    swipeGesture.value = enabled;
    persist(KEY_SWIPE, enabled ? '1' : '0');
  }

  function resetToDefaults() {
    setCardClickAction(DEFAULT_ACTION);
    setEditLibraryStatus(DEFAULT_EDIT_STATUS);
    setSwipeGesture(DEFAULT_SWIPE);
  }

  return {
    cardClickAction,
    editLibraryStatus,
    swipeGesture,
    setCardClickAction,
    setEditLibraryStatus,
    setSwipeGesture,
    resetToDefaults
  };
}
