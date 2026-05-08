/**
 * Redis cache provider for distributed caching
 */
import { CacheProvider } from '../types';
import { HyperCacheOptions } from '../types';
export declare class RedisProvider implements CacheProvider {
    private client;
    private debug;
    private connected;
    constructor(options?: HyperCacheOptions['redis'], debug?: boolean);
    /**
     * Initialize Redis connection
     */
    connect(): Promise<void>;
    /**
     * Close Redis connection
     */
    disconnect(): Promise<void>;
    /**
     * Set value in Redis
     */
    set(key: string, value: any): Promise<void>;
    /**
     * Get value from Redis
     */
    get(key: string): Promise<any>;
    /**
     * Delete key from Redis
     */
    del(key: string): Promise<void>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Clear all keys matching pattern
     */
    clear(): Promise<void>;
    /**
     * Scan keys matching pattern
     */
    scan(pattern: string): Promise<string[]>;
    /**
     * Get multiple values
     */
    getMultiple(keys: string[]): Promise<any[]>;
    /**
     * Set multiple values
     */
    setMultiple(data: Map<string, any>): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map