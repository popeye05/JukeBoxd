import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { cacheGet, cacheSet } from '../config/redis';
import { SpotifyAlbum, SpotifySearchResponse, SpotifyTokenResponse, Album } from '../types';

// Mock album data for demo mode
const MOCK_ALBUMS: Album[] = [
  {
    id: 'mock-1',
    spotifyId: 'mock-spotify-1',
    name: 'Abbey Road',
    artist: 'The Beatles',
    releaseDate: new Date('1969-09-26'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25',
    spotifyUrl: 'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-2',
    spotifyId: 'mock-spotify-2',
    name: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    releaseDate: new Date('1973-03-01'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe',
    spotifyUrl: 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-3',
    spotifyId: 'mock-spotify-3',
    name: 'Thriller',
    artist: 'Michael Jackson',
    releaseDate: new Date('1982-11-30'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b2735b8e6c6e6c6e6c6e6c6e6c6e',
    spotifyUrl: 'https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-4',
    spotifyId: 'mock-spotify-4',
    name: 'Back in Black',
    artist: 'AC/DC',
    releaseDate: new Date('1980-07-25'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273b92d22b4b3d4e4e4e4e4e4e4',
    spotifyUrl: 'https://open.spotify.com/album/6mUdeDZCsExyJLMdAfDuwh',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-5',
    spotifyId: 'mock-spotify-5',
    name: 'Hotel California',
    artist: 'Eagles',
    releaseDate: new Date('1976-12-08'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c5d4e4e4e4e4e4e4e4e4e4e4',
    spotifyUrl: 'https://open.spotify.com/album/4E6iyQvCZQPGHTQRXlAMdB',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-6',
    spotifyId: 'mock-spotify-6',
    name: 'Rumours',
    artist: 'Fleetwood Mac',
    releaseDate: new Date('1977-02-04'),
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273d6e4e4e4e4e4e4e4e4e4e4e4',
    spotifyUrl: 'https://open.spotify.com/album/1bt6q2SruMsBtcerNVtpZB',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export class SpotifyService {
  private client?: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly baseUrl = 'https://api.spotify.com/v1';
  private readonly tokenUrl = 'https://accounts.spotify.com/api/token';
  private readonly cachePrefix = 'spotify:';
  private readonly tokenCacheKey = 'spotify:access_token';
  private readonly defaultCacheTTL = 3600; // 1 hour
  private readonly searchCacheTTL = 1800; // 30 minutes
  private readonly demoMode: boolean;

  // Rate limiting properties
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerSecond = 10;
  private readonly windowSizeMs = 1000;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    // Enable demo mode if credentials are not configured or are placeholder values
    this.demoMode = !this.clientId || 
                   !this.clientSecret || 
                   this.clientId === 'your-spotify-client-id' ||
                   this.clientId === 'your-actual-spotify-client-id-here' ||
                   this.clientSecret === 'your-spotify-client-secret' ||
                   this.clientSecret === 'your-actual-spotify-client-secret-here';

    if (this.demoMode) {
      console.log('🎵 Spotify Service running in DEMO MODE - using mock album data');
      console.log('   To use real Spotify data, configure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env');
      return; // Skip API client setup in demo mode
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          await this.refreshAccessToken();
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
          return this.client!.request(originalRequest);
        }
        
        if (error.response?.status === 429) {
          // Rate limited, implement exponential backoff
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
          await this.delay(retryAfter * 1000);
          return this.client!.request(error.config);
        }

        throw this.handleSpotifyError(error);
      }
    );
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    
    // Check if we have a valid token
    if (this.accessToken && now < this.tokenExpiresAt) {
      return;
    }

    // Try to get token from cache
    const cachedToken = await this.getCachedToken();
    if (cachedToken && now < cachedToken.expiresAt) {
      this.accessToken = cachedToken.token;
      this.tokenExpiresAt = cachedToken.expiresAt;
      return;
    }

    // Get new token
    await this.refreshAccessToken();
  }

  /**
   * Get cached access token
   */
  private async getCachedToken(): Promise<{ token: string; expiresAt: number } | null> {
    try {
      const cached = await cacheGet(this.tokenCacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached Spotify token:', error);
      return null;
    }
  }

  /**
   * Cache access token
   */
  private async cacheToken(token: string, expiresIn: number): Promise<void> {
    const expiresAt = Date.now() + (expiresIn * 1000);
    const tokenData = { token, expiresAt };
    
    try {
      await cacheSet(this.tokenCacheKey, JSON.stringify(tokenData), expiresIn - 60); // Cache for slightly less time
    } catch (error) {
      console.error('Error caching Spotify token:', error);
    }
  }

  /**
   * Refresh access token using client credentials flow
   */
  public async refreshAccessToken(): Promise<string> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response: AxiosResponse<SpotifyTokenResponse> = await axios.post(
        this.tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      const { access_token, expires_in } = response.data;
      
      this.accessToken = access_token;
      this.tokenExpiresAt = Date.now() + (expires_in * 1000);
      
      // Cache the token
      await this.cacheToken(access_token, expires_in);
      
      return access_token;
    } catch (error) {
      console.error('Error refreshing Spotify access token:', error);
      throw new Error('Failed to authenticate with Spotify API');
    }
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart >= this.windowSizeMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we're over the limit
    if (this.requestCount >= this.maxRequestsPerSecond) {
      const waitTime = this.windowSizeMs - (now - this.windowStart);
      await this.delay(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Search for albums
   */
  public async searchAlbums(query: string, limit: number = 20): Promise<Album[]> {
    if (!query.trim()) {
      return [];
    }

    // Demo mode - return filtered mock albums
    if (this.demoMode) {
      console.log(`🎵 Demo mode: Searching for "${query}"`);
      const filteredAlbums = MOCK_ALBUMS.filter(album => 
        album.name.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      );
      
      // Simulate API delay
      await this.delay(500);
      
      return filteredAlbums.slice(0, limit);
    }

    // Check cache first
    const cacheKey = `${this.cachePrefix}search:${query}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Error parsing cached search results:', error);
      }
    }

    await this.checkRateLimit();

    try {
      const response: AxiosResponse<SpotifySearchResponse> = await this.client!.get('/search', {
        params: {
          q: query,
          type: 'album',
          limit: Math.min(limit, 50), // Spotify max is 50
          market: 'US', // Default market
        },
      });

      const albums = response.data.albums.items.map(this.mapSpotifyAlbumToAlbum);
      
      // Cache the results
      await cacheSet(cacheKey, JSON.stringify(albums), this.searchCacheTTL);
      
      return albums;
    } catch (error) {
      console.error('Error searching albums:', error);
      throw this.handleSpotifyError(error);
    }
  }

  /**
   * Get a specific album by Spotify ID
   */
  public async getAlbum(spotifyId: string): Promise<Album> {
    if (!spotifyId) {
      throw new Error('Spotify ID is required');
    }

    // Demo mode - return mock album by ID
    if (this.demoMode) {
      console.log(`🎵 Demo mode: Getting album "${spotifyId}"`);
      const album = MOCK_ALBUMS.find(a => a.spotifyId === spotifyId);
      if (!album) {
        throw new Error('Album not found');
      }
      
      // Simulate API delay
      await this.delay(300);
      
      return album;
    }

    // Check cache first
    const cacheKey = `${this.cachePrefix}album:${spotifyId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Error parsing cached album:', error);
      }
    }

    await this.checkRateLimit();

    try {
      const response: AxiosResponse<SpotifyAlbum> = await this.client!.get(`/albums/${spotifyId}`);
      const album = this.mapSpotifyAlbumToAlbum(response.data);
      
      // Cache the album
      await cacheSet(cacheKey, JSON.stringify(album), this.defaultCacheTTL);
      
      return album;
    } catch (error) {
      console.error('Error getting album:', error);
      throw this.handleSpotifyError(error);
    }
  }

  /**
   * Map Spotify album to our Album interface
   */
  private mapSpotifyAlbumToAlbum(spotifyAlbum: SpotifyAlbum): Album {
    return {
      id: '', // Will be set when saved to database
      spotifyId: spotifyAlbum.id,
      name: spotifyAlbum.name,
      artist: spotifyAlbum.artists.map(artist => artist.name).join(', '),
      releaseDate: new Date(spotifyAlbum.release_date),
      imageUrl: spotifyAlbum.images[0]?.url || '',
      spotifyUrl: spotifyAlbum.external_urls.spotify,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Handle Spotify API errors
   */
  private handleSpotifyError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Spotify API error';
      
      switch (status) {
        case 400:
          return new Error(`Bad request: ${message}`);
        case 401:
          return new Error('Spotify authentication failed');
        case 403:
          return new Error('Spotify access forbidden');
        case 404:
          return new Error('Album not found');
        case 429:
          return new Error('Spotify rate limit exceeded');
        case 500:
        case 502:
        case 503:
          return new Error('Spotify service temporarily unavailable');
        default:
          return new Error(`Spotify API error: ${message}`);
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Spotify API request timeout');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Unable to connect to Spotify API');
    }
    
    return new Error('Unexpected error communicating with Spotify API');
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cached data for testing
   */
  public async clearCache(): Promise<void> {
    // This would be used in tests to clear cache
    // Implementation would depend on Redis pattern matching
    console.log('Cache clearing not implemented - would clear spotify:* keys');
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      return true;
    } catch (error) {
      console.error('Spotify service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();

// Export factory function for testing
export const createSpotifyService = () => new SpotifyService();