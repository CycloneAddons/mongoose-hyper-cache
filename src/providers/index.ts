/**
 * Provider factory - creates the appropriate cache provider
 */

import { MemoryProvider } from './memory';
import { RedisProvider } from './redis';
import { HybridProvider } from './hybrid';
import { CacheProvider, HyperCacheOptions } from '../types';

export async function createProvider(
  options: HyperCacheOptions
): Promise<CacheProvider> {
  const provider = options.provider;
  const debug = options.debug || false;

  if (debug) console.log(`[Provider Factory] Creating ${provider} provider`);

  switch (provider) {
    case 'memory':
      return new MemoryProvider(options.memory?.maxItems, debug);

    case 'redis':
      const redisProvider = new RedisProvider(options.redis, debug);
      await redisProvider.connect();
      return redisProvider;

    case 'memory+redis':
      const hybridProvider = new HybridProvider(options, debug);
      await hybridProvider.connect();
      return hybridProvider;

    default:
      throw new Error(`Unknown provider type: ${provider}`);
  }
}

export { MemoryProvider, RedisProvider, HybridProvider };
