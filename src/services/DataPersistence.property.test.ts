import * as fc from 'fast-check';
import { connectDatabase, query, closeDatabase } from '../config/database';
import { UserModel } from '../models/User';
import { RatingService } from './RatingService';
import { ReviewService } from './ReviewService';
import { SocialService } from './SocialService';
import { DataPersistenceService } from './DataPersistenceService';
import { v4 as uuidv4 } from 'uuid';

// Feature: jukeboxd, Property 11: Data Persistence Consistency
describe('Property-Based Tests - Data Persistence', () => {
  beforeAll(async () => {
    await connectDatabase();
    
    // Create audit table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS account_deletion_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ratings_count INTEGER DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        follows_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await query('DELETE FROM activities WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM follows WHERE follower_id LIKE $1 OR followee_id LIKE $1', ['test-%']);
    await query('DELETE FROM reviews WHERE user_id LIKE $1', ['test-%']);
    await query('DELETE FROM ratings WHERE user_id LIKE $1', ['test-%']);
    await query('DELETE FROM albums WHERE spotify_id LIKE $1', ['test-%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
  });

  /**
   * Property 11: Data Persistence Consistency
   * For any user-created content (ratings, reviews), the data should be immediately persisted 
   * and remain available across system operations
   * **Validates: Requirements 7.1**
   */
  it('should immediately persist all user-created content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).map(s => `testuser_${s}_${Date.now()}`),
          email: fc.emailAddress().map(e => `test_${Date.now()}_${e}`),
          rating: fc.integer({ min: 1, max: 5 }),
          reviewContent: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0)
        }),
        async ({ username, email, rating, reviewContent }) => {
          // Create test user
          const user = await UserModel.create(username, email, 'TestPass123!');
          
          // Create test album
          const albumId = uuidv4();
          const spotifyId = `test-album-${Date.now()}-${Math.random()}`;
          await query(
            `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [albumId, spotifyId, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
          );

          // Test 1: Rating persistence with immediate validation
          const createdRating = await DataPersistenceService.executeWithPersistence(
            async (client) => {
              return await RatingService.createRating(user.id, albumId, rating);
            },
            'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
            [user.id, albumId]
          );
          
          // Verify rating is immediately available
          const persistedRating = await RatingService.getUserRating(user.id, albumId);
          expect(persistedRating).toBeDefined();
          expect(persistedRating?.rating).toBe(rating);
          expect(persistedRating?.id).toBe(createdRating.id);

          // Test 2: Review persistence with immediate validation
          const createdReview = await DataPersistenceService.executeWithPersistence(
            async (client) => {
              return await ReviewService.createReview(user.id, albumId, reviewContent);
            },
            'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
            [user.id, albumId]
          );
          
          // Verify review is immediately available
          const persistedReview = await ReviewService.getUserReview(user.id, albumId);
          expect(persistedReview).toBeDefined();
          expect(persistedReview?.content).toBe(reviewContent.trim());
          expect(persistedReview?.id).toBe(createdReview.id);

          // Test 3: Follow relationship persistence
          const otherUser = await UserModel.create(
            `otheruser_${Date.now()}_${Math.random()}`, 
            `other_${Date.now()}_${Math.random()}@test.com`, 
            'TestPass123!'
          );

          await DataPersistenceService.executeWithPersistence(
            async (client) => {
              return await SocialService.followUser(user.id, otherUser.id);
            },
            'SELECT id FROM follows WHERE follower_id = $1 AND followee_id = $2',
            [user.id, otherUser.id]
          );
          
          // Verify follow relationship is immediately available
          const isFollowing = await SocialService.isFollowing(user.id, otherUser.id);
          expect(isFollowing).toBe(true);

          // Test 4: Data persistence validation using DataPersistenceService
          const ratingExists = await DataPersistenceService.validateDataExists('ratings', {
            user_id: user.id,
            album_id: albumId,
            rating: rating
          });
          expect(ratingExists).toBe(true);

          const reviewExists = await DataPersistenceService.validateDataExists('reviews', {
            user_id: user.id,
            album_id: albumId
          });
          expect(reviewExists).toBe(true);

          const followExists = await DataPersistenceService.validateDataExists('follows', {
            follower_id: user.id,
            followee_id: otherUser.id
          });
          expect(followExists).toBe(true);

          // Test 5: Verify all data persists across separate database queries
          // (simulating system restart or separate operations)
          
          // Re-query rating
          const requeriedRating = await query(
            'SELECT * FROM ratings WHERE user_id = $1 AND album_id = $2',
            [user.id, albumId]
          );
          expect(requeriedRating.rows.length).toBe(1);
          expect(requeriedRating.rows[0].rating).toBe(rating);

          // Re-query review
          const requeriedReview = await query(
            'SELECT * FROM reviews WHERE user_id = $1 AND album_id = $2',
            [user.id, albumId]
          );
          expect(requeriedReview.rows.length).toBe(1);
          expect(requeriedReview.rows[0].content).toBe(reviewContent.trim());

          // Re-query follow relationship
          const requeriedFollow = await query(
            'SELECT * FROM follows WHERE follower_id = $1 AND followee_id = $2',
            [user.id, otherUser.id]
          );
          expect(requeriedFollow.rows.length).toBe(1);

          // Test 6: Ensure immediate persistence mechanism works
          await DataPersistenceService.ensureImmediatePersistence();
          
          // Verify data is still accessible after forced persistence
          const finalRatingCheck = await RatingService.getUserRating(user.id, albumId);
          expect(finalRatingCheck).toBeDefined();
          expect(finalRatingCheck?.rating).toBe(rating);
        }
      ),
      { numRuns: 20 } // Reduced iterations for faster execution as requested
    );
  });

  /**
   * Property: Data Persistence Under Concurrent Operations
   * Verifies that data remains consistent when multiple operations occur simultaneously
   */
  it('should maintain data consistency under concurrent operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userCount: fc.integer({ min: 2, max: 5 }),
          ratingsPerUser: fc.integer({ min: 1, max: 3 })
        }),
        async ({ userCount, ratingsPerUser }) => {
          // Create test album
          const albumId = uuidv4();
          const spotifyId = `test-album-${Date.now()}-${Math.random()}`;
          await query(
            `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [albumId, spotifyId, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
          );

          // Create multiple users
          const users = await Promise.all(
            Array.from({ length: userCount }, async (_, i) => {
              const username = `testuser_${Date.now()}_${i}_${Math.random()}`;
              const email = `test_${Date.now()}_${i}_${Math.random()}@test.com`;
              return await UserModel.create(username, email, 'TestPass123!');
            })
          );

          // Create concurrent rating operations using DataPersistenceService
          const ratingPromises = users.flatMap(user =>
            Array.from({ length: ratingsPerUser }, async () => {
              const rating = Math.floor(Math.random() * 5) + 1;
              return await DataPersistenceService.executeWithPersistence(
                async (client) => {
                  return await RatingService.createRating(user.id, albumId, rating);
                },
                'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
                [user.id, albumId]
              );
            })
          );

          // Execute all rating operations concurrently
          const createdRatings = await Promise.all(ratingPromises);

          // Verify all ratings were persisted correctly
          const persistedRatings = await query(
            'SELECT * FROM ratings WHERE album_id = $1',
            [albumId]
          );

          expect(persistedRatings.rows.length).toBe(userCount * ratingsPerUser);

          // Verify each rating can be retrieved individually
          for (const user of users) {
            const userRatings = await RatingService.getUserRatings(user.id);
            expect(userRatings.length).toBe(ratingsPerUser);
          }

          // Verify average rating calculation is consistent
          const averageRating = await RatingService.getAlbumAverageRating(albumId);
          expect(averageRating).toBeGreaterThan(0);
          expect(averageRating).toBeLessThanOrEqual(5);

          // Verify data persistence using DataPersistenceService validation
          for (const user of users) {
            const userRatingExists = await DataPersistenceService.validateDataExists('ratings', {
              user_id: user.id,
              album_id: albumId
            });
            expect(userRatingExists).toBe(true);
          }
        }
      ),
      { numRuns: 10 } // Reduced iterations for performance
    );
  });

  /**
   * Property: Transaction-based Data Persistence
   * Verifies that multiple operations in a single transaction are all persisted together
   */
  it('should persist multiple operations in a single transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).map(s => `testuser_${s}_${Date.now()}`),
          email: fc.emailAddress().map(e => `test_${Date.now()}_${e}`),
          rating: fc.integer({ min: 1, max: 5 }),
          reviewContent: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0)
        }),
        async ({ username, email, rating, reviewContent }) => {
          // Create test user and album
          const user = await UserModel.create(username, email, 'TestPass123!');
          const albumId = uuidv4();
          const spotifyId = `test-album-${Date.now()}-${Math.random()}`;
          await query(
            `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [albumId, spotifyId, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
          );

          // Execute multiple operations in a single transaction
          const results = await DataPersistenceService.executeTransactionWithPersistence([
            async (client) => {
              return await RatingService.createRating(user.id, albumId, rating);
            },
            async (client) => {
              return await ReviewService.createReview(user.id, albumId, reviewContent);
            }
          ], [
            {
              query: 'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
              params: [user.id, albumId]
            },
            {
              query: 'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
              params: [user.id, albumId]
            }
          ]);

          expect(results).toHaveLength(2);

          // Verify both operations were persisted
          const persistedRating = await RatingService.getUserRating(user.id, albumId);
          const persistedReview = await ReviewService.getUserReview(user.id, albumId);

          expect(persistedRating).toBeDefined();
          expect(persistedRating?.rating).toBe(rating);
          expect(persistedReview).toBeDefined();
          expect(persistedReview?.content).toBe(reviewContent.trim());

          // Verify data exists using validation service
          const ratingExists = await DataPersistenceService.validateDataExists('ratings', {
            user_id: user.id,
            album_id: albumId
          });
          const reviewExists = await DataPersistenceService.validateDataExists('reviews', {
            user_id: user.id,
            album_id: albumId
          });

          expect(ratingExists).toBe(true);
          expect(reviewExists).toBe(true);
        }
      ),
      { numRuns: 15 } // Moderate iterations for transaction testing
    );
  });
});