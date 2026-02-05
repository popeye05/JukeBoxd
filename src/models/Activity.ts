import { query } from '@/config/database';
import { Activity, ActivityWithDetails, ActivityType, QueryResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class ActivityModel {
  /**
   * Create a new activity
   */
  static async create(
    userId: string,
    type: ActivityType,
    albumId: string,
    data: any
  ): Promise<Activity> {
    // Validate activity type
    if (!['rating', 'review'].includes(type)) {
      throw new Error('Activity type must be either "rating" or "review"');
    }

    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO activities (id, user_id, type, album_id, data) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, user_id, type, album_id, data, created_at`,
      [id, userId, type, albumId, JSON.stringify(data)]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create activity');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Find activity by ID
   */
  static async findById(id: string): Promise<Activity | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, type, album_id, data, created_at FROM activities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Get activities by user ID (for user's own activity history)
   */
  static async findByUser(userId: string, limit: number = 50, offset: number = 0): Promise<Activity[]> {
    const result: QueryResult<any> = await query(
      `SELECT id, user_id, type, album_id, data, created_at 
       FROM activities 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get activities by multiple user IDs (for feed generation)
   */
  static async findByUsers(userIds: string[], limit: number = 50, offset: number = 0): Promise<Activity[]> {
    if (userIds.length === 0) {
      return [];
    }

    // Create placeholders for the IN clause
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const result: QueryResult<any> = await query(
      `SELECT id, user_id, type, album_id, data, created_at 
       FROM activities 
       WHERE user_id IN (${placeholders}) 
       ORDER BY created_at DESC 
       LIMIT $${userIds.length + 1} OFFSET $${userIds.length + 2}`,
      [...userIds, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get activities with full user and album details (for feed display)
   */
  static async findByUsersWithDetails(
    userIds: string[], 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ActivityWithDetails[]> {
    if (userIds.length === 0) {
      return [];
    }

    // Create placeholders for the IN clause
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const result: QueryResult<any> = await query(
      `SELECT 
        a.id, a.user_id, a.type, a.album_id, a.data, a.created_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        al.id as album_id, al.spotify_id, al.name as album_name, al.artist, al.release_date, 
        al.image_url, al.spotify_url, al.created_at as album_created_at, al.updated_at as album_updated_at
       FROM activities a
       JOIN users u ON a.user_id = u.id
       JOIN albums al ON a.album_id = al.id
       WHERE a.user_id IN (${placeholders})
       ORDER BY a.created_at DESC 
       LIMIT $${userIds.length + 1} OFFSET $${userIds.length + 2}`,
      [...userIds, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        createdAt: new Date(row.user_created_at),
        updatedAt: new Date(row.user_updated_at)
      },
      album: {
        id: row.album_id,
        spotifyId: row.spotify_id,
        name: row.album_name,
        artist: row.artist,
        releaseDate: new Date(row.release_date),
        imageUrl: row.image_url,
        spotifyUrl: row.spotify_url,
        createdAt: new Date(row.album_created_at),
        updatedAt: new Date(row.album_updated_at)
      }
    }));
  }

  /**
   * Get user's activities with details (for profile display)
   */
  static async findByUserWithDetails(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ActivityWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        a.id, a.user_id, a.type, a.album_id, a.data, a.created_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        al.id as album_id, al.spotify_id, al.name as album_name, al.artist, al.release_date, 
        al.image_url, al.spotify_url, al.created_at as album_created_at, al.updated_at as album_updated_at
       FROM activities a
       JOIN users u ON a.user_id = u.id
       JOIN albums al ON a.album_id = al.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        createdAt: new Date(row.user_created_at),
        updatedAt: new Date(row.user_updated_at)
      },
      album: {
        id: row.album_id,
        spotifyId: row.spotify_id,
        name: row.album_name,
        artist: row.artist,
        releaseDate: new Date(row.release_date),
        imageUrl: row.image_url,
        spotifyUrl: row.spotify_url,
        createdAt: new Date(row.album_created_at),
        updatedAt: new Date(row.album_updated_at)
      }
    }));
  }

  /**
   * Get recent activities (for general activity feed)
   */
  static async getRecentActivities(limit: number = 50, offset: number = 0): Promise<Activity[]> {
    const result: QueryResult<any> = await query(
      `SELECT id, user_id, type, album_id, data, created_at 
       FROM activities 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get activity count for a user
   */
  static async getActivityCount(userId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM activities WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Delete activity by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM activities WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete activities by user ID (for user cleanup)
   */
  static async deleteByUser(userId: string): Promise<number> {
    const result: QueryResult = await query(
      'DELETE FROM activities WHERE user_id = $1',
      [userId]
    );
    return result.rowCount;
  }

  /**
   * Delete activities by album ID (for album cleanup)
   */
  static async deleteByAlbum(albumId: string): Promise<number> {
    const result: QueryResult = await query(
      'DELETE FROM activities WHERE album_id = $1',
      [albumId]
    );
    return result.rowCount;
  }

  /**
   * Get activities by type
   */
  static async findByType(
    type: ActivityType, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Activity[]> {
    const result: QueryResult<any> = await query(
      `SELECT id, user_id, type, album_id, data, created_at 
       FROM activities 
       WHERE type = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [type, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as ActivityType,
      albumId: row.album_id,
      data: row.data,
      createdAt: new Date(row.created_at)
    }));
  }
}