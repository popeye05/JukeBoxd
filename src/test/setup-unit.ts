import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for property-based tests
jest.setTimeout(30000);

console.log('Unit test environment setup complete (no external services)');