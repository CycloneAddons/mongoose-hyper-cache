/**
 * Cache manager - manages documents, collections, and indexes
 */

import { CacheProvider } from '../types';
import { CachedDocument, QueryFilter } from '../types';
import { DocumentMatcher, MatcherOptions } from '../query-engine/matcher';

const NEGATIVE_CACHE_SYMBOL = Symbol('$$negative_cache$$');

export class CacheManager {
  private provider: CacheProvider;
  private debug: boolean;
  private syncMode: boolean = false; // true when warm complete

  constructor(provider: CacheProvider, debug: boolean = false) {
    this.provider = provider;
    this.debug = debug;
  }

  setSyncMode(enabled: boolean): void {
    this.syncMode = enabled;
  }

  // ===== Document Operations =====

  /**
   * Retrieve a document from cache (synchronous)
   * Returns null if not found (negative cache included)
   */
  getDocument(modelName: string, id: any): CachedDocument | null {
    const key = this.getDocKey(modelName, id);
    const value = (this.provider as any).get?.(key);
    
    // Check for negative cache marker
    if (value === NEGATIVE_CACHE_SYMBOL) {
      return null;
    }
    
    return value || null;
  }

  /**
   * Store a document in cache (synchronous for memory provider)
   */
  async cacheDocument(
    modelName: string,
    doc: CachedDocument
  ): Promise<void> {
    const key = this.getDocKey(modelName, doc._id);
    await this.provider.set(key, doc);
    if (this.debug) console.log(`[Cache] Stored doc ${key}`);
  }

  /**
   * Cache a negative result (document not found)
   */
  async cacheNegative(modelName: string, id: any): Promise<void> {
    const key = this.getDocKey(modelName, id);
    await this.provider.set(key, NEGATIVE_CACHE_SYMBOL);
    if (this.debug) console.log(`[Cache] Cached miss ${key}`);
  }

  /**
   * Delete a document from cache
   */
  async deleteDocument(modelName: string, id: any): Promise<void> {
    const key = this.getDocKey(modelName, id);
    await this.provider.del(key);
    if (this.debug) console.log(`[Cache] Deleted doc ${key}`);
  }

  /**
   * Get all documents for a collection synchronously
   */
  getCollectionDocuments(modelName: string): CachedDocument[] {
    const collectionKey = this.getCollectionKey(modelName);
    const docIds = (this.provider as any).get?.(collectionKey) || [];

    const docs: CachedDocument[] = [];
    for (const id of docIds) {
      const doc = this.getDocument(modelName, id);
      if (doc && doc !== (NEGATIVE_CACHE_SYMBOL as any)) {
        docs.push(doc);
      }
    }

    return docs;
  }

  // ===== Collection Operations =====

  /**
   * Add a document ID to collection
   */
  async addToCollection(modelName: string, id: any): Promise<void> {
    const key = this.getCollectionKey(modelName);
    const ids = (await this.provider.get(key) || []) as any[];

    if (!ids.includes(id)) {
      ids.push(id);
      await this.provider.set(key, ids);
    }
  }

  /**
   * Remove document ID from collection
   */
  async removeFromCollection(modelName: string, id: any): Promise<void> {
    const key = this.getCollectionKey(modelName);
    const ids = (await this.provider.get(key) || []) as any[];

    const filtered = ids.filter(docId => docId !== id);
    await this.provider.set(key, filtered);
  }

  /**
   * Get all document IDs in collection
   */
  async getCollectionIds(modelName: string): Promise<any[]> {
    const key = this.getCollectionKey(modelName);
    return (await this.provider.get(key)) || [];
  }

  /**
   * Clear a collection
   */
  async clearCollection(modelName: string): Promise<void> {
    const key = this.getCollectionKey(modelName);
    await this.provider.del(key);
  }

  // ===== Index Operations =====

