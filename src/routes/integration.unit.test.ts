import request from 'supertest';
import { app } from '@/server';

describe('API Integration Tests', () => {
  describe('Social API Endpoints', () => {
    it('should have social routes registered', async () => {
      // Test that the social routes are registered (should return 401 for unauthenticated requests)
      const response = await request(app)
        .post('/api/social/follow')
        .send({ userId: '550e8400-e29b-41d4-a716-446655440000' });

      expect(response.status).toBe(401); // Should require authentication
    });

    it('should have followers endpoint registered', async () => {
      const response = await request(app)
        .get('/api/social/followers/550e8400-e29b-41d4-a716-446655440000');

      // Should not require authentication for viewing followers
      expect(response.status).not.toBe(404); // Route should exist
    });

    it('should have following endpoint registered', async () => {
      const response = await request(app)
        .get('/api/social/following/550e8400-e29b-41d4-a716-446655440000');

      // Should not require authentication for viewing following
      expect(response.status).not.toBe(404); // Route should exist
    });

    it('should have profile endpoint registered', async () => {
      const response = await request(app)
        .get('/api/social/profile/550e8400-e29b-41d4-a716-446655440000');

      // Should not require authentication for viewing profiles
      expect(response.status).not.toBe(404); // Route should exist
    });
  });

  describe('Feed API Endpoints', () => {
    it('should have feed endpoint registered', async () => {
      const response = await request(app)
        .get('/api/feed');

      expect(response.status).toBe(401); // Should require authentication
    });

    it('should have user feed endpoint registered', async () => {
      const response = await request(app)
        .get('/api/feed/user/550e8400-e29b-41d4-a716-446655440000');

      // Should not require authentication for viewing public feeds
      expect(response.status).not.toBe(404); // Route should exist
    });

    it('should have recent activities endpoint registered', async () => {
      const response = await request(app)
        .get('/api/feed/recent');

      // Should not require authentication for viewing recent activities
      expect(response.status).not.toBe(404); // Route should exist
    });

    it('should have stats endpoint registered', async () => {
      const response = await request(app)
        .get('/api/feed/stats/550e8400-e29b-41d4-a716-446655440000');

      // Should not require authentication for viewing stats
      expect(response.status).not.toBe(404); // Route should exist
    });
  });

  describe('API Response Format', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .get('/api/social/followers/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format for authentication errors', async () => {
      const response = await request(app)
        .post('/api/social/follow')
        .send({ userId: '550e8400-e29b-41d4-a716-446655440000' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});