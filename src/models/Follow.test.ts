import { FollowModel } from './Follow';
import { UserModel } from './User';
import { connectDatabase, closeDatabase } from '@/config/database';
import { clearTestData } from '@/test/helpers';

describe('FollowModel', () => {
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

  describe('create', () => {
    it('should create a follow relationship', async () => {
      const follow = await FollowModel.create(testUser1.id, testUser2.id);

      expect(follow).toBeDefined();
      expect(follow.id).toBeDefined();
      expect(follow.followerId).toBe(testUser1.id);
      expect(follow.followeeId).toBe(testUser2.id);
      expect(follow.createdAt).toBeInstanceOf(Date);
    });

    it('should prevent self-following', async () => {
      await expect(FollowModel.create(testUser1.id, testUser1.id))
        .rejects.toThrow('Users cannot follow themselves');
    });

    it('should prevent duplicate follows', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      
      // Attempting to create the same follow relationship should fail due to unique constraint
      await expect(FollowModel.create(testUser1.id, testUser2.id))
        .rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a follow relationship', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      
      const removed = await FollowModel.remove(testUser1.id, testUser2.id);
      expect(removed).toBe(true);

      const isFollowing = await FollowModel.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(false);
    });

    it('should return false when trying to remove non-existent relationship', async () => {
      const removed = await FollowModel.remove(testUser1.id, testUser2.id);
      expect(removed).toBe(false);
    });
  });

  describe('isFollowing', () => {
    it('should return true when user is following another user', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      
      const isFollowing = await FollowModel.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(true);
    });

    it('should return false when user is not following another user', async () => {
      const isFollowing = await FollowModel.isFollowing(testUser1.id, testUser2.id);
      expect(isFollowing).toBe(false);
    });

    it('should return false for self-follow check', async () => {
      const isFollowing = await FollowModel.isFollowing(testUser1.id, testUser1.id);
      expect(isFollowing).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return followers of a user', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser3.id, testUser2.id);

      const followers = await FollowModel.getFollowers(testUser2.id);
      
      expect(followers).toHaveLength(2);
      expect(followers.map(f => f.id)).toContain(testUser1.id);
      expect(followers.map(f => f.id)).toContain(testUser3.id);
      expect(followers[0]).toHaveProperty('username');
      expect(followers[0]).toHaveProperty('email');
      expect(followers[0]).not.toHaveProperty('passwordHash');
    });

    it('should return empty array when user has no followers', async () => {
      const followers = await FollowModel.getFollowers(testUser1.id);
      expect(followers).toHaveLength(0);
    });
  });

  describe('getFollowing', () => {
    it('should return users that a user is following', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser1.id, testUser3.id);

      const following = await FollowModel.getFollowing(testUser1.id);
      
      expect(following).toHaveLength(2);
      expect(following.map(f => f.id)).toContain(testUser2.id);
      expect(following.map(f => f.id)).toContain(testUser3.id);
      expect(following[0]).toHaveProperty('username');
      expect(following[0]).toHaveProperty('email');
      expect(following[0]).not.toHaveProperty('passwordHash');
    });

    it('should return empty array when user is not following anyone', async () => {
      const following = await FollowModel.getFollowing(testUser1.id);
      expect(following).toHaveLength(0);
    });
  });

  describe('getFollowerCount', () => {
    it('should return correct follower count', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser3.id, testUser2.id);

      const count = await FollowModel.getFollowerCount(testUser2.id);
      expect(count).toBe(2);
    });

    it('should return 0 when user has no followers', async () => {
      const count = await FollowModel.getFollowerCount(testUser1.id);
      expect(count).toBe(0);
    });
  });

  describe('getFollowingCount', () => {
    it('should return correct following count', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser1.id, testUser3.id);

      const count = await FollowModel.getFollowingCount(testUser1.id);
      expect(count).toBe(2);
    });

    it('should return 0 when user is not following anyone', async () => {
      const count = await FollowModel.getFollowingCount(testUser1.id);
      expect(count).toBe(0);
    });
  });

  describe('findById', () => {
    it('should find follow relationship by ID', async () => {
      const createdFollow = await FollowModel.create(testUser1.id, testUser2.id);
      
      const foundFollow = await FollowModel.findById(createdFollow.id);
      
      expect(foundFollow).toBeDefined();
      expect(foundFollow!.id).toBe(createdFollow.id);
      expect(foundFollow!.followerId).toBe(testUser1.id);
      expect(foundFollow!.followeeId).toBe(testUser2.id);
    });

    it('should return null when follow relationship not found', async () => {
      const foundFollow = await FollowModel.findById('non-existent-id');
      expect(foundFollow).toBeNull();
    });
  });

  describe('findByUsers', () => {
    it('should find follow relationship by follower and followee', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      
      const foundFollow = await FollowModel.findByUsers(testUser1.id, testUser2.id);
      
      expect(foundFollow).toBeDefined();
      expect(foundFollow!.followerId).toBe(testUser1.id);
      expect(foundFollow!.followeeId).toBe(testUser2.id);
    });

    it('should return null when follow relationship not found', async () => {
      const foundFollow = await FollowModel.findByUsers(testUser1.id, testUser2.id);
      expect(foundFollow).toBeNull();
    });
  });

  describe('getMutualFollows', () => {
    it('should return mutual followers', async () => {
      // User1 follows User2, User2 follows User1 (mutual)
      await FollowModel.create(testUser1.id, testUser2.id);
      await FollowModel.create(testUser2.id, testUser1.id);
      
      // User1 follows User3, but User3 doesn't follow User1 (not mutual)
      await FollowModel.create(testUser1.id, testUser3.id);

      const mutualFollows = await FollowModel.getMutualFollows(testUser1.id);
      
      expect(mutualFollows).toHaveLength(1);
      expect(mutualFollows[0].id).toBe(testUser2.id);
    });

    it('should return empty array when no mutual follows exist', async () => {
      await FollowModel.create(testUser1.id, testUser2.id);
      
      const mutualFollows = await FollowModel.getMutualFollows(testUser1.id);
      expect(mutualFollows).toHaveLength(0);
    });
  });

  describe('deleteById', () => {
    it('should delete follow relationship by ID', async () => {
      const follow = await FollowModel.create(testUser1.id, testUser2.id);
      
      const deleted = await FollowModel.deleteById(follow.id);
      expect(deleted).toBe(true);

      const foundFollow = await FollowModel.findById(follow.id);
      expect(foundFollow).toBeNull();
    });

    it('should return false when trying to delete non-existent relationship', async () => {
      const deleted = await FollowModel.deleteById('non-existent-id');
      expect(deleted).toBe(false);
    });
  });
});