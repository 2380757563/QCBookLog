import { BookGroup } from '@/services/book/types';
import { Book } from '@/services/book/types';

export interface BookGroupCardProps {
  group: BookGroup;
  books: Book[];
  maxThumbnails?: number;
}

export interface BookGroupCardEmits {
  click: [groupId: string];
}
