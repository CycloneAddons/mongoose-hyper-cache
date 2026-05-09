/**
 * Mongoose query patching - patch existing methods to use cache
 * Makes find, findOne, findById synchronous after warmOnStartup
 */

import { Model } from 'mongoose';
import { CacheManager } from '../cache/manager';

// Helper to create chainable query object
function createQueryChain(results: any, selectedFields?: Set<string>) {
  const applySelect = (docs: any) => {
    if (!selectedFields || selectedFields.size === 0) return docs;
    if (!Array.isArray(docs)) {
      // Single document
      const doc = { ...docs };
      const filtered: any = {};
      selectedFields.forEach(field => {
        if (field in doc) filtered[field] = doc[field];
      });
      return filtered;
    }
    // Array of documents
    return docs.map(doc => {
      const filtered: any = {};
      selectedFields.forEach(field => {
        if (field in doc) filtered[field] = doc[field];
      });
      return filtered;
    });
  };

  const selected = selectedFields && selectedFields.size > 0 ? applySelect(results) : results;

  return {
    select: (fields: string) => {
      const fieldSet = new Set(fields.split(' ').filter(f => f));
      return createQueryChain(results, fieldSet);
    },
    lean: () => {
      // Return a thenable object so await works
      return {
        exec: () => selected,
        select: (fields: string) => {
          const fieldSet = new Set(fields.split(' ').filter(f => f));
          return createQueryChain(results, fieldSet).lean();
        },
        then: (resolve: any) => Promise.resolve(selected).then(resolve),
        catch: (reject: any) => Promise.resolve(selected).catch(reject),
      };
    },
    exec: () => selected,
    then: (resolve: any) => Promise.resolve(selected).then(resolve),
    catch: (reject: any) => Promise.resolve(selected).catch(reject),
  };
}

export class QueryPatcher {
  /**
   * Patch Model.find - replaces original method
   */
  static patchFind(
    Model: any,
    cacheManager: CacheManager,
    modelName: string,
    debug: boolean = false
  ): void {
    const originalFind = Model.find;

    Model.find = function (filter?: any, projection?: any, options?: any) {
      if (debug) console.log(`[QueryPatch] find() called`);
      
      // Direct synchronous call - returns results immediately
      try {
        const results = cacheManager.find(modelName, filter || {}, options || {});
        return createQueryChain(results);
      } catch (err) {
        if (debug) console.log('[QueryPatch] Cache miss, falling back to MongoDB');
        return originalFind.call(this, filter, projection, options);
      }
    };
  }

  /**
   * Patch Model.findOne - replaces original method
   */
  static patchFindOne(
    Model: any,
    cacheManager: CacheManager,
    modelName: string,
    debug: boolean = false
  ): void {
    const originalFindOne = Model.findOne;

    Model.findOne = function (filter?: any, projection?: any, options?: any) {
      if (debug) console.log(`[QueryPatch] findOne() called`);
      
      try {
        const result = cacheManager.findOne(modelName, filter || {});
        return createQueryChain(result);
      } catch (err) {
        if (debug) console.log('[QueryPatch] Cache miss, falling back to MongoDB');
        return originalFindOne.call(this, filter, projection, options);
      }
    };
  }

  /**
   * Patch Model.findById - replaces original method
   */
  static patchFindById(
    Model: any,
    cacheManager: CacheManager,
    modelName: string,
    debug: boolean = false
  ): void {
    const originalFindById = Model.findById;

    Model.findById = function (id?: any, projection?: any, options?: any) {
      if (debug) console.log(`[QueryPatch] findById() called:`, id);
      
      try {
        const result = cacheManager.findById(modelName, id);
        return createQueryChain(result);
      } catch (err) {
        if (debug) console.log('[QueryPatch] Cache miss, falling back to MongoDB');
        return originalFindById.call(this, id, projection, options);
      }
    };
  }

  /**
   * Patch Model.countDocuments - synchronous count
   */
  static patchCountDocuments(
    Model: any,
    cacheManager: CacheManager,
    modelName: string,
    debug: boolean = false
  ): void {
    const originalCount = Model.countDocuments;

    Model.countDocuments = function (filter?: any, options?: any) {
      if (debug) console.log(`[QueryPatch] countDocuments() called`);
      
      try {
        const count = cacheManager.countDocuments(modelName, filter || {});
        
        return {
          exec: () => count,
          then: (resolve: any) => Promise.resolve(count).then(resolve),
          catch: () => ({ then: (resolve: any) => Promise.resolve(count).then(resolve) }),
        };
      } catch (err) {
        if (debug) console.log('[QueryPatch] Cache miss, falling back to MongoDB');
        return originalCount.call(this, filter, options);
      }
    };
  }

  /**
   * Patch Model.exists - synchronous existence check
   */
  static patchExists(
    Model: any,
    cacheManager: CacheManager,
    modelName: string,
    debug: boolean = false
  ): void {
    const originalExists = Model.exists;

    Model.exists = function (filter?: any) {
      if (debug) console.log(`[QueryPatch] exists() called`);
      
      try {
        const exists = cacheManager.exists(modelName, filter || {});
        const result = exists ? { _id: true } : null;
        
        return {
          exec: () => result,
          then: (resolve: any) => Promise.resolve(result).then(resolve),
          catch: () => ({ then: (resolve: any) => Promise.resolve(result).then(resolve) }),
        };
      } catch (err) {
        if (debug) console.log('[QueryPatch] Cache miss, falling back to MongoDB');
        return originalExists.call(this, filter);
      }
    };
  }
}
