import { ActivityFeedService } from './ActivityFeedService';
import { UserModel } from '@/models';
import { connectDatabase, closeDatabase } from '@/config/database';

describe('ActivityFeedService - Empty Feed Scenarios', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  /**
   * Test message display when user follows no one
   * **Validates: Requirements 5.5**
   */
  describe('Empty feed handling', () => {
    it('should return empty feed when user follows no one', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get feed for user who follows no one
        const feed = await ActivityFeedService.getFeed(testUser.id);

        // Should return empty array
        expect(feed).toHaveLength(0);
        expect(Array.isArray(feed)).toBe(true);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });

    it('should return empty feed with pagination when user follows no one', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get paginated feed for user who follows no one
        const result = await ActivityFeedService.getFeedWithPagination(testUser.id, 1, 10);

        // Should return empty array with correct pagination metadata
        expect(result.activities).toHaveLength(0);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.hasMore).toBe(false);
        expect(result.pagination.total).toBe(0);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });

    it('should indicate user has no activities initially', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Check if user has activities
        const hasActivities = await ActivityFeedService.hasUserActivities(testUser.id);
        const activityCount = await ActivityFeedService.getUserActivityCount(testUser.id);

        // Should indicate no activities
        expect(hasActivities).toBe(false);
        expect(activityCount).toBe(0);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });

    it('should return empty user feed when user has no activities', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get user's own activity feed
        const userFeed = await ActivityFeedService.getUserFeed(testUser.id);

        // Should return empty array
        expect(userFeed).toHaveLength(0);
        expect(Array.isArray(userFeed)).toBe(true);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });

    it('should handle pagination correctly for empty user feed', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get paginated user activities
        const result = await ActivityFeedService.getUserActivitiesWithPagination(testUser.id, 1, 10);

        // Should return empty array with correct pagination metadata
        expect(result.activities).toHaveLength(0);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.hasMore).toBe(false);
        expect(result.pagination.total).toBe(0);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid user ID gracefully', async () => {
      // Test with non-existent user ID
      const feed = await ActivityFeedService.getFeed('non-existent-user-id');
      
      // Should return empty array (no followed users found)
      expect(feed).toHaveLength(0);
      expect(Array.isArray(feed)).toBe(true);
    });

    it('should handle zero limit in pagination', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get feed with zero limit
        const result = await ActivityFeedService.getFeedWithPagination(testUser.id, 1, 0);

        // Should return empty array
        expect(result.activities).toHaveLength(0);
        expect(result.pagination.limit).toBe(0);
        expect(result.pagination.hasMore).toBe(false);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });

    it('should handle negative page numbers gracefully', async () => {
      let testUser: any = null;

      try {
        // Create test user
        testUser = await UserModel.create(
          `testuser_${Date.now()}`,
          `test_${Date.now()}@example.com`,
          'password123'
        );

        // Get feed with negative page number (should be treated as page 1)
        const result = await ActivityFeedService.getFeedWithPagination(testUser.id, -1, 10);

        // Should handle gracefully
        expect(result.activities).toHaveLength(0);
        expect(Array.isArray(result.activities)).toBe(true);

      } finally {
        // Cleanup
        if (testUser) {
          await UserModel.deleteById(testUser.id);
        }
      }
    });
  });
});