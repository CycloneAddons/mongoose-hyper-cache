/**
 * Write sync - fast synchronous write to MongoDB + cache
 * Optimized for 30-40ms latency
 */
import { Model, UpdateQuery } from 'mongoose';
import { CacheManager } from '../cache/manager';
export declare class WriteSync {
    /**
     * Create - immediately cache, then write MongoDB in parallel
     */
    static create(model: Model<any>, modelName: string, data: any, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Update one - direct cache update + MongoDB write
     */
    static updateOne(model: Model<any>, modelName: string, filter: any, update: UpdateQuery<any>, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Update many - batch cache update + MongoDB write
     */
    static updateMany(model: Model<any>, modelName: string, filter: any, update: UpdateQuery<any>, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Delete one - direct removal + MongoDB delete
     */
    static deleteOne(model: Model<any>, modelName: string, filter: any, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Delete many - batch removal
     */
    static deleteMany(model: Model<any>, modelName: string, filter: any, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Replace one document
     */
    static replaceOne(model: Model<any>, modelName: string, filter: any, replacement: any, cacheManager: CacheManager, debug?: boolean): Promise<any>;
    /**
     * Bulk write operations
     */
    static bulkWrite(model: Model<any>, modelName: string, operations: any[], cacheManager: CacheManager, debug?: boolean): Promise<any>;
}
//# sourceMappingURL=write.d.ts.map