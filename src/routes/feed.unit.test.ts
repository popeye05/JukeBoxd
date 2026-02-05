import request from 'supertest';
import { app } from '@/server';
import { AuthService } from '@/services/AuthService';
import { ActivityFeedService } from '@/services/ActivityFeedService';

// Mock the services
jest.mock('@/services/ActivityFeedService');
jest.mock('@/services/AuthService');

const mockActivityFeedService = ActivityFeedService as jest.Mocked<typeof ActivityFeedService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Feed Routes', () => {
  let authToken: string;
  let mockUser: any;
  let mockActivities: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockActivities = [
      {
        id: 'activity-1',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'rating',
        albumId: 'album-1',
        data: { rating: 5 },
        createdAt: expect.any(String),
        user: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          username: 'otheruser',
          email: 'other@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        album: {
          id: 'album-1',
          spotifyId: 'spotify-1',
          name: 'Test Album',
          artist: 'Test Artist',
          releaseDate: expect.any(String),
          imageUrl: 'http://example.com/image.jpg',
          spotifyUrl: 'http://spotify.com/album/1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      }
    ];

    authToken = 'valid-jwt-token';
    
    // Mock authentication
    mockAuthService.validateToken.mockResolvedValue(mockUser);
  });

  describe('GET /api/feed', () => {
    it('should successfully get personalized feed', async () => {
      mockActivityFeedService.getFeed.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(mockActivities);
      expect(response.body.data.pagination).toBeDefined();
      expect(mockActivityFeedService.getFeed).toHaveBeenCalledWith(mockUser.id, 20, 0);
    });

    it('should handle pagination with page parameter', async () => {
      const mockPaginationResult = {
        activities: mockActivities,
        pagination: {
          page: 2,
          limit: 10,
          hasMore: false,
          total: 15
        }
      };
      mockActivityFeedService.getFeedWithPagination.mockResolvedValue(mockPaginationResult);

      const response = await request(app)
        .get('/api/feed?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(mockActivities);
      expect(response.body.data.pagination).toEqual(mockPaginationResult.pagination);
      expect(mockActivityFeedService.getFeedWithPagination).toHaveBeenCalledWith(mockUser.id, 2, 10);
    });

    it('should handle custom limit and offset', async () => {
      mockActivityFeedService.getFeed.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/feed?limit=50&offset=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockActivityFeedService.getFeed).toHaveBeenCalledWith(mockUser.id, 50, 10);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/feed');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockActivityFeedService.getFeed).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/feed?limit=200')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Limit must be between 1 and 100');
      expect(mockActivityFeedService.getFeed).not.toHaveBeenCalled();
    });

    it('should return 400 for negative offset', async () => {
      const response = await request(app)
        .get('/api/feed?offset=-5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Offset must be a non-negative integer');
      expect(mockActivityFeedService.getFeed).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/feed/user/:userId', () => {
    it('should successfully get user feed', async () => {
      mockActivityFeedService.getUserFeed.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get(`/api/feed/user/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(mockActivities);
      expect(response.body.data.userId).toBe(mockUser.id);
      expect(mockActivityFeedService.getUserFeed).toHaveBeenCalledWith(mockUser.id, 20, 0);
    });

    it('should handle pagination for user feed', async () => {
      const mockPaginationResult = {
        activities: mockActivities,
        pagination: {
          page: 1,
          limit: 20,
          hasMore: true,
          total: 25
        }
      };
      mockActivityFeedService.getUserActivitiesWithPagination.mockResolvedValue(mockPaginationResult);

      const response = await request(app)
        .get(`/api/feed/user/${mockUser.id}?page=1`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toEqual(mockPaginationResult.pagination);
      expect(mockActivityFeedService.getUserActivitiesWithPagination).toHaveBeenCalledWith(mockUser.id, 1, 20);
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/feed/user/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid user ID format');
      expect(mockActivityFeedService.getUserFeed).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/feed/recent', () => {
    it('should successfully get recent activities', async () => {
      mockActivityFeedService.getRecentActivities.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/feed/recent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(mockActivities);
      expect(mockActivityFeedService.getRecentActivities).toHaveBeenCalledWith(20, 0);
    });

    it('should filter by activity type', async () => {
      mockActivityFeedService.getActivitiesByType.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/feed/recent?type=rating');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(mockActivities);
      expect(response.body.data.pagination.type).toBe('rating');
      expect(mockActivityFeedService.getActivitiesByType).toHaveBeenCalledWith('rating', 20, 0);
    });

    it('should return 400 for invalid activity type', async () => {
      const response = await request(app)
        .get('/api/feed/recent?type=invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Type must be either "rating" or "review"');
      expect(mockActivityFeedService.getActivitiesByType).not.toHaveBeenCalled();
    });

    it('should handle custom limit and offset', async () => {
      mockActivityFeedService.getRecentActivities.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/feed/recent?limit=50&offset=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockActivityFeedService.getRecentActivities).toHaveBeenCalledWith(50, 10);
    });
  });

  describe('GET /api/feed/stats/:userId', () => {
    it('should successfully get user activity stats', async () => {
      mockActivityFeedService.getUserActivityCount.mockResolvedValue(15);
      mockActivityFeedService.hasUserActivities.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/feed/stats/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUser.id);
      expect(response.body.data.activityCount).toBe(15);
      expect(response.body.data.hasActivities).toBe(true);
      expect(mockActivityFeedService.getUserActivityCount).toHaveBeenCalledWith(mockUser.id);
      expect(mockActivityFeedService.hasUserActivities).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle user with no activities', async () => {
      mockActivityFeedService.getUserActivityCount.mockResolvedValue(0);
      mockActivityFeedService.hasUserActivities.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/feed/stats/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activityCount).toBe(0);
      expect(response.body.data.hasActivities).toBe(false);
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/feed/stats/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid user ID format');
      expect(mockActivityFeedService.getUserActivityCount).not.toHaveBeenCalled();
    });
  });
});