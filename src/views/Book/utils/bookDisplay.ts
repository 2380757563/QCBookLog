/**
 * 书籍显示相关工具函数
 *
 * 职责:
 * - 书籍状态判断 (getBookStatus)
 * - 书籍边框样式 (getBookBorderStyle)
 * - 装帧参数 (getBindingBorderParams/getBinding1/getBinding2)
 * - 类型名称 (getBinding1Name/getBinding2Name)
 * - 封面 URL 与图片加载处理
 *
 * 依赖:
 * - @/services/book/types - Book 类型
 * - @/store/bookBorder - borderStore 装帧边框
 * - @/store/bindingBorder - bindingBorderStore 装帧包边
 * - @/store/bindingBorder/types - getBindingType/getHardcoverTexture 等工具
 * - @/utils/imageUtils - generatePlaceholderImage
 */
import type { Book } from '@/services/book/types';
import type { BookStatus } from '@/store/bookBorder/types';
import type { Binding1Type, Binding2Type, BindingBorderParams } from '@/store/bindingBorder/types';
import { useBookBorderStore } from '@/store/bookBorder';
import { useBindingBorderStore } from '@/store/bindingBorder';
import {
  getBindingType,
  getHardcoverTexture,
  shouldShowOilEdge,
  getSpecialPattern
} from '@/store/bindingBorder/types';

/** 1. 判断书籍状态（用于边框样式） */
export function getBookStatus(book: Book): BookStatus {
  if (book.favorite === 1) return 'favorite';
  if (book.wants === 1) return 'pending';
  return 'normal';
}

/** 2. 构造书籍卡片边框样式（由状态决定） */
export function getBookBorderStyle(book: Book): Record<string, string> {
  const borderStore = useBookBorderStore();
  const status = getBookStatus(book);
  const params = borderStore.getBorderParams(status);
  const style: Record<string, string> = {
    borderRadius: `${params.borderRadius}px`
  };

  if (params.glow.enabled) {
    style.boxShadow = `0 0 ${params.glow.spread}px ${params.glow.color}`;
  }

  switch (params.type) {
    case 'normal-1':
    case 'normal-2':
    case 'normal-3':
    case 'normal-4':
    case 'normal-5':
    case 'pending-2':
    case 'favorite-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      style.boxSizing = 'border-box';
      break;
    case 'pending-1':
      style.border = `${params.lineWidth}px dashed ${params.color}`;
      style.boxSizing = 'border-box';
      break;
    case 'pending-3':
    case 'pending-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      style.boxSizing = 'border-box';
      break;
    case 'pending-5':
    case 'favorite-2':
    case 'favorite-5':
      if ('gradientStartColor' in params && 'gradientEndColor' in params) {
        style.border = `${params.lineWidth}px solid transparent`;
        style.backgroundImage = `linear-gradient(#f5f5f5, #f5f5f5), linear-gradient(135deg, ${params.gradientStartColor}, ${params.gradientEndColor})`;
        style.backgroundOrigin = 'border-box';
        style.backgroundClip = 'padding-box, border-box';
        style.boxSizing = 'border-box';
      }
      break;
    case 'favorite-1': {
      const gap = 'doubleLineGap' in params ? params.doubleLineGap : 4;
      style.border = `${params.lineWidth}px solid ${params.color}`;
      const innerShadow = `inset 0 0 0 ${gap}px #f5f5f5, inset 0 0 0 ${gap + params.lineWidth}px ${params.color}`;
      if (params.glow.enabled) {
        style.boxShadow = `${innerShadow}, 0 0 ${params.glow.spread}px ${params.glow.color}`;
      } else {
        style.boxShadow = innerShadow;
      }
      style.boxSizing = 'border-box';
      break;
    }
    case 'favorite-3':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      style.boxSizing = 'border-box';
      break;
  }

  return style;
}

