import { ActivityModel, FollowModel, RatingModel, ReviewModel } from '@/models';
import { Activity, ActivityWithDetails, ActivityType } from '@/types';

export class ActivityFeedService {
  /**
   * Get personalized activity feed for a user using fanout-on-read pattern
   * This fetches activities from all users that the current user follows
   */
  static async getFeed(userId: string, limit: number = 50, offset: number = 0): Promise<ActivityWithDetails[]> {
    // Get list of users that the current user follows
    const following = await FollowModel.getFollowing(userId);
    
    if (following.length === 0) {
      // If user follows no one, return empty feed
      return [];
    }

    // Extract user IDs from following list
    const followingUserIds = following.map(user => user.id);

    // Get activities from followed users with full details
    return await ActivityModel.findByUsersWithDetails(followingUserIds, limit, offset);
  }

  /**
   * Get public activity feed for a specific user (for profile viewing)
   */
  static async getUserFeed(userId: string, limit: number = 50, offset: number = 0): Promise<ActivityWithDetails[]> {
    return await ActivityModel.findByUserWithDetails(userId, limit, offset);
  }

  /**
   * Create activity when user rates an album
   */
  static async createRatingActivity(userId: string, albumId: string, rating: number): Promise<Activity> {
    const activityData = {
      rating: rating,
      timestamp: new Date().toISOString()
    };

    return await ActivityModel.create(userId, 'rating', albumId, activityData);
  }

  /**
   * Create activity when user reviews an album
   */
  static async createReviewActivity(userId: string, albumId: string, content: string): Promise<Activity> {
    const activityData = {
      content: content,
      timestamp: new Date().toISOString()
    };

    return await ActivityModel.create(userId, 'review', albumId, activityData);
  }

  /**
   * Get recent activities from all users (for discovery/public feed)
   */
  static async getRecentActivities(limit: number = 50, offset: number = 0): Promise<Activity[]> {
    return await ActivityModel.getRecentActivities(limit, offset);
  }

  /**
   * Get activities by type (ratings or reviews)
   */
  static async getActivitiesByType(
    type: ActivityType, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Activity[]> {
    return await ActivityModel.findByType(type, limit, offset);
  }

  /**
   * Get activity count for a user
   */
  static async getUserActivityCount(userId: string): Promise<number> {
    return await ActivityModel.getActivityCount(userId);
  }

  /**
   * Check if user has any activities (for empty state handling)
   */
  static async hasUserActivities(userId: string): Promise<boolean> {
    const count = await this.getUserActivityCount(userId);
    return count > 0;
  }

  /**
   * Get feed with pagination metadata
   */
  static async getFeedWithPagination(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{
    activities: ActivityWithDetails[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
      total: number;
    };
  }> {
    const offset = (page - 1) * limit;
    
    // Get one extra item to check if there are more pages
    const activities = await this.getFeed(userId, limit + 1, offset);
    
    const hasMore = activities.length > limit;
    const paginatedActivities = hasMore ? activities.slice(0, limit) : activities;

    // Get total count of followed users for rough estimation
    const following = await FollowModel.getFollowing(userId);
    const followingUserIds = following.map(user => user.id);
    
    // This is an approximation - in a real system you might cache this or use a different approach
    let totalEstimate = 0;
    if (followingUserIds.length > 0) {
      // Get rough estimate by checking first followed user's activity count
      // In production, you might want to cache this or use a more sophisticated approach
      totalEstimate = Math.max(activities.length, limit);
    }

    return {
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        hasMore,
        total: totalEstimate
      }
    };
  }

  /**
   * Get user's own activities with pagination
   */
  static async getUserActivitiesWithPagination(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{
    activities: ActivityWithDetails[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
      total: number;
    };
  }> {
    const offset = (page - 1) * limit;
    
    // Get one extra item to check if there are more pages
    const activities = await this.getUserFeed(userId, limit + 1, offset);
    
    const hasMore = activities.length > limit;
    const paginatedActivities = hasMore ? activities.slice(0, limit) : activities;

    // Get total count for this user
    const total = await this.getUserActivityCount(userId);

    return {
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        hasMore,
        total
      }
    };
  }

  /**
   * Helper method to automatically create activity when rating is created/updated
   * This should be called from the rating service
   */
  static async handleRatingUpdate(userId: string, albumId: string, rating: number, isNew: boolean): Promise<void> {
    if (isNew) {
      // Only create activity for new ratings, not updates
      await this.createRatingActivity(userId, albumId, rating);
    }
    // For updates, we might want to update the existing activity or create a new one
    // For now, we'll only create activities for new ratings to avoid spam
  }

  /**
   * Helper method to automatically create activity when review is created/updated
   * This should be called from the review service
   */
  static async handleReviewUpdate(userId: string, albumId: string, content: string, isNew: boolean): Promise<void> {
    if (isNew) {
      // Only create activity for new reviews, not updates
      await this.createReviewActivity(userId, albumId, content);
    }
    // For updates, we might want to update the existing activity or create a new one
    // For now, we'll only create activities for new reviews to avoid spam
  }

  /**
   * Clean up activities when user is deleted
   */
  static async cleanupUserActivities(userId: string): Promise<number> {
    return await ActivityModel.deleteByUser(userId);
  }

  /**
   * Clean up activities when album is deleted
   */
  static async cleanupAlbumActivities(albumId: string): Promise<number> {
    return await ActivityModel.deleteByAlbum(albumId);
  }
}