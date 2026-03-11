import { query } from '@/config/database';
import { QueryResult } from 'pg';

export interface ReviewLike {
  id: string;
  reviewId: string;
  userId: string;
  createdAt: Date;
}

export class ReviewLikeModel {
  /**
   * Add a like to a review
   */
  static async create(reviewId: string, userId: string): Promise<ReviewLike> {
    const result: QueryResult<any> = await query(
      `INSERT INTO review_likes (review_id, user_id) 
       VALUES ($1, $2) 
       RETURNING id, review_id, user_id, created_at`,
      [reviewId, userId]
    );

    return {
      id: result.rows[0].id,
      reviewId: result.rows[0].review_id,
      userId: result.rows[0].user_id,
      createdAt: new Date(result.rows[0].created_at)
    };
  }

  /**
   * Remove a like from a review
   */
  static async delete(reviewId: string, userId: string): Promise<boolean> {
    const result: QueryResult<any> = await query(
      `DELETE FROM review_likes 
       WHERE review_id = $1 AND user_id = $2`,
      [reviewId, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if user has liked a review
   */
  static async hasUserLiked(reviewId: string, userId: string): Promise<boolean> {
    const result: QueryResult<any> = await query(
      `SELECT 1 FROM review_likes 
       WHERE review_id = $1 AND user_id = $2`,
      [reviewId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get like count for a review
   */
  static async getLikeCount(reviewId: string): Promise<number> {
    const result: QueryResult<any> = await query(
      `SELECT COUNT(*) as count FROM review_likes 
       WHERE review_id = $1`,
      [reviewId]
    );

    return parseInt(result.rows[0].count);
  }
}