"use strict";
/**
 * Provider factory - creates the appropriate cache provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridProvider = exports.RedisProvider = exports.MemoryProvider = void 0;
exports.createProvider = createProvider;
const memory_1 = require("./memory");
Object.defineProperty(exports, "MemoryProvider", { enumerable: true, get: function () { return memory_1.MemoryProvider; } });
const redis_1 = require("./redis");
Object.defineProperty(exports, "RedisProvider", { enumerable: true, get: function () { return redis_1.RedisProvider; } });
const hybrid_1 = require("./hybrid");
Object.defineProperty(exports, "HybridProvider", { enumerable: true, get: function () { return hybrid_1.HybridProvider; } });
async function createProvider(options) {
    const provider = options.provider;
    const debug = options.debug || false;
    if (debug)
        console.log(`[Provider Factory] Creating ${provider} provider`);
    switch (provider) {
        case 'memory':
            return new memory_1.MemoryProvider(options.memory?.maxItems, debug);
        case 'redis':
            const redisProvider = new redis_1.RedisProvider(options.redis, debug);
            await redisProvider.connect();
            return redisProvider;
        case 'memory+redis':
            const hybridProvider = new hybrid_1.HybridProvider(options, debug);
            await hybridProvider.connect();
            return hybridProvider;
        default:
            throw new Error(`Unknown provider type: ${provider}`);
    }
}
//# sourceMappingURL=index.js.map