  /**
   * Build an index for quick lookups
   * index:ModelName:fieldName:fieldValue → [docIds]
   */
  async buildIndex(
    modelName: string,
    fieldName: string,
    documents: CachedDocument[]
  ): Promise<void> {
    const indexMap = new Map<string, string>();

    for (const doc of documents) {
      const fieldValue = this.getNestedValue(doc, fieldName);
      if (fieldValue !== undefined && fieldValue !== null) {
        const indexKey = this.getIndexKey(modelName, fieldName, fieldValue);
        const docIds = (await this.provider.get(indexKey) || []) as any[];

        if (!docIds.includes(doc._id)) {
          docIds.push(doc._id);
          await this.provider.set(indexKey, docIds);
        }
      }
    }

    if (this.debug) console.log(`[Cache] Built index for ${modelName}.${fieldName}`);
  }

  /**
   * Get document IDs from index
   */
  async getFromIndex(
    modelName: string,
    fieldName: string,
    fieldValue: any
  ): Promise<any[]> {
    const key = this.getIndexKey(modelName, fieldName, fieldValue);
    return (await this.provider.get(key)) || [];
  }

  /**
   * Update index when document changes
   */
  async updateIndex(
    modelName: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    docId: any
  ): Promise<void> {
    // Remove from old index
    if (oldValue !== undefined && oldValue !== null) {
      const oldKey = this.getIndexKey(modelName, fieldName, oldValue);
      const oldIds = (await this.provider.get(oldKey) || []) as any[];
      const filtered = oldIds.filter(id => id !== docId);
      await this.provider.set(oldKey, filtered);
    }

    // Add to new index
    if (newValue !== undefined && newValue !== null) {
      const newKey = this.getIndexKey(modelName, fieldName, newValue);
      const newIds = (await this.provider.get(newKey) || []) as any[];
      if (!newIds.includes(docId)) {
        newIds.push(docId);
        await this.provider.set(newKey, newIds);
      }
    }
  }

  /**
   * Delete index entry
   */
  async removeFromIndex(
    modelName: string,
    fieldName: string,
    fieldValue: any,
    docId: any
  ): Promise<void> {
    if (fieldValue === undefined || fieldValue === null) return;

    const key = this.getIndexKey(modelName, fieldName, fieldValue);
    const ids = (await this.provider.get(key) || []) as any[];
    const filtered = ids.filter(id => id !== docId);
    await this.provider.set(key, filtered);
  }

  /**
   * Find documents synchronously
   */
  find(
    modelName: string,
    filter: QueryFilter = {},
    options: MatcherOptions = {}
  ): CachedDocument[] {
    const docs = this.getCollectionDocuments(modelName);
    return DocumentMatcher.find(docs, filter, options);
  }

  /**
   * Find one document synchronously
   */
  findOne(
    modelName: string,
    filter: QueryFilter = {}
  ): CachedDocument | null {
    const docs = this.getCollectionDocuments(modelName);
    return DocumentMatcher.findOne(docs, filter);
  }

  /**
   * Find by ID synchronously
   */
  findById(modelName: string, id: any): CachedDocument | null {
    return this.getDocument(modelName, id);
  }

  /**
   * Count documents synchronously
   */
  countDocuments(
    modelName: string,
    filter: QueryFilter = {}
  ): number {
    const docs = this.getCollectionDocuments(modelName);
    return DocumentMatcher.count(docs, filter);
  }

  /**
   * Check if document exists synchronously
   */
  exists(
    modelName: string,
    filter: QueryFilter = {}
  ): boolean {
    const docs = this.getCollectionDocuments(modelName);
    return DocumentMatcher.exists(docs, filter);
  }

  // ===== Helper Methods =====

  private getDocKey(modelName: string, id: any): string {
    return `doc:${modelName}:${id}`;
  }

  private getCollectionKey(modelName: string): string {
    return `collection:${modelName}`;
  }

  private getIndexKey(
    modelName: string,
    fieldName: string,
    fieldValue: any
  ): string {
    return `index:${modelName}:${fieldName}:${fieldValue}`;
  }

  private getNestedValue(obj: any, path: string): any {
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
  async clear(): Promise<void> {
    await this.provider.clear();
    if (this.debug) console.log('[Cache] Cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return (this.provider as any).getStats?.();
  }
}
