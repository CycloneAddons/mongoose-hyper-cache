/**
 * Provider factory - creates the appropriate cache provider
 */
import { MemoryProvider } from './memory';
import { RedisProvider } from './redis';
import { HybridProvider } from './hybrid';
import { CacheProvider, HyperCacheOptions } from '../types';
export declare function createProvider(options: HyperCacheOptions): Promise<CacheProvider>;
export { MemoryProvider, RedisProvider, HybridProvider };
//# sourceMappingURL=index.d.ts.map