import request from 'supertest';
import { app } from '@/server';
import { RatingService } from '@/services/RatingService';
import { AlbumModel } from '@/models/Album';
import { AuthService } from '@/services/AuthService';
import { UserModel } from '@/models/User';

// Mock the services
jest.mock('@/services/RatingService');
jest.mock('@/models/Album');
jest.mock('@/services/AuthService');
jest.mock('@/models/User');

const mockRatingService = RatingService as jest.Mocked<typeof RatingService>;
const mockAlbumModel = AlbumModel as jest.Mocked<typeof AlbumModel>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Rating Routes', () => {
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAlbum = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    spotifyId: 'spotify-123',
    name: 'Test Album',
    artist: 'Test Artist',
    releaseDate: new Date(),
    imageUrl: 'http://example.com/image.jpg',
    spotifyUrl: 'http://spotify.com/album',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockRating = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    albumId: '550e8400-e29b-41d4-a716-446655440001',
    rating: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockAuthService.validateToken.mockResolvedValue(mockUser);
  });

  describe('POST /api/ratings', () => {
    it('should create a new rating successfully', async () => {
      mockAlbumModel.findById.mockResolvedValue(mockAlbum);
      mockRatingService.upsertRating.mockResolvedValue(mockRating);

      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          rating: 4
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating.id).toBe(mockRating.id);
      expect(response.body.data.rating.rating).toBe(mockRating.rating);
      expect(mockRatingService.upsertRating).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 4);
    });

    it('should return 400 for invalid rating value', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          rating: 6 // Invalid rating
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Rating must be an integer between 1 and 5');
    });

    it('should return 400 for missing albumId', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          rating: 4
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Album ID is required');
    });

    it('should return 404 for non-existent album', async () => {
      mockAlbumModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          rating: 4
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Album not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          rating: 4
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ratings/user/:userId', () => {
    const mockRatingsWithDetails = [
      {
        ...mockRating,
        user: mockUser,
        album: mockAlbum
      }
    ];

    it('should get user ratings successfully', async () => {
      mockRatingService.getUserRatingsWithDetails.mockResolvedValue(mockRatingsWithDetails);

      const response = await request(app)
        .get('/api/ratings/user/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ratings).toHaveLength(1);
      expect(response.body.data.ratings[0].id).toBe(mockRating.id);
      expect(response.body.data.total).toBe(1);
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/ratings/user/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid user ID format');
    });

    it('should return empty array for user with no ratings', async () => {
      mockRatingService.getUserRatingsWithDetails.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/ratings/user/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.data.ratings).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('DELETE /api/ratings/:ratingId', () => {
    it('should delete rating successfully', async () => {
      mockRatingService.getUserRatings.mockResolvedValue([mockRating]);
      mockRatingService.deleteRating.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/ratings/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Rating deleted successfully');
    });

    it('should return 404 for non-existent or unauthorized rating', async () => {
      mockRatingService.getUserRatings.mockResolvedValue([]);

      const response = await request(app)
        .delete('/api/ratings/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Rating not found or access denied');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/ratings/550e8400-e29b-41d4-a716-446655440002');

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid rating ID format', async () => {
      const response = await request(app)
        .delete('/api/ratings/invalid-id')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid rating ID format');
    });
  });
});