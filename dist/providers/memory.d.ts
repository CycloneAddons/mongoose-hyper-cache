/**
 * In-memory cache provider using LRU cache
 */
import { CacheProvider } from '../types';
export declare class MemoryProvider implements CacheProvider {
    private cache;
    private debug;
    constructor(maxItems?: number, debug?: boolean);
    /**
     * Synchronous set - no await needed
     */
    set(key: string, value: any): void;
    /**
     * Synchronous get - no await needed
     */
    get(key: string): any;
    /**
     * Synchronous delete
     */
    del(key: string): void;
    /**
     * Synchronous exists check
     */
    exists(key: string): boolean;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Scan pattern in cache (memory is fast, so we iterate)
     */
    scan(pattern: string): string[];
    /**
     * Get multiple values synchronously
     */
    getMultiple(keys: string[]): any[];
    /**
     * Set multiple values synchronously
     */
    setMultiple(data: Map<string, any>): void;
    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        max: number;
    };
}
//# sourceMappingURL=memory.d.ts.map