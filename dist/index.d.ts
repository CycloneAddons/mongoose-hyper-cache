/**
 * mongoose-hyper-cache - Main entry point
 * High-performance Mongoose caching layer with memory/Redis providers
 */
import mongoose from 'mongoose';
import { HyperCacheOptions, CacheProvider } from './types';
import { CacheManager } from './cache/manager';
export interface HyperCacheInstance {
    ready: Promise<void>;
    cacheManager: CacheManager;
    provider: CacheProvider;
    stats(): any;
    clear(): Promise<void>;
    destroy(): Promise<void>;
}
/**
 * Initialize mongoose-hyper-cache
 */
declare function init(mongooseInstance: typeof mongoose, options: HyperCacheOptions): Promise<HyperCacheInstance>;
export { init };
export { HyperCacheOptions } from './types';
export { CacheManager } from './cache/manager';
export { DocumentMatcher } from './query-engine/matcher';
export { QueryOperators } from './query-engine/operators';
/**
 * Default export
 */
declare const mongoose_hyper_cache: {
    init: typeof init;
};
export default mongoose_hyper_cache;
//# sourceMappingURL=index.d.ts.map