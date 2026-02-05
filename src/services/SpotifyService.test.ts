import axios from 'axios';
import { SpotifyService } from './SpotifyService';
import { cacheGet, cacheSet } from '../config/redis';
import { SpotifyAlbum, SpotifySearchResponse } from '../types';

// Mock dependencies
jest.mock('axios');
jest.mock('../config/redis');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCacheGet = cacheGet as jest.MockedFunction<typeof cacheGet>;
const mockedCacheSet = cacheSet as jest.MockedFunction<typeof cacheSet>;

describe('SpotifyService', () => {
  let spotifyService: SpotifyService;
  const mockSpotifyAlbum: SpotifyAlbum = {
    id: 'test-album-id',
    name: 'Test Album',
    artists: [{ name: 'Test Artist' }],
    release_date: '2023-01-01',
    images: [{ url: 'https://example.com/image.jpg', height: 640, width: 640 }],
    external_urls: { spotify: 'https://open.spotify.com/album/test-album-id' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'test-access-token',
        expires_in: 3600,
      },
    });

    spotifyService = new SpotifyService();
  });

  afterEach(() => {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  describe('constructor', () => {
    it('should throw error if client credentials are not configured', () => {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      
      expect(() => new SpotifyService()).toThrow('Spotify client credentials not configured');
    });

    it('should initialize with valid credentials', () => {
      expect(() => new SpotifyService()).not.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      mockedCacheSet.mockResolvedValueOnce(true);

      const token = await spotifyService.refreshAccessToken();

      expect(token).toBe('new-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic '),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
      expect(mockedCacheSet).toHaveBeenCalled();
    });

    it('should handle token refresh errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(spotifyService.refreshAccessToken()).rejects.toThrow(
        'Failed to authenticate with Spotify API'
      );
    });
  });

  describe('searchAlbums', () => {
    beforeEach(() => {
      // Mock the axios instance methods
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          albums: {
            items: [mockSpotifyAlbum],
            total: 1,
            limit: 20,
            offset: 0,
          },
        } as SpotifySearchResponse,
      });
    });

    it('should return empty array for empty query', async () => {
      const result = await spotifyService.searchAlbums('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace query', async () => {
      const result = await spotifyService.searchAlbums('   ');
      expect(result).toEqual([]);
    });

    it('should return cached results if available', async () => {
      const cachedAlbums = [
        {
          id: '',
          spotifyId: 'cached-album-id',
          name: 'Cached Album',
          artist: 'Cached Artist',
          releaseDate: new Date('2023-01-01'),
          imageUrl: 'https://example.com/cached.jpg',
          spotifyUrl: 'https://open.spotify.com/album/cached-album-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockedCacheGet.mockResolvedValueOnce(JSON.stringify(cachedAlbums));

      const result = await spotifyService.searchAlbums('test query');

      expect(result).toEqual(cachedAlbums);
      expect(mockedCacheGet).toHaveBeenCalledWith('spotify:search:test query:20');
    });

    it('should search albums and cache results', async () => {
      mockedCacheGet.mockResolvedValueOnce(null);
      mockedCacheSet.mockResolvedValueOnce(true);

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          albums: {
            items: [mockSpotifyAlbum],
            total: 1,
            limit: 20,
            offset: 0,
          },
        } as SpotifySearchResponse,
      });

      const result = await spotifyService.searchAlbums('test query');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        spotifyId: 'test-album-id',
        name: 'Test Album',
        artist: 'Test Artist',
      });
      expect(mockedCacheSet).toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      mockedCacheGet.mockResolvedValueOnce(null);
      
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: { message: 'Not found' } },
        },
      });

      await expect(spotifyService.searchAlbums('test query')).rejects.toThrow('Album not found');
    });

    it('should limit search results to Spotify maximum', async () => {
      mockedCacheGet.mockResolvedValueOnce(null);
      
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          albums: { items: [], total: 0, limit: 50, offset: 0 },
        },
      });

      await spotifyService.searchAlbums('test query', 100);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: {
          q: 'test query',
          type: 'album',
          limit: 50, // Should be capped at 50
          market: 'US',
        },
      });
    });
  });

  describe('getAlbum', () => {
    it('should throw error for empty Spotify ID', async () => {
      await expect(spotifyService.getAlbum('')).rejects.toThrow('Spotify ID is required');
    });

    it('should return cached album if available', async () => {
      const cachedAlbum = {
        id: '',
        spotifyId: 'cached-album-id',
        name: 'Cached Album',
        artist: 'Cached Artist',
        releaseDate: new Date('2023-01-01'),
        imageUrl: 'https://example.com/cached.jpg',
        spotifyUrl: 'https://open.spotify.com/album/cached-album-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockedCacheGet.mockResolvedValueOnce(JSON.stringify(cachedAlbum));

      const result = await spotifyService.getAlbum('cached-album-id');

      expect(result).toEqual(cachedAlbum);
      expect(mockedCacheGet).toHaveBeenCalledWith('spotify:album:cached-album-id');
    });

    it('should fetch album from API and cache result', async () => {
      mockedCacheGet.mockResolvedValueOnce(null);
      mockedCacheSet.mockResolvedValueOnce(true);

      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockSpotifyAlbum,
      });

      const result = await spotifyService.getAlbum('test-album-id');

      expect(result).toMatchObject({
        spotifyId: 'test-album-id',
        name: 'Test Album',
        artist: 'Test Artist',
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/albums/test-album-id');
      expect(mockedCacheSet).toHaveBeenCalled();
    });

    it('should handle album not found error', async () => {
      mockedCacheGet.mockResolvedValueOnce(null);
      
      const mockAxiosInstance = mockedAxios.create() as any;
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: { message: 'Album not found' } },
        },
      });

      await expect(spotifyService.getAlbum('nonexistent-id')).rejects.toThrow('Album not found');
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid access token' } },
        },
      };

      const spotifyError = (spotifyService as any).handleSpotifyError(error);
      expect(spotifyError.message).toBe('Spotify authentication failed');
    });

    it('should handle 429 rate limit errors', async () => {
      const error = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } },
        },
      };

      const spotifyError = (spotifyService as any).handleSpotifyError(error);
      expect(spotifyError.message).toBe('Spotify rate limit exceeded');
    });

    it('should handle network timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
      };

      const spotifyError = (spotifyService as any).handleSpotifyError(error);
      expect(spotifyError.message).toBe('Spotify API request timeout');
    });

    it('should handle connection errors', async () => {
      const error = {
        code: 'ENOTFOUND',
      };

      const spotifyError = (spotifyService as any).handleSpotifyError(error);
      expect(spotifyError.message).toBe('Unable to connect to Spotify API');
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');

      const spotifyError = (spotifyService as any).handleSpotifyError(error);
      expect(spotifyError.message).toBe('Unexpected error communicating with Spotify API');
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      });

      const isHealthy = await spotifyService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      // Mock failed token refresh
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await spotifyService.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('album mapping', () => {
    it('should correctly map Spotify album to internal Album format', () => {
      const spotifyAlbum: SpotifyAlbum = {
        id: 'spotify-123',
        name: 'Great Album',
        artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
        release_date: '2023-05-15',
        images: [
          { url: 'https://example.com/large.jpg', height: 640, width: 640 },
          { url: 'https://example.com/small.jpg', height: 300, width: 300 },
        ],
        external_urls: { spotify: 'https://open.spotify.com/album/spotify-123' },
      };

      const mapped = (spotifyService as any).mapSpotifyAlbumToAlbum(spotifyAlbum);

      expect(mapped).toMatchObject({
        spotifyId: 'spotify-123',
        name: 'Great Album',
        artist: 'Artist One, Artist Two',
        releaseDate: new Date('2023-05-15'),
        imageUrl: 'https://example.com/large.jpg',
        spotifyUrl: 'https://open.spotify.com/album/spotify-123',
      });
    });

    it('should handle albums with no images', () => {
      const spotifyAlbum: SpotifyAlbum = {
        id: 'spotify-123',
        name: 'Great Album',
        artists: [{ name: 'Artist One' }],
        release_date: '2023-05-15',
        images: [],
        external_urls: { spotify: 'https://open.spotify.com/album/spotify-123' },
      };

      const mapped = (spotifyService as any).mapSpotifyAlbumToAlbum(spotifyAlbum);

      expect(mapped.imageUrl).toBe('');
    });
  });
});