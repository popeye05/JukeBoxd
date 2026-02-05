import request from 'supertest';
import { app } from '@/server';
import { AuthService } from '@/services/AuthService';
import { SocialService } from '@/services/SocialService';

// Mock the services
jest.mock('@/services/SocialService');
jest.mock('@/services/AuthService');

const mockSocialService = SocialService as jest.Mocked<typeof SocialService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Social Routes', () => {
  let authToken: string;
  let mockUser: any;
  let mockFollowee: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFollowee = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      username: 'followee',
      email: 'followee@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    authToken = 'valid-jwt-token';
    
    // Mock authentication
    mockAuthService.validateToken.mockResolvedValue(mockUser);
  });

  describe('POST /api/social/follow', () => {
    it('should successfully follow a user', async () => {
      const mockFollow = {
        id: 'follow-1',
        followerId: mockUser.id,
        followeeId: mockFollowee.id,
        createdAt: expect.any(String)
      };

      mockSocialService.followUser.mockResolvedValue({
        id: 'follow-1',
        followerId: mockUser.id,
        followeeId: mockFollowee.id,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/social/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: mockFollowee.id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.follow).toEqual(mockFollow);
      expect(response.body.data.message).toBe('Successfully followed user');
      expect(mockSocialService.followUser).toHaveBeenCalledWith(mockUser.id, mockFollowee.id);
    });

    it('should return 400 when trying to follow yourself', async () => {
      const response = await request(app)
        .post('/api/social/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: mockUser.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Cannot follow yourself');
      expect(mockSocialService.followUser).not.toHaveBeenCalled();
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/social/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User ID to follow is required');
      expect(mockSocialService.followUser).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/social/follow')
        .send({ userId: mockFollowee.id });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockSocialService.followUser).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockSocialService.followUser.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .post('/api/social/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: mockFollowee.id });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(mockSocialService.followUser).toHaveBeenCalledWith(mockUser.id, mockFollowee.id);
    });
  });

  describe('DELETE /api/social/follow/:userId', () => {
    it('should successfully unfollow a user', async () => {
      mockSocialService.unfollowUser.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/social/follow/${mockFollowee.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.message).toBe('Successfully unfollowed user');
      expect(mockSocialService.unfollowUser).toHaveBeenCalledWith(mockUser.id, mockFollowee.id);
    });

    it('should return 400 when trying to unfollow yourself', async () => {
      const response = await request(app)
        .delete(`/api/social/follow/${mockUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Cannot unfollow yourself');
      expect(mockSocialService.unfollowUser).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .delete('/api/social/follow/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid user ID format');
      expect(mockSocialService.unfollowUser).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/social/follow/${mockFollowee.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockSocialService.unfollowUser).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/social/followers/:userId', () => {
    it('should successfully get user followers', async () => {
      const mockFollowers = [mockUser];
      mockSocialService.getFollowers.mockResolvedValue(mockFollowers);

      const response = await request(app)
        .get(`/api/social/followers/${mockFollowee.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toEqual(mockFollowers);
      expect(response.body.data.count).toBe(1);
      expect(mockSocialService.getFollowers).toHaveBeenCalledWith(mockFollowee.id);
    });

    it('should return empty array when user has no followers', async () => {
      mockSocialService.getFollowers.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/social/followers/${mockFollowee.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/social/followers/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid user ID format');
      expect(mockSocialService.getFollowers).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/social/following/:userId', () => {
    it('should successfully get users being followed', async () => {
      const mockFollowing = [mockFollowee];
      mockSocialService.getFollowing.mockResolvedValue(mockFollowing);

      const response = await request(app)
        .get(`/api/social/following/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toEqual(mockFollowing);
      expect(response.body.data.count).toBe(1);
      expect(mockSocialService.getFollowing).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array when user follows no one', async () => {
      mockSocialService.getFollowing.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/social/following/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe('GET /api/social/profile/:userId', () => {
    it('should successfully get user profile with stats', async () => {
      const mockProfile = {
        ...mockUser,
        followerCount: 5,
        followingCount: 3
      };
      mockSocialService.getUserProfileWithStats.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get(`/api/social/profile/${mockUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toEqual(mockProfile);
      expect(mockSocialService.getUserProfileWithStats).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle user not found', async () => {
      mockSocialService.getUserProfileWithStats.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .get(`/api/social/profile/${mockUser.id}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/social/is-following/:userId', () => {
    it('should return true when user is following', async () => {
      mockSocialService.isFollowing.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/social/is-following/${mockFollowee.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFollowing).toBe(true);
      expect(mockSocialService.isFollowing).toHaveBeenCalledWith(mockUser.id, mockFollowee.id);
    });

    it('should return false when user is not following', async () => {
      mockSocialService.isFollowing.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/social/is-following/${mockFollowee.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFollowing).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/social/is-following/${mockFollowee.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockSocialService.isFollowing).not.toHaveBeenCalled();
    });
  });
});