/**
 * 书籍图片处理 Composable
 *
 * 职责:
 * - 加载成功处理（添加 .loaded class）
 * - 加载失败处理（生成占位图）
 * - 封面 URL 解析
 */
import type { Book } from '@/api/book/types';
import { generatePlaceholderImage } from '@/utils/imageUtils';

export function useBookImage() {
  const handleImgLoad = (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    imgElement.classList.add('loaded');
  };

  const handleImgError = async (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    console.error('图片加载失败:', {
      src: imgElement.src,
      alt: imgElement.alt
    });

    try {
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
  };

  /** 计算封面 URL：优先 coverUrl，否则尝试 calibre 路径 */
  const getBookCoverUrl = (book: Book): string | undefined => {
    if (book.coverUrl) return book.coverUrl;
    if (book.path) {
      return `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
    }
    return undefined;
  };

  return { handleImgLoad, handleImgError, getBookCoverUrl };
}
