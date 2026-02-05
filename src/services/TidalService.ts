import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { cacheGet, cacheSet } from '../config/redis';
import { Album } from '../types';

// Import TIDAL packages
const { getInfo } = require('tidal-music-api');

// TIDAL API types
interface TidalAlbum {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  artists?: Array<{ name: string }>;
  releaseDate: string;
  cover: string;
  url: string;
  duration?: number;
  numberOfTracks?: number;
}

interface TidalSearchResponse {
  albums?: {
    items: TidalAlbum[];
    totalNumberOfItems: number;
  };
}

// Mock album data for demo mode (expanded catalog)
const MOCK_ALBUMS: Album[] = [
  {
    id: 'mock-1',
    spotifyId: 'mock-apple-1',
    name: 'Abbey Road',
    artist: 'The Beatles',
    releaseDate: new Date('1969-09-26'),
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/dc/30/58/dc30583b-a717-007b-00cc-eb25dc30583b/source/640x640bb.jpg',
    spotifyUrl: 'https://music.apple.com/album/1441164670',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-2',
    spotifyId: 'mock-tidal-2',
    name: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    releaseDate: new Date('1973-03-01'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/ea7caaff71dea1051d49b2fe.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234568',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-3',
    spotifyId: 'mock-tidal-3',
    name: 'Thriller',
    artist: 'Michael Jackson',
    releaseDate: new Date('1982-11-30'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/5b8e6c6e6c6e6c6e6c6e6c6e.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234569',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-4',
    spotifyId: 'mock-tidal-4',
    name: 'Back in Black',
    artist: 'AC/DC',
    releaseDate: new Date('1980-07-25'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/b92d22b4b3d4e4e4e4e4e4e4.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234570',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-5',
    spotifyId: 'mock-tidal-5',
    name: 'Hotel California',
    artist: 'Eagles',
    releaseDate: new Date('1976-12-08'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/c5d4e4e4e4e4e4e4e4e4e4e4.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234571',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-6',
    spotifyId: 'mock-tidal-6',
    name: 'Rumours',
    artist: 'Fleetwood Mac',
    releaseDate: new Date('1977-02-04'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/d6e4e4e4e4e4e4e4e4e4e4e4.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234572',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Additional popular albums for better demo experience
  {
    id: 'mock-7',
    spotifyId: 'mock-tidal-7',
    name: 'Led Zeppelin IV',
    artist: 'Led Zeppelin',
    releaseDate: new Date('1971-11-08'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/c8a11e48c2a9357b0d58b5e6.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234573',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-8',
    spotifyId: 'mock-tidal-8',
    name: 'The Wall',
    artist: 'Pink Floyd',
    releaseDate: new Date('1979-11-30'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/f05e5ac5b6c8b4b4b4b4b4b4.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234574',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-9',
    spotifyId: 'mock-tidal-9',
    name: 'Born to Run',
    artist: 'Bruce Springsteen',
    releaseDate: new Date('1975-08-25'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/a3b4c5d6e7f8g9h0i1j2k3l4.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234575',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-10',
    spotifyId: 'mock-tidal-10',
    name: 'Kind of Blue',
    artist: 'Miles Davis',
    releaseDate: new Date('1959-08-17'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/m5n6o7p8q9r0s1t2u3v4w5x6.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234576',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-11',
    spotifyId: 'mock-tidal-11',
    name: 'Nevermind',
    artist: 'Nirvana',
    releaseDate: new Date('1991-09-24'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/y7z8a9b0c1d2e3f4g5h6i7j8.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234577',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-12',
    spotifyId: 'mock-tidal-12',
    name: 'OK Computer',
    artist: 'Radiohead',
    releaseDate: new Date('1997-06-16'),
    imageUrl: 'https://resources.tidal.com/images/ab67616d/640x640/k9l0m1n2o3p4q5r6s7t8u9v0.jpg',
    spotifyUrl: 'https://tidal.com/browse/album/1234578',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export class TidalService {
  private client?: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly baseUrl = 'https://openapi.tidal.com/v1';
  private readonly cachePrefix = 'tidal:';
  private readonly tokenCacheKey = 'tidal:access_token';
  private readonly defaultCacheTTL = 3600; // 1 hour
  private readonly searchCacheTTL = 1800; // 30 minutes
  private readonly demoMode: boolean;
  private readonly useUnofficialAPI: boolean;

  // Rate limiting properties
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerSecond = 5; // TIDAL is more restrictive
  private readonly windowSizeMs = 1000;

  constructor() {
    this.clientId = process.env.TIDAL_CLIENT_ID || '';
    this.clientSecret = process.env.TIDAL_CLIENT_SECRET || '';

    // Enable demo mode if credentials are not configured or are placeholder values
    this.demoMode = !this.clientId || 
                   !this.clientSecret || 
                   this.clientId === 'your-tidal-client-id' ||
                   this.clientId === 'your-actual-tidal-client-id-here' ||
                   this.clientSecret === 'your-tidal-client-secret' ||
                   this.clientSecret === 'your-actual-tidal-client-secret-here';

    // Use unofficial API if no official credentials but not in full demo mode
    this.useUnofficialAPI = this.demoMode;

    if (this.demoMode) {
      console.log('🎵 Apple Music Service running in DEMO MODE - using mock album data');
      console.log('   To use real Apple Music data, configure Apple Music credentials in .env');
      return; // Skip API client setup in demo mode
    }

    if (this.useUnofficialAPI) {
      console.log('🎵 TIDAL Service using unofficial API - limited functionality');
    } else {
      console.log('🎵 TIDAL Service using official API');
      this.setupOfficialAPI();
    }
  }

  /**
   * Setup official TIDAL API client
   */
  private setupOfficialAPI(): void {
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

        throw this.handleTidalError(error);
      }
    );
  }

  /**
   * Ensure we have a valid access token (official API)
   */
  private async ensureValidToken(): Promise<void> {
    if (this.useUnofficialAPI || this.demoMode) return;

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
      console.error('Error getting cached TIDAL token:', error);
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
      await cacheSet(this.tokenCacheKey, JSON.stringify(tokenData), expiresIn - 60);
    } catch (error) {
      console.error('Error caching TIDAL token:', error);
    }
  }

  /**
   * Refresh access token using client credentials flow (official API)
   */
  public async refreshAccessToken(): Promise<string> {
    if (this.useUnofficialAPI || this.demoMode) {
      throw new Error('Token refresh not available in unofficial/demo mode');
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        'https://auth.tidal.com/v1/oauth2/token',
        'grant_type=client_credentials&scope=r_usr+w_usr',
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
      console.error('Error refreshing TIDAL access token:', error);
      throw new Error('Failed to authenticate with TIDAL API');
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
   * Search for albums using unofficial API
   */
  private async searchAlbumsUnofficial(query: string, limit: number): Promise<Album[]> {
    try {
      // The unofficial API doesn't have direct search, so we'll simulate it
      // by filtering our mock data for now
      console.log(`🎵 Unofficial TIDAL API: Searching for "${query}"`);
      
      const filteredAlbums = MOCK_ALBUMS.filter(album => 
        album.name.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      );
      
      // Simulate API delay
      await this.delay(800);
      
      return filteredAlbums.slice(0, limit);
    } catch (error) {
      console.error('Error with unofficial TIDAL search:', error);
      // Fallback to mock data
      return MOCK_ALBUMS.filter(album => 
        album.name.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  /**
   * Search for albums using official API
   */
  private async searchAlbumsOfficial(query: string, limit: number): Promise<Album[]> {
    await this.checkRateLimit();

    try {
      const response: AxiosResponse<TidalSearchResponse> = await this.client!.get('/search', {
        params: {
          query: query,
          type: 'albums',
          limit: Math.min(limit, 50),
          countryCode: 'US',
        },
      });

      const albums = response.data.albums?.items?.map(this.mapTidalAlbumToAlbum) || [];
      return albums;
    } catch (error) {
      console.error('Error searching albums with official TIDAL API:', error);
      throw this.handleTidalError(error);
    }
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

    let albums: Album[];
    
    if (this.useUnofficialAPI) {
      albums = await this.searchAlbumsUnofficial(query, limit);
    } else {
      albums = await this.searchAlbumsOfficial(query, limit);
    }
    
    // Cache the results
    await cacheSet(cacheKey, JSON.stringify(albums), this.searchCacheTTL);
    
    return albums;
  }

  /**
   * Get a specific album by TIDAL ID
   */
  public async getAlbum(tidalId: string): Promise<Album> {
    if (!tidalId) {
      throw new Error('TIDAL ID is required');
    }

    // Demo mode - return mock album by ID
    if (this.demoMode) {
      console.log(`🎵 Demo mode: Getting album "${tidalId}"`);
      const album = MOCK_ALBUMS.find(a => a.spotifyId === tidalId);
      if (!album) {
        throw new Error('Album not found');
      }
      
      // Simulate API delay
      await this.delay(300);
      
      return album;
    }

    // Check cache first
    const cacheKey = `${this.cachePrefix}album:${tidalId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Error parsing cached album:', error);
      }
    }

    if (this.useUnofficialAPI) {
      try {
        // Try to get album info using the unofficial API
        const albumUrl = `https://tidal.com/browse/album/${tidalId}`;
        const albumInfo = await getInfo(albumUrl);
        const album = this.mapTidalAlbumToAlbum(albumInfo);
        
        // Cache the album
        await cacheSet(cacheKey, JSON.stringify(album), this.defaultCacheTTL);
        
        return album;
      } catch (error) {
        console.error('Error getting album with unofficial API:', error);
        throw new Error('Album not found');
      }
    } else {
      await this.checkRateLimit();

      try {
        const response: AxiosResponse<TidalAlbum> = await this.client!.get(`/albums/${tidalId}`);
        const album = this.mapTidalAlbumToAlbum(response.data);
        
        // Cache the album
        await cacheSet(cacheKey, JSON.stringify(album), this.defaultCacheTTL);
        
        return album;
      } catch (error) {
        console.error('Error getting album:', error);
        throw this.handleTidalError(error);
      }
    }
  }

  /**
   * Map TIDAL album to our Album interface
   */
  private mapTidalAlbumToAlbum(tidalAlbum: TidalAlbum): Album {
    const artistName = tidalAlbum.artist?.name || 
                      (tidalAlbum.artists && tidalAlbum.artists.length > 0 
                        ? tidalAlbum.artists.map(artist => artist.name).join(', ')
                        : 'Unknown Artist');

    return {
      id: '', // Will be set when saved to database
      spotifyId: tidalAlbum.id,
      name: tidalAlbum.title,
      artist: artistName,
      releaseDate: new Date(tidalAlbum.releaseDate),
      imageUrl: tidalAlbum.cover || '',
      spotifyUrl: tidalAlbum.url || `https://tidal.com/browse/album/${tidalAlbum.id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Handle TIDAL API errors
   */
  private handleTidalError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'TIDAL API error';
      
      switch (status) {
        case 400:
          return new Error(`Bad request: ${message}`);
        case 401:
          return new Error('TIDAL authentication failed');
        case 403:
          return new Error('TIDAL access forbidden');
        case 404:
          return new Error('Album not found');
        case 429:
          return new Error('TIDAL rate limit exceeded');
        case 500:
        case 502:
        case 503:
          return new Error('TIDAL service temporarily unavailable');
        default:
          return new Error(`TIDAL API error: ${message}`);
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('TIDAL API request timeout');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Unable to connect to TIDAL API');
    }
    
    return new Error('Unexpected error communicating with TIDAL API');
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
    console.log('Cache clearing not implemented - would clear tidal:* keys');
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (this.demoMode || this.useUnofficialAPI) {
        return true; // Always healthy in demo/unofficial mode
      }
      await this.ensureValidToken();
      return true;
    } catch (error) {
      console.error('TIDAL service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tidalService = new TidalService();

// Export factory function for testing
export const createTidalService = () => new TidalService();