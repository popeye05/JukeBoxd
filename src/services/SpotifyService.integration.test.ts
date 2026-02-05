import { SpotifyService } from './SpotifyService';
import { connectRedis, closeRedis } from '../config/redis';

// This test file contains integration tests that would run against actual services
// These tests are marked as skipped by default to avoid requiring actual Spotify credentials
// and Redis connection during regular test runs

describe('SpotifyService Integration Tests', () => {
  let spotifyService: SpotifyService;

  beforeAll(async () => {
    // Only run if we have actual credentials
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.log('Skipping integration tests - Spotify credentials not configured');
      return;
    }

    try {
      await connectRedis();
      spotifyService = new SpotifyService();
    } catch (error) {
      console.log('Skipping integration tests - Redis not available');
    }
  });

  afterAll(async () => {
    try {
      await closeRedis();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Skip these tests by default - they require actual API credentials
  describe.skip('Real API Integration', () => {
    it('should successfully authenticate with Spotify API', async () => {
      const token = await spotifyService.refreshAccessToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    }, 10000);

    it('should search for albums successfully', async () => {
      const results = await spotifyService.searchAlbums('Abbey Road Beatles', 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      const album = results[0];
      expect(album).toBeDefined();
      expect(album?.spotifyId).toBeDefined();
      expect(album?.name).toBeDefined();
      expect(album?.artist).toBeDefined();
    }, 10000);

    it('should get specific album by ID', async () => {
      // Abbey Road album ID
      const albumId = '0ETFjACtuP2ADo6LFhL6HN';
      const album = await spotifyService.getAlbum(albumId);
      
      expect(album.spotifyId).toBe(albumId);
      expect(album.name).toContain('Abbey Road');
      expect(album.artist).toContain('Beatles');
    }, 10000);

    it('should handle non-existent album gracefully', async () => {
      const fakeId = 'nonexistent123456789012';
      await expect(spotifyService.getAlbum(fakeId)).rejects.toThrow();
    }, 10000);

    it('should cache search results', async () => {
      const query = 'test cache query';
      
      // First search
      const start1 = Date.now();
      const results1 = await spotifyService.searchAlbums(query, 5);
      const time1 = Date.now() - start1;
      
      // Second search (should be cached)
      const start2 = Date.now();
      const results2 = await spotifyService.searchAlbums(query, 5);
      const time2 = Date.now() - start2;
      
      expect(results1).toEqual(results2);
      expect(time2).toBeLessThan(time1); // Cached should be faster
    }, 15000);
  });

  describe('Service Health Check', () => {
    it('should perform health check', async () => {
      if (!spotifyService) {
        return; // Skip if service not initialized
      }

      const isHealthy = await spotifyService.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid credentials gracefully', () => {
      // Temporarily override credentials
      const originalClientId = process.env.SPOTIFY_CLIENT_ID;
      const originalClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      
      expect(() => new SpotifyService()).toThrow('Spotify client credentials not configured');
      
      // Restore credentials
      if (originalClientId) process.env.SPOTIFY_CLIENT_ID = originalClientId;
      if (originalClientSecret) process.env.SPOTIFY_CLIENT_SECRET = originalClientSecret;
    });
  });
});