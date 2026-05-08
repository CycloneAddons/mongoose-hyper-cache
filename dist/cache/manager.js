"use strict";
/**
 * Cache manager - manages documents, collections, and indexes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const matcher_1 = require("../query-engine/matcher");
const NEGATIVE_CACHE_SYMBOL = Symbol('$$negative_cache$$');
class CacheManager {
    constructor(provider, debug = false) {
        this.syncMode = false; // true when warm complete
        this.provider = provider;
        this.debug = debug;
    }
    setSyncMode(enabled) {
        this.syncMode = enabled;
    }
    // ===== Document Operations =====
    /**
     * Retrieve a document from cache (synchronous)
     * Returns null if not found (negative cache included)
     */
    getDocument(modelName, id) {
        const key = this.getDocKey(modelName, id);
        const value = this.provider.get?.(key);
        // Check for negative cache marker
        if (value === NEGATIVE_CACHE_SYMBOL) {
            return null;
        }
        return value || null;
    }
    /**
     * Store a document in cache (synchronous for memory provider)
     */
    async cacheDocument(modelName, doc) {
        const key = this.getDocKey(modelName, doc._id);
        await this.provider.set(key, doc);
        if (this.debug)
            console.log(`[Cache] Stored doc ${key}`);
    }
    /**
     * Cache a negative result (document not found)
     */
    async cacheNegative(modelName, id) {
        const key = this.getDocKey(modelName, id);
        await this.provider.set(key, NEGATIVE_CACHE_SYMBOL);
        if (this.debug)
            console.log(`[Cache] Cached miss ${key}`);
    }
    /**
     * Delete a document from cache
     */
    async deleteDocument(modelName, id) {
        const key = this.getDocKey(modelName, id);
        await this.provider.del(key);
        if (this.debug)
            console.log(`[Cache] Deleted doc ${key}`);
    }
    /**
     * Get all documents for a collection synchronously
     */
    getCollectionDocuments(modelName) {
        const collectionKey = this.getCollectionKey(modelName);
        const docIds = this.provider.get?.(collectionKey) || [];
        const docs = [];
        for (const id of docIds) {
            const doc = this.getDocument(modelName, id);
            if (doc && doc !== NEGATIVE_CACHE_SYMBOL) {
                docs.push(doc);
            }
        }
        return docs;
    }
    // ===== Collection Operations =====
    /**
     * Add a document ID to collection
     */
    async addToCollection(modelName, id) {
        const key = this.getCollectionKey(modelName);
        const ids = (await this.provider.get(key) || []);
        if (!ids.includes(id)) {
            ids.push(id);
            await this.provider.set(key, ids);
        }
    }
    /**
     * Remove document ID from collection
     */
    async removeFromCollection(modelName, id) {
        const key = this.getCollectionKey(modelName);
        const ids = (await this.provider.get(key) || []);
        const filtered = ids.filter(docId => docId !== id);
        await this.provider.set(key, filtered);
    }
    /**
     * Get all document IDs in collection
     */
    async getCollectionIds(modelName) {
        const key = this.getCollectionKey(modelName);
        return (await this.provider.get(key)) || [];
    }
    /**
     * Clear a collection
     */
    async clearCollection(modelName) {
        const key = this.getCollectionKey(modelName);
        await this.provider.del(key);
    }
    // ===== Index Operations =====
    /**
     * Build an index for quick lookups
     * index:ModelName:fieldName:fieldValue → [docIds]
     */
    async buildIndex(modelName, fieldName, documents) {
        const indexMap = new Map();
        for (const doc of documents) {
            const fieldValue = this.getNestedValue(doc, fieldName);
            if (fieldValue !== undefined && fieldValue !== null) {
                const indexKey = this.getIndexKey(modelName, fieldName, fieldValue);
                const docIds = (await this.provider.get(indexKey) || []);
                if (!docIds.includes(doc._id)) {
                    docIds.push(doc._id);
                    await this.provider.set(indexKey, docIds);
                }
            }
        }
        if (this.debug)
            console.log(`[Cache] Built index for ${modelName}.${fieldName}`);
    }
    /**
     * Get document IDs from index
     */
    async getFromIndex(modelName, fieldName, fieldValue) {
        const key = this.getIndexKey(modelName, fieldName, fieldValue);
        return (await this.provider.get(key)) || [];
    }
    /**
     * Update index when document changes
     */
    async updateIndex(modelName, fieldName, oldValue, newValue, docId) {
        // Remove from old index
        if (oldValue !== undefined && oldValue !== null) {
            const oldKey = this.getIndexKey(modelName, fieldName, oldValue);
            const oldIds = (await this.provider.get(oldKey) || []);
            const filtered = oldIds.filter(id => id !== docId);
            await this.provider.set(oldKey, filtered);
        }
        // Add to new index
        if (newValue !== undefined && newValue !== null) {
            const newKey = this.getIndexKey(modelName, fieldName, newValue);
            const newIds = (await this.provider.get(newKey) || []);
            if (!newIds.includes(docId)) {
                newIds.push(docId);
                await this.provider.set(newKey, newIds);
            }
        }
    }
    /**
     * Delete index entry
     */
    async removeFromIndex(modelName, fieldName, fieldValue, docId) {
        if (fieldValue === undefined || fieldValue === null)
            return;
        const key = this.getIndexKey(modelName, fieldName, fieldValue);
        const ids = (await this.provider.get(key) || []);
        const filtered = ids.filter(id => id !== docId);
        await this.provider.set(key, filtered);
    }
    /**
     * Find documents synchronously
     */
    find(modelName, filter = {}, options = {}) {
        const docs = this.getCollectionDocuments(modelName);
        return matcher_1.DocumentMatcher.find(docs, filter, options);
    }
    /**
     * Find one document synchronously
     */
    findOne(modelName, filter = {}) {
        const docs = this.getCollectionDocuments(modelName);
        return matcher_1.DocumentMatcher.findOne(docs, filter);
    }
    /**
     * Find by ID synchronously
     */
    findById(modelName, id) {
        return this.getDocument(modelName, id);
    }
    /**
     * Count documents synchronously
     */
    countDocuments(modelName, filter = {}) {
        const docs = this.getCollectionDocuments(modelName);
        return matcher_1.DocumentMatcher.count(docs, filter);
    }
    /**
     * Check if document exists synchronously
     */
    exists(modelName, filter = {}) {
        const docs = this.getCollectionDocuments(modelName);
        return matcher_1.DocumentMatcher.exists(docs, filter);
    }
    // ===== Helper Methods =====
    getDocKey(modelName, id) {
        return `doc:${modelName}:${id}`;
    }
    getCollectionKey(modelName) {
        return `collection:${modelName}`;
    }
    getIndexKey(modelName, fieldName, fieldValue) {
        return `index:${modelName}:${fieldName}:${fieldValue}`;
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current == null) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Clear entire cache
     */
    async clear() {
        await this.provider.clear();
        if (this.debug)
            console.log('[Cache] Cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.provider.getStats?.();
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=manager.js.map