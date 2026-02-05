import fc from 'fast-check';
import { ActivityFeedService } from './ActivityFeedService';
import { UserModel, AlbumModel, FollowModel, ActivityModel } from '@/models';
import { connectDatabase, closeDatabase } from '@/config/database';

// Feature: jukeboxd, Property 7: Activity Feed Generation
describe('ActivityFeedService Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  /**
   * Property 7: Activity Feed Generation
   * For any user with followed users, their feed should contain recent activities 
   * (ratings and reviews) from those followed users, ordered chronologically 
   * with most recent first
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it('should generate feed with activities from followed users in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 })
        }), { minLength: 2, maxLength: 5 }),
        fc.record({
          spotifyId: fc.string({ minLength: 10, maxLength: 30 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          artist: fc.string({ minLength: 1, maxLength: 100 }),
          releaseDate: fc.date({ min: new Date('1900-01-01'), max: new Date() }),
          imageUrl: fc.webUrl(),
          spotifyUrl: fc.webUrl()
        }),
        fc.array(fc.record({
          type: fc.constantFrom('rating', 'review'),
          data: fc.oneof(
            fc.record({ rating: fc.integer({ min: 1, max: 5 }) }),
            fc.record({ content: fc.string({ minLength: 1, maxLength: 500 }) })
          )
        }), { minLength: 1, maxLength: 10 })
      ),
      async (users, album, activities) => {
        const createdUsers: any[] = [];
        let createdAlbum: any = null;

        try {
          // Create users
          for (const userData of users) {
            const user = await UserModel.create(
              `${userData.username}_${Date.now()}_${Math.random()}`,
              `${Date.now()}_${Math.random()}_${userData.email}`,
              userData.password
            );
            createdUsers.push(user);
          }

          // Create album
          createdAlbum = await AlbumModel.create(
            `${album.spotifyId}_${Date.now()}_${Math.random()}`,
            album.name,
            album.artist,
            album.releaseDate,
            album.imageUrl,
            album.spotifyUrl
          );

          if (createdUsers.length < 2) return;

          const follower = createdUsers[0];
          const followees = createdUsers.slice(1);

          // Create follow relationships
          for (const followee of followees) {
            await FollowModel.create(follower.id, followee.id);
          }

          // Create activities for followed users
          const createdActivities: any[] = [];
          for (let i = 0; i < activities.length; i++) {
            const activity = activities[i];
            const followee = followees[i % followees.length];
            
            // Add small delay to ensure different timestamps
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            if (activity.type === 'rating' && 'rating' in activity.data) {
              const activityRecord = await ActivityFeedService.createRatingActivity(
                followee.id,
                createdAlbum.id,
                activity.data.rating
              );
              createdActivities.push(activityRecord);
            } else if (activity.type === 'review' && 'content' in activity.data) {
              const activityRecord = await ActivityFeedService.createReviewActivity(
                followee.id,
                createdAlbum.id,
                activity.data.content
              );
              createdActivities.push(activityRecord);
            }
          }

          // Get feed for follower
          const feed = await ActivityFeedService.getFeed(follower.id);

          // Property: Feed should contain activities from followed users only
          const feedUserIds = feed.map(activity => activity.userId);
          const followeeIds = followees.map(user => user.id);
          
          for (const userId of feedUserIds) {
            expect(followeeIds).toContain(userId);
          }

          // Property: Feed should be ordered chronologically (most recent first)
          for (let i = 0; i < feed.length - 1; i++) {
            expect(feed[i].createdAt.getTime()).toBeGreaterThanOrEqual(
              feed[i + 1].createdAt.getTime()
            );
          }

          // Property: Feed should contain all created activities
          expect(feed.length).toBe(createdActivities.length);

          // Property: Each activity should have required information (user, album, action, timestamp)
          for (const activity of feed) {
            expect(activity.user).toBeDefined();
            expect(activity.user.username).toBeDefined();
            expect(activity.album).toBeDefined();
            expect(activity.album.name).toBeDefined();
            expect(activity.type).toMatch(/^(rating|review)$/);
            expect(activity.createdAt).toBeInstanceOf(Date);
            expect(activity.data).toBeDefined();
          }

        } finally {
          // Cleanup
          for (const user of createdUsers) {
            await UserModel.deleteById(user.id);
          }
          if (createdAlbum) {
            await AlbumModel.deleteById(createdAlbum.id);
          }
        }
      })
    );
  }, 30000); // Increase timeout for property test

  /**
   * Property: Empty feed when user follows no one
   * **Validates: Requirements 5.5**
   */
  it('should return empty feed when user follows no one', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 })
        })
      ),
      async (userData) => {
        let createdUser: any = null;

        try {
          // Create user
          createdUser = await UserModel.create(
            `${userData.username}_${Date.now()}_${Math.random()}`,
            `${Date.now()}_${Math.random()}_${userData.email}`,
            userData.password
          );

          // Get feed for user who follows no one
          const feed = await ActivityFeedService.getFeed(createdUser.id);

          // Property: Feed should be empty when user follows no one
          expect(feed).toHaveLength(0);

        } finally {
          // Cleanup
          if (createdUser) {
            await UserModel.deleteById(createdUser.id);
          }
        }
      })
    );
  });

  /**
   * Property: Feed pagination should work correctly
   * **Validates: Requirements 5.4**
   */
  it('should handle feed pagination correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          followerData: fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          followeeData: fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          albumData: fc.record({
            spotifyId: fc.string({ minLength: 10, maxLength: 30 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            releaseDate: fc.date({ min: new Date('1900-01-01'), max: new Date() }),
            imageUrl: fc.webUrl(),
            spotifyUrl: fc.webUrl()
          }),
          activityCount: fc.integer({ min: 5, max: 15 }),
          pageSize: fc.integer({ min: 2, max: 5 })
        })
      ),
      async ({ followerData, followeeData, albumData, activityCount, pageSize }) => {
        let follower: any = null;
        let followee: any = null;
        let album: any = null;

        try {
          // Create users
          follower = await UserModel.create(
            `${followerData.username}_${Date.now()}_${Math.random()}`,
            `${Date.now()}_${Math.random()}_${followerData.email}`,
            followerData.password
          );

          followee = await UserModel.create(
            `${followeeData.username}_${Date.now()}_${Math.random()}`,
            `${Date.now()}_${Math.random()}_${followeeData.email}`,
            followeeData.password
          );

          // Create album
          album = await AlbumModel.create(
            `${albumData.spotifyId}_${Date.now()}_${Math.random()}`,
            albumData.name,
            albumData.artist,
            albumData.releaseDate,
            albumData.imageUrl,
            albumData.spotifyUrl
          );

          // Create follow relationship
          await FollowModel.create(follower.id, followee.id);

          // Create activities
          for (let i = 0; i < activityCount; i++) {
            await ActivityFeedService.createRatingActivity(followee.id, album.id, (i % 5) + 1);
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 5));
          }

          // Test pagination
          const firstPage = await ActivityFeedService.getFeedWithPagination(follower.id, 1, pageSize);
          const secondPage = await ActivityFeedService.getFeedWithPagination(follower.id, 2, pageSize);

          // Property: First page should have correct number of items
          expect(firstPage.activities.length).toBeLessThanOrEqual(pageSize);
          expect(firstPage.pagination.page).toBe(1);
          expect(firstPage.pagination.limit).toBe(pageSize);

          // Property: If there are more items than page size, hasMore should be true
          if (activityCount > pageSize) {
            expect(firstPage.pagination.hasMore).toBe(true);
          }

          // Property: Second page should have remaining items
          if (activityCount > pageSize) {
            const expectedSecondPageSize = Math.min(pageSize, activityCount - pageSize);
            expect(secondPage.activities.length).toBeLessThanOrEqual(expectedSecondPageSize);
            expect(secondPage.pagination.page).toBe(2);
          }

          // Property: No duplicate activities across pages
          const firstPageIds = firstPage.activities.map(a => a.id);
          const secondPageIds = secondPage.activities.map(a => a.id);
          const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
          expect(intersection).toHaveLength(0);

        } finally {
          // Cleanup
          if (follower) await UserModel.deleteById(follower.id);
          if (followee) await UserModel.deleteById(followee.id);
          if (album) await AlbumModel.deleteById(album.id);
        }
      })
    );
  }, 45000); // Increase timeout for complex property test
});