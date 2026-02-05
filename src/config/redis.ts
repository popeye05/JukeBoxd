import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;
  
  const clientOptions: any = {
    url: redisUrl,
    socket: {
      connectTimeout: 5000,
    },
  };

  if (redisPassword) {
    clientOptions.password = redisPassword;
  }

  redisClient = createClient(clientOptions);

  redisClient.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
  });

  redisClient.on('end', () => {
    console.log('Redis client disconnected');
  });

  try {
    await redisClient.connect();
    await redisClient.ping();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
  }
};

// Cache utility functions
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string, 
  value: string, 
  ttlSeconds?: number
): Promise<boolean> => {
  try {
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

export const cacheDel = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis EXISTS error:', error);
    return false;
  }
};

// Session management utilities
export const setSession = async (
  sessionId: string, 
  sessionData: any, 
  ttlSeconds: number = 604800 // 7 days
): Promise<boolean> => {
  return await cacheSet(`session:${sessionId}`, JSON.stringify(sessionData), ttlSeconds);
};

export const getSession = async (sessionId: string): Promise<any | null> => {
  const sessionData = await cacheGet(`session:${sessionId}`);
  return sessionData ? JSON.parse(sessionData) : null;
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  return await cacheDel(`session:${sessionId}`);
};