/**
 * Hybrid cache provider - memory + Redis with fallback
 * Flow: Memory → Redis → MongoDB (if warm not enabled)
 */
import { CacheProvider } from '../types';
import { HyperCacheOptions } from '../types';
export declare class HybridProvider implements CacheProvider {
    private memory;
    private redis;
    private debug;
    private useRedis;
    constructor(options: HyperCacheOptions, debug?: boolean);
    /**
     * Initialize Redis connection
     */
    connect(): Promise<void>;
    /**
     * Set - write to both memory and Redis
     */
    set(key: string, value: any): Promise<void>;
    /**
     * Get - memory first, then Redis
     */
    get(key: string): Promise<any>;
    /**
     * Synchronous get for cached reads
     */
    getSync(key: string): any;
    /**
     * Delete from both
     */
    del(key: string): Promise<void>;
    /**
     * Check existence in memory first
     */
    exists(key: string): Promise<boolean>;
    /**
     * Clear both caches
     */
    clear(): Promise<void>;
    /**
     * Scan pattern (memory first, then Redis)
     */
    scan(pattern: string): Promise<string[]>;
    /**
     * Get multiple (from memory first, then Redis)
     */
    getMultiple(keys: string[]): Promise<any[]>;
    /**
     * Set multiple (write to both)
     */
    setMultiple(data: Map<string, any>): Promise<void>;
    /**
     * Get memory stats
     */
    getStats(): {
        memory: {
            size: number;
            max: number;
        };
        redis: string;
    };
}
//# sourceMappingURL=hybrid.d.ts.map