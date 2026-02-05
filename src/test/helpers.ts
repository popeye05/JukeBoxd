import { query } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { User, Album, Rating, Review } from '@/types';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Database cleanup utilities
export const cleanupDatabase = async (): Promise<void> => {
  const tables = ['activities', 'follows', 'reviews', 'ratings', 'albums', 'users'];
  
  for (const table of tables) {
    await query(`DELETE FROM ${table}`);
  }
};

export const cleanupRedis = async (): Promise<void> => {
  const redis = getRedisClient();
  await redis.flushDb();
};

// Combined cleanup function for tests
export const clearTestData = async (): Promise<void> => {
  await cleanupDatabase();
  await cleanupRedis();
};

// Test data factories
export const createTestUser = async (overrides: Partial<User> = {}): Promise<User> => {
  const defaultUser = {
    id: uuidv4(),
    username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    passwordHash: await bcrypt.hash('password123', 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user = { ...defaultUser, ...overrides };

  await query(
    `INSERT INTO users (id, username, email, password_hash, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, user.username, user.email, user.passwordHash, user.createdAt, user.updatedAt]
  );

  return user;
};

export const createTestAlbum = async (overrides: Partial<Album> = {}): Promise<Album> => {
  const defaultAlbum = {
    id: uuidv4(),
    spotifyId: `spotify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Album ${Date.now()}`,
    artist: `Test Artist ${Date.now()}`,
    releaseDate: new Date('2023-01-01'),
    imageUrl: 'https://example.com/album-cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const album = { ...defaultAlbum, ...overrides };

  await query(
    `INSERT INTO albums (id, spotify_id, name, artist, release_date, image_url, spotify_url, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      album.id,
      album.spotifyId,
      album.name,
      album.artist,
      album.releaseDate,
      album.imageUrl,
      album.spotifyUrl,
      album.createdAt,
      album.updatedAt,
    ]
  );

  return album;
};

export const createTestRating = async (
  userId: string,
  albumId: string,
  rating: number = 5
): Promise<Rating> => {
  const ratingData = {
    id: uuidv4(),
    userId,
    albumId,
    rating,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await query(
    `INSERT INTO ratings (id, user_id, album_id, rating, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ratingData.id, ratingData.userId, ratingData.albumId, ratingData.rating, ratingData.createdAt, ratingData.updatedAt]
  );

  return ratingData;
};

export const createTestReview = async (
  userId: string,
  albumId: string,
  content: string = 'This is a test review'
): Promise<Review> => {
  const reviewData = {
    id: uuidv4(),
    userId,
    albumId,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await query(
    `INSERT INTO reviews (id, user_id, album_id, content, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [reviewData.id, reviewData.userId, reviewData.albumId, reviewData.content, reviewData.createdAt, reviewData.updatedAt]
  );

  return reviewData;
};

export const createTestFollow = async (followerId: string, followeeId: string): Promise<void> => {
  await query(
    `INSERT INTO follows (id, follower_id, followee_id, created_at) 
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), followerId, followeeId, new Date()]
  );
};

// Property-based test generators for fast-check
export const generateValidUsername = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
  let result = '';
  for (let i = 0; i < Math.floor(Math.random() * 40) + 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateValidEmail = (): string => {
  const domains = ['example.com', 'test.org', 'demo.net'];
  const username = generateValidUsername().toLowerCase();
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${domain}`;
};

export const generateValidRating = (): number => {
  return Math.floor(Math.random() * 5) + 1; // 1-5
};

export const generateValidReviewContent = (): string => {
  const words = [
    'amazing', 'great', 'good', 'okay', 'bad', 'terrible', 'fantastic', 'wonderful',
    'album', 'music', 'song', 'track', 'artist', 'performance', 'production', 'sound'
  ];
  
  const length = Math.floor(Math.random() * 50) + 10;
  let content = '';
  
  for (let i = 0; i < length; i++) {
    content += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  
  return content.trim();
};