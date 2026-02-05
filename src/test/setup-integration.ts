/**
 * Integration Test Setup
 * 
 * This file configures the test environment for integration tests,
 * including database connections, Redis setup, and global test utilities.
 */

import { connectDatabase, closeDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { clearTestData } from './helpers';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  try {
    // Connect to test database
    await connectDatabase();
    console.log('✅ Test database connected');

    // Connect to test Redis
    await connectRedis();
    console.log('✅ Test Redis connected');

    // Clear any existing test data
    await clearTestData();
    console.log('✅ Test data cleared');
  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    throw error;
  }
});

// Global test cleanup
afterAll(async () => {
  try {
    // Clear test data
    await clearTestData();
    console.log('✅ Test data cleared');

    // Disconnect from database
    await closeDatabase();
    console.log('✅ Test database disconnected');

    // Note: Redis connection cleanup handled automatically
  } catch (error) {
    console.error('❌ Integration test cleanup failed:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Mock external services for integration tests
jest.mock('@/services/SpotifyService', () => ({
  SpotifyService: {
    searchAlbums: jest.fn().mockResolvedValue([
      {
        id: 'mock-album-1',
        spotifyId: 'mock-spotify-1',
        name: 'Mock Album 1',
        artist: 'Mock Artist 1',
        releaseDate: '2023-01-01',
        imageUrl: 'https://example.com/mock1.jpg',
        spotifyUrl: 'https://open.spotify.com/album/mock1'
      },
      {
        id: 'mock-album-2',
        spotifyId: 'mock-spotify-2',
        name: 'Mock Album 2',
        artist: 'Mock Artist 2',
        releaseDate: '2023-02-01',
        imageUrl: 'https://example.com/mock2.jpg',
        spotifyUrl: 'https://open.spotify.com/album/mock2'
      }
    ]),
    getAlbum: jest.fn().mockImplementation((spotifyId: string) => 
      Promise.resolve({
        id: `mock-${spotifyId}`,
        spotifyId,
        name: `Mock Album for ${spotifyId}`,
        artist: 'Mock Artist',
        releaseDate: '2023-01-01',
        imageUrl: 'https://example.com/mock.jpg',
        spotifyUrl: `https://open.spotify.com/album/${spotifyId}`
      })
    ),
    refreshAccessToken: jest.fn().mockResolvedValue('mock-access-token')
  }
}));

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidRating(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidRating(received: number) {
    const pass = Number.isInteger(received) && received >= 1 && received <= 5;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid rating (1-5)`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid rating (1-5)`,
        pass: false,
      };
    }
  }
});

export {};