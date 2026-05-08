/**
 * Warm startup - preload all documents into cache
 */
import { Model } from 'mongoose';
import { CacheManager } from '../cache/manager';
import { HyperCacheOptions } from '../types';
export declare class WarmLoader {
    /**
     * Warm all collections on startup
     */
    static warmCollections(models: Map<string, Model<any>>, cacheManager: CacheManager, options: HyperCacheOptions, debug?: boolean): Promise<Map<string, number>>;
    /**
     * Warm a single collection
     */
    private static warmCollection;
    /**
     * Estimate memory usage for warming
     */
    static estimateMemoryUsage(documents: any[]): number;
}
//# sourceMappingURL=warm.d.ts.map