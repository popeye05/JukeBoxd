import api from './api';
import { User, UserProfile, UserProfileWithStats, Follow, ApiResponse, UserSearchResponse } from '../types';

export interface SocialStats {
  followersCount: number;
  followingCount: number;
  ratingsCount: number;
  reviewsCount: number;
}

export interface FollowResponse {
  follow: Follow;
  message: string;
}

export interface UnfollowResponse {
  success: boolean;
  message: string;
}

export interface FollowersResponse {
  followers: User[];
  count: number;
}

export interface FollowingResponse {
  following: User[];
  count: number;
}

export interface IsFollowingResponse {
  isFollowing: boolean;
}

export interface UserSuggestionsResponse {
  suggestions: User[];
  count: number;
}

class SocialApi {
  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post<ApiResponse<FollowResponse>>('/social/follow', {
      userId
    });
    return response.data.data;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<UnfollowResponse> {
    const response = await api.delete<ApiResponse<UnfollowResponse>>(`/social/follow/${userId}`);
    return response.data.data;
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: string): Promise<FollowersResponse> {
    const response = await api.get<ApiResponse<FollowersResponse>>(`/social/followers/${userId}`);
    return response.data.data;
  }

  /**
   * Get users being followed by a user
   */
  async getFollowing(userId: string): Promise<FollowingResponse> {
    const response = await api.get<ApiResponse<FollowingResponse>>(`/social/following/${userId}`);
    return response.data.data;
  }

  /**
   * Get user profile with social stats
   */
  async getUserProfile(userId: string): Promise<UserProfileWithStats> {
    const response = await api.get<ApiResponse<{ profile: UserProfileWithStats }>>(`/social/profile/${userId}`);
    return response.data.data.profile;
  }

  /**
   * Check if current user is following another user
   */
  async isFollowing(userId: string): Promise<boolean> {
    const response = await api.get<ApiResponse<IsFollowingResponse>>(`/social/is-following/${userId}`);
    return response.data.data.isFollowing;
  }

  /**
   * Get user suggestions for discovery
   */
  async getUserSuggestions(limit: number = 10): Promise<User[]> {
    const response = await api.get<ApiResponse<UserSuggestionsResponse>>(`/social/suggestions?limit=${limit}`);
    return response.data.data.suggestions;
  }

  /**
   * Search for users by query
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const response = await api.get<ApiResponse<UserSearchResponse>>(`/social/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data.users;
  }
}

export const socialApi = new SocialApi();
export default socialApi;