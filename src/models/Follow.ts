import { query } from '@/config/database';
import { Follow, FollowWithDetails, UserProfile, QueryResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class FollowModel {
  /**
   * Create a new follow relationship
   */
  static async create(followerId: string, followeeId: string): Promise<Follow> {
    // Prevent self-following
    if (followerId === followeeId) {
      throw new Error('Users cannot follow themselves');
    }

    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO follows (id, follower_id, followee_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, follower_id, followee_id, created_at`,
      [id, followerId, followeeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create follow relationship');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Remove a follow relationship
   */
  static async remove(followerId: string, followeeId: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId]
    );
    return result.rowCount > 0;
  }

  /**
   * Check if a user is following another user
   */
  static async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return false;
    }

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get all followers of a user
   */
  static async getFollowers(userId: string): Promise<UserProfile[]> {
    const result: QueryResult<any> = await query(
      `SELECT u.id, u.username, u.email, u.created_at, u.updated_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.followee_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get all users that a user is following
   */
  static async getFollowing(userId: string): Promise<UserProfile[]> {
    const result: QueryResult<any> = await query(
      `SELECT u.id, u.username, u.email, u.created_at, u.updated_at
       FROM follows f
       JOIN users u ON f.followee_id = u.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get follower count for a user
   */
  static async getFollowerCount(userId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM follows WHERE followee_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Get following count for a user
   */
  static async getFollowingCount(userId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Get follow relationships with full user details
   */
  static async getFollowersWithDetails(userId: string): Promise<FollowWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        f.id, f.follower_id, f.followee_id, f.created_at,
        follower.id as follower_id, follower.username as follower_username, 
        follower.email as follower_email, follower.created_at as follower_created_at, 
        follower.updated_at as follower_updated_at,
        followee.id as followee_id, followee.username as followee_username, 
        followee.email as followee_email, followee.created_at as followee_created_at, 
        followee.updated_at as followee_updated_at
       FROM follows f
       JOIN users follower ON f.follower_id = follower.id
       JOIN users followee ON f.followee_id = followee.id
       WHERE f.followee_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: new Date(row.created_at),
      follower: {
        id: row.follower_id,
        username: row.follower_username,
        email: row.follower_email,
        createdAt: new Date(row.follower_created_at),
        updatedAt: new Date(row.follower_updated_at)
      },
      followee: {
        id: row.followee_id,
        username: row.followee_username,
        email: row.followee_email,
        createdAt: new Date(row.followee_created_at),
        updatedAt: new Date(row.followee_updated_at)
      }
    }));
  }

  /**
   * Get following relationships with full user details
   */
  static async getFollowingWithDetails(userId: string): Promise<FollowWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        f.id, f.follower_id, f.followee_id, f.created_at,
        follower.id as follower_id, follower.username as follower_username, 
        follower.email as follower_email, follower.created_at as follower_created_at, 
        follower.updated_at as follower_updated_at,
        followee.id as followee_id, followee.username as followee_username, 
        followee.email as followee_email, followee.created_at as followee_created_at, 
        followee.updated_at as followee_updated_at
       FROM follows f
       JOIN users follower ON f.follower_id = follower.id
       JOIN users followee ON f.followee_id = followee.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: new Date(row.created_at),
      follower: {
        id: row.follower_id,
        username: row.follower_username,
        email: row.follower_email,
        createdAt: new Date(row.follower_created_at),
        updatedAt: new Date(row.follower_updated_at)
      },
      followee: {
        id: row.followee_id,
        username: row.followee_username,
        email: row.followee_email,
        createdAt: new Date(row.followee_created_at),
        updatedAt: new Date(row.followee_updated_at)
      }
    }));
  }

  /**
   * Find follow relationship by ID
   */
  static async findById(id: string): Promise<Follow | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, follower_id, followee_id, created_at FROM follows WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Find follow relationship by follower and followee
   */
  static async findByUsers(followerId: string, followeeId: string): Promise<Follow | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, follower_id, followee_id, created_at FROM follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Delete follow relationship by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM follows WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  static async getMutualFollows(userId: string): Promise<UserProfile[]> {
    const result: QueryResult<any> = await query(
      `SELECT DISTINCT u.id, u.username, u.email, u.created_at, u.updated_at
       FROM follows f1
       JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
       JOIN users u ON f1.followee_id = u.id
       WHERE f1.follower_id = $1`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
}