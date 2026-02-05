import * as fc from 'fast-check';
import { SocialService } from './SocialService';
import { UserModel } from '@/models/User';
import { connectDatabase, closeDatabase } from '@/config/database';
import { clearTestData } from '@/test/helpers';

// Feature: jukeboxd, Property 10: Profile Information Display
// **Validates: Requirements 6.4, 6.5**

describe('Profile Information Display Property-Based Tests', () => {
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

  describe('Property 10: Profile Information Display', () => {
    it('should display complete profile information with accurate social stats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 1, maxLength: 6 }),
          fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 0, maxLength: 15 }),
          async (userData, followPairs) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 6));
            const users = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const userData = uniqueUsers[i];
              if (!userData) continue;
              
              const user = await UserModel.create(
                `${userData.username}_${i}`,
                `${i}_${userData.email}`,
                userData.password
              );
              users.push(user);
            }

            if (users.length === 0) return true;

            // Create follow relationships
            const processedPairs = new Set<string>();
            const expectedFollowerCounts = new Map<string, number>();
            const expectedFollowingCounts = new Map<string, number>();
            
            users.forEach(user => {
              expectedFollowerCounts.set(user.id, 0);
              expectedFollowingCounts.set(user.id, 0);
            });

            for (const [followerIdx, followeeIdx] of followPairs) {
              if (users.length < 2) break;
              
              const followerUser = users[followerIdx % users.length];
              const followeeUser = users[followeeIdx % users.length];
              
              if (!followerUser || !followeeUser) continue;
              
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
              } catch (error: any) {
                // Skip if already following
                if (!error?.message?.includes('already following')) {
                  throw error;
                }
              }
            }

            // Verify profile information for each user
            for (const user of users) {
              const profile = await SocialService.getUserProfileWithStats(user.id);
              
              // Verify all required profile information is present
              if (!profile.id) {
                throw new Error(`Profile missing id for user ${user.username}`);
              }
              
              if (!profile.username) {
                throw new Error(`Profile missing username for user ${user.username}`);
              }
              
              if (!profile.email) {
                throw new Error(`Profile missing email for user ${user.username}`);
              }
              
              if (!profile.createdAt) {
                throw new Error(`Profile missing createdAt for user ${user.username}`);
              }
              
              if (!profile.updatedAt) {
                throw new Error(`Profile missing updatedAt for user ${user.username}`);
              }

              // Verify profile data matches original user data
              if (profile.id !== user.id) {
                throw new Error(`Profile id mismatch for user ${user.username}: expected ${user.id}, got ${profile.id}`);
              }
              
              if (profile.username !== user.username) {
                throw new Error(`Profile username mismatch for user ${user.username}: expected ${user.username}, got ${profile.username}`);
              }
              
              if (profile.email !== user.email) {
                throw new Error(`Profile email mismatch for user ${user.username}: expected ${user.email}, got ${profile.email}`);
              }

              // Verify social stats are present and accurate
              if (typeof profile.followerCount !== 'number') {
                throw new Error(`Profile missing or invalid followerCount for user ${user.username}`);
              }
              
              if (typeof profile.followingCount !== 'number') {
                throw new Error(`Profile missing or invalid followingCount for user ${user.username}`);
              }

              const expectedFollowerCount = expectedFollowerCounts.get(user.id) || 0;
              const expectedFollowingCount = expectedFollowingCounts.get(user.id) || 0;

              if (profile.followerCount !== expectedFollowerCount) {
                throw new Error(`Profile followerCount mismatch for user ${user.username}: expected ${expectedFollowerCount}, got ${profile.followerCount}`);
              }
              
              if (profile.followingCount !== expectedFollowingCount) {
                throw new Error(`Profile followingCount mismatch for user ${user.username}: expected ${expectedFollowingCount}, got ${profile.followingCount}`);
              }

              // Verify sensitive data is not exposed
              if ('passwordHash' in profile) {
                throw new Error(`Profile should not expose passwordHash for user ${user.username}`);
              }

              // Verify dates are valid Date objects
              if (!(profile.createdAt instanceof Date)) {
                throw new Error(`Profile createdAt should be a Date object for user ${user.username}`);
              }
              
              if (!(profile.updatedAt instanceof Date)) {
                throw new Error(`Profile updatedAt should be a Date object for user ${user.username}`);
              }

              // Verify social stats are non-negative
              if (profile.followerCount < 0) {
                throw new Error(`Profile followerCount should be non-negative for user ${user.username}`);
              }
              
              if (profile.followingCount < 0) {
                throw new Error(`Profile followingCount should be non-negative for user ${user.username}`);
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should maintain profile consistency across multiple profile views', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(userDataArb, { minLength: 1, maxLength: 4 }),
          fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 0, maxLength: 8 }),
          fc.integer({ min: 2, max: 5 }), // Number of times to fetch each profile
          async (userData, followPairs, fetchCount) => {
            // Create unique users
            const uniqueUsers = userData.slice(0, Math.min(userData.length, 4));
            const users = [];
            
            for (let i = 0; i < uniqueUsers.length; i++) {
              const userData = uniqueUsers[i];
              if (!userData) continue;
              
              const user = await UserModel.create(
                `${userData.username}_${i}`,
                `${i}_${userData.email}`,
                userData.password
              );
              users.push(user);
            }

            if (users.length === 0) return true;

            // Create follow relationships
            const processedPairs = new Set<string>();
            
            for (const [followerIdx, followeeIdx] of followPairs) {
              if (users.length < 2) break;
              
              const followerUser = users[followerIdx % users.length];
              const followeeUser = users[followeeIdx % users.length];
              
              if (!followerUser || !followeeUser) continue;
              
              // Skip self-follows and duplicates
              if (followerUser.id === followeeUser.id) continue;
              
              const pairKey = `${followerUser.id}-${followeeUser.id}`;
              if (processedPairs.has(pairKey)) continue;
              
              processedPairs.add(pairKey);

              try {
                await SocialService.followUser(followerUser.id, followeeUser.id);
              } catch (error: any) {
                // Skip if already following
                if (!error?.message?.includes('already following')) {
                  throw error;
                }
              }
            }

            // Fetch each profile multiple times and verify consistency
            for (const user of users) {
              const profiles = [];
              
              for (let i = 0; i < fetchCount; i++) {
                const profile = await SocialService.getUserProfileWithStats(user.id);
                profiles.push(profile);
              }

              // Verify all profile fetches return identical data
              const firstProfile = profiles[0];
              if (!firstProfile) continue;
              
              for (let i = 1; i < profiles.length; i++) {
                const currentProfile = profiles[i];
                if (!currentProfile) continue;
                
                if (currentProfile.id !== firstProfile.id) {
                  throw new Error(`Profile id inconsistency for user ${user.username} on fetch ${i}`);
                }
                
                if (currentProfile.username !== firstProfile.username) {
                  throw new Error(`Profile username inconsistency for user ${user.username} on fetch ${i}`);
                }
                
                if (currentProfile.email !== firstProfile.email) {
                  throw new Error(`Profile email inconsistency for user ${user.username} on fetch ${i}`);
                }
                
                if (currentProfile.followerCount !== firstProfile.followerCount) {
                  throw new Error(`Profile followerCount inconsistency for user ${user.username} on fetch ${i}: expected ${firstProfile.followerCount}, got ${currentProfile.followerCount}`);
                }
                
                if (currentProfile.followingCount !== firstProfile.followingCount) {
                  throw new Error(`Profile followingCount inconsistency for user ${user.username} on fetch ${i}: expected ${firstProfile.followingCount}, got ${currentProfile.followingCount}`);
                }
                
                if (currentProfile.createdAt.getTime() !== firstProfile.createdAt.getTime()) {
                  throw new Error(`Profile createdAt inconsistency for user ${user.username} on fetch ${i}`);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });

    it('should handle edge cases in profile display correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userDataArb,
          async (userData) => {
            // Create a single user
            const user = await UserModel.create(
              `${userData.username}_single`,
              `single_${userData.email}`,
              userData.password
            );

            // Test profile for user with no social connections
            const profile = await SocialService.getUserProfileWithStats(user.id);
            
            // Verify profile has all required fields
            if (!profile.id || !profile.username || !profile.email || !profile.createdAt || !profile.updatedAt) {
              throw new Error(`Profile missing required fields for isolated user ${user.username}`);
            }

            // Verify social stats are zero for isolated user
            if (profile.followerCount !== 0) {
              throw new Error(`Isolated user ${user.username} should have 0 followers, got ${profile.followerCount}`);
            }
            
            if (profile.followingCount !== 0) {
              throw new Error(`Isolated user ${user.username} should be following 0 users, got ${profile.followingCount}`);
            }

            // Verify profile data types
            if (typeof profile.id !== 'string') {
              throw new Error(`Profile id should be string for user ${user.username}`);
            }
            
            if (typeof profile.username !== 'string') {
              throw new Error(`Profile username should be string for user ${user.username}`);
            }
            
            if (typeof profile.email !== 'string') {
              throw new Error(`Profile email should be string for user ${user.username}`);
            }
            
            if (typeof profile.followerCount !== 'number') {
              throw new Error(`Profile followerCount should be number for user ${user.username}`);
            }
            
            if (typeof profile.followingCount !== 'number') {
              throw new Error(`Profile followingCount should be number for user ${user.username}`);
            }

            return true;
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });
  });
});