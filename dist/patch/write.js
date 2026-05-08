"use strict";
/**
 * Mongoose write operation patching - sync updates/deletes to cache
 * Patches create, update, delete methods
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WritePatcher = void 0;
class WritePatcher {
    /**
     * Patch Model.create
     */
    static patchCreate(Model, cacheManager, modelName, debug = false) {
        const originalCreate = Model.create;
        Model.create = async function (docs, options) {
            const result = await originalCreate.call(this, docs, options);
            try {
                // Don't await - let cache sync in background
                const docsArray = Array.isArray(result) ? result : [result];
                for (const doc of docsArray) {
                    const leanDoc = doc.toObject ? doc.toObject() : doc;
                    cacheManager.cacheDocument(modelName, leanDoc).catch(() => { });
                    cacheManager.addToCollection(modelName, doc._id).catch(() => { });
                }
            }
            catch (err) {
                if (debug)
                    console.log('[WritePatch] Create cache sync failed:', err);
            }
            return result;
        };
    }
    /**
     * Patch Model.updateOne
     */
    static patchUpdateOne(Model, cacheManager, modelName, debug = false) {
        const originalUpdateOne = Model.updateOne;
        Model.updateOne = function (filter, update, options) {
            return originalUpdateOne.call(this, filter, update, options).then(async (result) => {
                // Parallel: fetch and cache in background
                try {
                    const doc = await Model.findOne(filter).lean();
                    if (doc) {
                        cacheManager.cacheDocument(modelName, doc).catch(() => { });
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] updateOne cache sync failed:', err);
                }
                return result;
            });
        };
    }
    /**
     * Patch Model.updateMany
     */
    static patchUpdateMany(Model, cacheManager, modelName, debug = false) {
        const originalUpdateMany = Model.updateMany;
        Model.updateMany = function (filter, update, options) {
            return originalUpdateMany.call(this, filter, update, options).then(async (result) => {
                try {
                    const docs = await Model.find(filter).lean();
                    for (const doc of docs) {
                        cacheManager.cacheDocument(modelName, doc).catch(() => { });
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] updateMany cache sync failed:', err);
                }
                return result;
            });
        };
    }
    /**
     * Patch Model.deleteOne
     */
    static patchDeleteOne(Model, cacheManager, modelName, debug = false) {
        const originalDeleteOne = Model.deleteOne;
        Model.deleteOne = function (filter, options) {
            return originalDeleteOne.call(this, filter, options).then(async (result) => {
                try {
                    // Get IDs and remove from cache in background
                    const allIds = await cacheManager.getCollectionIds(modelName);
                    for (const id of allIds) {
                        const doc = cacheManager.findById(modelName, id);
                        if (doc) {
                            // Try to find in MongoDB - if not there, remove from cache
                            const exists = await Model.findById(id);
                            if (!exists) {
                                cacheManager.deleteDocument(modelName, id).catch(() => { });
                                cacheManager.removeFromCollection(modelName, id).catch(() => { });
                            }
                        }
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] deleteOne cache sync failed:', err);
                }
                return result;
            });
        };
    }
    /**
     * Patch Model.deleteMany
     */
    static patchDeleteMany(Model, cacheManager, modelName, debug = false) {
        const originalDeleteMany = Model.deleteMany;
        Model.deleteMany = function (filter, options) {
            return originalDeleteMany.call(this, filter, options).then(async (result) => {
                try {
                    // Verify and remove deleted docs from cache
                    const allIds = await cacheManager.getCollectionIds(modelName);
                    for (const id of allIds) {
                        const exists = await Model.findById(id);
                        if (!exists) {
                            cacheManager.deleteDocument(modelName, id).catch(() => { });
                            cacheManager.removeFromCollection(modelName, id).catch(() => { });
                        }
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] deleteMany cache sync failed:', err);
                }
                return result;
            });
        };
    }
    /**
     * Patch Model.findByIdAndUpdate
     */
    static patchFindByIdAndUpdate(Model, cacheManager, modelName, debug = false) {
        const originalFindByIdAndUpdate = Model.findByIdAndUpdate;
        Model.findByIdAndUpdate = function (id, update, options) {
            const query = originalFindByIdAndUpdate.call(this, id, update, options);
            const originalQueryExec = query.exec.bind(query);
            query.exec = async function () {
                const result = await originalQueryExec();
                try {
                    if (result) {
                        const leanDoc = result.toObject ? result.toObject() : result;
                        cacheManager.cacheDocument(modelName, leanDoc).catch(() => { });
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] findByIdAndUpdate cache sync failed:', err);
                }
                return result;
            };
            return query;
        };
    }
    /**
     * Patch Model.findByIdAndDelete
     */
    static patchFindByIdAndDelete(Model, cacheManager, modelName, debug = false) {
        const originalFindByIdAndDelete = Model.findByIdAndDelete;
        Model.findByIdAndDelete = function (id, options) {
            const query = originalFindByIdAndDelete.call(this, id, options);
            const originalQueryExec = query.exec.bind(query);
            query.exec = async function () {
                const result = await originalQueryExec();
                try {
                    if (result && id) {
                        cacheManager.deleteDocument(modelName, id).catch(() => { });
                        cacheManager.removeFromCollection(modelName, id).catch(() => { });
                    }
                }
                catch (err) {
                    if (debug)
                        console.log('[WritePatch] findByIdAndDelete cache sync failed:', err);
                }
                return result;
            };
            return query;
        };
    }
}
exports.WritePatcher = WritePatcher;
//# sourceMappingURL=write.js.map