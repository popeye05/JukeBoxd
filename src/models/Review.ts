import { query } from '@/config/database';
import { Review, ReviewWithDetails, QueryResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class ReviewModel {
  /**
   * Validate review content
   */
  private static validateContent(content: string): void {
    if (content === null || content === undefined || typeof content !== 'string') {
      throw new Error('Review content is required');
    }
    
    // Check if content is only whitespace
    if (content.trim().length === 0) {
      throw new Error('Review content cannot be empty or contain only whitespace');
    }

    // Optional: Add maximum length validation
    if (content.length > 5000) {
      throw new Error('Review content cannot exceed 5000 characters');
    }
  }

  /**
   * Create a new review
   */
  static async create(userId: string, albumId: string, content: string): Promise<Review> {
    this.validateContent(content);

    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO reviews (id, user_id, album_id, content) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, album_id, content, created_at, updated_at`,
      [id, userId, albumId, content.trim()]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create review');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Update existing review or create new one (upsert)
   */
  static async upsert(userId: string, albumId: string, content: string): Promise<Review> {
    this.validateContent(content);

    // Try to update existing review first
    const updateResult: QueryResult<any> = await query(
      `UPDATE reviews 
       SET content = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND album_id = $2 
       RETURNING id, user_id, album_id, content, created_at, updated_at`,
      [userId, albumId, content.trim()]
    );

    if (updateResult.rows.length > 0) {
      const row = updateResult.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        albumId: row.album_id,
        content: row.content,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    }

    // If no existing review, create new one
    return await this.create(userId, albumId, content);
  }

  /**
   * Find review by user and album
   */
  static async findByUserAndAlbum(userId: string, albumId: string): Promise<Review | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, content, created_at, updated_at FROM reviews WHERE user_id = $1 AND album_id = $2',
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
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find review by ID
   */
  static async findById(id: string): Promise<Review | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, content, created_at, updated_at FROM reviews WHERE id = $1',
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
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Get all reviews for an album (chronological order)
   */
  static async findByAlbum(albumId: string): Promise<Review[]> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, content, created_at, updated_at FROM reviews WHERE album_id = $1 ORDER BY created_at ASC',
      [albumId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get all reviews by a user
   */
  static async findByUser(userId: string): Promise<Review[]> {
    const result: QueryResult<any> = await query(
      'SELECT id, user_id, album_id, content, created_at, updated_at FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get reviews for an album with user and album details (chronological order)
   */
  static async findByAlbumWithDetails(albumId: string): Promise<ReviewWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        r.id, r.user_id, r.album_id, r.content, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        a.id as album_id, a.spotify_id, a.name as album_name, a.artist, a.release_date, a.image_url, a.spotify_url, 
        a.created_at as album_created_at, a.updated_at as album_updated_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN albums a ON r.album_id = a.id
       WHERE r.album_id = $1
       ORDER BY r.created_at ASC`,
      [albumId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      content: row.content,
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
   * Get reviews by a user with album details
   */
  static async findByUserWithDetails(userId: string): Promise<ReviewWithDetails[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        r.id, r.user_id, r.album_id, r.content, r.created_at, r.updated_at,
        u.id as user_id, u.username, u.email, u.created_at as user_created_at, u.updated_at as user_updated_at,
        a.id as album_id, a.spotify_id, a.name as album_name, a.artist, a.release_date, a.image_url, a.spotify_url, 
        a.created_at as album_created_at, a.updated_at as album_updated_at
       FROM reviews r
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
      content: row.content,
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
   * Update review content
   */
  static async updateContent(id: string, content: string): Promise<Review | null> {
    this.validateContent(content);

    const result: QueryResult<any> = await query(
      `UPDATE reviews 
       SET content = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, user_id, album_id, content, created_at, updated_at`,
      [id, content.trim()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Get review count for an album
   */
  static async getReviewCount(albumId: string): Promise<number> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM reviews WHERE album_id = $1',
      [albumId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0;
    }

    return parseInt(result.rows[0].count);
  }

  /**
   * Delete review by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM reviews WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete review by user and album
   */
  static async deleteByUserAndAlbum(userId: string, albumId: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM reviews WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );
    return result.rowCount > 0;
  }

  /**
   * Check if user has reviewed an album
   */
  static async hasUserReviewed(userId: string, albumId: string): Promise<boolean> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return false;
    }

    return parseInt(result.rows[0].count) > 0;
  }
}