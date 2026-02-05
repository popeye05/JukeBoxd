import { ReviewModel } from './Review';
import { query } from '@/config/database';

// Mock the database query function
jest.mock('@/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('ReviewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new review successfully', async () => {
      const mockReviewData = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'This is a great album!',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockReviewData],
        rowCount: 1
      });

      const result = await ReviewModel.create('user-123', 'album-123', 'This is a great album!');

      expect(result).toEqual({
        id: 'review-123',
        userId: 'user-123',
        albumId: 'album-123',
        content: 'This is a great album!',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reviews'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'user-123',
          'album-123',
          'This is a great album!'
        ])
      );
    });

    it('should trim whitespace from content', async () => {
      const mockReviewData = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'This is a great album!',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockReviewData],
        rowCount: 1
      });

      await ReviewModel.create('user-123', 'album-123', '  This is a great album!  ');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reviews'),
        expect.arrayContaining([
          expect.any(String),
          'user-123',
          'album-123',
          'This is a great album!' // Should be trimmed
        ])
      );
    });

    it('should throw error for empty content', async () => {
      await expect(
        ReviewModel.create('user-123', 'album-123', '')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');
    });

    it('should throw error for whitespace-only content', async () => {
      await expect(
        ReviewModel.create('user-123', 'album-123', '   \n\t   ')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');
    });

    it('should throw error for null content', async () => {
      await expect(
        ReviewModel.create('user-123', 'album-123', null as any)
      ).rejects.toThrow('Review content is required');
    });

    it('should throw error for undefined content', async () => {
      await expect(
        ReviewModel.create('user-123', 'album-123', undefined as any)
      ).rejects.toThrow('Review content is required');
    });

    it('should throw error for non-string content', async () => {
      await expect(
        ReviewModel.create('user-123', 'album-123', 123 as any)
      ).rejects.toThrow('Review content is required');
    });

    it('should throw error for content exceeding maximum length', async () => {
      const longContent = 'a'.repeat(5001);
      
      await expect(
        ReviewModel.create('user-123', 'album-123', longContent)
      ).rejects.toThrow('Review content cannot exceed 5000 characters');
    });

    it('should throw error when creation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await expect(
        ReviewModel.create('user-123', 'album-123', 'Valid content')
      ).rejects.toThrow('Failed to create review');
    });
  });

  describe('upsert', () => {
    it('should update existing review', async () => {
      const mockUpdatedReview = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'Updated review content',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z'
      };

      // Mock successful update
      mockQuery.mockResolvedValueOnce({
        rows: [mockUpdatedReview],
        rowCount: 1
      });

      const result = await ReviewModel.upsert('user-123', 'album-123', 'Updated review content');

      expect(result.content).toBe('Updated review content');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reviews'),
        ['user-123', 'album-123', 'Updated review content']
      );
    });

    it('should create new review when none exists', async () => {
      const mockNewReview = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'New review content',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock failed update (no existing review)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock successful create
      mockQuery.mockResolvedValueOnce({
        rows: [mockNewReview],
        rowCount: 1
      });

      const result = await ReviewModel.upsert('user-123', 'album-123', 'New review content');

      expect(result.content).toBe('New review content');
      expect(mockQuery).toHaveBeenCalledTimes(2); // update + create
    });

    it('should validate content in upsert', async () => {
      await expect(
        ReviewModel.upsert('user-123', 'album-123', '   ')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');
    });
  });

  describe('findByUserAndAlbum', () => {
    it('should find review by user and album', async () => {
      const mockReviewData = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'Great album!',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockReviewData],
        rowCount: 1
      });

      const result = await ReviewModel.findByUserAndAlbum('user-123', 'album-123');

      expect(result).toEqual({
        id: 'review-123',
        userId: 'user-123',
        albumId: 'album-123',
        content: 'Great album!',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND album_id = $2'),
        ['user-123', 'album-123']
      );
    });

    it('should return null when review not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await ReviewModel.findByUserAndAlbum('user-123', 'album-123');

      expect(result).toBeNull();
    });
  });

  describe('findByAlbum', () => {
    it('should find all reviews for an album in chronological order', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          album_id: 'album-123',
          content: 'First review',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'review-2',
          user_id: 'user-2',
          album_id: 'album-123',
          content: 'Second review',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockReviews,
        rowCount: 2
      });

      const result = await ReviewModel.findByAlbum('album-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('First review');
      expect(result[1]?.content).toBe('Second review');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        ['album-123']
      );
    });
  });

  describe('updateContent', () => {
    it('should update review content successfully', async () => {
      const mockUpdatedReview = {
        id: 'review-123',
        user_id: 'user-123',
        album_id: 'album-123',
        content: 'Updated content',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUpdatedReview],
        rowCount: 1
      });

      const result = await ReviewModel.updateContent('review-123', 'Updated content');

      expect(result?.content).toBe('Updated content');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reviews'),
        ['review-123', 'Updated content']
      );
    });

    it('should return null when review not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await ReviewModel.updateContent('nonexistent', 'Updated content');

      expect(result).toBeNull();
    });

    it('should validate content in update', async () => {
      await expect(
        ReviewModel.updateContent('review-123', '   ')
      ).rejects.toThrow('Review content cannot be empty or contain only whitespace');
    });
  });

  describe('getReviewCount', () => {
    it('should return correct review count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1
      });

      const result = await ReviewModel.getReviewCount('album-123');

      expect(result).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        ['album-123']
      );
    });

    it('should return 0 when no reviews exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await ReviewModel.getReviewCount('album-123');

      expect(result).toBe(0);
    });
  });

  describe('hasUserReviewed', () => {
    it('should return true when user has reviewed album', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1
      });

      const result = await ReviewModel.hasUserReviewed('user-123', 'album-123');

      expect(result).toBe(true);
    });

    it('should return false when user has not reviewed album', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1
      });

      const result = await ReviewModel.hasUserReviewed('user-123', 'album-123');

      expect(result).toBe(false);
    });

    it('should return false when no rows returned', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await ReviewModel.hasUserReviewed('user-123', 'album-123');

      expect(result).toBe(false);
    });
  });

  describe('deleteById', () => {
    it('should delete review successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      const result = await ReviewModel.deleteById('review-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM reviews WHERE id = $1',
        ['review-123']
      );
    });

    it('should return false when review not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await ReviewModel.deleteById('nonexistent');

      expect(result).toBe(false);
    });
  });
});