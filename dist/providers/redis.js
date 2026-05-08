"use strict";
/**
 * Redis cache provider for distributed caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisProvider = void 0;
const redis_1 = require("redis");
class RedisProvider {
    constructor(options = {}, debug = false) {
        this.connected = false;
        this.debug = debug;
        this.client = (0, redis_1.createClient)({
            host: options.host || 'localhost',
            port: options.port || 6379,
            password: options.password,
            db: options.db || 0,
            socket: {
                connectTimeout: options.connectTimeout || 5000,
            },
        });
        this.client.on('connect', () => {
            this.connected = true;
            if (this.debug)
                console.log('[RedisCache] Connected');
        });
        this.client.on('error', (err) => {
            console.error('[RedisCache] Error:', err);
            this.connected = false;
        });
    }
    /**
     * Initialize Redis connection
     */
    async connect() {
        if (!this.connected) {
            await this.client.connect();
        }
    }
    /**
     * Close Redis connection
     */
    async disconnect() {
        if (this.connected) {
            await this.client.quit();
            this.connected = false;
        }
    }
    /**
     * Set value in Redis
     */
    async set(key, value) {
        if (this.debug)
            console.log(`[RedisCache] SET ${key}`);
        const serialized = JSON.stringify(value);
        await this.client.set(key, serialized);
    }
    /**
     * Get value from Redis
     */
    async get(key) {
        const value = await this.client.get(key);
        if (this.debug && value)
            console.log(`[RedisCache] GET ${key}`);
        return value ? JSON.parse(value) : null;
    }
    /**
     * Delete key from Redis
     */
    async del(key) {
        if (this.debug)
            console.log(`[RedisCache] DEL ${key}`);
        await this.client.del(key);
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        const result = await this.client.exists(key);
        return result > 0;
    }
    /**
     * Clear all keys matching pattern
     */
    async clear() {
        if (this.debug)
            console.log('[RedisCache] CLEAR');
        await this.client.flushDb();
    }
    /**
     * Scan keys matching pattern
     */
    async scan(pattern) {
        const keys = [];
        let cursor = 0;
        do {
            const result = await this.client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100,
            });
            keys.push(...result.keys);
            cursor = result.cursor;
        } while (cursor !== 0);
        return keys;
    }
    /**
     * Get multiple values
     */
    async getMultiple(keys) {
        const values = await this.client.mGet(keys);
        return values.map(v => v ? JSON.parse(v) : null);
    }
    /**
     * Set multiple values
     */
    async setMultiple(data) {
        const pipeline = this.client.multi();
        data.forEach((value, key) => {
            pipeline.set(key, JSON.stringify(value));
        });
        await pipeline.exec();
    }
}
exports.RedisProvider = RedisProvider;
//# sourceMappingURL=redis.js.map