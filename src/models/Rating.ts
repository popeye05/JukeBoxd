import { query } from '@/config/database';
import { Rating, RatingWithDetails, QueryResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class RatingModel {
  /**
   * Create a new rating
   */
  static async create(userId: string, albumId: string, rating: number): Promise<Rating> {
    // Validate rating is between 1-5
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO ratings (id, user_id, album_id, rating) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, album_id, rating, created_at, updated_at`,
      [id, userId, albumId, rating]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create rating');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Update existing rating or create new one (upsert)
   */
  static async upsert(userId: string, albumId: string, rating: number): Promise<Rating> {
    // Validate rating is between 1-5
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    // Try to update existing rating first
    const updateResult: QueryResult<any> = await query(
      `UPDATE ratings 
       SET rating = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND album_id = $2 
       RETURNING id, user_id, album_id, rating, created_at, updated_at`,
      [userId, albumId, rating]
    );

    if (updateResult.rows.length > 0) {
      const row = updateResult.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        albumId: row.album_id,
        rating: row.rating,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    }

    // If no existing rating, create new one
    return await this.create(userId, albumId, rating);
  }

  /**
   * Find rating by user and album
   */
  static async findByUserAndAlbum(userId: string, albumId: string): Promise<Rating | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, rating, created_at, updated_at FROM ratings WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find rating by ID
   */
  static async findById(id: string): Promise<Rating | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, rating, created_at, updated_at FROM ratings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Get all ratings for an album
   */
  static async findByAlbum(albumId: string): Promise<Rating[]> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, rating, created_at, updated_at FROM ratings WHERE album_id = $1 ORDER BY created_at DESC',
      [albumId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get all ratings by a user
   */
  static async findByUser(userId: string): Promise<Rating[]> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, rating, created_at, updated_at FROM ratings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get ratings for an album with user and album details
   */
  static async findByAlbumWithDetails(albumId: string): Promise<RatingWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        r.id, r.user_id, r.album_id, r.rating, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        a.id as album_id, a.spotify_id, a.name as album_name, a.artist, a.release_date, a.image_url, a.spotify_url, 
        a.created_at as album_created_at, a.updated_at as album_updated_at
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       JOIN albums a ON r.album_id = a.id
       WHERE r.album_id = $1
       ORDER BY r.created_at DESC`,
      [albumId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
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
   * Get ratings by a user with album details
   */
  static async findByUserWithDetails(userId: string): Promise<RatingWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        r.id, r.user_id, r.album_id, r.rating, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        a.id as album_id, a.spotify_id, a.name as album_name, a.artist, a.release_date, a.image_url, a.spotify_url, 
        a.created_at as album_created_at, a.updated_at as album_updated_at
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       JOIN albums a ON r.album_id = a.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
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
   * Calculate average rating for an album
   */
  static async getAverageRating(albumId: string): Promise<number> {
    const result: QueryResult<{ avg: string }> = await query(
      'SELECT AVG(rating)::numeric(3,2) as avg FROM ratings WHERE album_id = $1',
      [albumId]
    );

    if (result.rows.length === 0 || !result.rows[0] || result.rows[0].avg === null) {
      return 0;
    }

    return parseFloat(result.rows[0].avg);
  }

  /**
   * Get rating count for an album
   */
  static async getRatingCount(albumId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM ratings WHERE album_id = $1',
      [albumId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Get rating count for a user
   */
  static async getRatingCountByUser(userId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM ratings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Delete rating by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM ratings WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete rating by user and album
   */
  static async deleteByUserAndAlbum(userId: string, albumId: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM ratings WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );
    return result.rowCount > 0;
  }
}