/** 3. 构造书籍装帧包边参数（右下角） */
export function getBindingBorderParams(book: Book): BindingBorderParams {
  const bindingBorderStore = useBindingBorderStore();
  const binding1 = (book.binding1 ?? 1) as Binding1Type;
  const binding2 = (book.binding2 ?? 0) as Binding2Type;
  const type = getBindingType(binding1);
  const settings = bindingBorderStore.settings;

  switch (type) {
    case 'ebook':
      return { ...settings.ebook };
    case 'paperback':
      return { ...settings.paperback };
    case 'hardcover': {
      const texture = getHardcoverTexture(binding2);
      const oilEdge = shouldShowOilEdge(binding2);
      return {
        ...settings.hardcover,
        texture,
        oilEdgeEnabled: oilEdge
      };
    }
    case 'special': {
      const pattern = getSpecialPattern(binding2);
      return {
        ...settings.special,
        texture: pattern
      };
    }
    default:
      return settings.paperback;
  }
}

/** 4. 获取书籍载体类型 */
export function getBinding1(book: Book): Binding1Type {
  const val = book.binding1;
  if (val === undefined || val === null) return 1;
  return val as Binding1Type;
}

/** 5. 获取书籍装帧类型 */
export function getBinding2(book: Book): Binding2Type {
  const val = book.binding2;
  if (val === undefined || val === null) return 0;
  return val as Binding2Type;
}

/** 6. 载体类型名称映射 */
export function getBinding1Name(value: number): string {
  const map: Record<number, string> = {
    0: '电子书',
    1: '纸质书',
    2: '有声书',
    3: '其他'
  };
  return map[value] || '未知';
}

/** 7. 装帧类型名称映射 */
export function getBinding2Name(value: number): string {
  const map: Record<number, string> = {
    0: '无装帧',
    1: '无线胶装',
    2: '骑马钉装订',
    3: '活页装订',
    4: '锁线胶装',
    5: '硬壳精装（圆脊）',
    6: '硬壳精装（方脊）',
    7: '布面精装',
    8: 'PU皮面精装',
    9: '真皮精装（头层牛皮）',
    10: '真皮精装（羊皮）',
    11: '仿皮（人造革）精装',
    12: '线装',
    13: '经折装'
  };
  return map[value] || '未知';
}

/** 8. 获取书籍封面 URL */
export function getBookCoverUrl(book: Book): string | undefined {
  if (book.coverUrl) return book.coverUrl;
  // 始终尝试根据 path 加载封面，不依赖 has_cover 字段
  if (book.path) {
    return `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
  }
  return undefined;
}

/** 9. 图片加载成功处理 */
export function handleImgLoad(event: Event): void {
  const imgElement = event.target as HTMLImageElement;
  imgElement.classList.add('loaded');
}

/** 10. 图片加载错误处理 - 降级为本地占位图 */
export async function handleImgError(event: Event): Promise<void> {
  const imgElement = event.target as HTMLImageElement;
  console.error('图片加载失败:', {
    src: imgElement.src,
    alt: imgElement.alt,
    event,
    errorMessage: event instanceof Error ? event.message : 'Unknown error'
  });

  try {
    // 动态导入以减小首屏体积
    const { generatePlaceholderImage } = await import('@/utils/imageUtils');
    const placeholderUrl = await generatePlaceholderImage(120, 180);
    imgElement.src = placeholderUrl;
    imgElement.style.display = 'block';

    const placeholderElement = imgElement.nextElementSibling as HTMLElement;
    if (placeholderElement && placeholderElement.classList.contains('cover-placeholder')) {
      placeholderElement.style.display = 'none';
    }
  } catch (error) {
    console.error('生成占位图片失败:', error);
    imgElement.style.display = 'none';
    const placeholder = imgElement.nextElementSibling as HTMLElement;
    if (placeholder && placeholder.classList.contains('cover-placeholder')) {
      placeholder.style.display = 'flex';
    }
  }
}
