/**
 * Index builder - automatically detects and builds indexes from schema
 */
import { Schema } from 'mongoose';
import { CacheManager } from './manager';
import { CachedDocument } from '../types';
export declare class IndexBuilder {
    /**
     * Build indexes from Mongoose schema
     */
    static buildIndexesFromSchema(modelName: string, schema: Schema, documents: CachedDocument[], cacheManager: CacheManager, debug?: boolean): Promise<void>;
    /**
     * Validate index consistency
     */
    static validateIndexes(modelName: string, documents: CachedDocument[], indexedFields: string[], debug?: boolean): boolean;
    private static getNestedValue;
}
//# sourceMappingURL=index-builder.d.ts.map