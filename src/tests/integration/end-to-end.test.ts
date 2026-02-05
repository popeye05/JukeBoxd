/**
 * End-to-End Integration Tests
 * 
 * These tests validate complete system integration with real database operations:
 * 1. Full stack user registration and authentication
 * 2. Complete album discovery, rating, and review workflows
 * 3. Social following and activity feed generation
 * 4. Data persistence and consistency across operations
 * 
 * **Validates: Requirements 1, 2, 3, 4, 5, 6, 7, 8**
 */

import request from 'supertest';
import { app } from '@/server';
import { clearTestData, createTestUser, createTestAlbum } from '@/test/helpers';
import { User, Album } from '@/types';
import { query } from '@/config/database';
import fc from 'fast-check';

describe('End-to-End Integration Tests', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    await clearTestData();
  });

  describe('Complete User Journey: Registration to Social Interaction', () => {
    it('should handle complete user lifecycle from registration to social interactions', async () => {
      // === PHASE 1: User Registration and Authentication ===
      const user1Data = {
        username: 'musiclover1',
        email: 'musiclover1@test.com',
        password: 'securePass123!'
      };

      const user2Data = {
        username: 'musiclover2',
        email: 'musiclover2@test.com',
        password: 'securePass456!'
      };

      // Register two users
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send(user1Data)
        .expect(201);

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send(user2Data)
        .expect(201);

      const user1Token = user1Response.body.data.token;
      const user2Token = user2Response.body.data.token;
      const user1 = user1Response.body.data.user;
      const user2 = user2Response.body.data.user;

      // Verify users can access their profiles
      const user1Profile = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user1Profile.body.data.user.username).toBe(user1Data.username);

      // === PHASE 2: Album Discovery and Content Creation ===
      
      // Create test albums in database
      const album1 = await createTestAlbum({
        name: 'Thriller',
        artist: 'Michael Jackson',
        spotifyId: 'thriller-spotify-id'
      });

      const album2 = await createTestAlbum({
        name: 'Abbey Road',
        artist: 'The Beatles',
        spotifyId: 'abbey-road-spotify-id'
      });

      // User1 discovers and rates albums
      const album1Details = await request(app)
        .get(`/api/albums/${album1.spotifyId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(album1Details.body.data.album.name).toBe('Thriller');

      // User1 rates album1
      const rating1Response = await request(app)
        .post('/api/ratings')
        .send({ albumId: album1.id, rating: 5 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(rating1Response.body.data.rating.rating).toBe(5);

      // User1 reviews album1
      const review1Response = await request(app)
        .post('/api/reviews')
        .send({ 
          albumId: album1.id, 
          content: 'Absolutely legendary album! The production quality is incredible and every track is a masterpiece.' 
        })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(review1Response.body.data.review.content).toContain('legendary album');

      // User2 rates and reviews album2
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album2.id, rating: 4 })
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ 
          albumId: album2.id, 
          content: 'Classic Beatles at their finest. The harmonies and songwriting are unmatched.' 
        })
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(201);

      // === PHASE 3: Social Following and Feed Generation ===

      // User1 follows User2
      const followResponse = await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(followResponse.body.data.follow.followerId).toBe(user1.id);
      expect(followResponse.body.data.follow.followeeId).toBe(user2.id);

      // Verify follow relationship
      const followingResponse = await request(app)
        .get(`/api/social/following/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(followingResponse.body.data.following).toHaveLength(1);
      expect(followingResponse.body.data.following[0].id).toBe(user2.id);

      const followersResponse = await request(app)
        .get(`/api/social/followers/${user2.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(followersResponse.body.data.followers).toHaveLength(1);
      expect(followersResponse.body.data.followers[0].id).toBe(user1.id);

      // === PHASE 4: Activity Feed Verification ===

      // User1 should see User2's activities in their feed
      const feedResponse = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(feedResponse.body.data.activities.length).toBeGreaterThan(0);
      
      // All activities should be from User2
      const user2Activities = feedResponse.body.data.activities.filter(
        (activity: any) => activity.userId === user2.id
      );
      expect(user2Activities.length).toBe(2); // 1 rating + 1 review

      // Verify activity details
      const ratingActivity = user2Activities.find((a: any) => a.type === 'rating');
      const reviewActivity = user2Activities.find((a: any) => a.type === 'review');

      expect(ratingActivity).toBeTruthy();
      expect(ratingActivity.data.rating).toBe(4);
      expect(ratingActivity.albumId).toBe(album2.id);

      expect(reviewActivity).toBeTruthy();
      expect(reviewActivity.data.content).toContain('Classic Beatles');
      expect(reviewActivity.albumId).toBe(album2.id);

      // === PHASE 5: Profile Statistics Verification ===

      // Check User1's profile stats
      const user1ProfileStats = await request(app)
        .get(`/api/social/profile/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user1ProfileStats.body.data.profile.followingCount).toBe(1);
      expect(user1ProfileStats.body.data.profile.followersCount).toBe(0);
      expect(user1ProfileStats.body.data.profile.ratingsCount).toBe(1);
      expect(user1ProfileStats.body.data.profile.reviewsCount).toBe(1);

      // Check User2's profile stats
      const user2ProfileStats = await request(app)
        .get(`/api/social/profile/${user2.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2ProfileStats.body.data.profile.followingCount).toBe(0);
      expect(user2ProfileStats.body.data.profile.followersCount).toBe(1);
      expect(user2ProfileStats.body.data.profile.ratingsCount).toBe(1);
      expect(user2ProfileStats.body.data.profile.reviewsCount).toBe(1);

      // === PHASE 6: Album Statistics Verification ===

      // Check album1 ratings and reviews
      const album1Ratings = await request(app)
        .get(`/api/albums/${album1.spotifyId}/ratings`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(album1Ratings.body.data.ratings).toHaveLength(1);
      expect(album1Ratings.body.data.averageRating).toBe(5);

      const album1Reviews = await request(app)
        .get(`/api/albums/${album1.spotifyId}/reviews`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(album1Reviews.body.data.reviews).toHaveLength(1);
      expect(album1Reviews.body.data.reviews[0].content).toContain('legendary album');

      // === PHASE 7: Data Persistence Verification ===

      // Verify data persists in database
      const dbUsers = await query('SELECT * FROM users ORDER BY created_at');
      expect(dbUsers.rows).toHaveLength(2);

      const dbAlbums = await query('SELECT * FROM albums ORDER BY created_at');
      expect(dbAlbums.rows).toHaveLength(2);

      const dbRatings = await query('SELECT * FROM ratings ORDER BY created_at');
      expect(dbRatings.rows).toHaveLength(2);

      const dbReviews = await query('SELECT * FROM reviews ORDER BY created_at');
      expect(dbReviews.rows).toHaveLength(2);

      const dbFollows = await query('SELECT * FROM follows ORDER BY created_at');
      expect(dbFollows.rows).toHaveLength(1);

      const dbActivities = await query('SELECT * FROM activities ORDER BY created_at');
      expect(dbActivities.rows).toHaveLength(4); // 2 ratings + 2 reviews

      // === PHASE 8: Unfollow and Feed Update ===

      // User1 unfollows User2
      await request(app)
        .delete(`/api/social/follow/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // User1's feed should now be empty
      const emptyFeedResponse = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(emptyFeedResponse.body.data.activities).toHaveLength(0);

      // Follow relationship should be removed from database
      const dbFollowsAfterUnfollow = await query('SELECT * FROM follows');
      expect(dbFollowsAfterUnfollow.rows).toHaveLength(0);
    });
  });

  describe('Data Consistency and Edge Cases', () => {
    it('should maintain referential integrity during complex operations', async () => {
      // Create users and albums
      const user = await createTestUser();
      const album = await createTestAlbum();

      // Login user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user.username, password: 'password123' });
      const token = loginResponse.body.data.token;

      // Create rating and review
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 3 })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ albumId: album.id, content: 'Decent album' })
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Update rating multiple times
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 4 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 5 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify only one rating exists in database
      const dbRatings = await query('SELECT * FROM ratings WHERE user_id = $1 AND album_id = $2', [user.id, album.id]);
      expect(dbRatings.rows).toHaveLength(1);
      expect(dbRatings.rows[0].rating).toBe(5);

      // Verify activities are created for each rating update
      const dbActivities = await query('SELECT * FROM activities WHERE user_id = $1 AND type = $2', [user.id, 'rating']);
      expect(dbActivities.rows.length).toBeGreaterThan(0);
    });

    it('should handle concurrent user operations correctly', async () => {
      const user1 = await createTestUser({ username: 'concurrent1', email: 'concurrent1@test.com' });
      const user2 = await createTestUser({ username: 'concurrent2', email: 'concurrent2@test.com' });
      const album = await createTestAlbum();

      // Login both users
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user1.username, password: 'password123' });
      const token1 = login1.body.data.token;

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user2.username, password: 'password123' });
      const token2 = login2.body.data.token;

      // Concurrent operations
      const operations = await Promise.allSettled([
        // User1 rates album
        request(app)
          .post('/api/ratings')
          .send({ albumId: album.id, rating: 5 })
          .set('Authorization', `Bearer ${token1}`),
        
        // User2 rates same album
        request(app)
          .post('/api/ratings')
          .send({ albumId: album.id, rating: 3 })
          .set('Authorization', `Bearer ${token2}`),
        
        // User1 follows User2
        request(app)
          .post('/api/social/follow')
          .send({ userId: user2.id })
          .set('Authorization', `Bearer ${token1}`),
        
        // User2 reviews album
        request(app)
          .post('/api/reviews')
          .send({ albumId: album.id, content: 'Concurrent review' })
          .set('Authorization', `Bearer ${token2}`)
      ]);

      // All operations should succeed
      operations.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(200);
          expect(result.value.status).toBeLessThan(300);
        }
      });

      // Verify database consistency
      const dbRatings = await query('SELECT * FROM ratings WHERE album_id = $1', [album.id]);
      expect(dbRatings.rows).toHaveLength(2);

      const dbReviews = await query('SELECT * FROM reviews WHERE album_id = $1', [album.id]);
      expect(dbReviews.rows).toHaveLength(1);

      const dbFollows = await query('SELECT * FROM follows WHERE follower_id = $1', [user1.id]);
      expect(dbFollows.rows).toHaveLength(1);
    });

    it('should handle account deletion with proper cleanup', async () => {
      const user1 = await createTestUser({ username: 'todelete1', email: 'todelete1@test.com' });
      const user2 = await createTestUser({ username: 'todelete2', email: 'todelete2@test.com' });
      const album = await createTestAlbum();

      // Login users
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user1.username, password: 'password123' });
      const token1 = login1.body.data.token;

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user2.username, password: 'password123' });
      const token2 = login2.body.data.token;

      // Create user data
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 4 })
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ albumId: album.id, content: 'Review before deletion' })
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      // Verify data exists
      const beforeDeletion = await Promise.all([
        query('SELECT * FROM ratings WHERE user_id = $1', [user1.id]),
        query('SELECT * FROM reviews WHERE user_id = $1', [user1.id]),
        query('SELECT * FROM follows WHERE follower_id = $1', [user1.id]),
        query('SELECT * FROM activities WHERE user_id = $1', [user1.id])
      ]);

      beforeDeletion.forEach(result => {
        expect(result.rows.length).toBeGreaterThan(0);
      });

      // Delete account
      await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      // Verify user data is cleaned up
      const afterDeletion = await Promise.all([
        query('SELECT * FROM users WHERE id = $1', [user1.id]),
        query('SELECT * FROM ratings WHERE user_id = $1', [user1.id]),
        query('SELECT * FROM reviews WHERE user_id = $1', [user1.id]),
        query('SELECT * FROM follows WHERE follower_id = $1', [user1.id]),
        query('SELECT * FROM activities WHERE user_id = $1', [user1.id])
      ]);

      afterDeletion.forEach(result => {
        expect(result.rows).toHaveLength(0);
      });

      // Verify token is invalidated
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(401);
    });
  });

  describe('Property-Based End-to-End Tests', () => {
    it('should handle various user registration scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 })
          }),
          async (userData) => {
            await clearTestData();
            
            const response = await request(app)
              .post('/api/auth/register')
              .send(userData);

            if (response.status === 201) {
              expect(response.body.data.user.username).toBe(userData.username);
              expect(response.body.data.user.email).toBe(userData.email);
              expect(response.body.data).toHaveProperty('token');

              // Verify user can authenticate
              const profileResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${response.body.data.token}`);

              expect(profileResponse.status).toBe(200);
              expect(profileResponse.body.data.user.id).toBe(response.body.data.user.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle various rating and review combinations', async () => {
      const user = await createTestUser();
      const album = await createTestAlbum();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user.username, password: 'password123' });
      const token = loginResponse.body.data.token;

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            rating: fc.integer({ min: 1, max: 5 }),
            reviewContent: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0)
          }),
          async (data) => {
            // Rate album
            const ratingResponse = await request(app)
              .post('/api/ratings')
              .send({ albumId: album.id, rating: data.rating })
              .set('Authorization', `Bearer ${token}`);

            expect(ratingResponse.status).toBe(200); // Update existing rating
            expect(ratingResponse.body.data.rating.rating).toBe(data.rating);

            // Review album
            const reviewResponse = await request(app)
              .post('/api/reviews')
              .send({ albumId: album.id, content: data.reviewContent })
              .set('Authorization', `Bearer ${token}`);

            expect(reviewResponse.status).toBe(200); // Update existing review
            expect(reviewResponse.body.data.review.content).toBe(data.reviewContent);

            // Verify activities are created
            const activitiesResponse = await request(app)
              .get(`/api/feed/user/${user.id}`)
              .set('Authorization', `Bearer ${token}`);

            expect(activitiesResponse.status).toBe(200);
            expect(activitiesResponse.body.data.activities.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain feed consistency across follow/unfollow operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 5, maxLength: 10 }),
          async (followActions) => {
            await clearTestData();
            
            const user1 = await createTestUser({ username: 'follower', email: 'follower@test.com' });
            const user2 = await createTestUser({ username: 'followee', email: 'followee@test.com' });
            const album = await createTestAlbum();

            const login1 = await request(app)
              .post('/api/auth/login')
              .send({ usernameOrEmail: user1.username, password: 'password123' });
            const token1 = login1.body.data.token;

            const login2 = await request(app)
              .post('/api/auth/login')
              .send({ usernameOrEmail: user2.username, password: 'password123' });
            const token2 = login2.body.data.token;

            // User2 creates some activity
            await request(app)
              .post('/api/ratings')
              .send({ albumId: album.id, rating: 4 })
              .set('Authorization', `Bearer ${token2}`);

            let isFollowing = false;

            // Perform follow/unfollow actions
            for (const shouldFollow of followActions) {
              if (shouldFollow && !isFollowing) {
                // Follow
                const followResponse = await request(app)
                  .post('/api/social/follow')
                  .send({ userId: user2.id })
                  .set('Authorization', `Bearer ${token1}`);
                
                if (followResponse.status === 201) {
                  isFollowing = true;
                }
              } else if (!shouldFollow && isFollowing) {
                // Unfollow
                const unfollowResponse = await request(app)
                  .delete(`/api/social/follow/${user2.id}`)
                  .set('Authorization', `Bearer ${token1}`);
                
                if (unfollowResponse.status === 200) {
                  isFollowing = false;
                }
              }

              // Check feed consistency
              const feedResponse = await request(app)
                .get('/api/feed')
                .set('Authorization', `Bearer ${token1}`);

              expect(feedResponse.status).toBe(200);

              if (isFollowing) {
                // Should see user2's activities
                const user2Activities = feedResponse.body.data.activities.filter(
                  (activity: any) => activity.userId === user2.id
                );
                expect(user2Activities.length).toBeGreaterThan(0);
              } else {
                // Should not see user2's activities
                const user2Activities = feedResponse.body.data.activities.filter(
                  (activity: any) => activity.userId === user2.id
                );
                expect(user2Activities.length).toBe(0);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});