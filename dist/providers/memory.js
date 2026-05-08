"use strict";
/**
 * In-memory cache provider using LRU cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryProvider = void 0;
const lru_cache_1 = require("lru-cache");
class MemoryProvider {
    constructor(maxItems = 100000, debug = false) {
        this.cache = new lru_cache_1.LRUCache({ max: maxItems });
        this.debug = debug;
    }
    /**
     * Synchronous set - no await needed
     */
    set(key, value) {
        if (this.debug)
            console.log(`[MemoryCache] SET ${key}`);
        this.cache.set(key, value);
    }
    /**
     * Synchronous get - no await needed
     */
    get(key) {
        const value = this.cache.get(key);
        if (this.debug && value)
            console.log(`[MemoryCache] GET ${key}`);
        return value;
    }
    /**
     * Synchronous delete
     */
    del(key) {
        if (this.debug)
            console.log(`[MemoryCache] DEL ${key}`);
        this.cache.delete(key);
    }
    /**
     * Synchronous exists check
     */
    exists(key) {
        return this.cache.has(key);
    }
    /**
     * Clear all cache
     */
    clear() {
        if (this.debug)
            console.log(`[MemoryCache] CLEAR`);
        this.cache.clear();
    }
    /**
     * Scan pattern in cache (memory is fast, so we iterate)
     */
    scan(pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        const matches = [];
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                matches.push(key);
            }
        }
        return matches;
    }
    /**
     * Get multiple values synchronously
     */
    getMultiple(keys) {
        return keys.map(key => this.cache.get(key));
    }
    /**
     * Set multiple values synchronously
     */
    setMultiple(data) {
        data.forEach((value, key) => {
            this.cache.set(key, value);
        });
    }
    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            max: this.cache.max,
        };
    }
}
exports.MemoryProvider = MemoryProvider;
//# sourceMappingURL=memory.js.map