import api from './api';
import { User } from '../types';

export const socialService = {
  // Follow a user
  followUser: async (userId: string): Promise<void> => {
    await api.post('/social/follow', { userId });
  },

  // Unfollow a user
  unfollowUser: async (userId: string): Promise<void> => {
    await api.delete(`/social/follow/${userId}`);
  },

  // Get user's followers
  getFollowers: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/social/followers/${userId}`);
    return response.data.data;
  },

  // Get users being followed
  getFollowing: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/social/following/${userId}`);
    return response.data.data;
  },
};