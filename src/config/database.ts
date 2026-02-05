import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
let pool: Pool;

export const connectDatabase = async (): Promise<void> => {
  const databaseUrl = process.env.NODE_ENV === 'test' 
    ? process.env.TEST_DATABASE_URL 
    : process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Database URL not provided in environment variables');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test the connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
  }
};