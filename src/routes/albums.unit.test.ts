import request from 'supertest';
import { spotifyService } from '@/services/SpotifyService';
import { RatingService } from '@/services/RatingService';
import { ReviewService } from '@/services/ReviewService';
import { AlbumModel } from '@/models/Album';
import { Album } from '@/types';

// Mock the services before importing the app
jest.mock('@/services/SpotifyService', () => ({
  spotifyService: {
    searchAlbums: jest.fn(),
    getAlbum: jest.fn()
  }
}));
jest.mock('@/services/RatingService');
jest.mock('@/services/ReviewService');
jest.mock('@/models/Album');
jest.mock('@/config/database', () => ({
  query: jest.fn(),
  connectDatabase: jest.fn()
}));
jest.mock('@/config/redis', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  connectRedis: jest.fn()
}));

// Import app after mocking
import { app } from '@/server';

const mockSpotifyService = spotifyService as jest.Mocked<typeof spotifyService>;
const mockRatingService = RatingService as jest.Mocked<typeof RatingService>;
const mockReviewService = ReviewService as jest.Mocked<typeof ReviewService>;
const mockAlbumModel = AlbumModel as jest.Mocked<typeof AlbumModel>;

describe('Album Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/albums/search', () => {
    const mockAlbums: Album[] = [
      {
        id: '1',
        spotifyId: 'spotify1',
        name: 'Test Album',
        artist: 'Test Artist',
        releaseDate: new Date('2023-01-01'),
        imageUrl: 'https://example.com/image.jpg',
        spotifyUrl: 'https://open.spotify.com/album/spotify1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should search albums successfully', async () => {
      mockSpotifyService.searchAlbums.mockResolvedValue(mockAlbums);

      const response = await request(app)
        .get('/api/albums/search')
        .query({ q: 'test query' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.albums).toHaveLength(1);
      expect(response.body.data.albums[0].spotifyId).toBe('spotify1');
      expect(response.body.data.query).toBe('test query');
      expect(response.body.data.limit).toBe(20);
      expect(mockSpotifyService.searchAlbums).toHaveBeenCalledWith('test query', 20);
    });

    it('should search albums with custom limit', async () => {
      mockSpotifyService.searchAlbums.mockResolvedValue(mockAlbums);

      const response = await request(app)
        .get('/api/albums/search')
        .query({ q: 'test query', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(10);
      expect(mockSpotifyService.searchAlbums).toHaveBeenCalledWith('test query', 10);
    });

    it('should return validation error for missing query', async () => {
      const response = await request(app)
        .get('/api/albums/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Search query is required');
    });

    it('should return validation error for invalid limit', async () => {
      const response = await request(app)
        .get('/api/albums/search')
        .query({ q: 'test', limit: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Limit must be between 1 and 50');
    });

    it('should handle Spotify API errors', async () => {
      mockSpotifyService.searchAlbums.mockRejectedValue(new Error('Spotify API error'));

      const response = await request(app)
        .get('/api/albums/search')
        .query({ q: 'test query' });

      expect(response.status).toBe(503);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Spotify API error');
    });

    it('should return empty results for empty query', async () => {
      mockSpotifyService.searchAlbums.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/albums/search')
        .query({ q: 'nonexistent' });

      expect(response.status).toBe(200);
      expect(response.body.data.albums).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('GET /api/albums/:spotifyId', () => {
    const mockAlbum: Album = {
      id: '1',
      spotifyId: 'spotify1',
      name: 'Test Album',
      artist: 'Test Artist',
      releaseDate: new Date('2023-01-01'),
      imageUrl: 'https://example.com/image.jpg',
      spotifyUrl: 'https://open.spotify.com/album/spotify1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockStats = {
      averageRating: 4.5,
      ratingCount: 10
    };

    it('should get album from database if exists', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(mockAlbum);
      mockRatingService.getAlbumStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/albums/spotify1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.album.spotifyId).toBe('spotify1');
      expect(response.body.data.album.averageRating).toBe(4.5);
      expect(response.body.data.album.ratingCount).toBe(10);
      expect(mockAlbumModel.findBySpotifyId).toHaveBeenCalledWith('spotify1');
    });

    it('should get album from Spotify if not in database', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockResolvedValue(mockAlbum);
      mockAlbumModel.findOrCreate.mockResolvedValue(mockAlbum);
      mockRatingService.getAlbumStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/albums/spotify1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.album.spotifyId).toBe('spotify1');
      expect(mockSpotifyService.getAlbum).toHaveBeenCalledWith('spotify1');
      expect(mockAlbumModel.findOrCreate).toHaveBeenCalled();
    });

    it('should return validation error for empty spotifyId', async () => {
      const response = await request(app)
        .get('/api/albums/');

      expect(response.status).toBe(404); // Route not found
    });

    it('should handle album not found', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockRejectedValue(new Error('Album not found'));

      const response = await request(app)
        .get('/api/albums/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Album not found');
    });
  });

  describe('GET /api/albums/:spotifyId/ratings', () => {
    const mockAlbum: Album = {
      id: '1',
      spotifyId: 'spotify1',
      name: 'Test Album',
      artist: 'Test Artist',
      releaseDate: new Date('2023-01-01'),
      imageUrl: 'https://example.com/image.jpg',
      spotifyUrl: 'https://open.spotify.com/album/spotify1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockRatings = [
      {
        id: '1',
        userId: 'user1',
        albumId: '1',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user1', username: 'testuser', email: 'test@example.com', createdAt: new Date(), updatedAt: new Date() },
        album: mockAlbum
      }
    ];

    const mockStats = {
      averageRating: 4.5,
      ratingCount: 10
    };

    it('should get album ratings successfully', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(mockAlbum);
      mockRatingService.getAlbumRatingsWithDetails.mockResolvedValue(mockRatings);
      mockRatingService.getAlbumStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/albums/spotify1/ratings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ratings).toHaveLength(1);
      expect(response.body.data.ratings[0].rating).toBe(5);
      expect(response.body.data.statistics.averageRating).toBe(4.5);
      expect(response.body.data.statistics.ratingCount).toBe(10);
      expect(response.body.data.album.spotifyId).toBe('spotify1');
    });

    it('should create album if not exists and get ratings', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockResolvedValue(mockAlbum);
      mockAlbumModel.findOrCreate.mockResolvedValue(mockAlbum);
      mockRatingService.getAlbumRatingsWithDetails.mockResolvedValue(mockRatings);
      mockRatingService.getAlbumStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/albums/spotify1/ratings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSpotifyService.getAlbum).toHaveBeenCalledWith('spotify1');
      expect(mockAlbumModel.findOrCreate).toHaveBeenCalled();
    });

    it('should handle album not found', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockRejectedValue(new Error('Album not found'));

      const response = await request(app)
        .get('/api/albums/nonexistent/ratings');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Album not found');
    });
  });

  describe('GET /api/albums/:spotifyId/reviews', () => {
    const mockAlbum: Album = {
      id: '1',
      spotifyId: 'spotify1',
      name: 'Test Album',
      artist: 'Test Artist',
      releaseDate: new Date('2023-01-01'),
      imageUrl: 'https://example.com/image.jpg',
      spotifyUrl: 'https://open.spotify.com/album/spotify1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockReviews = [
      {
        id: '1',
        userId: 'user1',
        albumId: '1',
        content: 'Great album!',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user1', username: 'testuser', email: 'test@example.com', createdAt: new Date(), updatedAt: new Date() },
        album: mockAlbum
      }
    ];

    it('should get album reviews successfully', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(mockAlbum);
      mockReviewService.getAlbumReviewsWithDetails.mockResolvedValue(mockReviews);
      mockReviewService.getAlbumReviewCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/albums/spotify1/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.reviews[0].content).toBe('Great album!');
      expect(response.body.data.statistics.reviewCount).toBe(5);
      expect(response.body.data.album.spotifyId).toBe('spotify1');
    });

    it('should create album if not exists and get reviews', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockResolvedValue(mockAlbum);
      mockAlbumModel.findOrCreate.mockResolvedValue(mockAlbum);
      mockReviewService.getAlbumReviewsWithDetails.mockResolvedValue(mockReviews);
      mockReviewService.getAlbumReviewCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/albums/spotify1/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSpotifyService.getAlbum).toHaveBeenCalledWith('spotify1');
      expect(mockAlbumModel.findOrCreate).toHaveBeenCalled();
    });

    it('should handle album not found', async () => {
      mockAlbumModel.findBySpotifyId.mockResolvedValue(null);
      mockSpotifyService.getAlbum.mockRejectedValue(new Error('Album not found'));

      const response = await request(app)
        .get('/api/albums/nonexistent/reviews');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBe('Album not found');
    });
  });
});