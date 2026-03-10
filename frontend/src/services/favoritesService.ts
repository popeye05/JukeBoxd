import api from './api';
import { Album } from '../types';

export interface FavoriteAlbum {
  id: string;
  userId: string;
  albumId: string;
  rank: number;
  createdAt: string;
  updatedAt: string;
  album?: Album;
}

export const favoritesService = {
  /**
   * Get user's favorite albums
   */
  getUserFavorites: async (userId: string): Promise<FavoriteAlbum[]> => {
    const response = await api.get(`/favorites/${userId}`);
    return response.data.data.favorites;
  },

  /**
   * Add album to favorites
   */
  addFavorite: async (albumId: string, rank?: number): Promise<FavoriteAlbum> => {
    const response = await api.post('/favorites', { albumId, rank });
    return response.data.data.favorite;
  },

  /**
   * Remove album from favorites
   */
  removeFavorite: async (albumId: string): Promise<void> => {
    await api.delete(`/favorites/${albumId}`);
  },

  /**
   * Reorder favorites
   */
  reorderFavorites: async (updates: { albumId: string; rank: number }[]): Promise<void> => {
    await api.put('/favorites/reorder', { updates });
  },
};
