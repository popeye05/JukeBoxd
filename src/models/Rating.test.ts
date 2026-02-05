import { RatingModel } from './Rating';
import { query } from '@/config/database';

// Mock the database query function
jest.mock('@/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('RatingModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new rating successfully', async () => {
      const mockRatingData = {
        id: 'rating-123',
        user_id: 'user-123',
        album_id: 'album-123',
        rating: 4,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRatingData],
        rowCount: 1
      });

      const result = await RatingModel.create('user-123', 'album-123', 4);

      expect(result).toEqual({
        id: 'rating-123',
        userId: 'user-123',
        albumId: 'album-123',
        rating: 4,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ratings'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'user-123',
          'album-123',
          4
        ])
      );
    });

    it('should throw error for invalid rating (too low)', async () => {
      await expect(
        RatingModel.create('user-123', 'album-123', 0)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });

    it('should throw error for invalid rating (too high)', async () => {
      await expect(
        RatingModel.create('user-123', 'album-123', 6)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });

    it('should throw error for non-integer rating', async () => {
      await expect(
        RatingModel.create('user-123', 'album-123', 3.5)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });

    it('should throw error when creation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await expect(
        RatingModel.create('user-123', 'album-123', 4)
      ).rejects.toThrow('Failed to create rating');
    });
  });

  describe('upsert', () => {
    it('should update existing rating', async () => {
      const mockUpdatedRating = {
        id: 'rating-123',
        user_id: 'user-123',
        album_id: 'album-123',
        rating: 5,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z'
      };

      // Mock successful update
      mockQuery.mockResolvedValueOnce({
        rows: [mockUpdatedRating],
        rowCount: 1
      });

      const result = await RatingModel.upsert('user-123', 'album-123', 5);

      expect(result.rating).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ratings'),
        ['user-123', 'album-123', 5]
      );
    });

    it('should create new rating when none exists', async () => {
      const mockNewRating = {
        id: 'rating-123',
        user_id: 'user-123',
        album_id: 'album-123',
        rating: 4,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock failed update (no existing rating)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock successful create
      mockQuery.mockResolvedValueOnce({
        rows: [mockNewRating],
        rowCount: 1
      });

      const result = await RatingModel.upsert('user-123', 'album-123', 4);

      expect(result.rating).toBe(4);
      expect(mockQuery).toHaveBeenCalledTimes(2); // update + create
    });
  });

  describe('findByUserAndAlbum', () => {
    it('should find rating by user and album', async () => {
      const mockRatingData = {
        id: 'rating-123',
        user_id: 'user-123',
        album_id: 'album-123',
        rating: 4,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRatingData],
        rowCount: 1
      });

      const result = await RatingModel.findByUserAndAlbum('user-123', 'album-123');

      expect(result).toEqual({
        id: 'rating-123',
        userId: 'user-123',
        albumId: 'album-123',
        rating: 4,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND album_id = $2'),
        ['user-123', 'album-123']
      );
    });

    it('should return null when rating not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await RatingModel.findByUserAndAlbum('user-123', 'album-123');

      expect(result).toBeNull();
    });
  });

  describe('getAverageRating', () => {
    it('should calculate average rating correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ avg: '4.25' }],
        rowCount: 1
      });

      const result = await RatingModel.getAverageRating('album-123');

      expect(result).toBe(4.25);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AVG(rating)'),
        ['album-123']
      );
    });

    it('should return 0 when no ratings exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ avg: null }],
        rowCount: 1
      });

      const result = await RatingModel.getAverageRating('album-123');

      expect(result).toBe(0);
    });

    it('should return 0 when no rows returned', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await RatingModel.getAverageRating('album-123');

      expect(result).toBe(0);
    });
  });

  describe('getRatingCount', () => {
    it('should return correct rating count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1
      });

      const result = await RatingModel.getRatingCount('album-123');

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        ['album-123']
      );
    });

    it('should return 0 when no ratings exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await RatingModel.getRatingCount('album-123');

      expect(result).toBe(0);
    });
  });

  describe('findByAlbum', () => {
    it('should find all ratings for an album', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          user_id: 'user-1',
          album_id: 'album-123',
          rating: 4,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'rating-2',
          user_id: 'user-2',
          album_id: 'album-123',
          rating: 5,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockRatings,
        rowCount: 2
      });

      const result = await RatingModel.findByAlbum('album-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.rating).toBe(4);
      expect(result[1]?.rating).toBe(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE album_id = $1'),
        ['album-123']
      );
    });
  });

  describe('deleteById', () => {
    it('should delete rating successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      const result = await RatingModel.deleteById('rating-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM ratings WHERE id = $1',
        ['rating-123']
      );
    });

    it('should return false when rating not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await RatingModel.deleteById('nonexistent');

      expect(result).toBe(false);
    });
  });
});