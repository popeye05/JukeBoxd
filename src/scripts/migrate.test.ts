import { query } from '@/config/database';
import { runMigrations } from './migrate';

describe('Database Migrations', () => {
  beforeAll(async () => {
    // Run migrations
    await runMigrations();
  });

  it('should create all required tables', async () => {
    const tables = ['users', 'albums', 'ratings', 'reviews', 'follows', 'activities'];
    
    for (const table of tables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      expect(result.rows[0].exists).toBe(true);
    }
  });

  it('should create all required indexes', async () => {
    const indexes = [
      'idx_ratings_user_id',
      'idx_ratings_album_id',
      'idx_reviews_user_id',
      'idx_reviews_album_id',
      'idx_follows_follower_id',
      'idx_follows_followee_id',
      'idx_activities_user_id',
      'idx_activities_created_at'
    ];

    for (const indexName of indexes) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        );
      `, [indexName]);
      
      expect(result.rows[0].exists).toBe(true);
    }
  });

  it('should enforce foreign key constraints', async () => {
    // Test that we cannot insert a rating with invalid user_id
    await expect(
      query(`
        INSERT INTO ratings (user_id, album_id, rating) 
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 5)
      `)
    ).rejects.toThrow();
  });

  it('should enforce check constraints', async () => {
    // First create a user and album for the test
    const userResult = await query(`
      INSERT INTO users (username, email, password_hash) 
      VALUES ('testuser', 'test@example.com', 'hashedpassword') 
      RETURNING id
    `);
    const userId = userResult.rows[0].id;

    const albumResult = await query(`
      INSERT INTO albums (spotify_id, name, artist) 
      VALUES ('test-spotify-id', 'Test Album', 'Test Artist') 
      RETURNING id
    `);
    const albumId = albumResult.rows[0].id;

    // Test that we cannot insert a rating outside 1-5 range
    await expect(
      query(`
        INSERT INTO ratings (user_id, album_id, rating) 
        VALUES ($1, $2, 6)
      `, [userId, albumId])
    ).rejects.toThrow();

    await expect(
      query(`
        INSERT INTO ratings (user_id, album_id, rating) 
        VALUES ($1, $2, 0)
      `, [userId, albumId])
    ).rejects.toThrow();
  });
});