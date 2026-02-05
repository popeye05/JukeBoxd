/**
 * Integration Tests for Critical User Journeys
 * 
 * These tests validate complete end-to-end user workflows:
 * 1. User Registration and Login Flow
 * 2. Album Discovery and Rating Workflow  
 * 3. Social Following and Feed Generation Workflow
 * 
 * **Validates: Requirements 1, 2, 3, 4, 5, 6**
 */

import request from 'supertest';
import { app } from '@/server';
import { clearTestData, createTestUser, createTestAlbum } from '@/test/helpers';
import { User, Album, AuthToken } from '@/types';
import fc from 'fast-check';

describe('Critical User Journeys Integration Tests', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    await clearTestData();
  });

  describe('Journey 1: User Registration and Login Flow', () => {
    it('should complete full registration and login workflow', async () => {
      const userData = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'securePassword123!'
      };

      // Step 1: User Registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.data).toHaveProperty('token');
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data.user.username).toBe(userData.username);
      expect(registerResponse.body.data.user.email).toBe(userData.email);

      const { token: registerToken, user: registeredUser } = registerResponse.body.data;

      // Step 2: Verify authenticated access works
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(profileResponse.body.data.user.id).toBe(registeredUser.id);

      // Step 3: Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      // Step 4: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: userData.username,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.data).toHaveProperty('token');
      expect(loginResponse.body.data.user.username).toBe(userData.username);

      // Step 5: Verify new token works
      const verifyResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(verifyResponse.body.data.user.id).toBe(registeredUser.id);
    });

    it('should handle login with email instead of username', async () => {
      const userData = {
        username: 'emailuser',
        email: 'email@test.com',
        password: 'password123'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login with email
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.data.user.email).toBe(userData.email);
    });

    it('should reject invalid credentials', async () => {
      const userData = {
        username: 'validuser',
        email: 'valid@test.com',
        password: 'correctpassword'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try login with wrong password
      await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: userData.username,
          password: 'wrongpassword'
        })
        .expect(401);

      // Try login with non-existent user
      await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'nonexistent',
          password: 'anypassword'
        })
        .expect(401);
    });

    it('should prevent duplicate registrations', async () => {
      const userData = {
        username: 'duplicate',
        email: 'duplicate@test.com',
        password: 'password123'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same username should fail
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      // Registration with same email but different username should fail
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'different',
          email: userData.email,
          password: 'password123'
        })
        .expect(409);
    });
  });

  describe('Journey 2: Album Discovery and Rating Workflow', () => {
    let authToken: string;
    let user: User;
    let testAlbum: Album;

    beforeEach(async () => {
      // Create authenticated user
      user = await createTestUser();
      testAlbum = await createTestAlbum();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: user.username,
          password: 'password123'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should complete album search, rating, and review workflow', async () => {
      // Step 1: Search for albums (mocked Spotify response)
      const searchResponse = await request(app)
        .get('/api/albums/search')
        .query({ q: 'test album' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.data).toHaveProperty('albums');
      expect(Array.isArray(searchResponse.body.data.albums)).toBe(true);

      // Step 2: Get album details
      const albumResponse = await request(app)
        .get(`/api/albums/${testAlbum.spotifyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(albumResponse.body.data.album.name).toBe(testAlbum.name);

      // Step 3: Rate the album
      const ratingData = {
        albumId: testAlbum.id,
        rating: 4
      };

      const ratingResponse = await request(app)
        .post('/api/ratings')
        .send(ratingData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(ratingResponse.body.data.rating.rating).toBe(4);
      expect(ratingResponse.body.data.rating.userId).toBe(user.id);

      // Step 4: Write a review
      const reviewData = {
        albumId: testAlbum.id,
        content: 'This is an amazing album with great production quality!'
      };

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(reviewResponse.body.data.review.content).toBe(reviewData.content);
      expect(reviewResponse.body.data.review.userId).toBe(user.id);

      // Step 5: Verify album now shows rating and review
      const updatedAlbumResponse = await request(app)
        .get(`/api/albums/${testAlbum.spotifyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedAlbumResponse.body.data.userRating).toBe(4);
      expect(updatedAlbumResponse.body.data.userReview).toBeTruthy();

      // Step 6: Get album ratings and reviews
      const ratingsResponse = await request(app)
        .get(`/api/albums/${testAlbum.spotifyId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(ratingsResponse.body.data.ratings).toHaveLength(1);
      expect(ratingsResponse.body.data.averageRating).toBe(4);

      const reviewsResponse = await request(app)
        .get(`/api/albums/${testAlbum.spotifyId}/reviews`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(reviewsResponse.body.data.reviews).toHaveLength(1);
      expect(reviewsResponse.body.data.reviews[0].content).toBe(reviewData.content);
    });

    it('should allow updating existing ratings and reviews', async () => {
      // Create initial rating and review
      await request(app)
        .post('/api/ratings')
        .send({ albumId: testAlbum.id, rating: 3 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .send({ albumId: testAlbum.id, content: 'Initial review' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const reviewId = reviewResponse.body.data.review.id;

      // Update rating
      const updatedRatingResponse = await request(app)
        .post('/api/ratings')
        .send({ albumId: testAlbum.id, rating: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedRatingResponse.body.data.rating.rating).toBe(5);

      // Update review
      const updatedReviewResponse = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .send({ content: 'Updated review with more details' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedReviewResponse.body.data.review.content).toBe('Updated review with more details');
    });

    it('should prevent unauthorized rating and review actions', async () => {
      // Try to rate without authentication
      await request(app)
        .post('/api/ratings')
        .send({ albumId: testAlbum.id, rating: 4 })
        .expect(401);

      // Try to review without authentication
      await request(app)
        .post('/api/reviews')
        .send({ albumId: testAlbum.id, content: 'Unauthorized review' })
        .expect(401);
    });

    it('should validate rating values', async () => {
      // Invalid rating values
      const invalidRatings = [0, 6, -1, 10];

      for (const rating of invalidRatings) {
        await request(app)
          .post('/api/ratings')
          .send({ albumId: testAlbum.id, rating })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      }
    });

    it('should reject empty or whitespace-only reviews', async () => {
      const invalidReviews = ['', '   ', '\t\n  ', '     \n\n\t   '];

      for (const content of invalidReviews) {
        await request(app)
          .post('/api/reviews')
          .send({ albumId: testAlbum.id, content })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      }
    });
  });

  describe('Journey 3: Social Following and Feed Generation Workflow', () => {
    let user1Token: string, user2Token: string, user3Token: string;
    let user1: User, user2: User, user3: User;
    let album1: Album, album2: Album;

    beforeEach(async () => {
      // Create test users
      user1 = await createTestUser({ username: 'user1', email: 'user1@test.com' });
      user2 = await createTestUser({ username: 'user2', email: 'user2@test.com' });
      user3 = await createTestUser({ username: 'user3', email: 'user3@test.com' });

      // Create test albums
      album1 = await createTestAlbum({ name: 'Album 1', artist: 'Artist 1' });
      album2 = await createTestAlbum({ name: 'Album 2', artist: 'Artist 2' });

      // Get auth tokens
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user1.username, password: 'password123' });
      user1Token = login1.body.data.token;

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user2.username, password: 'password123' });
      user2Token = login2.body.data.token;

      const login3 = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user3.username, password: 'password123' });
      user3Token = login3.body.data.token;
    });

    it('should complete social following and feed generation workflow', async () => {
      // Step 1: User1 follows User2 and User3
      const followUser2Response = await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(followUser2Response.body.data.follow.followerId).toBe(user1.id);
      expect(followUser2Response.body.data.follow.followeeId).toBe(user2.id);

      await request(app)
        .post('/api/social/follow')
        .send({ userId: user3.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Step 2: Verify follow relationships
      const followingResponse = await request(app)
        .get(`/api/social/following/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(followingResponse.body.data.following).toHaveLength(2);
      expect(followingResponse.body.data.count).toBe(2);

      const followersResponse = await request(app)
        .get(`/api/social/followers/${user2.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(followersResponse.body.data.followers).toHaveLength(1);
      expect(followersResponse.body.data.followers[0].id).toBe(user1.id);

      // Step 3: User2 and User3 create activities (ratings and reviews)
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album1.id, rating: 5 })
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ albumId: album1.id, content: 'Amazing album by User2!' })
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(201);

      await request(app)
        .post('/api/ratings')
        .send({ albumId: album2.id, rating: 4 })
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ albumId: album2.id, content: 'Great music by User3!' })
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(201);

      // Step 4: User1 checks their personalized feed
      const feedResponse = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(feedResponse.body.data.activities).toHaveLength(4); // 2 ratings + 2 reviews
      
      // Verify activities are from followed users only
      const userIds = feedResponse.body.data.activities.map((activity: any) => activity.userId);
      expect(userIds).toContain(user2.id);
      expect(userIds).toContain(user3.id);
      expect(userIds).not.toContain(user1.id);

      // Verify chronological ordering (most recent first)
      const timestamps = feedResponse.body.data.activities.map((activity: any) => 
        new Date(activity.createdAt).getTime()
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i-1]).toBeGreaterThanOrEqual(timestamps[i]);
      }

      // Step 5: Check individual user feeds
      const user2FeedResponse = await request(app)
        .get(`/api/feed/user/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user2FeedResponse.body.data.activities).toHaveLength(2);
      expect(user2FeedResponse.body.data.userId).toBe(user2.id);

      // Step 6: Test unfollow functionality
      await request(app)
        .delete(`/api/social/follow/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Verify User2's activities no longer appear in User1's feed
      const updatedFeedResponse = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const updatedUserIds = updatedFeedResponse.body.data.activities.map((activity: any) => activity.userId);
      expect(updatedUserIds).not.toContain(user2.id);
      expect(updatedUserIds).toContain(user3.id);
    });

    it('should show empty feed message for users with no follows', async () => {
      // User1 has no follows, should get empty feed message
      const emptyFeedResponse = await request(app)
        .get('/api/feed')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(emptyFeedResponse.body.data.activities).toHaveLength(0);
      expect(emptyFeedResponse.body.data.pagination.hasMore).toBe(false);
    });

    it('should prevent self-following', async () => {
      await request(app)
        .post('/api/social/follow')
        .send({ userId: user1.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);
    });

    it('should handle duplicate follow attempts', async () => {
      // First follow should succeed
      await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Second follow attempt should be handled gracefully
      await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(409);
    });

    it('should update follower/following counts correctly', async () => {
      // Initial counts should be zero
      const initialProfile = await request(app)
        .get(`/api/social/profile/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(initialProfile.body.data.profile.followingCount).toBe(0);
      expect(initialProfile.body.data.profile.followersCount).toBe(0);

      // User1 follows User2
      await request(app)
        .post('/api/social/follow')
        .send({ userId: user2.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      // Check updated counts
      const user1Profile = await request(app)
        .get(`/api/social/profile/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2Profile = await request(app)
        .get(`/api/social/profile/${user2.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user1Profile.body.data.profile.followingCount).toBe(1);
      expect(user2Profile.body.data.profile.followersCount).toBe(1);
    });
  });

  describe('Cross-Journey Integration', () => {
    let userToken: string;
    let user: User;
    let album: Album;

    beforeEach(async () => {
      user = await createTestUser();
      album = await createTestAlbum();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user.username, password: 'password123' });
      userToken = loginResponse.body.data.token;
    });

    it('should maintain data consistency across all user actions', async () => {
      // Create rating and review
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 5 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      await request(app)
        .post('/api/reviews')
        .send({ albumId: album.id, content: 'Excellent album!' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // Verify user profile shows correct activity counts
      const profileResponse = await request(app)
        .get(`/api/social/profile/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(profileResponse.body.data.profile.ratingsCount).toBe(1);
      expect(profileResponse.body.data.profile.reviewsCount).toBe(1);

      // Verify user's public feed shows their activities
      const userFeedResponse = await request(app)
        .get(`/api/feed/user/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(userFeedResponse.body.data.activities).toHaveLength(2);
    });

    it('should handle account deletion properly', async () => {
      // Create some user data
      await request(app)
        .post('/api/ratings')
        .send({ albumId: album.id, rating: 4 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // Delete account
      await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify token is no longer valid
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      // Verify user profile is no longer accessible
      await request(app)
        .get(`/api/social/profile/${user.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
    });
  });

  describe('Property-Based Integration Tests', () => {
    it('should handle various user registration inputs correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 100 }),
          async (username, email, password) => {
            await clearTestData();
            
            const response = await request(app)
              .post('/api/auth/register')
              .send({ username, email, password });

            if (response.status === 201) {
              expect(response.body.data.user.username).toBe(username);
              expect(response.body.data.user.email).toBe(email);
              expect(response.body.data).toHaveProperty('token');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle various rating values correctly', async () => {
      const user = await createTestUser();
      const album = await createTestAlbum();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user.username, password: 'password123' });
      const token = loginResponse.body.data.token;

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (rating) => {
            const response = await request(app)
              .post('/api/ratings')
              .send({ albumId: album.id, rating })
              .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(201);
            expect(response.body.data.rating.rating).toBe(rating);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle various review content correctly', async () => {
      const user = await createTestUser();
      const album = await createTestAlbum();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: user.username, password: 'password123' });
      const token = loginResponse.body.data.token;

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          async (content) => {
            const response = await request(app)
              .post('/api/reviews')
              .send({ albumId: album.id, content })
              .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(201);
            expect(response.body.data.review.content).toBe(content);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});