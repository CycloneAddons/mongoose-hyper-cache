/**
 * Cache manager - manages documents, collections, and indexes
 */
import { CacheProvider } from '../types';
import { CachedDocument, QueryFilter } from '../types';
import { MatcherOptions } from '../query-engine/matcher';
export declare class CacheManager {
    private provider;
    private debug;
    private syncMode;
    constructor(provider: CacheProvider, debug?: boolean);
    setSyncMode(enabled: boolean): void;
    /**
     * Retrieve a document from cache (synchronous)
     * Returns null if not found (negative cache included)
     */
    getDocument(modelName: string, id: any): CachedDocument | null;
    /**
     * Store a document in cache (synchronous for memory provider)
     */
    cacheDocument(modelName: string, doc: CachedDocument): Promise<void>;
    /**
     * Cache a negative result (document not found)
     */
    cacheNegative(modelName: string, id: any): Promise<void>;
    /**
     * Delete a document from cache
     */
    deleteDocument(modelName: string, id: any): Promise<void>;
    /**
     * Get all documents for a collection synchronously
     */
    getCollectionDocuments(modelName: string): CachedDocument[];
    /**
     * Add a document ID to collection
     */
    addToCollection(modelName: string, id: any): Promise<void>;
    /**
     * Remove document ID from collection
     */
    removeFromCollection(modelName: string, id: any): Promise<void>;
    /**
     * Get all document IDs in collection
     */
    getCollectionIds(modelName: string): Promise<any[]>;
    /**
     * Clear a collection
     */
    clearCollection(modelName: string): Promise<void>;
    /**
     * Build an index for quick lookups
     * index:ModelName:fieldName:fieldValue → [docIds]
     */
    buildIndex(modelName: string, fieldName: string, documents: CachedDocument[]): Promise<void>;
    /**
     * Get document IDs from index
     */
    getFromIndex(modelName: string, fieldName: string, fieldValue: any): Promise<any[]>;
    /**
     * Update index when document changes
     */
    updateIndex(modelName: string, fieldName: string, oldValue: any, newValue: any, docId: any): Promise<void>;
    /**
     * Delete index entry
     */
    removeFromIndex(modelName: string, fieldName: string, fieldValue: any, docId: any): Promise<void>;
    /**
     * Find documents synchronously
     */
    find(modelName: string, filter?: QueryFilter, options?: MatcherOptions): CachedDocument[];
    /**
     * Find one document synchronously
     */
    findOne(modelName: string, filter?: QueryFilter): CachedDocument | null;
    /**
     * Find by ID synchronously
     */
    findById(modelName: string, id: any): CachedDocument | null;
    /**
     * Count documents synchronously
     */
    countDocuments(modelName: string, filter?: QueryFilter): number;
    /**
     * Check if document exists synchronously
     */
    exists(modelName: string, filter?: QueryFilter): boolean;
    private getDocKey;
    private getCollectionKey;
    private getIndexKey;
    private getNestedValue;
    /**
     * Clear entire cache
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): any;
}
//# sourceMappingURL=manager.d.ts.map