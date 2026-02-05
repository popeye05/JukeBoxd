import { SocialService } from './SocialService';
import { UserModel } from '@/models/User';
import { RatingModel } from '@/models/Rating';
import { AlbumModel } from '@/models/Album';
import { connectDatabase, closeDatabase } from '@/config/database';
import { clearTestData } from '@/test/helpers';

describe('SocialService Edge Cases', () => {
  let testUser1: any;
  let testUser2: any;
  let testAlbum: any;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    
    // Create test users
    testUser1 = await UserModel.create('testuser1', 'test1@example.com', 'password123');
    testUser2 = await UserModel.create('testuser2', 'test2@example.com', 'password123');
    
    // Create test album for rating tests
    testAlbum = await AlbumModel.create(
      'spotify-album-123',
      'Test Album',
      'Test Artist',
      new Date('2023-01-01'),
      'https://example.com/image.jpg',
      'https://open.spotify.com/album/123'
    );
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Self-follow prevention', () => {
    it('should prevent users from following themselves', async () => {
      await expect(SocialService.followUser(testUser1.id, testUser1.id))
        .rejects.toThrow('Users cannot follow themselves');
    });

    it('should not allow self-follow through any method', async () => {
      // Verify user is not following themselves initially
      const isFollowing = await SocialService.isFollowing(testUser1.id, testUser1.id);
      expect(isFollowing).toBe(false);

      // Verify user doesn't appear in their own following list
      const following = await SocialService.getFollowing(testUser1.id);
      expect(following.map(u => u.id)).not.toContain(testUser1.id);

      // Verify user doesn't appear in their own followers list
      const followers = await SocialService.getFollowers(testUser1.id);
      expect(followers.map(u => u.id)).not.toContain(testUser1.id);

      // Verify counts are correct (should be 0 for new user)
      const followerCount = await SocialService.getFollowerCount(testUser1.id);
      const followingCount = await SocialService.getFollowingCount(testUser1.id);
      expect(followerCount).toBe(0);
      expect(followingCount).toBe(0);
    });

    it('should maintain self-follow prevention after other operations', async () => {
      // Create a normal follow relationship
      await SocialService.followUser(testUser1.id, testUser2.id);

      // Verify normal follow worked
      const isFollowingOther = await SocialService.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowingOther).toBe(true);

      // Still should not be able to follow self
      await expect(SocialService.followUser(testUser1.id, testUser1.id))
        .rejects.toThrow('Users cannot follow themselves');

      // Verify self-follow status hasn't changed
      const isFollowingSelf = await SocialService.isFollowing(testUser1.id, testUser1.id);
      expect(isFollowingSelf).toBe(false);
    });
  });

  describe('Non-existent user handling', () => {
    it('should handle non-existent follower in followUser', async () => {
      await expect(SocialService.followUser('non-existent-id', testUser2.id))
        .rejects.toThrow('Follower user not found');
    });

    it('should handle non-existent followee in followUser', async () => {
      await expect(SocialService.followUser(testUser1.id, 'non-existent-id'))
        .rejects.toThrow('User to follow not found');
    });

    it('should handle non-existent user in getFollowers', async () => {
      await expect(SocialService.getFollowers('non-existent-id'))
        .rejects.toThrow('User not found');
    });

    it('should handle non-existent user in getFollowing', async () => {
      await expect(SocialService.getFollowing('non-existent-id'))
        .rejects.toThrow('User not found');
    });

    it('should handle non-existent user in getUserProfileWithStats', async () => {
      await expect(SocialService.getUserProfileWithStats('non-existent-id'))
        .rejects.toThrow('User not found');
    });

    it('should handle non-existent user in getMutualFollows', async () => {
      await expect(SocialService.getMutualFollows('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('Duplicate follow prevention', () => {
    it('should prevent duplicate follow attempts', async () => {
      // First follow should succeed
      await SocialService.followUser(testUser1.id, testUser2.id);

      // Second follow should fail
      await expect(SocialService.followUser(testUser1.id, testUser2.id))
        .rejects.toThrow('User is already following this user');

      // Verify only one follow relationship exists
      const followerCount = await SocialService.getFollowerCount(testUser2.id);
      const followingCount = await SocialService.getFollowingCount(testUser1.id);
      expect(followerCount).toBe(1);
      expect(followingCount).toBe(1);
    });
  });

  describe('Unfollow edge cases', () => {
    it('should handle unfollowing user not being followed', async () => {
      await expect(SocialService.unfollowUser(testUser1.id, testUser2.id))
        .rejects.toThrow('User is not following this user');
    });

    it('should handle unfollowing after already unfollowed', async () => {
      // Follow then unfollow
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.unfollowUser(testUser1.id, testUser2.id);

      // Second unfollow should fail
      await expect(SocialService.unfollowUser(testUser1.id, testUser2.id))
        .rejects.toThrow('User is not following this user');
    });
  });

  describe('Empty result handling', () => {
    it('should handle user with no followers', async () => {
      const followers = await SocialService.getFollowers(testUser1.id);
      expect(followers).toEqual([]);

      const followerCount = await SocialService.getFollowerCount(testUser1.id);
      expect(followerCount).toBe(0);
    });

    it('should handle user following no one', async () => {
      const following = await SocialService.getFollowing(testUser1.id);
      expect(following).toEqual([]);

      const followingCount = await SocialService.getFollowingCount(testUser1.id);
      expect(followingCount).toBe(0);
    });

    it('should handle user with no mutual follows', async () => {
      // User1 follows User2, but User2 doesn't follow User1
      await SocialService.followUser(testUser1.id, testUser2.id);

      const mutualFollows = await SocialService.getMutualFollows(testUser1.id);
      expect(mutualFollows).toEqual([]);
    });

    it('should handle empty follow suggestions', async () => {
      // In a system with only 2 users where user1 already follows user2
      await SocialService.followUser(testUser1.id, testUser2.id);

      const suggestions = await SocialService.getFollowSuggestions(testUser1.id, 10);
      // Should not suggest user2 (already following) or user1 (self)
      expect(suggestions.map(s => s.id)).not.toContain(testUser1.id);
      expect(suggestions.map(s => s.id)).not.toContain(testUser2.id);
    });
  });

  describe('Batch operations edge cases', () => {
    it('should handle empty array in isFollowingMultiple', async () => {
      const result = await SocialService.isFollowingMultiple(testUser1.id, []);
      expect(result).toEqual({});
    });

    it('should handle non-existent users in isFollowingMultiple', async () => {
      const result = await SocialService.isFollowingMultiple(testUser1.id, ['non-existent-1', 'non-existent-2']);
      expect(result['non-existent-1']).toBe(false);
      expect(result['non-existent-2']).toBe(false);
    });

    it('should handle mixed existing and non-existent users in isFollowingMultiple', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);

      const result = await SocialService.isFollowingMultiple(testUser1.id, [testUser2.id, 'non-existent-id']);
      expect(result[testUser2.id]).toBe(true);
      expect(result['non-existent-id']).toBe(false);
    });
  });

  describe('Data consistency edge cases', () => {
    it('should maintain consistency after multiple follow/unfollow operations', async () => {
      // Follow
      await SocialService.followUser(testUser1.id, testUser2.id);
      expect(await SocialService.isFollowing(testUser1.id, testUser2.id)).toBe(true);
      expect(await SocialService.getFollowingCount(testUser1.id)).toBe(1);
      expect(await SocialService.getFollowerCount(testUser2.id)).toBe(1);

      // Unfollow
      await SocialService.unfollowUser(testUser1.id, testUser2.id);
      expect(await SocialService.isFollowing(testUser1.id, testUser2.id)).toBe(false);
      expect(await SocialService.getFollowingCount(testUser1.id)).toBe(0);
      expect(await SocialService.getFollowerCount(testUser2.id)).toBe(0);

      // Follow again
      await SocialService.followUser(testUser1.id, testUser2.id);
      expect(await SocialService.isFollowing(testUser1.id, testUser2.id)).toBe(true);
      expect(await SocialService.getFollowingCount(testUser1.id)).toBe(1);
      expect(await SocialService.getFollowerCount(testUser2.id)).toBe(1);
    });

    it('should maintain profile stats consistency', async () => {
      const initialProfile = await SocialService.getUserProfileWithStats(testUser1.id);
      expect(initialProfile.followerCount).toBe(0);
      expect(initialProfile.followingCount).toBe(0);

      // Add a follow relationship
      await SocialService.followUser(testUser1.id, testUser2.id);

      const updatedProfile = await SocialService.getUserProfileWithStats(testUser1.id);
      expect(updatedProfile.followerCount).toBe(0); // Still no followers
      expect(updatedProfile.followingCount).toBe(1); // Now following 1 user

      const otherUserProfile = await SocialService.getUserProfileWithStats(testUser2.id);
      expect(otherUserProfile.followerCount).toBe(1); // Now has 1 follower
      expect(otherUserProfile.followingCount).toBe(0); // Still following no one
    });
  });

  describe('Authentication requirement for rating (Requirement 2.5)', () => {
    it('should require authentication to create a rating', async () => {
      // Attempt to create a rating without a valid user ID (simulating unauthenticated request)
      await expect(RatingModel.create('', testAlbum.id, 4))
        .rejects.toThrow();

      await expect(RatingModel.create('invalid-user-id', testAlbum.id, 4))
        .rejects.toThrow();
    });

    it('should require authentication to update a rating', async () => {
      // First create a valid rating
      const rating = await RatingModel.create(testUser1.id, testAlbum.id, 4);

      // Attempt to update with invalid user ID (simulating unauthenticated request)
      await expect(RatingModel.upsert('', testAlbum.id, 5))
        .rejects.toThrow();

      await expect(RatingModel.upsert('invalid-user-id', testAlbum.id, 5))
        .rejects.toThrow();
    });

    it('should require valid user to retrieve user-specific ratings', async () => {
      // Create a rating for testUser1
      await RatingModel.create(testUser1.id, testAlbum.id, 4);

      // Should return null for non-existent user
      const nonExistentUserRating = await RatingModel.findByUserAndAlbum('non-existent-user', testAlbum.id);
      expect(nonExistentUserRating).toBeNull();

      // Should return empty array for non-existent user's ratings
      const nonExistentUserRatings = await RatingModel.findByUser('non-existent-user');
      expect(nonExistentUserRatings).toEqual([]);
    });

    it('should allow authenticated users to rate albums', async () => {
      // Valid authenticated user should be able to create rating
      const rating = await RatingModel.create(testUser1.id, testAlbum.id, 4);
      
      expect(rating).toBeDefined();
      expect(rating.userId).toBe(testUser1.id);
      expect(rating.albumId).toBe(testAlbum.id);
      expect(rating.rating).toBe(4);

      // Should be able to retrieve the rating
      const retrievedRating = await RatingModel.findByUserAndAlbum(testUser1.id, testAlbum.id);
      expect(retrievedRating).not.toBeNull();
      expect(retrievedRating?.rating).toBe(4);
    });

    it('should allow authenticated users to update their ratings', async () => {
      // Create initial rating
      await RatingModel.create(testUser1.id, testAlbum.id, 3);

      // Update rating (upsert)
      const updatedRating = await RatingModel.upsert(testUser1.id, testAlbum.id, 5);
      
      expect(updatedRating.rating).toBe(5);
      expect(updatedRating.userId).toBe(testUser1.id);
      expect(updatedRating.albumId).toBe(testAlbum.id);

      // Verify the rating was actually updated
      const retrievedRating = await RatingModel.findByUserAndAlbum(testUser1.id, testAlbum.id);
      expect(retrievedRating?.rating).toBe(5);
    });

    it('should prevent users from rating with invalid user IDs', async () => {
      // Test various invalid user ID scenarios
      const invalidUserIds = ['', null, undefined, 'invalid-uuid', '123'];

      for (const invalidUserId of invalidUserIds) {
        if (invalidUserId === null || invalidUserId === undefined) {
          // Skip null/undefined as they would cause TypeScript errors
          continue;
        }
        
        await expect(RatingModel.create(invalidUserId, testAlbum.id, 4))
          .rejects.toThrow();
      }
    });

    it('should maintain rating integrity with authentication', async () => {
      // User 1 creates a rating
      const rating1 = await RatingModel.create(testUser1.id, testAlbum.id, 4);
      
      // User 2 creates a different rating for the same album
      const rating2 = await RatingModel.create(testUser2.id, testAlbum.id, 5);

      // Both ratings should exist independently
      expect(rating1.userId).toBe(testUser1.id);
      expect(rating2.userId).toBe(testUser2.id);
      expect(rating1.rating).toBe(4);
      expect(rating2.rating).toBe(5);

      // Each user should only see their own rating when querying by user and album
      const user1Rating = await RatingModel.findByUserAndAlbum(testUser1.id, testAlbum.id);
      const user2Rating = await RatingModel.findByUserAndAlbum(testUser2.id, testAlbum.id);

      expect(user1Rating?.rating).toBe(4);
      expect(user2Rating?.rating).toBe(5);

      // Album should show both ratings
      const albumRatings = await RatingModel.findByAlbum(testAlbum.id);
      expect(albumRatings).toHaveLength(2);
      expect(albumRatings.map(r => r.userId)).toContain(testUser1.id);
      expect(albumRatings.map(r => r.userId)).toContain(testUser2.id);
    });

    it('should handle authentication edge cases in rating deletion', async () => {
      // Create a rating
      const rating = await RatingModel.create(testUser1.id, testAlbum.id, 4);

      // Should not be able to delete with invalid user ID
      const deleteResult1 = await RatingModel.deleteByUserAndAlbum('invalid-user-id', testAlbum.id);
      expect(deleteResult1).toBe(false);

      // Rating should still exist
      const stillExists = await RatingModel.findByUserAndAlbum(testUser1.id, testAlbum.id);
      expect(stillExists).not.toBeNull();

      // Should be able to delete with correct user ID
      const deleteResult2 = await RatingModel.deleteByUserAndAlbum(testUser1.id, testAlbum.id);
      expect(deleteResult2).toBe(true);

      // Rating should now be gone
      const shouldBeNull = await RatingModel.findByUserAndAlbum(testUser1.id, testAlbum.id);
      expect(shouldBeNull).toBeNull();
    });
  });
});