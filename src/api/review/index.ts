import { reviewApi } from '@/api/apiClient';
import { Review, ReviewService } from './types';

class ReviewServiceImpl implements ReviewService {
  async getAllReviews(): Promise<Review[]> {
    return reviewApi.getAll();
  }
  async getReviewById(id: string | number): Promise<Review | undefined> {
    return reviewApi.getById(id);
  }
  async getReviewsByBookId(bookId: number): Promise<Review[]> {
    return reviewApi.getByBookId(bookId);
  }
  async createReview(review: Omit<Review, 'id' | 'createTime' | 'updateTime'>): Promise<Review> {
    return reviewApi.create(review);
  }
  async updateReview(review: Review): Promise<Review> {
    return reviewApi.update(String(review.id), review);
  }
  async deleteReview(id: string | number): Promise<void> {
    await reviewApi.delete(id);
  }
}

export const reviewService: ReviewService = new ReviewServiceImpl();
