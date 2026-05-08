/**
 * mongoose-hyper-cache - Main entry point
 * High-performance Mongoose caching layer with memory/Redis providers
 */

import mongoose, { Model } from 'mongoose';
import { HyperCacheOptions, CacheProvider } from './types';
import { createProvider } from './providers';
import { CacheManager } from './cache/manager';
import { WarmLoader } from './startup/warm';
import { ChangeStreamWatcher } from './sync/change-stream';
import { QueryPatcher } from './patch/query';
import { WritePatcher } from './patch/write';

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
async function init(
  mongooseInstance: typeof mongoose,
  options: HyperCacheOptions
): Promise<HyperCacheInstance> {
  const debug = options.debug || false;

  if (debug) {
    console.log('[HyperCache] Initializing with options:', options);
  }

  // Validate options
  if (!options.provider) {
    throw new Error('Provider type is required (memory, redis, or memory+redis)');
  }

  // Create cache provider
  const provider = await createProvider(options);
  const cacheManager = new CacheManager(provider, debug);

  // Change stream watcher (for distributed sync)
  const changeStreamWatcher = options.watch ? new ChangeStreamWatcher() : null;

  // Collect models
  const models = new Map<string, Model<any>>();
  mongooseInstance.modelNames().forEach(name => {
    const model = mongooseInstance.model(name);
    models.set(name, model);
  });

  if (debug) {
    console.log(`[HyperCache] Found ${models.size} models:`, Array.from(models.keys()));
  }

  // Initialize ready promise
  const readyPromise = (async () => {
    try {
      // Warm startup if enabled
      if (options.warmOnStartup) {
        if (debug) console.log('[HyperCache] Starting warmOnStartup...');
        const warmResults = await WarmLoader.warmCollections(
          models,
          cacheManager,
          options,
          debug
        );

        if (debug) {
          console.log('[HyperCache] Warm complete:', Object.fromEntries(warmResults));
        }
      }

      // Patch mongoose methods for all models
      for (const [modelName, model] of models) {
        try {
          // Patch read operations - these become synchronous after warm
          QueryPatcher.patchFind(model, cacheManager, modelName, debug);
          QueryPatcher.patchFindOne(model, cacheManager, modelName, debug);
          QueryPatcher.patchFindById(model, cacheManager, modelName, debug);
          QueryPatcher.patchCountDocuments(model, cacheManager, modelName, debug);
          QueryPatcher.patchExists(model, cacheManager, modelName, debug);

          // Patch write operations - auto-sync to cache
          WritePatcher.patchCreate(model, cacheManager, modelName, debug);
          WritePatcher.patchUpdateOne(model, cacheManager, modelName, debug);
          WritePatcher.patchUpdateMany(model, cacheManager, modelName, debug);
          WritePatcher.patchDeleteOne(model, cacheManager, modelName, debug);
          WritePatcher.patchDeleteMany(model, cacheManager, modelName, debug);
          WritePatcher.patchFindByIdAndUpdate(model, cacheManager, modelName, debug);
          WritePatcher.patchFindByIdAndDelete(model, cacheManager, modelName, debug);

          if (debug) {
            console.log(`[HyperCache] ✓ Patched ${modelName}`);
          }
        } catch (err) {
          console.error(`[HyperCache] Error patching ${modelName}:`, err);
        }

        // Start change stream watcher if enabled
        if (changeStreamWatcher && options.watch) {
          try {
            await changeStreamWatcher.watchModel(modelName, model, cacheManager, debug);
          } catch (err) {
            console.warn(`[HyperCache] Failed to watch ${modelName}:`, err);
          }
        }
      }

      // Enable sync mode for reads
      cacheManager.setSyncMode(true);

      if (debug) {
        console.log('[HyperCache] ✓ Initialization complete');
      }
    } catch (err) {
      console.error('[HyperCache] Initialization failed:', err);
      throw err;
    }
  })();

  return {
    ready: readyPromise,
    cacheManager,
    provider,

    /**
     * Get cache statistics
     */
    stats() {
      return {
        provider: options.provider,
        providerStats: cacheManager.getCacheStats(),
        changeStreamWatcher: changeStreamWatcher?.getStatus() || {},
      };
    },

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
      await cacheManager.clear();
      if (debug) console.log('[HyperCache] Cache cleared');
    },

    /**
     * Destroy instance and cleanup
     */
    async destroy(): Promise<void> {
      await readyPromise; // Wait for init to complete

      if (changeStreamWatcher) {
        await changeStreamWatcher.stopWatching();
      }

      await cacheManager.clear();

      if (debug) console.log('[HyperCache] ✓ Destroyed');
    },
  };
}

// Export everything
export { init };
export { HyperCacheOptions } from './types';
export { CacheManager } from './cache/manager';
export { DocumentMatcher } from './query-engine/matcher';
export { QueryOperators } from './query-engine/operators';

/**
 * Default export
 */
const mongoose_hyper_cache = { init };
export default mongoose_hyper_cache;
