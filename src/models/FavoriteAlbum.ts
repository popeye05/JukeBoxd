import { query } from '@/config/database';
import { Album } from '@/types';

export interface FavoriteAlbum {
  id: string;
  userId: string;
  albumId: string;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FavoriteAlbumWithDetails extends FavoriteAlbum {
  album?: Album;
}

export class FavoriteAlbumModel {
  /**
   * Add album to favorites
   */
  static async addFavorite(userId: string, albumId: string, rank: number): Promise<FavoriteAlbum> {
    const result = await query(
      `INSERT INTO favorite_albums (user_id, album_id, rank)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, album_id) 
       DO UPDATE SET rank = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, albumId, rank]
    );
    return this.mapRowToFavorite(result.rows[0]);
  }

  /**
   * Remove album from favorites
   */
  static async removeFavorite(userId: string, albumId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM favorite_albums WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );
    return result.rowCount > 0;
  }

  /**
   * Get user's favorite albums with details
   */
  static async getUserFavorites(userId: string): Promise<FavoriteAlbumWithDetails[]> {
    const result = await query(
      `SELECT 
        fa.*,
        a.id as album_id,
        a.spotify_id,
        a.name as album_name,
        a.artist,
        a.release_date,
        a.image_url,
        a.spotify_url
       FROM favorite_albums fa
       JOIN albums a ON fa.album_id = a.id
       WHERE fa.user_id = $1
       ORDER BY fa.rank ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rank: row.rank,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      album: {
        id: row.album_id,
        spotifyId: row.spotify_id,
        name: row.album_name,
        artist: row.artist,
        releaseDate: new Date(row.release_date),
        imageUrl: row.image_url,
        spotifyUrl: row.spotify_url,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }
    }));
  }

  /**
   * Update ranks for multiple favorites (for reordering)
   */
  static async updateRanks(userId: string, updates: { albumId: string; rank: number }[]): Promise<void> {
    const client = await query('BEGIN');
    
    try {
      for (const update of updates) {
        await query(
          'UPDATE favorite_albums SET rank = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND album_id = $3',
          [update.rank, userId, update.albumId]
        );
      }
      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Check if album is in user's favorites
   */
  static async isFavorite(userId: string, albumId: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM favorite_albums WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get next available rank for user
   */
  static async getNextRank(userId: string): Promise<number> {
    const result = await query(
      'SELECT COALESCE(MAX(rank), 0) + 1 as next_rank FROM favorite_albums WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].next_rank;
  }

  private static mapRowToFavorite(row: any): FavoriteAlbum {
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      rank: row.rank,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
