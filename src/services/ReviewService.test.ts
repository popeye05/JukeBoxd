import { ReviewService } from './ReviewService';
import { UserModel, AlbumModel, ActivityModel } from '@/models';
import { connectDatabase, closeDatabase } from '@/config/database';

describe('ReviewService', () => {
  let testUser: any;
  let testAlbum: any;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await UserModel.create(
      `testuser_${Date.now()}`,
      `test_${Date.now()}@example.com`,
      'password123'
    );

    // Create test album
    testAlbum = await AlbumModel.create(
      `spotify_${Date.now()}`,
      'Test Album',
      'Test Artist',
      new Date('2023-01-01'),
      'https://example.com/image.jpg',
      'https://open.spotify.com/album/test'
    );
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await UserModel.deleteById(testUser.id);
    }
    if (testAlbum) {
      await AlbumModel.deleteById(testAlbum.id);
    }
  });

  describe('upsertReview', () => {
    it('should create new review and activity', async () => {
      const content = 'This is a great album!';
      const review = await ReviewService.upsertReview(testUser.id, testAlbum.id, content);

      expect(review).toBeDefined();
      expect(review.userId).toBe(testUser.id);
      expect(review.albumId).toBe(testAlbum.id);
      expect(review.content).toBe(content);

      // Check that activity was created
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.type).toBe('review');
      expect(activities[0]!.data.content).toBe(content);
    });

    it('should update existing review without creating new activity', async () => {
      const originalContent = 'Original review';
      const updatedContent = 'Updated review';

      // Create initial review
      await ReviewService.upsertReview(testUser.id, testAlbum.id, originalContent);

      // Update review
      const updatedReview = await ReviewService.upsertReview(testUser.id, testAlbum.id, updatedContent);

      expect(updatedReview.content).toBe(updatedContent);

      // Should still only have one activity (from initial creation)
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.data.content).toBe(originalContent); // Original activity unchanged
    });

    it('should reject empty or whitespace-only content', async () => {
      await expect(
        ReviewService.upsertReview(testUser.id, testAlbum.id, '')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

      await expect(
        ReviewService.upsertReview(testUser.id, testAlbum.id, '   ')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

      await expect(
        ReviewService.upsertReview(testUser.id, testAlbum.id, '\n\t  ')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');
    });
  });

  describe('createReview', () => {
    it('should create review and activity', async () => {
      const content = 'Amazing album with great tracks!';
      const review = await ReviewService.createReview(testUser.id, testAlbum.id, content);

      expect(review).toBeDefined();
      expect(review.content).toBe(content);

      // Check that activity was created
      const activities = await ActivityModel.findByUser(testUser.id);
      expect(activities).toHaveLength(1);
      expect(activities[0]!.type).toBe('review');
      expect(activities[0]!.data.content).toBe(content);
    });
  });

  describe('getUserReview', () => {
    it('should return user review for album', async () => {
      const content = 'Great album!';
      await ReviewService.createReview(testUser.id, testAlbum.id, content);

      const review = await ReviewService.getUserReview(testUser.id, testAlbum.id);

      expect(review).toBeDefined();
      expect(review!.content).toBe(content);
    });

    it('should return null if user has not reviewed album', async () => {
      const review = await ReviewService.getUserReview(testUser.id, testAlbum.id);
      expect(review).toBeNull();
    });
  });

  describe('getAlbumReviews', () => {
    it('should return all reviews for album in chronological order', async () => {
      // Create another user
      const testUser2 = await UserModel.create(
        `testuser2_${Date.now()}`,
        `test2_${Date.now()}@example.com`,
        'password123'
      );

      try {
        // Both users review the album
        await ReviewService.createReview(testUser.id, testAlbum.id, 'First review');
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        await ReviewService.createReview(testUser2.id, testAlbum.id, 'Second review');

        const reviews = await ReviewService.getAlbumReviews(testAlbum.id);

        expect(reviews).toHaveLength(2);
        // Should be in chronological order (oldest first)
        expect(reviews[0]!.content).toBe('First review');
        expect(reviews[1]!.content).toBe('Second review');
      } finally {
        await UserModel.deleteById(testUser2.id);
      }
    });
  });

  describe('updateReview', () => {
    it('should update review content', async () => {
      const originalContent = 'Original review';
      const updatedContent = 'Updated review content';

      const review = await ReviewService.createReview(testUser.id, testAlbum.id, originalContent);

      const updatedReview = await ReviewService.updateReview(review.id, updatedContent);

      expect(updatedReview).toBeDefined();
      expect(updatedReview!.content).toBe(updatedContent);
      expect(updatedReview!.id).toBe(review.id);
    });

    it('should return null for non-existent review', async () => {
      const updatedReview = await ReviewService.updateReview('non-existent-id', 'New content');
      expect(updatedReview).toBeNull();
    });
  });

  describe('getAlbumReviewCount', () => {
    it('should return correct review count', async () => {
      // Initially no reviews
      let count = await ReviewService.getAlbumReviewCount(testAlbum.id);
      expect(count).toBe(0);

      // Add review
      await ReviewService.createReview(testUser.id, testAlbum.id, 'Great album!');

      count = await ReviewService.getAlbumReviewCount(testAlbum.id);
      expect(count).toBe(1);
    });
  });

  describe('hasUserReviewed', () => {
    it('should return false if user has not reviewed album', async () => {
      const hasReviewed = await ReviewService.hasUserReviewed(testUser.id, testAlbum.id);
      expect(hasReviewed).toBe(false);
    });

    it('should return true if user has reviewed album', async () => {
      await ReviewService.createReview(testUser.id, testAlbum.id, 'Great album!');

      const hasReviewed = await ReviewService.hasUserReviewed(testUser.id, testAlbum.id);
      expect(hasReviewed).toBe(true);
    });
  });

  describe('deleteUserReview', () => {
    it('should delete user review', async () => {
      await ReviewService.createReview(testUser.id, testAlbum.id, 'Great album!');

      // Verify review exists
      let review = await ReviewService.getUserReview(testUser.id, testAlbum.id);
      expect(review).toBeDefined();

      // Delete review
      const deleted = await ReviewService.deleteUserReview(testUser.id, testAlbum.id);
      expect(deleted).toBe(true);

      // Verify review is gone
      review = await ReviewService.getUserReview(testUser.id, testAlbum.id);
      expect(review).toBeNull();
    });
  });

  describe('validateReviewContent', () => {
    it('should validate valid content', async () => {
      const result = ReviewService.validateReviewContent('This is a valid review');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined content', async () => {
      let result = ReviewService.validateReviewContent(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content is required');

      result = ReviewService.validateReviewContent(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content is required');
    });

    it('should reject empty or whitespace-only content', async () => {
      let result = ReviewService.validateReviewContent('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content cannot be empty or contain only whitespace');

      result = ReviewService.validateReviewContent('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content cannot be empty or contain only whitespace');

      result = ReviewService.validateReviewContent('\n\t  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content cannot be empty or contain only whitespace');
    });

    it('should reject content that is too long', async () => {
      const longContent = 'a'.repeat(5001);
      const result = ReviewService.validateReviewContent(longContent);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Review content cannot exceed 5000 characters');
    });
  });
});