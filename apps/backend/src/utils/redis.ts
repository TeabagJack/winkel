import Redis from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Helper functions
export async function setCache(key: string, value: string, ttl?: number): Promise<void> {
  if (ttl) {
    await redis.setex(key, ttl, value);
  } else {
    await redis.set(key, value);
  }
}

export async function getCache(key: string): Promise<string | null> {
  return await redis.get(key);
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function addToBlacklist(token: string, ttl: number): Promise<void> {
  await redis.setex(`blacklist:${token}`, ttl, 'true');
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`blacklist:${token}`);
  return result === 'true';
}
