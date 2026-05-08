/**
 * Hybrid cache provider - memory + Redis with fallback
 * Flow: Memory → Redis → MongoDB (if warm not enabled)
 */

import { MemoryProvider } from './memory';
import { RedisProvider } from './redis';
import { CacheProvider } from '../types';
import { HyperCacheOptions } from '../types';

export class HybridProvider implements CacheProvider {
  private memory: MemoryProvider;
  private redis: RedisProvider;
  private debug: boolean;
  private useRedis: boolean = false;

  constructor(options: HyperCacheOptions, debug: boolean = false) {
    this.debug = debug;
    this.memory = new MemoryProvider(
      options.memory?.maxItems || 100000,
      debug
    );
    this.redis = new RedisProvider(options.redis, debug);
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.useRedis = true;
      if (this.debug) console.log('[HybridCache] Redis connected');
    } catch (err) {
      console.warn('[HybridCache] Redis connection failed, using memory only');
      this.useRedis = false;
    }
  }

  /**
   * Set - write to both memory and Redis
   */
  async set(key: string, value: any): Promise<void> {
    this.memory.set(key, value);
    if (this.useRedis) {
      await this.redis.set(key, value);
    }
  }

  /**
   * Get - memory first, then Redis
   */
  async get(key: string): Promise<any> {
    // Check memory first (fastest)
    const memValue = this.memory.get(key);
    if (memValue !== undefined) {
      if (this.debug) console.log(`[HybridCache] Memory hit ${key}`);
      return memValue;
    }

    // Fall back to Redis
    if (this.useRedis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue !== null && redisValue !== undefined) {
          if (this.debug) console.log(`[HybridCache] Redis hit ${key}`);
          // Populate memory cache for next read
          this.memory.set(key, redisValue);
          return redisValue;
        }
      } catch (err) {
        if (this.debug) console.error(`[HybridCache] Redis get error:`, err);
      }
    }

    return undefined;
  }

  /**
   * Synchronous get for cached reads
   */
  getSync(key: string): any {
    return this.memory.get(key);
  }

  /**
   * Delete from both
   */
  async del(key: string): Promise<void> {
    this.memory.del(key);
    if (this.useRedis) {
      await this.redis.del(key);
    }
  }

  /**
   * Check existence in memory first
   */
  async exists(key: string): Promise<boolean> {
    if (this.memory.exists(key)) {
      return true;
    }
    if (this.useRedis) {
      return await this.redis.exists(key);
    }
    return false;
  }

  /**
   * Clear both caches
   */
  async clear(): Promise<void> {
    this.memory.clear();
    if (this.useRedis) {
      await this.redis.clear();
    }
  }

  /**
   * Scan pattern (memory first, then Redis)
   */
  async scan(pattern: string): Promise<string[]> {
    const memKeys = this.memory.scan(pattern);
    if (!this.useRedis) {
      return memKeys;
    }

    const redisKeys = await this.redis.scan(pattern);
    return Array.from(new Set([...memKeys, ...redisKeys]));
  }

  /**
   * Get multiple (from memory first, then Redis)
   */
  async getMultiple(keys: string[]): Promise<any[]> {
    const results: any[] = [];
    const missingIndexes: number[] = [];
    const missingKeys: string[] = [];

    // Get from memory
    keys.forEach((key, index) => {
      const val = this.memory.get(key);
      if (val !== undefined) {
        results[index] = val;
      } else {
        missingIndexes.push(index);
        missingKeys.push(key);
      }
    });

    // Get missing from Redis
    if (this.useRedis && missingKeys.length > 0) {
      try {
        const redisValues = await this.redis.getMultiple(missingKeys);
        redisValues.forEach((val, idx) => {
          results[missingIndexes[idx]] = val;
        });
      } catch (err) {
        if (this.debug) console.error('[HybridCache] Redis getMultiple error:', err);
      }
    }

    return results;
  }

  /**
   * Set multiple (write to both)
   */
  async setMultiple(data: Map<string, any>): Promise<void> {
    this.memory.setMultiple(data);
    if (this.useRedis) {
      await this.redis.setMultiple(data);
    }
  }

  /**
   * Get memory stats
   */
  getStats() {
    return {
      memory: this.memory.getStats(),
      redis: this.useRedis ? 'connected' : 'disconnected',
    };
  }
}
