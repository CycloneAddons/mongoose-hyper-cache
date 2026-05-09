"use strict";
/**
 * mongoose-hyper-cache - Main entry point
 * High-performance Mongoose caching layer with memory/Redis providers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

exports.QueryOperators = exports.DocumentMatcher = exports.CacheManager = void 0;
exports.init = init;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
import providers_1 from ""./providers";
import manager_1 from ""./cache/manager";
import warm_1 from ""./startup/warm";
import change_stream_1 from ""./sync/change-stream";
import query_1 from ""./patch/query";
import write_1 from ""./patch/write";
function loadModelFile(filePath) {
    const resolvedPath = path_1.default.resolve(process.cwd(), filePath);
    if (!fs_1.default.existsSync(resolvedPath)) {
        throw new Error(`Model path not found: ${resolvedPath}`);
    }
    const stats = fs_1.default.statSync(resolvedPath);
    if (stats.isDirectory()) {
        const entries = fs_1.default.readdirSync(resolvedPath);
        for (const entry of entries) {
            loadModelFile(path_1.default.join(resolvedPath, entry));
        }
        return;
    }
    if (resolvedPath.endsWith('.d.ts')) {
        return;
    }
    if (!/\.(js|cjs|mjs|ts)$/i.test(resolvedPath)) {
        return;
    }
    require(resolvedPath);
}
function loadModelsFromPaths(modelPaths, debug) {
    if (!modelPaths || modelPaths.length === 0)
        return;
    const paths = Array.isArray(modelPaths) ? modelPaths : [modelPaths];
    for (const modelPath of paths) {
        if (debug)
            console.log(`[HyperCache] Loading model path: ${modelPath}`);
        loadModelFile(modelPath);
    }
}
/**
 * Initialize mongoose-hyper-cache
 */
async function init(mongooseInstance, options) {
    const debug = options.debug || false;
    if (debug) {
        console.log('[HyperCache] Initializing with options:', options);
    }
    // Validate options
    if (!options.provider) {
        throw new Error('Provider type is required (memory, redis, or memory+redis)');
    }
    // Load model files before discovery when paths are provided
    loadModelsFromPaths(options.modelPaths, debug);
    // Create cache provider
    const provider = await (0, providers_1.createProvider)(options);
    const cacheManager = new manager_1.CacheManager(provider, debug);
    // Change stream watcher (for distributed sync)
    const changeStreamWatcher = options.watch ? new change_stream_1.ChangeStreamWatcher() : null;
    // Collect models
    const models = new Map();
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
                if (debug)
                    console.log('[HyperCache] Starting warmOnStartup...');
                const warmResults = await warm_1.WarmLoader.warmCollections(models, cacheManager, options, debug);
                if (debug) {
                    console.log('[HyperCache] Warm complete:', Object.fromEntries(warmResults));
                }
            }
            // Patch mongoose methods for all models
            for (const [modelName, model] of models) {
                try {
                    // Patch read operations - these become synchronous after warm
                    query_1.QueryPatcher.patchFind(model, cacheManager, modelName, debug);
                    query_1.QueryPatcher.patchFindOne(model, cacheManager, modelName, debug);
                    query_1.QueryPatcher.patchFindById(model, cacheManager, modelName, debug);
                    query_1.QueryPatcher.patchCountDocuments(model, cacheManager, modelName, debug);
                    query_1.QueryPatcher.patchExists(model, cacheManager, modelName, debug);
                    // Patch write operations - auto-sync to cache
                    write_1.WritePatcher.patchCreate(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchUpdateOne(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchUpdateMany(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchDeleteOne(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchDeleteMany(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchFindByIdAndUpdate(model, cacheManager, modelName, debug);
                    write_1.WritePatcher.patchFindByIdAndDelete(model, cacheManager, modelName, debug);
                    if (debug) {
                        console.log(`[HyperCache] ✓ Patched ${modelName}`);
                    }
                }
                catch (err) {
                    console.error(`[HyperCache] Error patching ${modelName}:`, err);
                }
                // Start change stream watcher if enabled
                if (changeStreamWatcher && options.watch) {
                    try {
                        await changeStreamWatcher.watchModel(modelName, model, cacheManager, debug);
                    }
                    catch (err) {
                        console.warn(`[HyperCache] Failed to watch ${modelName}:`, err);
                    }
                }
            }
            // Enable sync mode for reads
            cacheManager.setSyncMode(true);
            if (debug) {
                console.log('[HyperCache] ✓ Initialization complete');
            }
        }
        catch (err) {
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
        async clear() {
            await cacheManager.clear();
            if (debug)
                console.log('[HyperCache] Cache cleared');
        },
        /**
         * Destroy instance and cleanup
         */
        async destroy() {
            await readyPromise; // Wait for init to complete
            if (changeStreamWatcher) {
                await changeStreamWatcher.stopWatching();
            }
            await cacheManager.clear();
            if (debug)
                console.log('[HyperCache] ✓ Destroyed');
        },
    };
}
var manager_2 = require("./cache/manager";
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return manager_2.CacheManager; } });
var matcher_1 = require("./query-engine/matcher";
Object.defineProperty(exports, "DocumentMatcher", { enumerable: true, get: function () { return matcher_1.DocumentMatcher; } });
var operators_1 = require("./query-engine/operators";
Object.defineProperty(exports, "QueryOperators", { enumerable: true, get: function () { return operators_1.QueryOperators; } });
/**
 * Default export
 */
const mongoose_hyper_cache = { init };
exports.default = mongoose_hyper_cache;
//# sourceMappingURL=index.js.map