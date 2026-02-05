import api from './api';
import { Review } from '../types';

export const reviewService = {
  // Create album review
  createReview: async (albumId: string, content: string): Promise<Review> => {
    const response = await api.post('/reviews', { albumId, content });
    return response.data.data;
  },

  // Update review
  updateReview: async (reviewId: string, content: string): Promise<Review> => {
    const response = await api.put(`/reviews/${reviewId}`, { content });
    return response.data.data;
  },

  // Delete review
  deleteReview: async (reviewId: string): Promise<void> => {
    await api.delete(`/reviews/${reviewId}`);
  },

  // Get user's reviews
  getUserReviews: async (userId: string): Promise<Review[]> => {
    const response = await api.get(`/reviews/user/${userId}`);
    return response.data.data;
  },
};