import { SocialService } from './SocialService';
import { UserModel } from '@/models/User';
import { FollowModel } from '@/models/Follow';
import { connectDatabase, closeDatabase } from '@/config/database';
import { clearTestData } from '@/test/helpers';

describe('SocialService', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

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
    testUser3 = await UserModel.create('testuser3', 'test3@example.com', 'password123');
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('followUser', () => {
    it('should successfully follow a user', async () => {
      const follow = await SocialService.followUser(testUser1.id, testUser2.id);

      expect(follow).toBeDefined();
      expect(follow.followerId).toBe(testUser1.id);
      expect(follow.followeeId).toBe(testUser2.id);

      const isFollowing = await SocialService.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(true);
    });

    it('should throw error when follower does not exist', async () => {
      await expect(SocialService.followUser('non-existent-id', testUser2.id))
        .rejects.toThrow('Follower user not found');
    });

    it('should throw error when followee does not exist', async () => {
      await expect(SocialService.followUser(testUser1.id, 'non-existent-id'))
        .rejects.toThrow('User to follow not found');
    });

    it('should throw error when trying to follow same user twice', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      
      await expect(SocialService.followUser(testUser1.id, testUser2.id))
        .rejects.toThrow('User is already following this user');
    });

    it('should throw error when trying to follow self', async () => {
      await expect(SocialService.followUser(testUser1.id, testUser1.id))
        .rejects.toThrow('Users cannot follow themselves');
    });
  });

  describe('unfollowUser', () => {
    it('should successfully unfollow a user', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      
      const result = await SocialService.unfollowUser(testUser1.id, testUser2.id);
      expect(result).toBe(true);

      const isFollowing = await SocialService.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(false);
    });

    it('should throw error when trying to unfollow user not being followed', async () => {
      await expect(SocialService.unfollowUser(testUser1.id, testUser2.id))
        .rejects.toThrow('User is not following this user');
    });
  });

  describe('getFollowers', () => {
    it('should return followers of a user', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser3.id, testUser2.id);

      const followers = await SocialService.getFollowers(testUser2.id);
      
      expect(followers).toHaveLength(2);
      expect(followers.map(f => f.id)).toContain(testUser1.id);
      expect(followers.map(f => f.id)).toContain(testUser3.id);
    });

    it('should throw error when user does not exist', async () => {
      await expect(SocialService.getFollowers('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getFollowing', () => {
    it('should return users that a user is following', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser1.id, testUser3.id);

      const following = await SocialService.getFollowing(testUser1.id);
      
      expect(following).toHaveLength(2);
      expect(following.map(f => f.id)).toContain(testUser2.id);
      expect(following.map(f => f.id)).toContain(testUser3.id);
    });

    it('should throw error when user does not exist', async () => {
      await expect(SocialService.getFollowing('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('isFollowing', () => {
    it('should return true when user is following another user', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      
      const isFollowing = await SocialService.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(true);
    });

    it('should return false when user is not following another user', async () => {
      const isFollowing = await SocialService.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(false);
    });
  });

  describe('getFollowerCount', () => {
    it('should return correct follower count', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser3.id, testUser2.id);

      const count = await SocialService.getFollowerCount(testUser2.id);
      expect(count).toBe(2);
    });

    it('should return 0 when user has no followers', async () => {
      const count = await SocialService.getFollowerCount(testUser1.id);
      expect(count).toBe(0);
    });
  });

  describe('getFollowingCount', () => {
    it('should return correct following count', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser1.id, testUser3.id);

      const count = await SocialService.getFollowingCount(testUser1.id);
      expect(count).toBe(2);
    });

    it('should return 0 when user is not following anyone', async () => {
      const count = await SocialService.getFollowingCount(testUser1.id);
      expect(count).toBe(0);
    });
  });

  describe('getUserProfileWithStats', () => {
    it('should return user profile with social stats', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser3.id, testUser2.id);
      await SocialService.followUser(testUser2.id, testUser1.id);

      const profile = await SocialService.getUserProfileWithStats(testUser2.id);
      
      expect(profile.id).toBe(testUser2.id);
      expect(profile.username).toBe(testUser2.username);
      expect(profile.followerCount).toBe(2);
      expect(profile.followingCount).toBe(1);
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('should throw error when user does not exist', async () => {
      await expect(SocialService.getUserProfileWithStats('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getMutualFollows', () => {
    it('should return mutual followers', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);
      await SocialService.followUser(testUser2.id, testUser1.id);
      await SocialService.followUser(testUser1.id, testUser3.id);

      const mutualFollows = await SocialService.getMutualFollows(testUser1.id);
      
      expect(mutualFollows).toHaveLength(1);
      expect(mutualFollows[0].id).toBe(testUser2.id);
    });

    it('should throw error when user does not exist', async () => {
      await expect(SocialService.getMutualFollows('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getFollowSuggestions', () => {
    it('should return users not already followed', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);

      const suggestions = await SocialService.getFollowSuggestions(testUser1.id, 10);
      
      expect(suggestions.map(s => s.id)).toContain(testUser3.id);
      expect(suggestions.map(s => s.id)).not.toContain(testUser1.id); // Should not suggest self
      expect(suggestions.map(s => s.id)).not.toContain(testUser2.id); // Should not suggest already followed
    });

    it('should respect limit parameter', async () => {
      const suggestions = await SocialService.getFollowSuggestions(testUser1.id, 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('isFollowingMultiple', () => {
    it('should return correct following status for multiple users', async () => {
      await SocialService.followUser(testUser1.id, testUser2.id);

      const status = await SocialService.isFollowingMultiple(testUser1.id, [testUser2.id, testUser3.id]);
      
      expect(status[testUser2.id]).toBe(true);
      expect(status[testUser3.id]).toBe(false);
    });

    it('should return empty object for empty array', async () => {
      const status = await SocialService.isFollowingMultiple(testUser1.id, []);
      expect(status).toEqual({});
    });
  });
});