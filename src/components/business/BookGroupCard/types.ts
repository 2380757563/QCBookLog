import { BookGroup } from '@/api/book/types';
import { Book } from '@/api/book/types';

export interface BookGroupCardProps {
  group: BookGroup;
  books: Book[];
  maxThumbnails?: number;
}

export interface BookGroupCardEmits {
  click: [groupId: string];
}
