import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { cacheGet, cacheSet } from '../config/redis';
import { Album } from '../types';

// Last.fm API types
interface LastFmAlbum {
  name: string;
  artist: string;
  mbid?: string;
  url: string;
  image: Array<{
    '#text': string;
    size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
  }>;
  listeners?: string;
  playcount?: string;
  wiki?: {
    published: string;
    summary: string;
    content: string;
  };
}

interface LastFmSearchResponse {
  results: {
    albummatches: {
      album: LastFmAlbum[];
    };
  };
}

interface LastFmAlbumInfoResponse {
  album: LastFmAlbum;
}

// Mock album data for fallback (same as before but with Last.fm URLs)
const MOCK_ALBUMS: Album[] = [
  {
    id: 'mock-1',
    spotifyId: 'mock-lastfm-1',
    name: 'Abbey Road',
    artist: 'The Beatles',
    releaseDate: new Date('1969-09-26'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/3b54885952161aaea4ce2965b2db1638.png',
    spotifyUrl: 'https://www.last.fm/music/The+Beatles/Abbey+Road',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-2',
    spotifyId: 'mock-lastfm-2',
    name: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    releaseDate: new Date('1973-03-01'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/8b5cf1baf4b842b3c1d7bb84b7bb3991.png',
    spotifyUrl: 'https://www.last.fm/music/Pink+Floyd/The+Dark+Side+of+the+Moon',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-3',
    spotifyId: 'mock-lastfm-3',
    name: 'Thriller',
    artist: 'Michael Jackson',
    releaseDate: new Date('1982-11-30'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/c6f59c1e5e7240a4c0d427abd71f3dbb.png',
    spotifyUrl: 'https://www.last.fm/music/Michael+Jackson/Thriller',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-4',
    spotifyId: 'mock-lastfm-4',
    name: 'Back in Black',
    artist: 'AC/DC',
    releaseDate: new Date('1980-07-25'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/c14b155c696e4a82c59d158d54a5b7a6.png',
    spotifyUrl: 'https://www.last.fm/music/AC%2FDC/Back+in+Black',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-5',
    spotifyId: 'mock-lastfm-5',
    name: 'Hotel California',
    artist: 'Eagles',
    releaseDate: new Date('1976-12-08'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/2a96cbd8b46e442fc41c2b86b821562f.png',
    spotifyUrl: 'https://www.last.fm/music/Eagles/Hotel+California',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-6',
    spotifyId: 'mock-lastfm-6',
    name: 'Rumours',
    artist: 'Fleetwood Mac',
    releaseDate: new Date('1977-02-04'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/3b54885952161aaea4ce2965b2db1638.png',
    spotifyUrl: 'https://www.last.fm/music/Fleetwood+Mac/Rumours',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-7',
    spotifyId: 'mock-lastfm-7',
    name: 'Led Zeppelin IV',
    artist: 'Led Zeppelin',
    releaseDate: new Date('1971-11-08'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/c8a11e48c2a9357b0d58b5e6.png',
    spotifyUrl: 'https://www.last.fm/music/Led+Zeppelin/Led+Zeppelin+IV',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-8',
    spotifyId: 'mock-lastfm-8',
    name: 'The Wall',
    artist: 'Pink Floyd',
    releaseDate: new Date('1979-11-30'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/f05e5ac5b6c8b4b4b4b4b4b4.png',
    spotifyUrl: 'https://www.last.fm/music/Pink+Floyd/The+Wall',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-9',
    spotifyId: 'mock-lastfm-9',
    name: 'Born to Run',
    artist: 'Bruce Springsteen',
    releaseDate: new Date('1975-08-25'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/a3b4c5d6e7f8g9h0i1j2k3l4.png',
    spotifyUrl: 'https://www.last.fm/music/Bruce+Springsteen/Born+to+Run',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-10',
    spotifyId: 'mock-lastfm-10',
    name: 'Kind of Blue',
    artist: 'Miles Davis',
    releaseDate: new Date('1959-08-17'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/m5n6o7p8q9r0s1t2u3v4w5x6.png',
    spotifyUrl: 'https://www.last.fm/music/Miles+Davis/Kind+of+Blue',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-11',
    spotifyId: 'mock-lastfm-11',
    name: 'Nevermind',
    artist: 'Nirvana',
    releaseDate: new Date('1991-09-24'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/y7z8a9b0c1d2e3f4g5h6i7j8.png',
    spotifyUrl: 'https://www.last.fm/music/Nirvana/Nevermind',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-12',
    spotifyId: 'mock-lastfm-12',
    name: 'OK Computer',
    artist: 'Radiohead',
    releaseDate: new Date('1997-06-16'),
    imageUrl: 'https://lastfm.freetls.fastly.net/i/u/640x640/k9l0m1n2o3p4q5r6s7t8u9v0.png',
    spotifyUrl: 'https://www.last.fm/music/Radiohead/OK+Computer',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export class LastFmService {
  private client!: AxiosInstance;
  private apiKey: string;
  private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  private readonly cachePrefix = 'lastfm:';
  private readonly defaultCacheTTL = 3600; // 1 hour
  private readonly searchCacheTTL = 1800; // 30 minutes
  private readonly demoMode: boolean;

  // Rate limiting properties (Last.fm is generous but let's be respectful)
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerSecond = 5;
  private readonly windowSizeMs = 1000;

  constructor() {
    this.apiKey = process.env.LASTFM_API_KEY || '';

    // Enable demo mode if API key is not configured or is placeholder
    this.demoMode = !this.apiKey || 
                   this.apiKey === 'your-lastfm-api-key' ||
                   this.apiKey === 'demo-mode';

    if (this.demoMode) {
      console.log('🎵 Last.fm Service running in DEMO MODE - using mock album data');
      console.log('   To use real Last.fm data, get a free API key from https://www.last.fm/api');
    } else {
      console.log('🎵 Last.fm Service using real API with key:', this.apiKey.substring(0, 8) + '...');
      this.setupClient();
    }
  }

  /**
   * Setup Last.fm API client
   */
  private setupClient(): void {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'JukeBoxd/1.0.0',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          // Rate limited, implement exponential backoff
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(this.client!.request(error.config));
            }, retryAfter * 1000);
          });
        }

        throw this.handleLastFmError(error);
      }
    );
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
      const response: AxiosResponse<LastFmSearchResponse> = await this.client.get('', {
        params: {
          method: 'album.search',
          album: query,
          api_key: this.apiKey,
          format: 'json',
          limit: Math.min(limit, 50),
        },
      });

      const albums = response.data.results?.albummatches?.album?.map(this.mapLastFmAlbumToAlbum) || [];
      
      // Cache the results
      await cacheSet(cacheKey, JSON.stringify(albums), this.searchCacheTTL);
      
      return albums;
    } catch (error) {
      console.error('Error searching albums with Last.fm API:', error);
      
      // Fallback to mock data on error
      console.log('🎵 Falling back to demo mode due to API error');
      const filteredAlbums = MOCK_ALBUMS.filter(album => 
        album.name.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      );
      
      return filteredAlbums.slice(0, limit);
    }
  }

  /**
   * Get a specific album by Last.fm MBID or artist/album name
   */
  public async getAlbum(albumId: string): Promise<Album> {
    if (!albumId) {
      throw new Error('Album ID is required');
    }

    // Demo mode - return mock album by ID
    if (this.demoMode) {
      console.log(`🎵 Demo mode: Getting album "${albumId}"`);
      const album = MOCK_ALBUMS.find(a => a.spotifyId === albumId);
      if (!album) {
        throw new Error('Album not found');
      }
      
      // Simulate API delay
      await this.delay(300);
      
      return album;
    }

    // Check cache first
    const cacheKey = `${this.cachePrefix}album:${albumId}`;
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
      // Try to parse albumId as "artist|album" format
      const [artist, albumName] = albumId.includes('|') 
        ? albumId.split('|') 
        : [null, albumId];

      const params: any = {
        method: 'album.getinfo',
        api_key: this.apiKey,
        format: 'json',
      };

      if (artist && albumName) {
        params.artist = artist;
        params.album = albumName;
      } else {
        params.mbid = albumId;
      }

      const response: AxiosResponse<LastFmAlbumInfoResponse> = await this.client.get('', {
        params,
      });

      const album = this.mapLastFmAlbumToAlbum(response.data.album);
      
      // Cache the album
      await cacheSet(cacheKey, JSON.stringify(album), this.defaultCacheTTL);
      
      return album;
    } catch (error) {
      console.error('Error getting album:', error);
      throw new Error('Album not found');
    }
  }

  /**
   * Map Last.fm album to our Album interface
   */
  private mapLastFmAlbumToAlbum = (lastFmAlbum: LastFmAlbum): Album => {
    // Get the largest available image
    const imageUrl = lastFmAlbum.image?.find(img => img.size === 'extralarge')?.['#text'] ||
                     lastFmAlbum.image?.find(img => img.size === 'large')?.['#text'] ||
                     lastFmAlbum.image?.find(img => img.size === 'medium')?.['#text'] ||
                     lastFmAlbum.image?.[0]?.['#text'] ||
                     '';

    // Create a unique ID for the album
    const albumId = lastFmAlbum.mbid || `${lastFmAlbum.artist}|${lastFmAlbum.name}`;

    // Try to extract release date from wiki if available
    let releaseDate = new Date();
    if (lastFmAlbum.wiki?.published) {
      const publishedDate = new Date(lastFmAlbum.wiki.published);
      if (!isNaN(publishedDate.getTime())) {
        releaseDate = publishedDate;
      }
    }

    return {
      id: '', // Will be set when saved to database
      spotifyId: albumId,
      name: lastFmAlbum.name,
      artist: lastFmAlbum.artist,
      releaseDate,
      imageUrl: imageUrl.replace('/300x300/', '/640x640/'), // Get higher resolution if possible
      spotifyUrl: lastFmAlbum.url || `https://www.last.fm/music/${encodeURIComponent(lastFmAlbum.artist)}/${encodeURIComponent(lastFmAlbum.name)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  /**
   * Handle Last.fm API errors
   */
  private handleLastFmError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Last.fm API error';
      
      switch (status) {
        case 400:
          return new Error(`Bad request: ${message}`);
        case 403:
          return new Error('Last.fm API key invalid or suspended');
        case 404:
          return new Error('Album not found');
        case 429:
          return new Error('Last.fm rate limit exceeded');
        case 500:
        case 502:
        case 503:
          return new Error('Last.fm service temporarily unavailable');
        default:
          return new Error(`Last.fm API error: ${message}`);
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Last.fm API request timeout');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Unable to connect to Last.fm API');
    }
    
    return new Error('Unexpected error communicating with Last.fm API');
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
    console.log('Cache clearing not implemented - would clear lastfm:* keys');
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (this.demoMode) {
        return true; // Always healthy in demo mode
      }

      // Test API with a simple request
      await this.checkRateLimit();
      await this.client.get('', {
        params: {
          method: 'album.search',
          album: 'test',
          api_key: this.apiKey,
          format: 'json',
          limit: 1,
        },
      });
      
      return true;
    } catch (error) {
      console.error('Last.fm service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const lastFmService = new LastFmService();

// Export factory function for testing
export const createLastFmService = () => new LastFmService();