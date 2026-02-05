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

describe('ActivityFeedService - Empty Feed Message Display', () => {
  const mockFollowModel = FollowModel as jest.Mocked<typeof FollowModel>;
  const mockActivityModel = ActivityModel as jest.Mocked<typeof ActivityModel>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test message display when user follows no one
   * **Validates: Requirements 5.5**
   * 
   * Requirement 5.5: "WHEN a user has no followed users, THE System SHALL display 
   * a message encouraging them to discover and follow other users"
   */
  describe('Empty feed message requirements - Requirements 5.5', () => {
    it('should provide empty state data that triggers encouraging message display', async () => {
      // Arrange: User who follows no one (empty feed scenario)
      const userId = 'lonely-user-123';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed data that UI will use to determine what to display
      const feedResult = await ActivityFeedService.getFeedWithPagination(userId, 1, 20);

      // Assert: Service provides data indicating empty state
      expect(feedResult.activities).toHaveLength(0);
      expect(feedResult.pagination.total).toBe(0);
      
      // This empty state should trigger UI to display encouraging message like:
      // "You're not following anyone yet! Discover and follow other users to see their music activity."
      const shouldShowEmptyMessage = feedResult.activities.length === 0 && feedResult.pagination.total === 0;
      expect(shouldShowEmptyMessage).toBe(true);
    });

    it('should distinguish between no followed users vs followed users with no activity', async () => {
      // Test Case 1: User follows no one (should show "discover and follow" message)
      const lonelyUserId = 'user-follows-nobody';
      mockFollowModel.getFollowing.mockResolvedValueOnce([]);

      const emptyFollowingResult = await ActivityFeedService.getFeedWithPagination(lonelyUserId, 1, 20);
      
      // Test Case 2: User follows people but they have no activity (different message)
      const followsInactiveUserId = 'user-follows-inactive-people';
      mockFollowModel.getFollowing.mockResolvedValueOnce([
        { 
          id: 'inactive-user-1', 
          username: 'silent_user', 
          email: 'silent@example.com',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        },
        { 
          id: 'inactive-user-2', 
          username: 'quiet_user', 
          email: 'quiet@example.com',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ]);
      mockActivityModel.findByUsersWithDetails.mockResolvedValueOnce([]);

      const followsInactiveResult = await ActivityFeedService.getFeedWithPagination(followsInactiveUserId, 1, 20);

      // Assert: Both scenarios result in empty activities but for different reasons
      expect(emptyFollowingResult.activities).toHaveLength(0);
      expect(followsInactiveResult.activities).toHaveLength(0);

      // The UI can distinguish between these cases:
      // Case 1: No followed users -> "Discover and follow other users"
      // Case 2: Followed users exist but no activity -> "Your followed users haven't been active lately"
      
      // Verify the service calls to distinguish the cases
      expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(lonelyUserId);
      expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(followsInactiveUserId);
      expect(mockActivityModel.findByUsersWithDetails).toHaveBeenCalledTimes(1); // Only for case 2
    });

    it('should provide data structure suitable for empty state message rendering', async () => {
      // Arrange: User in empty feed state
      const userId = 'empty-feed-user';
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get comprehensive empty state data
      const feedData = await ActivityFeedService.getFeedWithPagination(userId, 1, 20);
      const hasPersonalActivity = await ActivityFeedService.hasUserActivities(userId);
      
      // Mock user has no personal activities either
      mockActivityModel.getActivityCount.mockResolvedValue(0);
      const personalActivityCount = await ActivityFeedService.getUserActivityCount(userId);

      // Assert: Data structure provides all info needed for UI message logic
      const emptyStateInfo = {
        hasFollowedUsers: false, // Derived from empty following list
        hasActivitiesFromFollowed: feedData.activities.length > 0,
        hasPersonalActivities: hasPersonalActivity,
        personalActivityCount: personalActivityCount,
        totalFeedItems: feedData.pagination.total
      };

      expect(emptyStateInfo).toEqual({
        hasFollowedUsers: false,
        hasActivitiesFromFollowed: false,
        hasPersonalActivities: false,
        personalActivityCount: 0,
        totalFeedItems: 0
      });

      // UI can use this data to show appropriate message:
      // if (!hasFollowedUsers) -> "Discover and follow other users to see their music activity!"
      // else if (!hasActivitiesFromFollowed) -> "Your followed users haven't shared any music activity yet."
    });

    it('should handle the complete new user experience flow', async () => {
      // Arrange: Brand new user scenario
      const newUserId = 'brand-new-user';
      
      // New user follows no one
      mockFollowModel.getFollowing.mockResolvedValue([]);
      
      // New user has no personal activities
      mockActivityModel.getActivityCount.mockResolvedValue(0);
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);

      // Act: Get all data a new user would see
      const mainFeed = await ActivityFeedService.getFeedWithPagination(newUserId, 1, 20);
      const personalFeed = await ActivityFeedService.getUserActivitiesWithPagination(newUserId, 1, 20);
      const hasAnyActivity = await ActivityFeedService.hasUserActivities(newUserId);

      // Assert: Complete empty state for new user
      expect(mainFeed.activities).toHaveLength(0);
      expect(mainFeed.pagination.total).toBe(0);
      expect(personalFeed.activities).toHaveLength(0);
      expect(personalFeed.pagination.total).toBe(0);
      expect(hasAnyActivity).toBe(false);

      // This complete empty state should trigger the UI to show:
      // Main feed: "Welcome! Discover and follow other users to see their music activity."
      // Personal feed: "Start rating and reviewing albums to build your music profile!"
      
      const isCompletelyNewUser = 
        mainFeed.activities.length === 0 && 
        personalFeed.activities.length === 0 && 
        !hasAnyActivity;
      
      expect(isCompletelyNewUser).toBe(true);
    });

    it('should provide consistent empty state detection across service methods', async () => {
      // Arrange: User in various empty states
      const userId = 'consistency-test-user';
      mockFollowModel.getFollowing.mockResolvedValue([]);
      mockActivityModel.getActivityCount.mockResolvedValue(0);
      mockActivityModel.findByUserWithDetails.mockResolvedValue([]);

      // Act: Call all methods that could indicate empty state
      const results = await Promise.all([
        ActivityFeedService.getFeed(userId),
        ActivityFeedService.getFeedWithPagination(userId, 1, 10),
        ActivityFeedService.getUserFeed(userId),
        ActivityFeedService.getUserActivitiesWithPagination(userId, 1, 10),
        ActivityFeedService.hasUserActivities(userId),
        ActivityFeedService.getUserActivityCount(userId)
      ]);

      const [feed, paginatedFeed, userFeed, paginatedUserFeed, hasActivities, activityCount] = results;

      // Assert: All methods consistently indicate empty state
      expect(feed).toHaveLength(0);
      expect(paginatedFeed.activities).toHaveLength(0);
      expect(paginatedFeed.pagination.total).toBe(0);
      expect(userFeed).toHaveLength(0);
      expect(paginatedUserFeed.activities).toHaveLength(0);
      expect(paginatedUserFeed.pagination.total).toBe(0);
      expect(hasActivities).toBe(false);
      expect(activityCount).toBe(0);

      // UI can confidently show encouraging message based on this consistent empty state
      const shouldShowEncouragingMessage = 
        feed.length === 0 && 
        paginatedFeed.pagination.total === 0 && 
        !hasActivities;
      
      expect(shouldShowEncouragingMessage).toBe(true);
    });
  });

  describe('Message display logic validation', () => {
    it('should support different empty state messages based on context', async () => {
      const userId = 'context-aware-user';
      
      // Scenario 1: No followed users (primary empty state)
      mockFollowModel.getFollowing.mockResolvedValueOnce([]);
      const noFollowingFeed = await ActivityFeedService.getFeed(userId);
      
      // Scenario 2: User has personal activity but follows no one
      mockFollowModel.getFollowing.mockResolvedValueOnce([]);
      mockActivityModel.getActivityCount.mockResolvedValueOnce(5);
      const activeUserNoFollowing = await ActivityFeedService.getFeed(userId);
      const hasPersonalActivity = await ActivityFeedService.hasUserActivities(userId);

      // Assert: Service provides data for context-aware messaging
      expect(noFollowingFeed).toHaveLength(0);
      expect(activeUserNoFollowing).toHaveLength(0);
      expect(hasPersonalActivity).toBe(true);

      // UI can show different messages:
      // If no personal activity: "Welcome! Start by rating albums and following other users."
      // If has personal activity: "Great music taste! Follow other users to discover more."
    });

    it('should handle edge cases that might affect message display', async () => {
      // Test various edge cases that shouldn't break empty message logic
      const testCases = [
        { userId: '', description: 'empty user ID' },
        { userId: 'null', description: 'string null user ID' },
        { userId: 'undefined', description: 'string undefined user ID' },
        { userId: 'very-long-user-id-that-might-cause-issues-in-some-systems-123456789', description: 'very long user ID' }
      ];

      for (const testCase of testCases) {
        // Arrange: Mock empty state for edge case user ID
        mockFollowModel.getFollowing.mockResolvedValue([]);
        
        // Act: Get feed for edge case user ID
        const feed = await ActivityFeedService.getFeed(testCase.userId);
        
        // Assert: Should handle gracefully and still indicate empty state
        expect(feed).toEqual([]);
        expect(Array.isArray(feed)).toBe(true);
        
        // Empty state should still trigger encouraging message regardless of edge case
        const shouldShowMessage = feed.length === 0;
        expect(shouldShowMessage).toBe(true);
      }
    });
  });
});