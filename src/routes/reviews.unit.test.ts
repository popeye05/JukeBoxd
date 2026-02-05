import request from 'supertest';
import { app } from '@/server';
import { ReviewService } from '@/services/ReviewService';
import { AlbumModel } from '@/models/Album';
import { AuthService } from '@/services/AuthService';
import { UserModel } from '@/models/User';

// Mock the services
jest.mock('@/services/ReviewService');
jest.mock('@/models/Album');
jest.mock('@/services/AuthService');
jest.mock('@/models/User');

const mockReviewService = ReviewService as jest.Mocked<typeof ReviewService>;
const mockAlbumModel = AlbumModel as jest.Mocked<typeof AlbumModel>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Review Routes', () => {
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

  const mockReview = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    albumId: '550e8400-e29b-41d4-a716-446655440001',
    content: 'This is a great album!',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockAuthService.validateToken.mockResolvedValue(mockUser);
  });

  describe('POST /api/reviews', () => {
    it('should create a new review successfully', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockAlbumModel.findById.mockResolvedValue(mockAlbum);
      mockReviewService.getUserReview.mockResolvedValue(null);
      mockReviewService.createReview.mockResolvedValue(mockReview);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'This is a great album!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review.id).toBe(mockReview.id);
      expect(mockReviewService.createReview).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'This is a great album!');
    });

    it('should return 400 for whitespace-only content', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ 
        isValid: false, 
        error: 'Review content cannot be empty or contain only whitespace' 
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          content: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Review content');
    });

    it('should return 409 if user already reviewed the album', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockAlbumModel.findById.mockResolvedValue(mockAlbum);
      mockReviewService.getUserReview.mockResolvedValue(mockReview);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'Another review'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toBe('You have already reviewed this album. Use PUT to update your review.');
    });

    it('should return 404 for non-existent album', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockAlbumModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          albumId: '550e8400-e29b-41d4-a716-446655440001',
          content: 'This is a great album!'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Album not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          albumId: 'album-123',
          content: 'This is a great album!'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/reviews/:reviewId', () => {
    it('should update review successfully', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockReviewService.getReviewById.mockResolvedValue(mockReview);
      const updatedReview = { ...mockReview, content: 'Updated review content' };
      mockReviewService.updateReview.mockResolvedValue(updatedReview);

      const response = await request(app)
        .put('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          content: 'Updated review content'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review.id).toBe(updatedReview.id);
    });

    it('should return 403 for unauthorized update attempt', async () => {
      const otherUserReview = { ...mockReview, userId: '550e8400-e29b-41d4-a716-446655440003' };
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockReviewService.getReviewById.mockResolvedValue(otherUserReview);

      const response = await request(app)
        .put('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          content: 'Updated review content'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Access denied: You can only update your own reviews');
    });

    it('should return 404 for non-existent review', async () => {
      mockReviewService.validateReviewContent.mockReturnValue({ isValid: true });
      mockReviewService.getReviewById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          content: 'Updated review content'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Review not found');
    });
  });

  describe('DELETE /api/reviews/:reviewId', () => {
    it('should delete review successfully', async () => {
      mockReviewService.getReviewById.mockResolvedValue(mockReview);
      mockReviewService.deleteReview.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Review deleted successfully');
    });

    it('should return 403 for unauthorized delete attempt', async () => {
      const otherUserReview = { ...mockReview, userId: '550e8400-e29b-41d4-a716-446655440003' };
      mockReviewService.getReviewById.mockResolvedValue(otherUserReview);

      const response = await request(app)
        .delete('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Access denied: You can only delete your own reviews');
    });

    it('should return 404 for non-existent review', async () => {
      mockReviewService.getReviewById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/reviews/550e8400-e29b-41d4-a716-446655440002')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Review not found');
    });
  });

  describe('GET /api/reviews/user/:userId', () => {
    const mockReviewsWithDetails = [
      {
        ...mockReview,
        user: mockUser,
        album: mockAlbum
      }
    ];

    it('should get user reviews successfully', async () => {
      mockReviewService.getUserReviewsWithDetails.mockResolvedValue(mockReviewsWithDetails);

      const response = await request(app)
        .get('/api/reviews/user/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/reviews/user/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid user ID format');
    });

    it('should return empty array for user with no reviews', async () => {
      mockReviewService.getUserReviewsWithDetails.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/reviews/user/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.data.reviews).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });
});