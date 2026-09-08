/**
 * 统计页设置 Composable
 *
 * 职责:
 * - 设置菜单开关状态 (openSettingsMenu)
 * - 卡片透明度 (cardOpacity) - 0-100，影响 StackedSettingsPanel 浮层透明
 * - 词云显示选项 (wordCloudTopN / wordCloudFontSize)
 * - 外部点击关闭菜单的全局监听
 *
 * 依赖:
 * - 无（独立 composable）
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { ref } from 'vue';

export type WordCloudFontSize = 'small' | 'medium' | 'large';

/** 词云 Top N 选项 */
export const WORDCLOUD_COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const WORDCLOUD_TOP_N_DEFAULT = 30;
export const WORDCLOUD_TOP_N = WORDCLOUD_TOP_N_DEFAULT; // 模板里用到的常量

/** 词云字号预设选项 */
export const WORDCLOUD_FONT_OPTIONS: ReadonlyArray<{ value: WordCloudFontSize; label: string }> = [
  { value: 'small',  label: '紧凑' },
  { value: 'medium', label: '标准' },
  { value: 'large',  label: '醒目' },
];

/** 不同字号范围对应的最大/最小 px */
export const WORDCLOUD_FONT_PRESETS: Record<WordCloudFontSize, { min: number; max: number }> = {
  small:  { min: 12, max: 28 },
  medium: { min: 14, max: 40 },
  large:  { min: 16, max: 56 },
};

export function useStatsSettings() {
  // 当前打开的设置菜单 id（null=全部关闭）
  const openSettingsMenu = ref<string | null>(null);

  // 图表卡片透明度（0-100，默认 100 不透明）
  // 用户通过设置面板中的滑块调整，使卡片下方的内容根据透明度显现
  const cardOpacity = ref<number>(100);
  function setCardOpacity(v: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    cardOpacity.value = Math.max(0, Math.min(100, Math.round(n)));
  }

  // 词云图：显示前 N 个标签（按添加频次）
  const wordCloudTopN = ref<number>(WORDCLOUD_TOP_N_DEFAULT);
  // 字号预设
  const wordCloudFontSize = ref<WordCloudFontSize>('medium');

  /**
   * 切换某个 id 的设置菜单（互斥：点开新的会自动关闭旧的）
   */
  function toggleSettingsMenu(id: string) {
    openSettingsMenu.value = openSettingsMenu.value === id ? null : id;
  }

  /**
   * StackedSettingsPanel 内部关闭时同步状态
   * - StackedSettingsPanel 通过 update:modelValue 上报；这里只负责同步内部状态
   */
  function onSettingsCardToggle(id: string, v: boolean) {
    if (!v && openSettingsMenu.value === id) {
      openSettingsMenu.value = null;
    }
  }

  /** 外部点击关闭菜单 */
  function handleOutsideClick() {
    openSettingsMenu.value = null;
  }

  /** 主动关闭菜单（供 useTimeRange 在切换非 custom 时回调） */
  function closeMenu() {
    openSettingsMenu.value = null;
  }

  return {
    // 菜单状态
    openSettingsMenu,
    toggleSettingsMenu,
    onSettingsCardToggle,
    handleOutsideClick,
    closeMenu,
    // 卡片透明度
    cardOpacity,
    setCardOpacity,
    // 词云选项
    wordCloudTopN,
    wordCloudFontSize,
  };
}
