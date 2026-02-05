import * as fc from 'fast-check';
import { FollowModel } from './Follow';
import { UserModel } from './User';
import { SocialService } from '@/services/SocialService';
import { connectDatabase, closeDatabase } from '@/config/database';
import { clearTestData } from '@/test/helpers';
import { User } from '@/types';

// Feature: jukeboxd, Property 6: Follow Relationship Management
// **Validates: Requirements 4.2, 4.3, 4.4**

describe('Follow Property-Based Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  // Generator for valid usernames
  const usernameArb = fc.string({ minLength: 3, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9_]+$/.test(s));

  // Generator for valid emails
  const emailArb = fc.emailAddress();

  // Generator for valid passwords
  const passwordArb = fc.string({ minLength: 8, maxLength: 50 });

  // Generator for user data
  const userDataArb = fc.record({
    username: usernameArb,
    email: emailArb,
    password: passwordArb
  });

  describe('Property 6: Follow Relationship Management', () => {
    it('should maintain correct follower/following counts after follow operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 2, maxLength: 5 }),
          fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 1, maxLength: 10 }),
          async (userData, followPairs) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 5));
            const users: User[] = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const user = await UserModel.create(
                `${uniqueUsers[i].username}_${i}`,
                `${i}_${uniqueUsers[i].email}`,
                uniqueUsers[i].password
              );
              users.push(user);
            }

            if (users.length < 2) return true;

            // Track expected counts
            const expectedFollowerCounts = new Map<string, number>();
            const expectedFollowingCounts = new Map<string, number>();
            
            users.forEach(user => {
              expectedFollowerCounts.set(user.id, 0);
              expectedFollowingCounts.set(user.id, 0);
            });

            // Process follow operations
            const processedPairs = new Set<string>();
            
            for (const [followerIdx, followeeIdx] of followPairs) {
              const followerUser = users[followerIdx % users.length];
              const followeeUser = users[followeeIdx % users.length];
              
              // Skip self-follows and duplicates
              if (followerUser.id === followeeUser.id) continue;
              
              const pairKey = `${followerUser.id}-${followeeUser.id}`;
              if (processedPairs.has(pairKey)) continue;
              
              processedPairs.add(pairKey);

              try {
                await SocialService.followUser(followerUser.id, followeeUser.id);
                
                // Update expected counts
                expectedFollowingCounts.set(followerUser.id, 
                  (expectedFollowingCounts.get(followerUser.id) || 0) + 1);
                expectedFollowerCounts.set(followeeUser.id, 
                  (expectedFollowerCounts.get(followeeUser.id) || 0) + 1);
              } catch (error) {
                // Skip if already following
                if (!error.message.includes('already following')) {
                  throw error;
                }
              }
            }

            // Verify counts match expectations
            for (const user of users) {
              const actualFollowerCount = await SocialService.getFollowerCount(user.id);
              const actualFollowingCount = await SocialService.getFollowingCount(user.id);
              
              const expectedFollowerCount = expectedFollowerCounts.get(user.id) || 0;
              const expectedFollowingCount = expectedFollowingCounts.get(user.id) || 0;

              if (actualFollowerCount !== expectedFollowerCount) {
                throw new Error(`Follower count mismatch for user ${user.username}: expected ${expectedFollowerCount}, got ${actualFollowerCount}`);
              }
              
              if (actualFollowingCount !== expectedFollowingCount) {
                throw new Error(`Following count mismatch for user ${user.username}: expected ${expectedFollowingCount}, got ${actualFollowingCount}`);
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should maintain bidirectional consistency in follow relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 2, maxLength: 4 }),
          fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 1, maxLength: 8 }),
          async (userData, followPairs) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 4));
            const users: User[] = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const user = await UserModel.create(
                `${uniqueUsers[i].username}_${i}`,
                `${i}_${uniqueUsers[i].email}`,
                uniqueUsers[i].password
              );
              users.push(user);
            }

            if (users.length < 2) return true;

            // Process follow operations
            const processedPairs = new Set<string>();
            
            for (const [followerIdx, followeeIdx] of followPairs) {
              const followerUser = users[followerIdx % users.length];
              const followeeUser = users[followeeIdx % users.length];
              
              // Skip self-follows and duplicates
              if (followerUser.id === followeeUser.id) continue;
              
              const pairKey = `${followerUser.id}-${followeeUser.id}`;
              if (processedPairs.has(pairKey)) continue;
              
              processedPairs.add(pairKey);

              try {
                await SocialService.followUser(followerUser.id, followeeUser.id);
              } catch (error) {
                // Skip if already following
                if (!error.message.includes('already following')) {
                  throw error;
                }
              }
            }

            // Verify bidirectional consistency
            for (const followerUser of users) {
              const following = await SocialService.getFollowing(followerUser.id);
              
              for (const followedUser of following) {
                // If A follows B, then B should have A in their followers list
                const followersOfB = await SocialService.getFollowers(followedUser.id);
                const isInFollowersList = followersOfB.some(f => f.id === followerUser.id);
                
                if (!isInFollowersList) {
                  throw new Error(`Bidirectional consistency failed: ${followerUser.username} follows ${followedUser.username}, but ${followerUser.username} is not in ${followedUser.username}'s followers list`);
                }

                // Verify isFollowing returns true
                const isFollowing = await SocialService.isFollowing(followerUser.id, followedUser.id);
                if (!isFollowing) {
                  throw new Error(`isFollowing inconsistency: ${followerUser.username} should be following ${followedUser.username}`);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should correctly handle follow/unfollow state transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 2, maxLength: 3 }),
          fc.array(fc.record({
            followerIdx: fc.nat(),
            followeeIdx: fc.nat(),
            action: fc.constantFrom('follow', 'unfollow')
          }), { minLength: 1, maxLength: 10 }),
          async (userData, operations) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 3));
            const users: User[] = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const user = await UserModel.create(
                `${uniqueUsers[i].username}_${i}`,
                `${i}_${uniqueUsers[i].email}`,
                uniqueUsers[i].password
              );
              users.push(user);
            }

            if (users.length < 2) return true;

            // Track current state
            const followingState = new Map<string, Set<string>>();
            users.forEach(user => {
              followingState.set(user.id, new Set());
            });

            // Process operations
            for (const operation of operations) {
              const followerUser = users[operation.followerIdx % users.length];
              const followeeUser = users[operation.followeeIdx % users.length];
              
              // Skip self-operations
              if (followerUser.id === followeeUser.id) continue;

              const followerSet = followingState.get(followerUser.id)!;
              const isCurrentlyFollowing = followerSet.has(followeeUser.id);

              try {
                if (operation.action === 'follow') {
                  if (!isCurrentlyFollowing) {
                    await SocialService.followUser(followerUser.id, followeeUser.id);
                    followerSet.add(followeeUser.id);
                  }
                } else { // unfollow
                  if (isCurrentlyFollowing) {
                    await SocialService.unfollowUser(followerUser.id, followeeUser.id);
                    followerSet.delete(followeeUser.id);
                  }
                }
              } catch (error) {
                // Handle expected errors
                if (operation.action === 'follow' && error.message.includes('already following')) {
                  continue;
                }
                if (operation.action === 'unfollow' && error.message.includes('not following')) {
                  continue;
                }
                throw error;
              }
            }

            // Verify final state matches expectations
            for (const user of users) {
              const expectedFollowing = followingState.get(user.id)!;
              const actualFollowing = await SocialService.getFollowing(user.id);
              const actualFollowingIds = new Set(actualFollowing.map(u => u.id));

              if (expectedFollowing.size !== actualFollowingIds.size) {
                throw new Error(`Following count mismatch for ${user.username}: expected ${expectedFollowing.size}, got ${actualFollowingIds.size}`);
              }

              for (const expectedId of expectedFollowing) {
                if (!actualFollowingIds.has(expectedId)) {
                  throw new Error(`Missing following relationship: ${user.username} should be following user ${expectedId}`);
                }
              }

              for (const actualId of actualFollowingIds) {
                if (!expectedFollowing.has(actualId as string)) {
                  throw new Error(`Unexpected following relationship: ${user.username} should not be following user ${actualId}`);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should prevent self-following across all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 1, maxLength: 5 }),
          async (userData) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 5));
            const users: User[] = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const user = await UserModel.create(
                `${uniqueUsers[i].username}_${i}`,
                `${i}_${uniqueUsers[i].email}`,
                uniqueUsers[i].password
              );
              users.push(user);
            }

            // Try to make each user follow themselves
            for (const user of users) {
              try {
                await SocialService.followUser(user.id, user.id);
                throw new Error(`Self-follow should have been prevented for user ${user.username}`);
              } catch (error) {
                if (!error.message.includes('cannot follow themselves')) {
                  throw new Error(`Unexpected error for self-follow attempt: ${error.message}`);
                }
              }

              // Verify user is not following themselves
              const isFollowing = await SocialService.isFollowing(user.id, user.id);
              if (isFollowing) {
                throw new Error(`User ${user.username} should not be following themselves`);
              }

              // Verify user doesn't appear in their own following list
              const following = await SocialService.getFollowing(user.id);
              const selfInFollowing = following.some(f => f.id === user.id);
              if (selfInFollowing) {
                throw new Error(`User ${user.username} should not appear in their own following list`);
              }

              // Verify user doesn't appear in their own followers list
              const followers = await SocialService.getFollowers(user.id);
              const selfInFollowers = followers.some(f => f.id === user.id);
              if (selfInFollowers) {
                throw new Error(`User ${user.username} should not appear in their own followers list`);
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });
  });
});