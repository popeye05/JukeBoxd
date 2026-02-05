import * as fc from 'fast-check';
import axios from 'axios';
import { cacheGet, cacheSet } from '../config/redis';
import { SpotifyAlbum, SpotifySearchResponse } from '../types';

// Mock dependencies
jest.mock('axios');
jest.mock('../config/redis');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCacheGet = cacheGet as jest.MockedFunction<typeof cacheGet>;
const mockedCacheSet = cacheSet as jest.MockedFunction<typeof cacheSet>;

// Mock axios.create before importing SpotifyService
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  request: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};
mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

// Now import SpotifyService after mocks are set up
import { SpotifyService } from './SpotifyService';

describe('SpotifyService Property Tests', () => {
  let spotifyService: SpotifyService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
    
    // Reset the mock axios instance
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.request.mockReset();
    
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

  // Generators for test data
  const spotifyIdArb = fc.string({ minLength: 1, maxLength: 22 }).filter(s => s.trim().length > 0);
  const albumNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const artistNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const searchQueryArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);
  const limitArb = fc.integer({ min: 1, max: 50 });
  const dateArb = fc.date({ min: new Date('1900-01-01'), max: new Date('2030-12-31') });
  const urlArb = fc.webUrl();

  const spotifyAlbumArb = fc.record({
    id: spotifyIdArb,
    name: albumNameArb,
    artists: fc.array(fc.record({ name: artistNameArb }), { minLength: 1, maxLength: 5 }),
    release_date: dateArb.map(d => d.toISOString().split('T')[0]),
    images: fc.array(
      fc.record({
        url: urlArb,
        height: fc.integer({ min: 64, max: 1024 }),
        width: fc.integer({ min: 64, max: 1024 }),
      }),
      { minLength: 0, maxLength: 3 }
    ),
    external_urls: fc.record({ spotify: urlArb }),
  }, { requiredKeys: ['id', 'name', 'artists', 'release_date', 'images', 'external_urls'] });

  // **Property 14: Spotify API Integration**
  // **Validates: Requirements 8.1, 8.2**
  describe('Property 14: Spotify API Integration', () => {
    it('should include proper authentication for any API request', async () => {
      await fc.assert(
        fc.asyncProperty(searchQueryArb, async (query) => {
          // Setup mocks
          mockedCacheGet.mockResolvedValue(null);
          mockedCacheSet.mockResolvedValue(true);
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              albums: { items: [], total: 0, limit: 20, offset: 0 },
            } as SpotifySearchResponse,
          });

          // Execute search
          await spotifyService.searchAlbums(query);

          // Verify authentication was included
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
        }),
        { numRuns: 20 }
      );
    });

    it('should correctly parse valid Spotify API responses for any album data', async () => {
      await fc.assert(
        fc.asyncProperty(spotifyAlbumArb, async (spotifyAlbum) => {
          // Setup mocks
          mockedCacheGet.mockResolvedValue(null);
          mockedCacheSet.mockResolvedValue(true);
          
          mockAxiosInstance.get.mockResolvedValue({
            data: spotifyAlbum,
          });

          // Execute get album
          const result = await spotifyService.getAlbum(spotifyAlbum.id);

          // Verify correct parsing
          expect(result.spotifyId).toBe(spotifyAlbum.id);
          expect(result.name).toBe(spotifyAlbum.name);
          expect(result.artist).toBe(spotifyAlbum.artists.map(a => a.name).join(', '));
          expect(result.releaseDate).toEqual(new Date(spotifyAlbum.release_date as string));
          expect(result.imageUrl).toBe(spotifyAlbum.images[0]?.url || '');
          expect(result.spotifyUrl).toBe(spotifyAlbum.external_urls.spotify);
        }),
        { numRuns: 20 }
      );
    });
  });

  // **Property 15: API Caching Behavior**
  // **Validates: Requirements 8.4**
  describe('Property 15: API Caching Behavior', () => {
    it('should use cached results for any repeated album data requests', async () => {
      await fc.assert(
        fc.asyncProperty(spotifyIdArb, async (spotifyId) => {
          const cachedAlbum = {
            id: '',
            spotifyId,
            name: 'Cached Album',
            artist: 'Cached Artist',
            releaseDate: new Date('2023-01-01'),
            imageUrl: 'https://example.com/cached.jpg',
            spotifyUrl: `https://open.spotify.com/album/${spotifyId}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Setup cache to return data
          mockedCacheGet.mockResolvedValue(JSON.stringify(cachedAlbum));
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              id: spotifyId,
              name: 'API Album',
              artists: [{ name: 'API Artist' }],
              release_date: '2023-01-01',
              images: [{ url: 'https://example.com/api.jpg', height: 640, width: 640 }],
              external_urls: { spotify: `https://open.spotify.com/album/${spotifyId}` },
            },
          });

          // Execute get album
          const result = await spotifyService.getAlbum(spotifyId);

          // Verify cached data was used (not API data)
          expect(result).toEqual(cachedAlbum);
          expect(mockedCacheGet).toHaveBeenCalledWith(`spotify:album:${spotifyId}`);
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
        }),
        { numRuns: 20 }
      );
    });

    it('should cache results for any successful search query', async () => {
      await fc.assert(
        fc.asyncProperty(searchQueryArb, limitArb, async (query, limit) => {
          // Setup mocks
          mockedCacheGet.mockResolvedValue(null);
          mockedCacheSet.mockResolvedValue(true);
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              albums: { items: [], total: 0, limit, offset: 0 },
            } as SpotifySearchResponse,
          });

          // Execute search
          await spotifyService.searchAlbums(query, limit);

          // Verify caching was attempted
          expect(mockedCacheSet).toHaveBeenCalledWith(
            `spotify:search:${query}:${limit}`,
            expect.any(String),
            expect.any(Number)
          );
        }),
        { numRuns: 20 }
      );
    });

    it('should fetch from API when cache is empty for any album request', async () => {
      await fc.assert(
        fc.asyncProperty(spotifyAlbumArb, async (spotifyAlbum) => {
          // Setup cache to return null (cache miss)
          mockedCacheGet.mockResolvedValue(null);
          mockedCacheSet.mockResolvedValue(true);
          
          mockAxiosInstance.get.mockResolvedValue({
            data: spotifyAlbum,
          });

          // Execute get album
          const result = await spotifyService.getAlbum(spotifyAlbum.id);

          // Verify API was called and result was cached
          expect(mockedCacheGet).toHaveBeenCalledWith(`spotify:album:${spotifyAlbum.id}`);
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/albums/${spotifyAlbum.id}`);
          expect(mockedCacheSet).toHaveBeenCalledWith(
            `spotify:album:${spotifyAlbum.id}`,
            expect.any(String),
            expect.any(Number)
          );
          
          // Verify correct data mapping
          expect(result.spotifyId).toBe(spotifyAlbum.id);
          expect(result.name).toBe(spotifyAlbum.name);
        }),
        { numRuns: 20 }
      );
    });

    it('should use cached search results for any repeated search query', async () => {
      await fc.assert(
        fc.asyncProperty(searchQueryArb, limitArb, async (query, limit) => {
          const cachedResults = [
            {
              id: '',
              spotifyId: 'cached-album-1',
              name: 'Cached Album 1',
              artist: 'Cached Artist 1',
              releaseDate: new Date('2023-01-01'),
              imageUrl: 'https://example.com/cached1.jpg',
              spotifyUrl: 'https://open.spotify.com/album/cached-album-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          // Setup cache to return search results
          mockedCacheGet.mockResolvedValue(JSON.stringify(cachedResults));
          
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              albums: { 
                items: [{
                  id: 'api-album-1',
                  name: 'API Album 1',
                  artists: [{ name: 'API Artist 1' }],
                  release_date: '2023-01-01',
                  images: [{ url: 'https://example.com/api1.jpg', height: 640, width: 640 }],
                  external_urls: { spotify: 'https://open.spotify.com/album/api-album-1' },
                }], 
                total: 1, 
                limit, 
                offset: 0 
              },
            } as SpotifySearchResponse,
          });

          // Execute search
          const result = await spotifyService.searchAlbums(query, limit);

          // Verify cached data was used (not API data)
          expect(result).toEqual(cachedResults);
          expect(mockedCacheGet).toHaveBeenCalledWith(`spotify:search:${query}:${limit}`);
          expect(mockAxiosInstance.get).not.toHaveBeenCalled();
        }),
        { numRuns: 20 }
      );
    });

    it('should handle cache errors gracefully and fallback to API for any request', async () => {
      await fc.assert(
        fc.asyncProperty(spotifyAlbumArb, async (spotifyAlbum) => {
          // Setup cache to throw error
          mockedCacheGet.mockRejectedValue(new Error('Cache connection failed'));
          mockedCacheSet.mockResolvedValue(true);
          
          mockAxiosInstance.get.mockResolvedValue({
            data: spotifyAlbum,
          });

          // Execute get album - should not throw error
          const result = await spotifyService.getAlbum(spotifyAlbum.id);

          // Verify API was called despite cache error
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/albums/${spotifyAlbum.id}`);
          expect(result.spotifyId).toBe(spotifyAlbum.id);
        }),
        { numRuns: 10 }
      );
    });
  });

  // **Property 16: API Error Handling**
  // **Validates: Requirements 8.3, 8.5**
  describe('Property 16: API Error Handling', () => {
    const errorStatusArb = fc.constantFrom(400, 401, 403, 404, 429, 500, 502, 503);
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });

    it('should handle any Spotify API error gracefully and provide meaningful feedback', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryArb,
          errorStatusArb,
          errorMessageArb,
          async (query, status, message) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            
            mockAxiosInstance.get.mockRejectedValue({
              response: {
                status,
                data: { error: { message } },
              },
            });

            // Execute search and expect error
            await expect(spotifyService.searchAlbums(query)).rejects.toThrow();

            // Verify error was handled (no unhandled promise rejection)
            // The specific error message depends on status code
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide meaningful error messages for any network error type', async () => {
      await fc.assert(
        fc.asyncProperty(
          spotifyIdArb,
          fc.constantFrom('ECONNABORTED', 'ENOTFOUND', 'ECONNREFUSED'),
          async (spotifyId, errorCode) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            
            mockAxiosInstance.get.mockRejectedValue({
              code: errorCode,
            });

            // Execute get album and expect meaningful error
            try {
              await spotifyService.getAlbum(spotifyId);
              fail('Expected error to be thrown');
            } catch (error: any) {
              // Verify error message is meaningful
              expect(error.message).toBeDefined();
              expect(error.message.length).toBeGreaterThan(0);
              expect(error.message).not.toBe('');
              
              // Verify specific error types
              if (errorCode === 'ECONNABORTED') {
                expect(error.message).toContain('timeout');
              } else if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
                expect(error.message).toContain('connect');
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle rate limiting gracefully for any request', async () => {
      await fc.assert(
        fc.asyncProperty(searchQueryArb, async (query) => {
          // Setup mocks
          mockedCacheGet.mockResolvedValue(null);
          
          mockAxiosInstance.get.mockRejectedValue({
            response: {
              status: 429,
              headers: { 'retry-after': '1' },
              data: { error: { message: 'Rate limit exceeded' } },
            },
          });

          // Execute search and expect rate limit error
          await expect(spotifyService.searchAlbums(query)).rejects.toThrow('Spotify rate limit exceeded');
        }),
        { numRuns: 10 } // Fewer runs for rate limiting tests
      );
    });

    it('should provide specific error messages for different HTTP status codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryArb,
          fc.constantFrom(400, 401, 403, 404, 500, 502, 503),
          async (query, status) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            
            mockAxiosInstance.get.mockRejectedValue({
              response: {
                status,
                data: { error: { message: 'Test error message' } },
              },
            });

            // Execute search and expect specific error
            try {
              await spotifyService.searchAlbums(query);
              fail('Expected error to be thrown');
            } catch (error: any) {
              // Verify error message is meaningful and status-specific
              expect(error.message).toBeDefined();
              expect(error.message.length).toBeGreaterThan(0);
              
              // Verify specific error messages based on status code
              switch (status) {
                case 400:
                  expect(error.message).toContain('Bad request');
                  break;
                case 401:
                  expect(error.message).toContain('authentication failed');
                  break;
                case 403:
                  expect(error.message).toContain('access forbidden');
                  break;
                case 404:
                  expect(error.message).toContain('not found');
                  break;
                case 429:
                  expect(error.message).toContain('rate limit exceeded');
                  break;
                case 500:
                case 502:
                case 503:
                  expect(error.message).toContain('temporarily unavailable');
                  break;
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle errors without response data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryArb,
          async (query) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            
            // Mock error without response data
            mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

            // Execute search and expect generic error
            try {
              await spotifyService.searchAlbums(query);
              fail('Expected error to be thrown');
            } catch (error: any) {
              // Verify error message is meaningful
              expect(error.message).toBeDefined();
              expect(error.message.length).toBeGreaterThan(0);
              expect(error.message).toContain('Unexpected error communicating with Spotify API');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle malformed error responses gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          spotifyIdArb,
          async (spotifyId) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            
            // Mock error with malformed response
            mockAxiosInstance.get.mockRejectedValue({
              response: {
                status: 500,
                data: null, // Malformed response
              },
            });

            // Execute get album and expect error
            try {
              await spotifyService.getAlbum(spotifyId);
              fail('Expected error to be thrown');
            } catch (error: any) {
              // Verify error message is meaningful even with malformed response
              expect(error.message).toBeDefined();
              expect(error.message.length).toBeGreaterThan(0);
              expect(error.message).toContain('temporarily unavailable');
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Additional property tests for edge cases
  describe('Input Validation Properties', () => {
    it('should handle any empty or whitespace-only search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => s.trim().length === 0),
          async (emptyQuery) => {
            const result = await spotifyService.searchAlbums(emptyQuery);
            expect(result).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject any empty Spotify ID for album retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => s.trim().length === 0),
          async (emptyId) => {
            await expect(spotifyService.getAlbum(emptyId)).rejects.toThrow('Spotify ID is required');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should limit search results to Spotify maximum for any limit value', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryArb,
          fc.integer({ min: 51, max: 1000 }),
          async (query, largeLimit) => {
            // Setup mocks
            mockedCacheGet.mockResolvedValue(null);
            mockedCacheSet.mockResolvedValue(true);
            
            mockAxiosInstance.get.mockResolvedValue({
              data: {
                albums: { items: [], total: 0, limit: 50, offset: 0 },
              } as SpotifySearchResponse,
            });

            await spotifyService.searchAlbums(query, largeLimit);

            // Verify limit was capped at 50
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
              params: {
                q: query,
                type: 'album',
                limit: 50, // Should be capped at 50
                market: 'US',
              },
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Album Mapping Properties', () => {
    it('should correctly map any valid Spotify album to internal format', async () => {
      await fc.assert(
        fc.asyncProperty(spotifyAlbumArb, async (spotifyAlbum) => {
          const mapped = (spotifyService as any).mapSpotifyAlbumToAlbum(spotifyAlbum);

          // Verify all required fields are mapped correctly
          expect(mapped.spotifyId).toBe(spotifyAlbum.id);
          expect(mapped.name).toBe(spotifyAlbum.name);
          expect(mapped.artist).toBe(spotifyAlbum.artists.map(a => a.name).join(', '));
          expect(mapped.releaseDate).toEqual(new Date(spotifyAlbum.release_date as string));
          expect(mapped.imageUrl).toBe(spotifyAlbum.images[0]?.url || '');
          expect(mapped.spotifyUrl).toBe(spotifyAlbum.external_urls.spotify);
          expect(mapped.createdAt).toBeInstanceOf(Date);
          expect(mapped.updatedAt).toBeInstanceOf(Date);
        }),
        { numRuns: 20 }
      );
    });

    it('should handle albums with any number of artists correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({ name: artistNameArb }), { minLength: 1, maxLength: 10 }),
          async (artists) => {
            const spotifyAlbum: SpotifyAlbum = {
              id: 'test-id',
              name: 'Test Album',
              artists,
              release_date: '2023-01-01',
              images: [],
              external_urls: { spotify: 'https://open.spotify.com/album/test-id' },
            };

            const mapped = (spotifyService as any).mapSpotifyAlbumToAlbum(spotifyAlbum);
            const expectedArtist = artists.map(a => a.name).join(', ');

            expect(mapped.artist).toBe(expectedArtist);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});