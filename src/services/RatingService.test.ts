import { RatingService } from './RatingService';
import { UserModel, AlbumModel, ActivityModel } from '@/models';
import { connectDatabase, closeDatabase } from '@/config/database';

describe('RatingService', () => {
  let testUser: any;
  let testAlbum: any;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await UserModel.create(
      `testuser_${Date.now()}`,
      `test_${Date.now()}@example.com`,
      'password123'
    );

    // Create test album
    testAlbum = await AlbumModel.create(
      `spotify_${Date.now()}`,
      'Test Album',
      'Test Artist',
      new Date('2023-01-01'),
      'https://example.com/image.jpg',
      'https://open.spotify.com/album/test'
    );
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await UserModel.deleteById(testUser.id);
    }
    if (testAlbum) {
      await AlbumModel.deleteById(testAlbum.id);
    }
  });

  describe('upsertRating', () => {
    it('should create new rating and activity', async () => {
      const rating = await RatingService.upsertRating(testUser.id, testAlbum.id, 5);

      expect(rating).toBeDefined();
      expect(rating.userId).toBe(testUser.id);
      expect(rating.albumId).toBe(testAlbum.id);
      expect(rating.rating).toBe(5);

      // Check that activity was created
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.type).toBe('rating');
      expect(activities[0]!.data.rating).toBe(5);
    });

    it('should update existing rating without creating new activity', async () => {
      // Create initial rating
      await RatingService.upsertRating(testUser.id, testAlbum.id, 3);

      // Update rating
      const updatedRating = await RatingService.upsertRating(testUser.id, testAlbum.id, 5);

      expect(updatedRating.rating).toBe(5);

      // Should still only have one activity (from initial creation)
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.data.rating).toBe(3); // Original activity unchanged
    });

    it('should validate rating range', async () => {
      await expect(
        RatingService.upsertRating(testUser.id, testAlbum.id, 0)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        RatingService.upsertRating(testUser.id, testAlbum.id, 6)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        RatingService.upsertRating(testUser.id, testAlbum.id, 3.5)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });
  });

  describe('createRating', () => {
    it('should create rating and activity', async () => {
      const rating = await RatingService.createRating(testUser.id, testAlbum.id, 4);

      expect(rating).toBeDefined();
      expect(rating.rating).toBe(4);

      // Check that activity was created
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.type).toBe('rating');
      expect(activities[0]!.data.rating).toBe(4);
    });
  });

  describe('getUserRating', () => {
    it('should return user rating for album', async () => {
      await RatingService.createRating(testUser.id, testAlbum.id, 5);

      const rating = await RatingService.getUserRating(testUser.id, testAlbum.id);

      expect(rating).toBeDefined();
      expect(rating!.rating).toBe(5);
    });

    it('should return null if user has not rated album', async () => {
      const rating = await RatingService.getUserRating(testUser.id, testAlbum.id);
      expect(rating).toBeNull();
    });
  });

  describe('getAlbumRatings', () => {
    it('should return all ratings for album', async () => {
      // Create another user
      const testUser2 = await UserModel.create(
        `testuser2_${Date.now()}`,
        `test2_${Date.now()}@example.com`,
        'password123'
      );

      try {
        // Both users rate the album
        await RatingService.createRating(testUser.id, testAlbum.id, 5);
        await RatingService.createRating(testUser2.id, testAlbum.id, 4);

        const ratings = await RatingService.getAlbumRatings(testAlbum.id);

        expect(ratings).toHaveLength(2);
        const ratingValues = ratings.map(r => r.rating);
        expect(ratingValues).toContain(5);
        expect(ratingValues).toContain(4);
      } finally {
        await UserModel.deleteById(testUser2.id);
      }
    });
  });

  describe('getAlbumAverageRating', () => {
    it('should calculate correct average rating', async () => {
      // Create another user
      const testUser2 = await UserModel.create(
        `testuser2_${Date.now()}`,
        `test2_${Date.now()}@example.com`,
        'password123'
      );

      try {
        // Ratings: 5, 3 -> average should be 4.00
        await RatingService.createRating(testUser.id, testAlbum.id, 5);
        await RatingService.createRating(testUser2.id, testAlbum.id, 3);

        const average = await RatingService.getAlbumAverageRating(testAlbum.id);

        expect(average).toBe(4.00);
      } finally {
        await UserModel.deleteById(testUser2.id);
      }
    });

    it('should return 0 for album with no ratings', async () => {
      const average = await RatingService.getAlbumAverageRating(testAlbum.id);
      expect(average).toBe(0);
    });
  });

  describe('getAlbumRatingCount', () => {
    it('should return correct rating count', async () => {
      // Initially no ratings
      let count = await RatingService.getAlbumRatingCount(testAlbum.id);
      expect(count).toBe(0);

      // Add rating
      await RatingService.createRating(testUser.id, testAlbum.id, 5);

      count = await RatingService.getAlbumRatingCount(testAlbum.id);
      expect(count).toBe(1);
    });
  });

  describe('getAlbumStats', () => {
    it('should return album statistics', async () => {
      // Create another user
      const testUser2 = await UserModel.create(
        `testuser2_${Date.now()}`,
        `test2_${Date.now()}@example.com`,
        'password123'
      );

      try {
        // Add ratings
        await RatingService.createRating(testUser.id, testAlbum.id, 5);
        await RatingService.createRating(testUser2.id, testAlbum.id, 3);

        const stats = await RatingService.getAlbumStats(testAlbum.id);

        expect(stats.averageRating).toBe(4.00);
        expect(stats.ratingCount).toBe(2);
      } finally {
        await UserModel.deleteById(testUser2.id);
      }
    });
  });

  describe('deleteUserRating', () => {
    it('should delete user rating', async () => {
      await RatingService.createRating(testUser.id, testAlbum.id, 5);

      // Verify rating exists
      let rating = await RatingService.getUserRating(testUser.id, testAlbum.id);
      expect(rating).toBeDefined();

      // Delete rating
      const deleted = await RatingService.deleteUserRating(testUser.id, testAlbum.id);
      expect(deleted).toBe(true);

      // Verify rating is gone
      rating = await RatingService.getUserRating(testUser.id, testAlbum.id);
      expect(rating).toBeNull();
    });
  });
});