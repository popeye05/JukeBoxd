import { createClient } from 'redis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

let redisClient: any;
let isRedisAvailable = false;
const memoryStore = new Map<string, { value: string, expires: number }>();

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  const clientOptions: any = {
    url: redisUrl,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries: number) => {
        if (retries > 1) {
          console.warn('Redis: Max retries reached, giving up');
          return new Error('Redis max retries reached');
        }
        return 1000; // Retry after 1 second
      }
    },
  };

  if (redisPassword) {
    clientOptions.password = redisPassword;
  }

  redisClient = createClient(clientOptions);

  (redisClient as any).on('error', (error: any) => {
    // Only warn on first error to avoid log spam
    if (isRedisAvailable) {
      console.warn('Redis connection error (switching to memory mode):', error.message);
    }
    isRedisAvailable = false;
  });

  (redisClient as any).on('connect', () => {
    console.log('Redis client connected');
    isRedisAvailable = true;
  });

  (redisClient as any).on('ready', () => {
    console.log('Redis client ready');
    isRedisAvailable = true;
  });

  (redisClient as any).on('end', () => {
    console.log('Redis client disconnected');
    isRedisAvailable = false;
  });

  try {
    await redisClient.connect();
    // Test connection
    await redisClient.ping();
    isRedisAvailable = true;
    console.log('✅ Redis connected successfully');
  } catch (error: any) {
    console.warn(`⚠️ Redis connection failed: ${error.message}`);
    console.warn('⚠️ Using in-memory session store as fallback');
    isRedisAvailable = false;
    // We don't throw here to allow the app to start without Redis
  }
};

export const getRedisClient = (): any => {
  if (!redisClient && !isRedisAvailable) {
    // Return a dummy client or null if using memory store
    // The repositories should check isRedisAvailable or use cache utils
    return null;
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient && isRedisAvailable) {
    await redisClient.quit();
  }
};

// Cache utility functions
export const cacheGet = async (key: string): Promise<string | null> => {
  if (!isRedisAvailable) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expires < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }
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
  if (!isRedisAvailable) {
    const expires = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : 24 * 60 * 60 * 1000);
    memoryStore.set(key, { value, expires });
    return true;
  }
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
  if (!isRedisAvailable) {
    return memoryStore.delete(key);
  }
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  if (!isRedisAvailable) {
    return memoryStore.has(key);
  }
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