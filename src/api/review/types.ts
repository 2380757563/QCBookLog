export interface Review {
  id: string | number;
  uuid?: string;
  bookId: number;
  bookTitle?: string;
  bookAuthor?: string;
  title: string;
  content: string;
  rating?: number;
  syncStatus?: 'none' | 'pending' | 'synced' | 'failed';
  coverUrl?: string;
  createTime: string;
  updateTime: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewService {
  getAllReviews(): Promise<Review[]>;
  getReviewById(id: string | number): Promise<Review | undefined>;
  getReviewsByBookId(bookId: number): Promise<Review[]>;
  createReview(review: Omit<Review, 'id' | 'createTime' | 'updateTime'>): Promise<Review>;
  updateReview(review: Review): Promise<Review>;
  deleteReview(id: string | number): Promise<void>;
}
