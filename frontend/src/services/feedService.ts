import api from './api';
import { Activity } from '../types';

export const feedService = {
  // Get personalized activity feed
  getFeed: async (limit: number = 20, offset: number = 0): Promise<Activity[]> => {
    const response = await api.get(`/feed?limit=${limit}&offset=${offset}`);
    return response.data.data;
  },

  // Get user's public activity
  getUserActivity: async (userId: string, limit: number = 20, offset: number = 0): Promise<Activity[]> => {
    const response = await api.get(`/feed/user/${userId}?limit=${limit}&offset=${offset}`);
    return response.data.data;
  },
};