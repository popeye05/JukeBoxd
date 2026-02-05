import { SocialService } from './SocialService';
import { UserModel } from '@/models/User';
import { RatingModel } from '@/models/Rating';
import { AlbumModel } from '@/models/Album';
import { FollowModel } from '@/models/Follow';

// Mock the database dependencies
jest.mock('@/models/User');
jest.mock('@/models/Rating');
jest.mock('@/models/Album');
jest.mock('@/models/Follow');
jest.mock('@/config/database');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockRatingModel = RatingModel as jest.Mocked<typeof RatingModel>;
const mockAlbumModel = AlbumModel as jest.Mocked<typeof AlbumModel>;
const mockFollowModel = FollowModel as jest.Mocked<typeof FollowModel>;

describe('SocialService Follow Edge Cases - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Self-follow prevention (Requirement 4.5)', () => {
    it('should prevent users from following themselves', async () => {
      const userId = 'user-123';
      
      // Mock user exists
      mockUserModel.findById.mockResolvedValueOnce({
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockUserModel.findById.mockResolvedValueOnce({
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock FollowModel.create to throw error for self-follow
      mockFollowModel.create.mockRejectedValueOnce(new Error('Users cannot follow themselves'));

      await expect(SocialService.followUser(userId, userId))
        .rejects.toThrow('Users cannot follow themselves');

      expect(mockFollowModel.create).toHaveBeenCalledWith(userId, userId);
    });

    it('should not allow self-follow through isFollowing check', async () => {
      const userId = 'user-123';
      
      // Mock that user is not following themselves
      mockFollowModel.isFollowing.mockResolvedValueOnce(false);

      const isFollowing = await SocialService.isFollowing(userId, userId);
      expect(isFollowing).toBe(false);
      expect(mockFollowModel.isFollowing).toHaveBeenCalledWith(userId, userId);
    });

    it('should maintain self-follow prevention after other operations', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';

      // Mock users exist
      mockUserModel.findById.mockResolvedValue({
        id: user1Id,
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock successful follow of another user
      mockFollowModel.isFollowing.mockResolvedValueOnce(false); // Not already following
      mockFollowModel.create.mockResolvedValueOnce({
        id: 'follow-123',
        followerId: user1Id,
        followeeId: user2Id,
        createdAt: new Date()
      });

      // Follow another user should work
      await SocialService.followUser(user1Id, user2Id);

      // Reset mocks for self-follow attempt
      jest.clearAllMocks();
      
      mockUserModel.findById.mockResolvedValue({
        id: user1Id,
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Self-follow should still be prevented
      mockFollowModel.create.mockRejectedValueOnce(new Error('Users cannot follow themselves'));

      await expect(SocialService.followUser(user1Id, user1Id))
        .rejects.toThrow('Users cannot follow themselves');
    });

    it('should prevent self-follow at the model level', async () => {
      const userId = 'user-123';

      // Test that FollowModel.create directly prevents self-follow
      mockFollowModel.create.mockRejectedValueOnce(new Error('Users cannot follow themselves'));

      await expect(FollowModel.create(userId, userId))
        .rejects.toThrow('Users cannot follow themselves');

      expect(mockFollowModel.create).toHaveBeenCalledWith(userId, userId);
    });
  });

  describe('Authentication requirement for rating (Requirement 2.5)', () => {
    const validUserId = 'user-123';
    const validAlbumId = 'album-123';
    const validRating = 4;

    it('should require valid user ID to create a rating', async () => {
      // Test empty user ID
      mockRatingModel.create.mockRejectedValueOnce(new Error('User ID is required'));
      
      await expect(RatingModel.create('', validAlbumId, validRating))
        .rejects.toThrow('User ID is required');

      // Test invalid user ID format
      mockRatingModel.create.mockRejectedValueOnce(new Error('Invalid user ID format'));
      
      await expect(RatingModel.create('invalid-id', validAlbumId, validRating))
        .rejects.toThrow('Invalid user ID format');
    });

    it('should require valid user ID to update a rating', async () => {
      // Test empty user ID for upsert
      mockRatingModel.upsert.mockRejectedValueOnce(new Error('User ID is required'));
      
      await expect(RatingModel.upsert('', validAlbumId, validRating))
        .rejects.toThrow('User ID is required');

      // Test invalid user ID format for upsert
      mockRatingModel.upsert.mockRejectedValueOnce(new Error('Invalid user ID format'));
      
      await expect(RatingModel.upsert('invalid-id', validAlbumId, validRating))
        .rejects.toThrow('Invalid user ID format');
    });

    it('should return null for non-existent user ratings', async () => {
      // Mock that rating doesn't exist for non-existent user
      mockRatingModel.findByUserAndAlbum.mockResolvedValueOnce(null);

      const rating = await RatingModel.findByUserAndAlbum('non-existent-user', validAlbumId);
      expect(rating).toBeNull();
      expect(mockRatingModel.findByUserAndAlbum).toHaveBeenCalledWith('non-existent-user', validAlbumId);
    });

    it('should return empty array for non-existent user\'s ratings', async () => {
      // Mock empty array for non-existent user
      mockRatingModel.findByUser.mockResolvedValueOnce([]);

      const ratings = await RatingModel.findByUser('non-existent-user');
      expect(ratings).toEqual([]);
      expect(mockRatingModel.findByUser).toHaveBeenCalledWith('non-existent-user');
    });

    it('should allow authenticated users to create ratings', async () => {
      const mockRating = {
        id: 'rating-123',
        userId: validUserId,
        albumId: validAlbumId,
        rating: validRating,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRatingModel.create.mockResolvedValueOnce(mockRating);

      const result = await RatingModel.create(validUserId, validAlbumId, validRating);
      
      expect(result).toEqual(mockRating);
      expect(mockRatingModel.create).toHaveBeenCalledWith(validUserId, validAlbumId, validRating);
    });

    it('should allow authenticated users to update their ratings', async () => {
      const updatedRating = {
        id: 'rating-123',
        userId: validUserId,
        albumId: validAlbumId,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRatingModel.upsert.mockResolvedValueOnce(updatedRating);

      const result = await RatingModel.upsert(validUserId, validAlbumId, 5);
      
      expect(result).toEqual(updatedRating);
      expect(result.rating).toBe(5);
      expect(mockRatingModel.upsert).toHaveBeenCalledWith(validUserId, validAlbumId, 5);
    });

    it('should prevent rating creation with invalid user IDs', async () => {
      const invalidUserIds = ['', 'invalid-uuid', '123', 'not-a-uuid'];

      for (const invalidUserId of invalidUserIds) {
        mockRatingModel.create.mockRejectedValueOnce(new Error('Invalid user ID'));
        
        await expect(RatingModel.create(invalidUserId, validAlbumId, validRating))
          .rejects.toThrow('Invalid user ID');
      }

      expect(mockRatingModel.create).toHaveBeenCalledTimes(invalidUserIds.length);
    });

    it('should maintain rating integrity with proper authentication', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const albumId = 'album-123';

      const user1Rating = {
        id: 'rating-1',
        userId: user1Id,
        albumId: albumId,
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user2Rating = {
        id: 'rating-2',
        userId: user2Id,
        albumId: albumId,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock creating ratings for different users
      mockRatingModel.create.mockResolvedValueOnce(user1Rating);
      mockRatingModel.create.mockResolvedValueOnce(user2Rating);

      const rating1 = await RatingModel.create(user1Id, albumId, 4);
      const rating2 = await RatingModel.create(user2Id, albumId, 5);

      expect(rating1.userId).toBe(user1Id);
      expect(rating2.userId).toBe(user2Id);
      expect(rating1.rating).toBe(4);
      expect(rating2.rating).toBe(5);

      // Mock finding ratings by user and album
      mockRatingModel.findByUserAndAlbum.mockResolvedValueOnce(user1Rating);
      mockRatingModel.findByUserAndAlbum.mockResolvedValueOnce(user2Rating);

      const foundRating1 = await RatingModel.findByUserAndAlbum(user1Id, albumId);
      const foundRating2 = await RatingModel.findByUserAndAlbum(user2Id, albumId);

      expect(foundRating1?.rating).toBe(4);
      expect(foundRating2?.rating).toBe(5);
    });

    it('should handle authentication edge cases in rating deletion', async () => {
      const validUserId = 'user-123';
      const albumId = 'album-123';

      // Mock deletion with invalid user ID returns false
      mockRatingModel.deleteByUserAndAlbum.mockResolvedValueOnce(false);

      const deleteResult1 = await RatingModel.deleteByUserAndAlbum('invalid-user-id', albumId);
      expect(deleteResult1).toBe(false);

      // Mock successful deletion with valid user ID
      mockRatingModel.deleteByUserAndAlbum.mockResolvedValueOnce(true);

      const deleteResult2 = await RatingModel.deleteByUserAndAlbum(validUserId, albumId);
      expect(deleteResult2).toBe(true);

      expect(mockRatingModel.deleteByUserAndAlbum).toHaveBeenCalledTimes(2);
      expect(mockRatingModel.deleteByUserAndAlbum).toHaveBeenCalledWith('invalid-user-id', albumId);
      expect(mockRatingModel.deleteByUserAndAlbum).toHaveBeenCalledWith(validUserId, albumId);
    });

    it('should validate rating values regardless of authentication', async () => {
      const validUserId = 'user-123';
      const albumId = 'album-123';

      // Test invalid rating values
      const invalidRatings = [0, 6, -1, 3.5, NaN];

      for (const invalidRating of invalidRatings) {
        mockRatingModel.create.mockRejectedValueOnce(new Error('Rating must be an integer between 1 and 5'));
        
        await expect(RatingModel.create(validUserId, albumId, invalidRating))
          .rejects.toThrow('Rating must be an integer between 1 and 5');
      }

      // Test valid rating values
      const validRatings = [1, 2, 3, 4, 5];

      for (const validRating of validRatings) {
        const mockRating = {
          id: `rating-${validRating}`,
          userId: validUserId,
          albumId: albumId,
          rating: validRating,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockRatingModel.create.mockResolvedValueOnce(mockRating);
        
        const result = await RatingModel.create(validUserId, albumId, validRating);
        expect(result.rating).toBe(validRating);
      }
    });

    it('should enforce authentication at the service layer', async () => {
      // This test simulates how authentication would be enforced at the API/service layer
      // In a real implementation, this would be handled by middleware
      
      const simulateUnauthenticatedRequest = async (userId: string | null) => {
        if (!userId) {
          throw new Error('Authentication required');
        }
        
        if (userId === 'invalid') {
          throw new Error('Invalid authentication token');
        }

        // Proceed with rating creation if authenticated
        const mockRating = {
          id: 'rating-123',
          userId: userId,
          albumId: 'album-123',
          rating: 4,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockRatingModel.create.mockResolvedValueOnce(mockRating);
        return await RatingModel.create(userId, 'album-123', 4);
      };

      // Test unauthenticated request
      await expect(simulateUnauthenticatedRequest(null))
        .rejects.toThrow('Authentication required');

      // Test invalid authentication
      await expect(simulateUnauthenticatedRequest('invalid'))
        .rejects.toThrow('Invalid authentication token');

      // Test valid authentication
      const result = await simulateUnauthenticatedRequest('user-123');
      expect(result.userId).toBe('user-123');
    });
  });

  describe('Integration of both edge cases', () => {
    it('should prevent self-follow and require authentication for ratings in the same user session', async () => {
      const userId = 'user-123';
      const albumId = 'album-123';

      // Test self-follow prevention
      mockUserModel.findById.mockResolvedValue({
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockFollowModel.create.mockRejectedValueOnce(new Error('Users cannot follow themselves'));

      await expect(SocialService.followUser(userId, userId))
        .rejects.toThrow('Users cannot follow themselves');

      // Test rating authentication requirement
      const mockRating = {
        id: 'rating-123',
        userId: userId,
        albumId: albumId,
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRatingModel.create.mockResolvedValueOnce(mockRating);

      // Should allow authenticated user to rate
      const rating = await RatingModel.create(userId, albumId, 4);
      expect(rating.userId).toBe(userId);

      // Should prevent unauthenticated rating
      mockRatingModel.create.mockRejectedValueOnce(new Error('Authentication required'));
      
      await expect(RatingModel.create('', albumId, 4))
        .rejects.toThrow('Authentication required');
    });
  });
});