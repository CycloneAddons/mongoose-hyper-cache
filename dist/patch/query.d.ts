/**
 * Mongoose query patching - patch existing methods to use cache
 * Makes find, findOne, findById synchronous after warmOnStartup
 */
import { CacheManager } from '../cache/manager';
export declare class QueryPatcher {
    /**
     * Patch Model.find - replaces original method
     */
    static patchFind(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.findOne - replaces original method
     */
    static patchFindOne(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.findById - replaces original method
     */
    static patchFindById(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.countDocuments - synchronous count
     */
    static patchCountDocuments(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.exists - synchronous existence check
     */
    static patchExists(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
}
//# sourceMappingURL=query.d.ts.map