import * as fc from 'fast-check';
import { connectDatabase, query, closeDatabase } from '../config/database';
import { UserModel } from '../models/User';
import { RatingModel } from '../models/Rating';
import { ReviewModel } from '../models/Review';
import { FollowModel } from '../models/Follow';
import { AuthService } from './AuthService';
import { v4 as uuidv4 } from 'uuid';

// Feature: jukeboxd, Property 13: Account Deletion Data Handling
describe('Property-Based Tests - Account Deletion', () => {
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
    await query('DELETE FROM account_deletion_audit WHERE user_id LIKE $1', ['test-%']);
    await query('DELETE FROM activities WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM follows WHERE follower_id LIKE $1 OR followee_id LIKE $1', ['test-%']);
    await query('DELETE FROM reviews WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM ratings WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM albums WHERE spotify_id LIKE $1', ['test-%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
  });

  /**
   * Property 13: Account Deletion Data Handling
   * For any user account deletion, personal data should be removed while maintaining 
   * system integrity and anonymized contributions
   * Validates: Requirements 7.5
   */
  it('should remove personal data while preserving anonymized contributions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }).map(s => `testuser_${s}_${Date.now()}`),
          email: fc.emailAddress().map(e => `test_${Date.now()}_${e}`),
          ratingsCount: fc.integer({ min: 1, max: 5 }),
          reviewsCount: fc.integer({ min: 1, max: 3 }),
          followsCount: fc.integer({ min: 1, max: 3 })
        }),
        async ({ username, email, ratingsCount, reviewsCount, followsCount }) => {
          // Create test user
          const user = await UserModel.create(username, email, 'TestPass123!');
          
          // Create test albums
          const albums = await Promise.all(
            Array.from({ length: Math.max(ratingsCount, reviewsCount) }, async (_, i) => {
              const albumId = uuidv4();
              const spotifyId = `test-album-${Date.now()}-${i}-${Math.random()}`;
              await query(
                `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [albumId, spotifyId, `Test Album ${i}`, 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
              );
              return albumId;
            })
          );

          // Create ratings
          const createdRatings = await Promise.all(
            albums.slice(0, ratingsCount).map(async (albumId, i) => {
              const rating = Math.floor(Math.random() * 5) + 1;
              return await RatingModel.create(user.id, albumId, rating);
            })
          );

          // Create reviews
          const createdReviews = await Promise.all(
            albums.slice(0, reviewsCount).map(async (albumId, i) => {
              const content = `This is a test review ${i} with some content`;
              return await ReviewModel.create(user.id, albumId, content);
            })
          );

          // Create other users to follow
          const otherUsers = await Promise.all(
            Array.from({ length: followsCount }, async (_, i) => {
              const otherUsername = `otheruser_${Date.now()}_${i}_${Math.random()}`;
              const otherEmail = `other_${Date.now()}_${i}_${Math.random()}@test.com`;
              return await UserModel.create(otherUsername, otherEmail, 'TestPass123!');
            })
          );

          // Create follow relationships
          const createdFollows = await Promise.all(
            otherUsers.map(async (otherUser) => {
              return await FollowModel.create(user.id, otherUser.id);
            })
          );

          // Create activities
          await Promise.all(
            createdRatings.map(async (rating, i) => {
              await query(
                `INSERT INTO activities (id, user_id, type, album_id, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [uuidv4(), user.id, 'rating', albums[i], JSON.stringify({ rating: rating.rating })]
              );
            })
          );

          // Store initial counts for verification
          const initialRatingsCount = createdRatings.length;
          const initialReviewsCount = createdReviews.length;
          const initialFollowsCount = createdFollows.length;

          // Calculate initial album averages (before deletion)
          const initialAverages = await Promise.all(
            albums.slice(0, ratingsCount).map(async (albumId) => {
              return await RatingModel.getAverageRating(albumId);
            })
          );

          // Delete the user account
          await AuthService.deleteAccount(user.id);

          // Verify personal data was removed
          const deletedUser = await UserModel.findById(user.id);
          expect(deletedUser).toBeNull();

          // Verify ratings were anonymized (not deleted)
          const anonymizedRatings = await query(
            'SELECT * FROM ratings WHERE id = ANY($1)',
            [createdRatings.map(r => r.id)]
          );
          expect(anonymizedRatings.rows.length).toBe(initialRatingsCount);
          anonymizedRatings.rows.forEach(row => {
            expect(row.user_id).toBeNull(); // Personal data removed
            expect(row.rating).toBeGreaterThanOrEqual(1); // Content preserved
            expect(row.rating).toBeLessThanOrEqual(5);
          });

          // Verify reviews were anonymized (not deleted)
          const anonymizedReviews = await query(
            'SELECT * FROM reviews WHERE id = ANY($1)',
            [createdReviews.map(r => r.id)]
          );
          expect(anonymizedReviews.rows.length).toBe(initialReviewsCount);
          anonymizedReviews.rows.forEach(row => {
            expect(row.user_id).toBeNull(); // Personal data removed
            expect(row.content).toBeTruthy(); // Content preserved
          });

          // Verify follow relationships were completely removed
          const remainingFollows = await query(
            'SELECT * FROM follows WHERE id = ANY($1)',
            [createdFollows.map(f => f.id)]
          );
          expect(remainingFollows.rows.length).toBe(0);

          // Verify activities were anonymized
          const anonymizedActivities = await query(
            'SELECT * FROM activities WHERE album_id = ANY($1)',
            [albums.slice(0, ratingsCount)]
          );
          expect(anonymizedActivities.rows.length).toBe(initialRatingsCount);
          anonymizedActivities.rows.forEach(row => {
            expect(row.user_id).toBeNull(); // Personal data removed
            expect(row.data).toBeTruthy(); // Content preserved
          });

          // Verify system integrity: album averages should remain the same
          const finalAverages = await Promise.all(
            albums.slice(0, ratingsCount).map(async (albumId) => {
              return await RatingModel.getAverageRating(albumId);
            })
          );

          initialAverages.forEach((initialAvg, i) => {
            expect(finalAverages[i]).toBe(initialAvg);
          });

          // Verify audit trail was created
          const auditRecord = await query(
            'SELECT * FROM account_deletion_audit WHERE user_id = $1',
            [user.id]
          );
          expect(auditRecord.rows.length).toBe(1);
          expect(auditRecord.rows[0].ratings_count).toBe(initialRatingsCount);
          expect(auditRecord.rows[0].reviews_count).toBe(initialReviewsCount);
          expect(auditRecord.rows[0].follows_count).toBe(initialFollowsCount);

          // Verify other users remain unaffected
          for (const otherUser of otherUsers) {
            const stillExists = await UserModel.findById(otherUser.id);
            expect(stillExists).toBeDefined();
            expect(stillExists?.username).toBe(otherUser.username);
          }
        }
      ),
      { numRuns: 20 } // Reduced iterations for faster execution as requested
    );
  });

  /**
   * Property: Account Deletion Preserves System Integrity
   * Verifies that deleting accounts doesn't break referential integrity or system functionality
   */
  it('should preserve system integrity after account deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          usersToDelete: fc.integer({ min: 1, max: 3 }),
          usersToKeep: fc.integer({ min: 2, max: 4 })
        }),
        async ({ usersToDelete, usersToKeep }) => {
          // Create test album
          const albumId = uuidv4();
          const spotifyId = `test-album-${Date.now()}-${Math.random()}`;
          await query(
            `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [albumId, spotifyId, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
          );

          // Create users to delete
          const usersForDeletion = await Promise.all(
            Array.from({ length: usersToDelete }, async (_, i) => {
              const username = `deleteuser_${Date.now()}_${i}_${Math.random()}`;
              const email = `delete_${Date.now()}_${i}_${Math.random()}@test.com`;
              return await UserModel.create(username, email, 'TestPass123!');
            })
          );

          // Create users to keep
          const usersToKeepData = await Promise.all(
            Array.from({ length: usersToKeep }, async (_, i) => {
              const username = `keepuser_${Date.now()}_${i}_${Math.random()}`;
              const email = `keep_${Date.now()}_${i}_${Math.random()}@test.com`;
              return await UserModel.create(username, email, 'TestPass123!');
            })
          );

          // All users rate the album
          const allUsers = [...usersForDeletion, ...usersToKeepData];
          await Promise.all(
            allUsers.map(async (user, i) => {
              const rating = Math.floor(Math.random() * 5) + 1;
              return await RatingModel.create(user.id, albumId, rating);
            })
          );

          // Calculate initial statistics
          const initialRatingCount = await RatingModel.getRatingCount(albumId);
          const initialAverage = await RatingModel.getAverageRating(albumId);

          // Delete some users
          await Promise.all(
            usersForDeletion.map(user => AuthService.deleteAccount(user.id))
          );

          // Verify system integrity
          const finalRatingCount = await RatingModel.getRatingCount(albumId);
          const finalAverage = await RatingModel.getAverageRating(albumId);

          // Rating count should remain the same (anonymized, not deleted)
          expect(finalRatingCount).toBe(initialRatingCount);
          
          // Average should remain the same (contributions preserved)
          expect(finalAverage).toBe(initialAverage);

          // Verify remaining users are unaffected
          for (const user of usersToKeepData) {
            const stillExists = await UserModel.findById(user.id);
            expect(stillExists).toBeDefined();
            
            const userRating = await RatingModel.findByUserAndAlbum(user.id, albumId);
            expect(userRating).toBeDefined();
            expect(userRating?.userId).toBe(user.id);
          }

          // Verify deleted users no longer exist
          for (const user of usersForDeletion) {
            const shouldNotExist = await UserModel.findById(user.id);
            expect(shouldNotExist).toBeNull();
          }
        }
      ),
      { numRuns: 10 } // Reduced iterations for performance
    );
  });
});