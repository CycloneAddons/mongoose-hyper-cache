/**
 * Mongoose query patching - patch existing methods to use cache
 * Makes find, findOne, findById synchronous after warmOnStartup
 */

import { Model } from 'mongoose';
import { CacheManager } from '../cache/manager';

// Create a proxy object that acts like the document but supports chaining
function createDocumentProxy(data: any) {
  const chainMethods = {
    select: (fields: string) => createDocumentProxy(data),
    lean: () => ({
      exec: () => data,
      then: (resolve: any) => Promise.resolve(data).then(resolve),
      catch: (reject: any) => Promise.resolve(data).catch(reject),
    }),
    exec: () => data,
    then: (resolve: any) => Promise.resolve(data).then(resolve),
    catch: (reject: any) => Promise.resolve(data).catch(reject),
  };

  return new Proxy(data || {}, {
    get(target: any, prop: string) {
      // Chain methods take priority
      if (prop in chainMethods) {
        return (chainMethods as any)[prop];
      }
      // Otherwise return document property
      return target?.[prop];
    },
  });
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
        // For arrays, create wrapper that acts like array with chain methods
        const wrapper = (results || []) as any;
        wrapper.lean = () => ({
          exec: () => wrapper,
          then: (resolve: any) => Promise.resolve(wrapper).then(resolve),
          catch: (reject: any) => Promise.resolve(wrapper).catch(reject),
        });
        wrapper.select = () => wrapper;
        wrapper.exec = () => wrapper;
        wrapper.then = (resolve: any) => Promise.resolve(wrapper).then(resolve);
        wrapper.catch = (reject: any) => Promise.resolve(wrapper).catch(reject);
        return wrapper;
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
        return createDocumentProxy(result);
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
        return createDocumentProxy(result);
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
