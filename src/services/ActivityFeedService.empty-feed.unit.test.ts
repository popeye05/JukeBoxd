import { ActivityFeedService } from './ActivityFeedService';
import { FollowModel, ActivityModel } from '@/models';

// Mock the dependencies
jest.mock('@/models', () => ({
  FollowModel: {
    getFollowing: jest.fn(),
  },
  ActivityModel: {
    findByUsersWithDetails: jest.fn(),
    findByUserWithDetails: jest.fn(),
    getActivityCount: jest.fn(),
  },
}));

describe('ActivityFeedService - Empty Feed Unit Tests', () => {
  const mockFollowModel = FollowModel as jest.Mocked<typeof FollowModel>;
  const mockActivityModel = ActivityModel as jest.Mocked<typeof ActivityModel>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test message display when user follows no one
   * **Validates: Requirements 5.5**
   */
  describe('Empty feed scenario - Requirements 5.5', () => {
    it('should return empty feed when user follows no one', async () => {
      // Arrange: Mock user following no one
      const userId = 'test-user-id';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed for user who follows no one
      const feed = await ActivityFeedService.getFeed(userId);

      // Assert: Should return empty array (indicating empty state for UI)
      expect(feed).toEqual([]);
      expect(Array.isArray(feed)).toBe(true);
      expect(feed).toHaveLength(0);

      // Verify that the service correctly identified no followed users
      expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(userId);
      expect(mockFollowModel.getFollowing).toHaveBeenCalledTimes(1);

      // Verify that no activity queries were made since user follows no one
      expect(mockActivityModel.findByUsersWithDetails).not.toHaveBeenCalled();
    });

    it('should return empty feed with pagination metadata when user follows no one', async () => {
      // Arrange: Mock user following no one
      const userId = 'test-user-id';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get paginated feed for user who follows no one
      const result = await ActivityFeedService.getFeedWithPagination(userId, 1, 10);

      // Assert: Should return empty activities with correct pagination metadata
      expect(result.activities).toEqual([]);
      expect(result.activities).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        hasMore: false,
        total: 0,
      });

      // Verify correct service calls
      expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(userId);
      expect(mockActivityModel.findByUsersWithDetails).not.toHaveBeenCalled();
    });

    it('should indicate user has no activities when they are new', async () => {
      // Arrange: Mock new user with no activities
      const userId = 'new-user-id';
      mockActivityModel.getActivityCount.mockResolvedValue(0);

      // Act: Check if user has activities
      const hasActivities = await ActivityFeedService.hasUserActivities(userId);
      const activityCount = await ActivityFeedService.getUserActivityCount(userId);

      // Assert: Should indicate no activities (empty state for UI)
      expect(hasActivities).toBe(false);
      expect(activityCount).toBe(0);

      // Verify correct service calls
      expect(mockActivityModel.getActivityCount).toHaveBeenCalledWith(userId);
      expect(mockActivityModel.getActivityCount).toHaveBeenCalledTimes(2); // Called twice
    });

    it('should return empty user feed when user has no activities', async () => {
      // Arrange: Mock user with no personal activities
      const userId = 'inactive-user-id';
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);

      // Act: Get user's own activity feed
      const userFeed = await ActivityFeedService.getUserFeed(userId);

      // Assert: Should return empty array (indicating empty state for UI)
      expect(userFeed).toEqual([]);
      expect(Array.isArray(userFeed)).toBe(true);
      expect(userFeed).toHaveLength(0);

      // Verify correct service calls
      expect(mockActivityModel.findByUserWithDetails).toHaveBeenCalledWith(userId, 50, 0);
    });

    it('should handle pagination correctly for empty user feed', async () => {
      // Arrange: Mock user with no personal activities
      const userId = 'inactive-user-id';
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);
      mockActivityModel.getActivityCount.mockResolvedValue(0);

      // Act: Get paginated user activities
      const result = await ActivityFeedService.getUserActivitiesWithPagination(userId, 1, 10);

      // Assert: Should return empty activities with correct pagination metadata
      expect(result.activities).toEqual([]);
      expect(result.activities).toHaveLength(0);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        hasMore: false,
        total: 0,
      });

      // Verify correct service calls
      expect(mockActivityModel.findByUserWithDetails).toHaveBeenCalledWith(userId, 11, 0); // limit + 1
      expect(mockActivityModel.getActivityCount).toHaveBeenCalledWith(userId);
    });
  });

  describe('Edge cases for empty feed handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      // Arrange: Mock invalid user ID returning no followed users
      const invalidUserId = 'non-existent-user-id';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed for invalid user
      const feed = await ActivityFeedService.getFeed(invalidUserId);

      // Assert: Should return empty array gracefully
      expect(feed).toEqual([]);
      expect(Array.isArray(feed)).toBe(true);
      expect(feed).toHaveLength(0);

      // Verify service was called with invalid ID
      expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(invalidUserId);
    });

    it('should handle zero limit in pagination', async () => {
      // Arrange: Mock user following no one
      const userId = 'test-user-id';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed with zero limit
      const result = await ActivityFeedService.getFeedWithPagination(userId, 1, 0);

      // Assert: Should handle zero limit gracefully
      expect(result.activities).toEqual([]);
      expect(result.pagination.limit).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle negative page numbers gracefully', async () => {
      // Arrange: Mock user following no one
      const userId = 'test-user-id';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed with negative page number
      const result = await ActivityFeedService.getFeedWithPagination(userId, -1, 10);

      // Assert: Should handle negative page gracefully
      expect(result.activities).toEqual([]);
      expect(Array.isArray(result.activities)).toBe(true);
      expect(result.pagination.page).toBe(-1); // Preserves input
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should correctly identify empty state for UI message display', async () => {
      // Arrange: Mock scenarios that should trigger empty state message
      const userId = 'lonely-user-id';
      
      // User follows no one
      mockFollowModel.getFollowing.mockResolvedValue([]);
      
      // User has no personal activities
      mockActivityModel.getActivityCount.mockResolvedValue(0);
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);

      // Act: Get all relevant data for empty state detection
      const feed = await ActivityFeedService.getFeed(userId);
      const hasActivities = await ActivityFeedService.hasUserActivities(userId);
      const userFeed = await ActivityFeedService.getUserFeed(userId);
      const paginatedResult = await ActivityFeedService.getFeedWithPagination(userId, 1, 10);

      // Assert: All methods should indicate empty state
      expect(feed).toHaveLength(0);
      expect(hasActivities).toBe(false);
      expect(userFeed).toHaveLength(0);
      expect(paginatedResult.activities).toHaveLength(0);
      expect(paginatedResult.pagination.total).toBe(0);

      // This empty state data should be used by the UI to display:
      // "You're not following anyone yet! Discover and follow other users to see their music activity."
    });
  });

  describe('Service behavior validation', () => {
    it('should not make unnecessary database calls when user follows no one', async () => {
      // Arrange: Mock user following no one
      const userId = 'efficient-test-user';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed
      await ActivityFeedService.getFeed(userId);

      // Assert: Should only check following, not query activities
      expect(mockFollowModel.getFollowing).toHaveBeenCalledTimes(1);
      expect(mockActivityModel.findByUsersWithDetails).not.toHaveBeenCalled();
    });

    it('should return consistent empty state across different methods', async () => {
      // Arrange: Mock user in complete empty state
      const userId = 'consistent-empty-user';
      mockFollowModel.getFollowing.mockResolvedValue([]);
      mockActivityModel.getActivityCount.mockResolvedValue(0);
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);

      // Act: Call all feed-related methods
      const [feed, hasActivities, userFeed, paginatedFeed, userPaginated] = await Promise.all([
        ActivityFeedService.getFeed(userId),
        ActivityFeedService.hasUserActivities(userId),
        ActivityFeedService.getUserFeed(userId),
        ActivityFeedService.getFeedWithPagination(userId, 1, 10),
        ActivityFeedService.getUserActivitiesWithPagination(userId, 1, 10),
      ]);

      // Assert: All methods should consistently indicate empty state
      expect(feed).toHaveLength(0);
      expect(hasActivities).toBe(false);
      expect(userFeed).toHaveLength(0);
      expect(paginatedFeed.activities).toHaveLength(0);
      expect(paginatedFeed.pagination.total).toBe(0);
      expect(userPaginated.activities).toHaveLength(0);
      expect(userPaginated.pagination.total).toBe(0);
    });
  });
});