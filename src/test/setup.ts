import { connectDatabase, closeDatabase } from '../config/database';
import { connectRedis, closeRedis } from '../config/redis';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  try {
    // Connect to test database
    await connectDatabase();
    
    // Connect to Redis (use different DB for tests)
    await connectRedis();
    
    console.log('Test environment setup complete');
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
}, 30000);

// Global test teardown
afterAll(async () => {
  try {
    await closeDatabase();
    await closeRedis();
    console.log('Test environment cleanup complete');
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
}, 10000);

// Increase timeout for property-based tests
jest.setTimeout(30000);