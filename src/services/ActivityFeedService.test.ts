import { ActivityFeedService } from './ActivityFeedService';
import { UserModel, AlbumModel, FollowModel, ActivityModel } from '@/models';
import { connectDatabase, closeDatabase } from '@/config/database';

describe('ActivityFeedService', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testAlbum: any;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test users
    testUser1 = await UserModel.create(
      `testuser1_${Date.now()}`,
      `test1_${Date.now()}@example.com`,
      'password123'
    );

    testUser2 = await UserModel.create(
      `testuser2_${Date.now()}`,
      `test2_${Date.now()}@example.com`,
      'password123'
    );

    testUser3 = await UserModel.create(
      `testuser3_${Date.now()}`,
      `test3_${Date.now()}@example.com`,
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
    if (testUser1) await UserModel.deleteById(testUser1.id);
    if (testUser2) await UserModel.deleteById(testUser2.id);
    if (testUser3) await UserModel.deleteById(testUser3.id);
    if (testAlbum) await AlbumModel.deleteById(testAlbum.id);
  });

  describe('getFeed', () => {
    it('should return empty feed when user follows no one', async () => {
      const feed = await ActivityFeedService.getFeed(testUser1.id);
      expect(feed).toHaveLength(0);
    });

    it('should return activities from followed users', async () => {
      // User1 follows User2
      await FollowModel.create(testUser1.id, testUser2.id);

      // User2 creates activities
      await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser2.id, 'review', testAlbum.id, { content: 'Great album!' });

      const feed = await ActivityFeedService.getFeed(testUser1.id);

      expect(feed).toHaveLength(2);
      expect(feed[0]!.userId).toBe(testUser2.id);
      expect(feed[1]!.userId).toBe(testUser2.id);
      // Should be ordered by created_at DESC
      expect(feed[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(feed[1]!.createdAt.getTime());
    });

    it('should return activities from multiple followed users', async () => {
      // User1 follows User2 and User3
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser1.id, testUser3.id);

      // Both users create activities
      await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser3.id, 'review', testAlbum.id, { content: 'Nice!' });

      const feed = await ActivityFeedService.getFeed(testUser1.id);

      expect(feed).toHaveLength(2);
      const userIds = feed.map(activity => activity.userId);
      expect(userIds).toContain(testUser2.id);
      expect(userIds).toContain(testUser3.id);
    });

    it('should respect limit and offset', async () => {
      // User1 follows User2
      await FollowModel.create(testUser1.id, testUser2.id);

      // User2 creates multiple activities
      for (let i = 0; i < 5; i++) {
        await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: i + 1 });
      }

      const firstPage = await ActivityFeedService.getFeed(testUser1.id, 3, 0);
      const secondPage = await ActivityFeedService.getFeed(testUser1.id, 3, 3);

      expect(firstPage).toHaveLength(3);
      expect(secondPage).toHaveLength(2);
    });
  });

  describe('getUserFeed', () => {
    it('should return activities for specific user', async () => {
      // User2 creates activities
      await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser2.id, 'review', testAlbum.id, { content: 'Great!' });

      const feed = await ActivityFeedService.getUserFeed(testUser2.id);

      expect(feed).toHaveLength(2);
      expect(feed[0]!.userId).toBe(testUser2.id);
      expect(feed[1]!.userId).toBe(testUser2.id);
    });
  });

  describe('createRatingActivity', () => {
    it('should create rating activity', async () => {
      const activity = await ActivityFeedService.createRatingActivity(testUser1.id, testAlbum.id, 5);

      expect(activity).toBeDefined();
      expect(activity.userId).toBe(testUser1.id);
      expect(activity.type).toBe('rating');
      expect(activity.albumId).toBe(testAlbum.id);
      expect(activity.data.rating).toBe(5);
      expect(activity.data.timestamp).toBeDefined();
    });
  });

  describe('createReviewActivity', () => {
    it('should create review activity', async () => {
      const content = 'This is a great album!';
      const activity = await ActivityFeedService.createReviewActivity(testUser1.id, testAlbum.id, content);

      expect(activity).toBeDefined();
      expect(activity.userId).toBe(testUser1.id);
      expect(activity.type).toBe('review');
      expect(activity.albumId).toBe(testAlbum.id);
      expect(activity.data.content).toBe(content);
      expect(activity.data.timestamp).toBeDefined();
    });
  });

  describe('getFeedWithPagination', () => {
    it('should return feed with pagination metadata', async () => {
      // User1 follows User2
      await FollowModel.create(testUser1.id, testUser2.id);

      // User2 creates activities
      for (let i = 0; i < 5; i++) {
        await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: i + 1 });
      }

      const result = await ActivityFeedService.getFeedWithPagination(testUser1.id, 1, 3);

      expect(result.activities).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should handle empty feed with pagination', async () => {
      const result = await ActivityFeedService.getFeedWithPagination(testUser1.id, 1, 10);

      expect(result.activities).toHaveLength(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUserActivityCount', () => {
    it('should return correct activity count', async () => {
      // Initially no activities
      let count = await ActivityFeedService.getUserActivityCount(testUser1.id);
      expect(count).toBe(0);

      // Create activities
      await ActivityModel.create(testUser1.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser1.id, 'review', testAlbum.id, { content: 'Great!' });

      count = await ActivityFeedService.getUserActivityCount(testUser1.id);
      expect(count).toBe(2);
    });
  });

  describe('hasUserActivities', () => {
    it('should return false for user with no activities', async () => {
      const hasActivities = await ActivityFeedService.hasUserActivities(testUser1.id);
      expect(hasActivities).toBe(false);
    });

    it('should return true for user with activities', async () => {
      await ActivityModel.create(testUser1.id, 'rating', testAlbum.id, { rating: 5 });

      const hasActivities = await ActivityFeedService.hasUserActivities(testUser1.id);
      expect(hasActivities).toBe(true);
    });
  });

  describe('getActivitiesByType', () => {
    it('should return activities filtered by type', async () => {
      // Create activities of different types
      await ActivityModel.create(testUser1.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser1.id, 'review', testAlbum.id, { content: 'Great!' });
      await ActivityModel.create(testUser2.id, 'rating', testAlbum.id, { rating: 4 });

      const ratingActivities = await ActivityFeedService.getActivitiesByType('rating');
      const reviewActivities = await ActivityFeedService.getActivitiesByType('review');

      expect(ratingActivities).toHaveLength(2);
      expect(reviewActivities).toHaveLength(1);
      
      ratingActivities.forEach(activity => {
        expect(activity.type).toBe('rating');
      });
      
      reviewActivities.forEach(activity => {
        expect(activity.type).toBe('review');
      });
    });
  });

  describe('cleanupUserActivities', () => {
    it('should delete all activities for a user', async () => {
      // Create activities for user
      await ActivityModel.create(testUser1.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser1.id, 'review', testAlbum.id, { content: 'Great!' });

      // Verify activities exist
      let count = await ActivityFeedService.getUserActivityCount(testUser1.id);
      expect(count).toBe(2);

      // Clean up activities
      const deletedCount = await ActivityFeedService.cleanupUserActivities(testUser1.id);
      expect(deletedCount).toBe(2);

      // Verify activities are gone
      count = await ActivityFeedService.getUserActivityCount(testUser1.id);
      expect(count).toBe(0);
    });
  });
});