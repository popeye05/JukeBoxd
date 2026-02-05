import { ActivityModel, UserModel, AlbumModel } from '@/models';
import { Activity, ActivityType } from '@/types';
import { connectDatabase, closeDatabase } from '@/config/database';

describe('ActivityModel', () => {
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

  describe('create', () => {
    it('should create a rating activity', async () => {
      const activityData = { rating: 5, timestamp: new Date().toISOString() };
      
      const activity = await ActivityModel.create(
        testUser.id,
        'rating',
        testAlbum.id,
        activityData
      );

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.userId).toBe(testUser.id);
      expect(activity.type).toBe('rating');
      expect(activity.albumId).toBe(testAlbum.id);
      expect(activity.data).toEqual(activityData);
      expect(activity.createdAt).toBeInstanceOf(Date);
    });

    it('should create a review activity', async () => {
      const activityData = { content: 'Great album!', timestamp: new Date().toISOString() };
      
      const activity = await ActivityModel.create(
        testUser.id,
        'review',
        testAlbum.id,
        activityData
      );

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.userId).toBe(testUser.id);
      expect(activity.type).toBe('review');
      expect(activity.albumId).toBe(testAlbum.id);
      expect(activity.data).toEqual(activityData);
      expect(activity.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid activity type', async () => {
      const activityData = { rating: 5 };
      
      await expect(
        ActivityModel.create(testUser.id, 'invalid' as ActivityType, testAlbum.id, activityData)
      ).rejects.toThrow('Activity type must be either "rating" or "review"');
    });
  });

  describe('findById', () => {
    it('should find activity by ID', async () => {
      const activityData = { rating: 4 };
      const created = await ActivityModel.create(testUser.id, 'rating', testAlbum.id, activityData);

      const found = await ActivityModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.userId).toBe(testUser.id);
      expect(found!.type).toBe('rating');
      expect(found!.albumId).toBe(testAlbum.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await ActivityModel.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should find activities by user ID', async () => {
      // Create multiple activities
      await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser.id, 'review', testAlbum.id, { content: 'Great!' });

      const activities = await ActivityModel.findByUser(testUser.id);

      expect(activities).toHaveLength(2);
      expect(activities[0]!.userId).toBe(testUser.id);
      expect(activities[1]!.userId).toBe(testUser.id);
      // Should be ordered by created_at DESC
      expect(activities[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(activities[1]!.createdAt.getTime());
    });

    it('should return empty array for user with no activities', async () => {
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(0);
    });

    it('should respect limit and offset', async () => {
      // Create 3 activities
      for (let i = 0; i < 3; i++) {
        await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: i + 1 });
      }

      const firstPage = await ActivityModel.findByUser(testUser.id, 2, 0);
      const secondPage = await ActivityModel.findByUser(testUser.id, 2, 2);

      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1);
    });
  });

  describe('findByUsers', () => {
    it('should find activities by multiple user IDs', async () => {
      // Create another user
      const testUser2 = await UserModel.create(
        `testuser2_${Date.now()}`,
        `test2_${Date.now()}@example.com`,
        'password123'
      );

      try {
        // Create activities for both users
        await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });
        await ActivityModel.create(testUser2.id, 'review', testAlbum.id, { content: 'Nice!' });

        const activities = await ActivityModel.findByUsers([testUser.id, testUser2.id]);

        expect(activities).toHaveLength(2);
        const userIds = activities.map(a => a.userId);
        expect(userIds).toContain(testUser.id);
        expect(userIds).toContain(testUser2.id);
      } finally {
        await UserModel.deleteById(testUser2.id);
      }
    });

    it('should return empty array for empty user IDs array', async () => {
      const activities = await ActivityModel.findByUsers([]);
      expect(activities).toHaveLength(0);
    });
  });

  describe('findByUsersWithDetails', () => {
    it('should find activities with user and album details', async () => {
      await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });

      const activities = await ActivityModel.findByUsersWithDetails([testUser.id]);

      expect(activities).toHaveLength(1);
      expect(activities[0]!.user).toBeDefined();
      expect(activities[0]!.user.username).toBe(testUser.username);
      expect(activities[0]!.album).toBeDefined();
      expect(activities[0]!.album.name).toBe(testAlbum.name);
    });
  });

  describe('getActivityCount', () => {
    it('should return correct activity count for user', async () => {
      // Initially no activities
      let count = await ActivityModel.getActivityCount(testUser.id);
      expect(count).toBe(0);

      // Create activities
      await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser.id, 'review', testAlbum.id, { content: 'Great!' });

      count = await ActivityModel.getActivityCount(testUser.id);
      expect(count).toBe(2);
    });
  });

  describe('deleteById', () => {
    it('should delete activity by ID', async () => {
      const activity = await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });

      const deleted = await ActivityModel.deleteById(activity.id);
      expect(deleted).toBe(true);

      const found = await ActivityModel.findById(activity.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await ActivityModel.deleteById('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findByType', () => {
    it('should find activities by type', async () => {
      // Create activities of different types
      await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 5 });
      await ActivityModel.create(testUser.id, 'review', testAlbum.id, { content: 'Great!' });
      await ActivityModel.create(testUser.id, 'rating', testAlbum.id, { rating: 4 });

      const ratingActivities = await ActivityModel.findByType('rating');
      const reviewActivities = await ActivityModel.findByType('review');

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
});