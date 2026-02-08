import api from './api';
import { Rating } from '../types';

export const ratingService = {
  // Create or update album rating
  rateAlbum: async (albumId: string, rating: number): Promise<Rating> => {
    const response = await api.post('/ratings', { albumId, rating });
    return response.data.data;
  },

  // Get user's ratings
  getUserRatings: async (userId: string): Promise<Rating[]> => {
    const response = await api.get(`/ratings/user/${userId}`);
    return response.data.data.ratings;
  },

  // Delete rating
  deleteRating: async (ratingId: string): Promise<void> => {
    await api.delete(`/ratings/${ratingId}`);
  },
};