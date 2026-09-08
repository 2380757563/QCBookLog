import { defineStore } from 'pinia';
import { ref } from 'vue';
import { reviewService } from '@/api/review';
import type { Review } from '@/api/review/types';

export const useReviewStore = defineStore('review', () => {
  const allReviews = ref<Review[]>([]);
  const loading = ref(false);

  const setReviews = (reviews: Review[]) => {
    allReviews.value = reviews;
  };

  const addReview = (review: Review) => {
    allReviews.value.unshift(review);
  };

  const updateReview = (review: Review) => {
    const index = allReviews.value.findIndex(r => r.id === review.id);
    if (index !== -1) {
      allReviews.value[index] = review;
    }
  };

  const deleteReview = (id: string | number) => {
    allReviews.value = allReviews.value.filter(r => r.id !== id);
  };

  const loadReviews = async () => {
    loading.value = true;
    try {
      const reviews = await reviewService.getAllReviews();
      allReviews.value = reviews;
    } finally {
      loading.value = false;
    }
  };

  return {
    allReviews,
    loading,
    setReviews,
    addReview,
    updateReview,
    deleteReview,
    loadReviews
  };
});
