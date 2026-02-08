import { FollowModel } from '@/models/Follow';
import { UserModel } from '@/models/User';
import { RatingModel } from '@/models/Rating';
import { ReviewModel } from '@/models/Review';
import { DataPersistenceService } from './DataPersistenceService';
import { Follow, UserProfile } from '@/types';

export class SocialService {
  /**
   * Follow a user
   */
  static async followUser(followerId: string, followeeId: string): Promise<Follow> {
    // Validate that both users exist
    await DataPersistenceService.validateReferentialIntegrity([
      { table: 'follows', column: 'follower_id', referencedTable: 'users', referencedColumn: 'id', value: followerId },
      { table: 'follows', column: 'followee_id', referencedTable: 'users', referencedColumn: 'id', value: followeeId }
    ]);

    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Check if already following
      const existingFollow = await FollowModel.isFollowing(followerId, followeeId);
      if (existingFollow) {
        throw new Error('User is already following this user');
      }

      // Create the follow relationship
      return await FollowModel.create(followerId, followeeId);
    },
      // Validation query to ensure the follow was persisted
      'SELECT id FROM follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId]);
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(followerId: string, followeeId: string): Promise<boolean> {
    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Check if the follow relationship exists
      const isFollowing = await FollowModel.isFollowing(followerId, followeeId);
      if (!isFollowing) {
        throw new Error('User is not following this user');
      }

      // Remove the follow relationship
      return await FollowModel.remove(followerId, followeeId);
    });
  }

  /**
   * Get followers of a user
   */
  static async getFollowers(userId: string): Promise<UserProfile[]> {
    // Validate that user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await FollowModel.getFollowers(userId);
  }

  /**
   * Get users that a user is following
   */
  static async getFollowing(userId: string): Promise<UserProfile[]> {
    // Validate that user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await FollowModel.getFollowing(userId);
  }

  /**
   * Check if one user is following another
   */
  static async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    return await FollowModel.isFollowing(followerId, followeeId);
  }

  /**
   * Get follower count for a user
   */
  static async getFollowerCount(userId: string): Promise<number> {
    return await FollowModel.getFollowerCount(userId);
  }

  /**
   * Get following count for a user
   */
  static async getFollowingCount(userId: string): Promise<number> {
    return await FollowModel.getFollowingCount(userId);
  }

  /**
   * Get user profile with social stats
   */
  static async getUserProfileWithStats(userId: string): Promise<UserProfile & {
    followersCount: number;
    followingCount: number;
    ratingsCount: number;
    reviewsCount: number;
  }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const [followerCount, followingCount, ratingsCount, reviewsCount] = await Promise.all([
      this.getFollowerCount(userId),
      this.getFollowingCount(userId),
      RatingModel.getRatingCountByUser(userId),
      ReviewModel.getReviewCountByUser(userId)
    ]);

    return {
      ...UserModel.toProfile(user),
      followersCount: followerCount,
      followingCount,
      ratingsCount,
      reviewsCount
    };
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  static async getMutualFollows(userId: string): Promise<UserProfile[]> {
    // Validate that user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await FollowModel.getMutualFollows(userId);
  }

  /**
   * Get follow suggestions for a user (users not already followed)
   * This is a simple implementation - in a real app you might use more sophisticated algorithms
   */
  static async getFollowSuggestions(userId: string, limit: number = 10): Promise<UserProfile[]> {
    // For now, just return users that the current user is not following
    // In a real implementation, you might consider mutual connections, similar interests, etc.

    const following = await FollowModel.getFollowing(userId);
    const followingIds = following.map(user => user.id);
    followingIds.push(userId); // Don't suggest the user themselves

    // This is a simplified query - in production you'd want more sophisticated suggestions
    const { query } = await import('@/config/database');
    const result = await query(
      `SELECT id, username, email, created_at, updated_at 
       FROM users 
       WHERE id != ALL($1) 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [followingIds, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Batch check if a user is following multiple users
   */
  static async isFollowingMultiple(followerId: string, followeeIds: string[]): Promise<{ [key: string]: boolean }> {
    if (followeeIds.length === 0) {
      return {};
    }

    const { query } = await import('@/config/database');
    const result = await query(
      `SELECT followee_id 
       FROM follows 
       WHERE follower_id = $1 AND followee_id = ANY($2)`,
      [followerId, followeeIds]
    );

    const followingSet = new Set(result.rows.map((row: any) => row.followee_id));

    const followingStatus: { [key: string]: boolean } = {};
    followeeIds.forEach(id => {
      followingStatus[id] = followingSet.has(id);
    });

    return followingStatus;
  }
  /**
   * Search for users by username or display name
   */
  static async searchUsers(queryStr: string, limit: number = 20): Promise<UserProfile[]> {
    if (!queryStr || queryStr.trim().length === 0) {
      return [];
    }

    const { query } = await import('@/config/database');
    const searchPattern = `%${queryStr}%`;

    const result = await query(
      `SELECT id, username, email, bio, avatar_url, display_name, created_at, updated_at 
       FROM users 
       WHERE username ILIKE $1 OR display_name ILIKE $1 
       ORDER BY 
         CASE WHEN username ILIKE $1 THEN 0 ELSE 1 END, 
         username 
       LIMIT $2`,
      [searchPattern, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      displayName: row.display_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      followersCount: 0, // These would need expensive separate queries or joins. 
      followingCount: 0, // For search results list, strictly speaking we might not need them immediately, 
      ratingsCount: 0,   // or we can load them if needed. For now, returning basic profile.
      reviewsCount: 0    // The interface might require them though.
    })) as UserProfile[]; // Cast because we might be missing counts if defined in UserProfile
  }
}