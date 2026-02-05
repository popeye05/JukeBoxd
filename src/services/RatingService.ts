import { RatingModel } from '@/models';
import { ActivityFeedService } from './ActivityFeedService';
import { DataPersistenceService } from './DataPersistenceService';
import { Rating, RatingWithDetails } from '@/types';

export class RatingService {
  /**
   * Create or update a rating and create corresponding activity
   */
  static async upsertRating(userId: string, albumId: string, rating: number): Promise<Rating> {
    // Validate referential integrity
    await DataPersistenceService.validateReferentialIntegrity([
      { table: 'ratings', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', value: userId },
      { table: 'ratings', column: 'album_id', referencedTable: 'albums', referencedColumn: 'id', value: albumId }
    ]);

    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Check if rating already exists
      const existingRating = await RatingModel.findByUserAndAlbum(userId, albumId);
      const isNew = !existingRating;

      // Create or update the rating
      const ratingResult = await RatingModel.upsert(userId, albumId, rating);

      // Create activity only for new ratings
      if (isNew) {
        try {
          await ActivityFeedService.createRatingActivity(userId, albumId, rating);
        } catch (error) {
          // Log error but don't fail the rating creation
          console.error('Failed to create rating activity:', error);
        }
      }

      return ratingResult;
    }, 
    // Validation query to ensure the rating was persisted
    'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
    [userId, albumId]);
  }

  /**
   * Create a new rating and corresponding activity
   */
  static async createRating(userId: string, albumId: string, rating: number): Promise<Rating> {
    // Validate referential integrity
    await DataPersistenceService.validateReferentialIntegrity([
      { table: 'ratings', column: 'user_id', referencedTable: 'users', referencedColumn: 'id', value: userId },
      { table: 'ratings', column: 'album_id', referencedTable: 'albums', referencedColumn: 'id', value: albumId }
    ]);

    // Execute with immediate persistence
    return await DataPersistenceService.executeWithPersistence(async (client) => {
      // Create the rating
      const ratingResult = await RatingModel.create(userId, albumId, rating);

      // Create corresponding activity
      try {
        await ActivityFeedService.createRatingActivity(userId, albumId, rating);
      } catch (error) {
        // Log error but don't fail the rating creation
        console.error('Failed to create rating activity:', error);
      }

      return ratingResult;
    },
    // Validation query to ensure the rating was persisted
    'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
    [userId, albumId]);
  }

  /**
   * Get rating by user and album
   */
  static async getUserRating(userId: string, albumId: string): Promise<Rating | null> {
    return await RatingModel.findByUserAndAlbum(userId, albumId);
  }

  /**
   * Get all ratings for an album
   */
  static async getAlbumRatings(albumId: string): Promise<Rating[]> {
    return await RatingModel.findByAlbum(albumId);
  }

  /**
   * Get all ratings by a user
   */
  static async getUserRatings(userId: string): Promise<Rating[]> {
    return await RatingModel.findByUser(userId);
  }

  /**
   * Get ratings for an album with user and album details
   */
  static async getAlbumRatingsWithDetails(albumId: string): Promise<RatingWithDetails[]> {
    return await RatingModel.findByAlbumWithDetails(albumId);
  }

  /**
   * Get ratings by a user with album details
   */
  static async getUserRatingsWithDetails(userId: string): Promise<RatingWithDetails[]> {
    return await RatingModel.findByUserWithDetails(userId);
  }

  /**
   * Calculate average rating for an album
   */
  static async getAlbumAverageRating(albumId: string): Promise<number> {
    return await RatingModel.getAverageRating(albumId);
  }

  /**
   * Get rating count for an album
   */
  static async getAlbumRatingCount(albumId: string): Promise<number> {
    return await RatingModel.getRatingCount(albumId);
  }

  /**
   * Delete rating by ID
   */
  static async deleteRating(id: string): Promise<boolean> {
    return await RatingModel.deleteById(id);
  }

  /**
   * Delete rating by user and album
   */
  static async deleteUserRating(userId: string, albumId: string): Promise<boolean> {
    return await RatingModel.deleteByUserAndAlbum(userId, albumId);
  }

  /**
   * Get album statistics (average rating and count)
   */
  static async getAlbumStats(albumId: string): Promise<{ averageRating: number; ratingCount: number }> {
    const [averageRating, ratingCount] = await Promise.all([
      this.getAlbumAverageRating(albumId),
      this.getAlbumRatingCount(albumId)
    ]);

    return {
      averageRating,
      ratingCount
    };
  }
}