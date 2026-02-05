import { AuthService } from './AuthService';
import { UserModel } from '../models/User';
import { RatingModel } from '../models/Rating';
import { ReviewModel } from '../models/Review';
import { FollowModel } from '../models/Follow';
import { connectDatabase, query, closeDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

describe('AuthService - Account Deletion', () => {
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
    await query('DELETE FROM activities WHERE user_id IS NULL');
    await query('DELETE FROM follows WHERE follower_id LIKE $1 OR followee_id LIKE $1', ['test-%']);
    await query('DELETE FROM reviews WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM ratings WHERE user_id LIKE $1 OR user_id IS NULL', ['test-%']);
    await query('DELETE FROM albums WHERE spotify_id LIKE $1', ['test-%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
  });

  describe('deleteAccount', () => {
    it('should delete user account and anonymize data', async () => {
      // Create test user
      const testUsername = `testuser_${Date.now()}`;
      const user = await UserModel.create(testUsername, `${testUsername}@test.com`, 'TestPass123!');

      // Create test album
      const albumId = uuidv4();
      await query(
        `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [albumId, `test-album-${Date.now()}`, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
      );

      // Create test rating
      const rating = await RatingModel.create(user.id, albumId, 5);

      // Create test review
      const review = await ReviewModel.create(user.id, albumId, 'Great album!');

      // Create another user to follow
      const otherUser = await UserModel.create(`otheruser_${Date.now()}`, `other_${Date.now()}@test.com`, 'TestPass123!');
      
      // Create follow relationship
      const follow = await FollowModel.create(user.id, otherUser.id);

      // Create activity
      await query(
        `INSERT INTO activities (id, user_id, type, album_id, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), user.id, 'rating', albumId, JSON.stringify({ rating: 5 })]
      );

      // Delete the account
      await AuthService.deleteAccount(user.id);

      // Verify user was deleted
      const deletedUser = await UserModel.findById(user.id);
      expect(deletedUser).toBeNull();

      // Verify rating was anonymized (user_id set to null)
      const anonymizedRating = await query('SELECT * FROM ratings WHERE id = $1', [rating.id]);
      expect(anonymizedRating.rows.length).toBe(1);
      expect(anonymizedRating.rows[0].user_id).toBeNull();

      // Verify review was anonymized
      const anonymizedReview = await query('SELECT * FROM reviews WHERE id = $1', [review.id]);
      expect(anonymizedReview.rows.length).toBe(1);
      expect(anonymizedReview.rows[0].user_id).toBeNull();

      // Verify follow relationships were deleted
      const deletedFollows = await query('SELECT * FROM follows WHERE id = $1', [follow.id]);
      expect(deletedFollows.rows.length).toBe(0);

      // Verify activities were anonymized
      const anonymizedActivities = await query('SELECT * FROM activities WHERE album_id = $1', [albumId]);
      expect(anonymizedActivities.rows.length).toBe(1);
      expect(anonymizedActivities.rows[0].user_id).toBeNull();

      // Verify audit record was created
      const auditRecord = await query('SELECT * FROM account_deletion_audit WHERE user_id = $1', [user.id]);
      expect(auditRecord.rows.length).toBe(1);
      expect(auditRecord.rows[0].ratings_count).toBe(1);
      expect(auditRecord.rows[0].reviews_count).toBe(1);
      expect(auditRecord.rows[0].follows_count).toBe(1);
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentUserId = uuidv4();

      await expect(AuthService.deleteAccount(nonExistentUserId))
        .rejects.toThrow('Account deletion failed');
    });

    it('should preserve data integrity after account deletion', async () => {
      // Create test users
      const user1 = await UserModel.create(`testuser1_${Date.now()}`, `test1_${Date.now()}@test.com`, 'TestPass123!');
      const user2 = await UserModel.create(`testuser2_${Date.now()}`, `test2_${Date.now()}@test.com`, 'TestPass123!');

      // Create test album
      const albumId = uuidv4();
      await query(
        `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [albumId, `test-album-${Date.now()}`, 'Test Album', 'Test Artist', '2023-01-01', 'http://test.com/image.jpg', 'http://spotify.com/album']
      );

      // Both users rate the same album
      await RatingModel.create(user1.id, albumId, 5);
      await RatingModel.create(user2.id, albumId, 4);

      // Get initial average rating
      const initialAverage = await RatingModel.getAverageRating(albumId);
      expect(initialAverage).toBe(4.5);

      // Delete user1's account
      await AuthService.deleteAccount(user1.id);

      // Verify album still has both ratings (one anonymized)
      const remainingRatings = await query('SELECT * FROM ratings WHERE album_id = $1', [albumId]);
      expect(remainingRatings.rows.length).toBe(2);

      // Verify average rating is still calculated correctly
      const finalAverage = await RatingModel.getAverageRating(albumId);
      expect(finalAverage).toBe(4.5);

      // Verify user2 still exists and can be found
      const remainingUser = await UserModel.findById(user2.id);
      expect(remainingUser).toBeDefined();
      expect(remainingUser?.username).toContain('testuser2_');
    });
  });
});