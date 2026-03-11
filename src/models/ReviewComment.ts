import { query, QueryResult } from '@/config/database';

export interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewCommentWithUser extends ReviewComment {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export class ReviewCommentModel {
  /**
   * Create a new comment
   */
  static async create(reviewId: string, userId: string, content: string): Promise<ReviewComment> {
    const result: QueryResult<any> = await query(
      `INSERT INTO review_comments (review_id, user_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING id, review_id, user_id, content, created_at, updated_at`,
      [reviewId, userId, content]
    );

    return {
      id: result.rows[0].id,
      reviewId: result.rows[0].review_id,
      userId: result.rows[0].user_id,
      content: result.rows[0].content,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at)
    };
  }

  /**
   * Get comments for a review with user details
   */
  static async findByReviewId(reviewId: string): Promise<ReviewCommentWithUser[]> {
    const result: QueryResult<any> = await query(
      `SELECT 
        c.id, c.review_id, c.user_id, c.content, c.created_at, c.updated_at,
        u.username, u.avatar_url
       FROM review_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.review_id = $1
       ORDER BY c.created_at ASC`,
      [reviewId]
    );

    return result.rows.map(row => ({
      id: row.id,
      reviewId: row.review_id,
      userId: row.user_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      user: {
        id: row.user_id,
        username: row.username,
        avatarUrl: row.avatar_url
      }
    }));
  }

  /**
   * Get comment count for a review
   */
  static async getCommentCount(reviewId: string): Promise<number> {
    const result: QueryResult<any> = await query(
      `SELECT COUNT(*) as count FROM review_comments 
       WHERE review_id = $1`,
      [reviewId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Delete a comment
   */
  static async delete(commentId: string, userId: string): Promise<boolean> {
    const result: QueryResult<any> = await query(
      `DELETE FROM review_comments 
       WHERE id = $1 AND user_id = $2`,
      [commentId, userId]
    );

    return result.rowCount > 0;
  }
}