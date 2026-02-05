import { query } from '@/config/database';
import { Album, QueryResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class AlbumModel {
  /**
   * Create a new album from Spotify data
   */
  static async create(
    spotifyId: string,
    name: string,
    artist: string,
    releaseDate: Date,
    imageUrl: string,
    spotifyUrl: string
  ): Promise<Album> {
    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at`,
      [id, spotifyId, name, artist, releaseDate, imageUrl, spotifyUrl]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create album');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find album by Spotify ID
   */
  static async findBySpotifyId(spotifyId: string): Promise<Album | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at FROM albums WHERE spotify_id = $1',
      [spotifyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find album by ID
   */
  static async findById(id: string): Promise<Album | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at FROM albums WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find or create album from Spotify data
   * This is useful when we need to ensure an album exists before creating ratings/reviews
   */
  static async findOrCreate(
    spotifyId: string,
    name: string,
    artist: string,
    releaseDate: Date,
    imageUrl: string,
    spotifyUrl: string
  ): Promise<Album> {
    // First try to find existing album
    const existing = await this.findBySpotifyId(spotifyId);
    if (existing) {
      return existing;
    }

    // Create new album if it doesn't exist
    return await this.create(spotifyId, name, artist, releaseDate, imageUrl, spotifyUrl);
  }

  /**
   * Update album information
   */
  static async update(
    id: string,
    name: string,
    artist: string,
    releaseDate: Date,
    imageUrl: string,
    spotifyUrl: string
  ): Promise<Album | null> {
    const result: QueryResult<any> = await query(
      `UPDATE albums 
       SET name = $2, artist = $3, release_date = $4, image_url = $5, spotify_url = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at`,
      [id, name, artist, releaseDate, imageUrl, spotifyUrl]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Delete album by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM albums WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Search albums by name or artist
   */
  static async search(searchTerm: string, limit: number = 20): Promise<Album[]> {
    const result: QueryResult<any> = await query(
      `SELECT id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at 
       FROM albums 
       WHERE name ILIKE $1 OR artist ILIKE $1 
       ORDER BY name ASC 
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  /**
   * Get all albums (with pagination)
   */
  static async findAll(limit: number = 50, offset: number = 0): Promise<Album[]> {
    const result: QueryResult<any> = await query(
      `SELECT id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at 
       FROM albums 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      artist: row.artist,
      releaseDate: new Date(row.release_date),
      imageUrl: row.image_url,
      spotifyUrl: row.spotify_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }
}