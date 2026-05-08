/**
 * Mongoose write operation patching - sync updates/deletes to cache
 * Patches create, update, delete methods
 */
import { CacheManager } from '../cache/manager';
export declare class WritePatcher {
    /**
     * Patch Model.create
     */
    static patchCreate(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.updateOne
     */
    static patchUpdateOne(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.updateMany
     */
    static patchUpdateMany(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.deleteOne
     */
    static patchDeleteOne(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.deleteMany
     */
    static patchDeleteMany(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.findByIdAndUpdate
     */
    static patchFindByIdAndUpdate(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
    /**
     * Patch Model.findByIdAndDelete
     */
    static patchFindByIdAndDelete(Model: any, cacheManager: CacheManager, modelName: string, debug?: boolean): void;
}
//# sourceMappingURL=write.d.ts.map