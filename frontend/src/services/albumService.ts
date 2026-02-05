import api from './api';
import { Album, SearchResult, Rating, Review } from '../types';

export const albumService = {
  // Search albums via Last.fm
  searchAlbums: async (query: string, limit: number = 20): Promise<SearchResult> => {
    const response = await api.get(`/albums/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  },

  // Get album details by Last.fm ID
  getAlbum: async (lastFmId: string): Promise<Album> => {
    const response = await api.get(`/albums/${lastFmId}`);
    return response.data.data.album;
  },

  // Get album ratings by Last.fm ID
  getAlbumRatings: async (lastFmId: string): Promise<Rating[]> => {
    const response = await api.get(`/albums/${lastFmId}/ratings`);
    return response.data.data.ratings;
  },

  // Get album reviews by Last.fm ID
  getAlbumReviews: async (lastFmId: string): Promise<Review[]> => {
    const response = await api.get(`/albums/${lastFmId}/reviews`);
    return response.data.data.reviews;
  },
};