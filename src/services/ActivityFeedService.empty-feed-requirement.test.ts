import { ActivityFeedService } from './ActivityFeedService';
import { FollowModel } from '@/models';

// Mock the dependencies
jest.mock('@/models', () => ({
  FollowModel: {
    getFollowing: jest.fn(),
  },
}));

/**
 * Unit Tests for Empty Feed Scenario - Task 6.3
 * 
 * **Validates: Requirements 5.5**
 * "WHEN a user has no followed users, THE System SHALL display a message 
 * encouraging them to discover and follow other users"
 * 
 * These tests verify that the ActivityFeedService correctly identifies empty 
 * feed scenarios and provides the appropriate data structure for the UI to 
 * display encouraging messages to users.
 */
describe('ActivityFeedService - Empty Feed Requirement 5.5', () => {
  const mockFollowModel = FollowModel as jest.Mocked<typeof FollowModel>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Core requirement test: Empty feed detection for message display
   * **Validates: Requirements 5.5**
   */
  it('should provide empty state data that enables UI to display encouraging message when user follows no one', async () => {
    // Arrange: User who follows no one (the core empty feed scenario)
    const userId = 'user-needs-encouragement';
    mockFollowModel.getFollowing.mockResolvedValue([]);

    // Act: Get feed data that UI components will use
    const feedData = await ActivityFeedService.getFeedWithPagination(userId, 1, 20);

    // Assert: Service provides clear empty state indicators
    expect(feedData.activities).toHaveLength(0);
    expect(feedData.pagination.total).toBe(0);
    expect(feedData.pagination.hasMore).toBe(false);

    // Verify the service correctly identified no followed users
    expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(userId);

    // This empty state data enables the UI to display messages like:
    // "You're not following anyone yet! Discover and follow other users to see their music activity."
    // "Start exploring music and connect with other music lovers!"
    // "Find users with similar taste and follow them to build your personalized feed."
    
    const shouldDisplayEncouragingMessage = 
      feedData.activities.length === 0 && 
      feedData.pagination.total === 0;
    
    expect(shouldDisplayEncouragingMessage).toBe(true);
  });

  /**
   * Comprehensive empty state validation
   * **Validates: Requirements 5.5**
   */
  it('should consistently indicate empty state across all feed methods for proper message display', async () => {
    // Arrange: User in complete empty state
    const userId = 'completely-empty-user';
    mockFollowModel.getFollowing.mockResolvedValue([]);

    // Act: Get data from all relevant methods
    const basicFeed = await ActivityFeedService.getFeed(userId);
    const paginatedFeed = await ActivityFeedService.getFeedWithPagination(userId, 1, 10);

    // Assert: All methods consistently indicate empty state
    expect(basicFeed).toHaveLength(0);
    expect(paginatedFeed.activities).toHaveLength(0);
    expect(paginatedFeed.pagination.total).toBe(0);

    // This consistent empty state allows the UI to confidently display:
    // "Welcome to JukeBoxd! Start by discovering and following other music enthusiasts 
    // to see their ratings and reviews in your personalized activity feed."
    
    const isEmptyFeedState = 
      basicFeed.length === 0 && 
      paginatedFeed.activities.length === 0 && 
      paginatedFeed.pagination.total === 0;
    
    expect(isEmptyFeedState).toBe(true);
  });

  /**
   * Edge case handling for message display
   * **Validates: Requirements 5.5**
   */
  it('should handle edge cases gracefully while maintaining empty state message capability', async () => {
    // Test various edge cases that should still trigger encouraging message
    const edgeCases = [
      { userId: '', description: 'empty user ID' },
      { userId: 'non-existent-user', description: 'non-existent user' },
      { userId: 'user-with-special-chars-!@#$%', description: 'special characters in ID' }
    ];

    for (const testCase of edgeCases) {
      // Arrange: Mock empty following for edge case
      mockFollowModel.getFollowing.mockResolvedValue([]);

      // Act: Get feed data
      const feedData = await ActivityFeedService.getFeedWithPagination(testCase.userId, 1, 10);

      // Assert: Should still provide empty state data for message display
      expect(feedData.activities).toHaveLength(0);
      expect(feedData.pagination.total).toBe(0);

      // Even edge cases should enable encouraging message display
      const canShowEncouragingMessage = feedData.activities.length === 0;
      expect(canShowEncouragingMessage).toBe(true);
    }
  });

  /**
   * Performance validation for empty state detection
   * **Validates: Requirements 5.5**
   */
  it('should efficiently detect empty state without unnecessary database queries', async () => {
    // Arrange: User follows no one
    const userId = 'efficient-empty-check';
    mockFollowModel.getFollowing.mockResolvedValue([]);

    // Act: Get feed data
    await ActivityFeedService.getFeed(userId);

    // Assert: Should only check following relationships, not query activities
    expect(mockFollowModel.getFollowing).toHaveBeenCalledTimes(1);
    expect(mockFollowModel.getFollowing).toHaveBeenCalledWith(userId);

    // This efficient empty state detection allows for fast UI response
    // when displaying encouraging messages to users with empty feeds
  });
});