import { ReviewModel } from '@/models';
import { ActivityFeedService } from './ActivityFeedService';
import { DataPersistenceService } from './DataPersistenceService';
import { Review, ReviewWithDetails } from '@/types';

export class ReviewService {
  /**
   * Create or update a review and create corresponding activity
   */
  static async upsertReview(userId: string, albumId: string, content: string): Promise<Review> {
    // Validate content first
    const validation = this.validateReviewContent(content);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Validate referential integrity
    await DataPersistenceService.validateReferentialIntegrity([
      { table: 'reviews', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', value: userId },
      { table: 'reviews', column: 'album_id', referencedTable: 'albums', referencedColumn: 'id', value: albumId }
    ]);

    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Check if review already exists
      const existingReview = await ReviewModel.findByUserAndAlbum(userId, albumId);
      const isNew = !existingReview;

      // Create or update the review
      const reviewResult = await ReviewModel.upsert(userId, albumId, content);

      // Create activity only for new reviews
      if (isNew) {
        try {
          await ActivityFeedService.createReviewActivity(userId, albumId, content);
        } catch (error) {
          // Log error but don't fail the review creation
          console.error('Failed to create review activity:', error);
        }
      }

      return reviewResult;
    },
      // Validation query to ensure the review was persisted
      'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]);
  }

  /**
   * Create a new review and corresponding activity
   */
  static async createReview(userId: string, albumId: string, content: string): Promise<Review> {
    // Validate content first
    const validation = this.validateReviewContent(content);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Validate referential integrity
    await DataPersistenceService.validateReferentialIntegrity([
      { table: 'reviews', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', value: userId },
      { table: 'reviews', column: 'album_id', referencedTable: 'albums', referencedColumn: 'id', value: albumId }
    ]);

    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Create the review
      const reviewResult = await ReviewModel.create(userId, albumId, content);

      // Create corresponding activity
      try {
        await ActivityFeedService.createReviewActivity(userId, albumId, content);
      } catch (error) {
        // Log error but don't fail the review creation
        console.error('Failed to create review activity:', error);
      }

      return reviewResult;
    },
      // Validation query to ensure the review was persisted
      'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]);
  }

  /**
   * Update existing review content
   */
  static async updateReview(id: string, content: string): Promise<Review | null> {
    return await ReviewModel.updateContent(id, content);
  }

  /**
   * Get review by user and album
   */
  static async getUserReview(userId: string, albumId: string): Promise<Review | null> {
    return await ReviewModel.findByUserAndAlbum(userId, albumId);
  }

  /**
   * Get review by ID
   */
  static async getReviewById(id: string): Promise<Review | null> {
    return await ReviewModel.findById(id);
  }

  /**
   * Get all reviews for an album (chronological order)
   */
  static async getAlbumReviews(albumId: string): Promise<Review[]> {
    return await ReviewModel.findByAlbum(albumId);
  }

  /**
   * Get all reviews by a user
   */
  static async getUserReviews(userId: string): Promise<Review[]> {
    return await ReviewModel.findByUser(userId);
  }

  /**
   * Get reviews for an album with user and album details (chronological order)
   */
  static async getAlbumReviewsWithDetails(albumId: string): Promise<ReviewWithDetails[]> {
    return await ReviewModel.findByAlbumWithDetails(albumId);
  }

  /**
   * Get reviews by a user with album details
   */
  static async getUserReviewsWithDetails(userId: string): Promise<ReviewWithDetails[]> {
    return await ReviewModel.findByUserWithDetails(userId);
  }

  /**
   * Get recent reviews for home page
   */
  static async getRecentReviews(limit: number = 6): Promise<ReviewWithDetails[]> {
    return await ReviewModel.findRecentWithDetails(limit);
  }

  /**
   * Get review count for an album
   */
  static async getAlbumReviewCount(albumId: string): Promise<number> {
    return await ReviewModel.getReviewCount(albumId);
  }

  /**
   * Delete review by ID
   */
  static async deleteReview(id: string): Promise<boolean> {
    return await ReviewModel.deleteById(id);
  }

  /**
   * Delete review by user and album
   */
  static async deleteUserReview(userId: string, albumId: string): Promise<boolean> {
    return await ReviewModel.deleteByUserAndAlbum(userId, albumId);
  }

  /**
   * Check if user has reviewed an album
   */
  static async hasUserReviewed(userId: string, albumId: string): Promise<boolean> {
    return await ReviewModel.hasUserReviewed(userId, albumId);
  }

  /**
   * Validate review content
   */
  static validateReviewContent(content: string): { isValid: boolean; error?: string } {
    if (content === null || content === undefined || typeof content !== 'string') {
      return { isValid: false, error: 'Review content is required' };
    }

    // Check if content is only whitespace
    if (content.trim().length === 0) {
      return { isValid: false, error: 'Review content cannot be empty or contain only whitespace' };
    }

    // Optional: Add maximum length validation
    if (content.length > 5000) {
      return { isValid: false, error: 'Review content cannot exceed 5000 characters' };
    }

    return { isValid: true };
  }
}