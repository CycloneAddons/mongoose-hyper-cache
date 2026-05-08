/**
 * Redis cache provider for distributed caching
 */

import { createClient } from 'redis';
import { CacheProvider } from '../types';
import { HyperCacheOptions } from '../types';

type RedisClient = ReturnType<typeof createClient>;

export class RedisProvider implements CacheProvider {
  private client: RedisClient;
  private debug: boolean;
  private connected: boolean = false;

  constructor(options: HyperCacheOptions['redis'] = {}, debug: boolean = false) {
    this.debug = debug;
    
    this.client = createClient({
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password,
      db: options.db || 0,
      socket: {
        connectTimeout: options.connectTimeout || 5000,
      },
    } as any);

    this.client.on('connect', () => {
      this.connected = true;
      if (this.debug) console.log('[RedisCache] Connected');
    });

    this.client.on('error', (err) => {
      console.error('[RedisCache] Error:', err);
      this.connected = false;
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Set value in Redis
   */
  async set(key: string, value: any): Promise<void> {
    if (this.debug) console.log(`[RedisCache] SET ${key}`);
    const serialized = JSON.stringify(value);
    await this.client.set(key, serialized);
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    if (this.debug && value) console.log(`[RedisCache] GET ${key}`);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<void> {
    if (this.debug) console.log(`[RedisCache] DEL ${key}`);
    await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  /**
   * Clear all keys matching pattern
   */
  async clear(): Promise<void> {
    if (this.debug) console.log('[RedisCache] CLEAR');
    await this.client.flushDb();
  }

  /**
   * Scan keys matching pattern
   */
  async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      keys.push(...result.keys);
      cursor = result.cursor;
    } while (cursor !== 0);

    return keys;
  }

  /**
   * Get multiple values
   */
  async getMultiple(keys: string[]): Promise<any[]> {
    const values = await this.client.mGet(keys);
    return values.map(v => v ? JSON.parse(v) : null);
  }

  /**
   * Set multiple values
   */
  async setMultiple(data: Map<string, any>): Promise<void> {
    const pipeline = this.client.multi();
    
    data.forEach((value, key) => {
      pipeline.set(key, JSON.stringify(value));
    });

    await pipeline.exec();
  }
}
