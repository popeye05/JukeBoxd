import api from './api';
import { Activity, ApiResponse } from '../types';

export interface FeedResponse {
  activities: Activity[];
  pagination: {
    page?: number;
    limit: number;
    offset?: number;
    hasMore: boolean;
    total?: number;
  };
}

export interface UserFeedResponse extends FeedResponse {
  userId: string;
}

export interface FeedStatsResponse {
  userId: string;
  activityCount: number;
  hasActivities: boolean;
}

class FeedApi {
  /**
   * Get personalized activity feed for authenticated user
   */
  async getFeed(params?: {
    limit?: number;
    offset?: number;
    page?: number;
  }): Promise<FeedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await api.get<ApiResponse<FeedResponse>>(
      `/feed${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data;
  }

  /**
   * Get public activity feed for a specific user
   */
  async getUserFeed(userId: string, params?: {
    limit?: number;
    offset?: number;
    page?: number;
  }): Promise<UserFeedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await api.get<ApiResponse<UserFeedResponse>>(
      `/feed/user/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data;
  }

  /**
   * Get recent activities from all users (public discovery feed)
   */
  async getRecentActivities(params?: {
    limit?: number;
    offset?: number;
    type?: 'rating' | 'review';
  }): Promise<FeedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.type) queryParams.append('type', params.type);

    const response = await api.get<ApiResponse<FeedResponse>>(
      `/feed/recent${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data;
  }

  /**
   * Get activity statistics for a user
   */
  async getFeedStats(userId: string): Promise<FeedStatsResponse> {
    const response = await api.get<ApiResponse<FeedStatsResponse>>(`/feed/stats/${userId}`);
    return response.data.data;
  }
}

export const feedApi = new FeedApi();
export default feedApi;