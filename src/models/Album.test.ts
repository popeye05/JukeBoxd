import { AlbumModel } from './Album';
import { query } from '@/config/database';
import { Album } from '@/types';

// Mock the database query function
jest.mock('@/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('AlbumModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new album successfully', async () => {
      const mockAlbumData = {
        id: 'album-123',
        spotify_id: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        release_date: '2023-01-01',
        image_url: 'https://example.com/image.jpg',
        spotify_url: 'https://open.spotify.com/album/123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAlbumData],
        rowCount: 1
      });

      const result = await AlbumModel.create(
        'spotify-123',
        'Test Album',
        'Test Artist',
        new Date('2023-01-01'),
        'https://example.com/image.jpg',
        'https://open.spotify.com/album/123'
      );

      expect(result).toEqual({
        id: 'album-123',
        spotifyId: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        releaseDate: new Date('2023-01-01'),
        imageUrl: 'https://example.com/image.jpg',
        spotifyUrl: 'https://open.spotify.com/album/123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO albums'),
        expect.arrayContaining([
          expect.any(String), // UUID
          'spotify-123',
          'Test Album',
          'Test Artist',
          new Date('2023-01-01'),
          'https://example.com/image.jpg',
          'https://open.spotify.com/album/123'
        ])
      );
    });

    it('should throw error when creation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await expect(
        AlbumModel.create(
          'spotify-123',
          'Test Album',
          'Test Artist',
          new Date('2023-01-01'),
          'https://example.com/image.jpg',
          'https://open.spotify.com/album/123'
        )
      ).rejects.toThrow('Failed to create album');
    });
  });

  describe('findBySpotifyId', () => {
    it('should find album by Spotify ID', async () => {
      const mockAlbumData = {
        id: 'album-123',
        spotify_id: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        release_date: '2023-01-01',
        image_url: 'https://example.com/image.jpg',
        spotify_url: 'https://open.spotify.com/album/123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAlbumData],
        rowCount: 1
      });

      const result = await AlbumModel.findBySpotifyId('spotify-123');

      expect(result).toEqual({
        id: 'album-123',
        spotifyId: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        releaseDate: new Date('2023-01-01'),
        imageUrl: 'https://example.com/image.jpg',
        spotifyUrl: 'https://open.spotify.com/album/123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE spotify_id = $1'),
        ['spotify-123']
      );
    });

    it('should return null when album not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await AlbumModel.findBySpotifyId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findOrCreate', () => {
    it('should return existing album if found', async () => {
      const mockAlbumData = {
        id: 'album-123',
        spotify_id: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        release_date: '2023-01-01',
        image_url: 'https://example.com/image.jpg',
        spotify_url: 'https://open.spotify.com/album/123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock findBySpotifyId to return existing album
      mockQuery.mockResolvedValueOnce({
        rows: [mockAlbumData],
        rowCount: 1
      });

      const result = await AlbumModel.findOrCreate(
        'spotify-123',
        'Test Album',
        'Test Artist',
        new Date('2023-01-01'),
        'https://example.com/image.jpg',
        'https://open.spotify.com/album/123'
      );

      expect(result.spotifyId).toBe('spotify-123');
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only findBySpotifyId called
    });

    it('should create new album if not found', async () => {
      const mockAlbumData = {
        id: 'album-123',
        spotify_id: 'spotify-123',
        name: 'Test Album',
        artist: 'Test Artist',
        release_date: '2023-01-01',
        image_url: 'https://example.com/image.jpg',
        spotify_url: 'https://open.spotify.com/album/123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock findBySpotifyId to return null (not found)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock create to return new album
      mockQuery.mockResolvedValueOnce({
        rows: [mockAlbumData],
        rowCount: 1
      });

      const result = await AlbumModel.findOrCreate(
        'spotify-123',
        'Test Album',
        'Test Artist',
        new Date('2023-01-01'),
        'https://example.com/image.jpg',
        'https://open.spotify.com/album/123'
      );

      expect(result.spotifyId).toBe('spotify-123');
      expect(mockQuery).toHaveBeenCalledTimes(2); // findBySpotifyId + create
    });
  });

  describe('search', () => {
    it('should search albums by name and artist', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          spotify_id: 'spotify-1',
          name: 'Test Album 1',
          artist: 'Test Artist',
          release_date: '2023-01-01',
          image_url: 'https://example.com/image1.jpg',
          spotify_url: 'https://open.spotify.com/album/1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'album-2',
          spotify_id: 'spotify-2',
          name: 'Another Album',
          artist: 'Test Artist',
          release_date: '2023-02-01',
          image_url: 'https://example.com/image2.jpg',
          spotify_url: 'https://open.spotify.com/album/2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockAlbums,
        rowCount: 2
      });

      const result = await AlbumModel.search('Test', 20);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('Test Album 1');
      expect(result[1]?.name).toBe('Another Album');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE $1 OR artist ILIKE $1'),
        ['%Test%', 20]
      );
    });

    it('should return empty array when no matches found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await AlbumModel.search('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('deleteById', () => {
    it('should delete album successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      const result = await AlbumModel.deleteById('album-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM albums WHERE id = $1',
        ['album-123']
      );
    });

    it('should return false when album not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await AlbumModel.deleteById('nonexistent');

      expect(result).toBe(false);
    });
  });
});