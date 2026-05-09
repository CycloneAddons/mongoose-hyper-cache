"use strict";
/**
 * Mongoose query patching - patch existing methods to use cache
 * Makes find, findOne, findById synchronous after warmOnStartup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryPatcher = void 0;
// Helper to create chainable query object
function createQueryChain(results, selectedFields) {
    const applySelect = (docs) => {
        if (!selectedFields || selectedFields.size === 0)
            return docs;
        if (!Array.isArray(docs)) {
            // Single document
            const doc = { ...docs };
            const filtered = {};
            selectedFields.forEach(field => {
                if (field in doc)
                    filtered[field] = doc[field];
            });
            return filtered;
        }
        // Array of documents
        return docs.map(doc => {
            const filtered = {};
            selectedFields.forEach(field => {
                if (field in doc)
                    filtered[field] = doc[field];
            });
            return filtered;
        });
    };
    const selected = selectedFields && selectedFields.size > 0 ? applySelect(results) : results;
    return {
        select: (fields) => {
            const fieldSet = new Set(fields.split(' ').filter(f => f));
            return createQueryChain(results, fieldSet);
        },
        lean: () => {
            // Return a thenable object so await works
            return {
                exec: () => selected,
                select: (fields) => {
                    const fieldSet = new Set(fields.split(' ').filter(f => f));
                    return createQueryChain(results, fieldSet).lean();
                },
                then: (resolve) => Promise.resolve(selected).then(resolve),
                catch: (reject) => Promise.resolve(selected).catch(reject),
            };
        },
        exec: () => selected,
        then: (resolve) => Promise.resolve(selected).then(resolve),
        catch: (reject) => Promise.resolve(selected).catch(reject),
    };
}
class QueryPatcher {
    /**
     * Patch Model.find - replaces original method
     */
    static patchFind(Model, cacheManager, modelName, debug = false) {
        const originalFind = Model.find;
        Model.find = function (filter, projection, options) {
            if (debug)
                console.log(`[QueryPatch] find() called`);
            // Direct synchronous call - returns results immediately
            try {
                const results = cacheManager.find(modelName, filter || {}, options || {});
                return createQueryChain(results);
            }
            catch (err) {
                if (debug)
                    console.log('[QueryPatch] Cache miss, falling back to MongoDB');
                return originalFind.call(this, filter, projection, options);
            }
        };
    }
    /**
     * Patch Model.findOne - replaces original method
     */
    static patchFindOne(Model, cacheManager, modelName, debug = false) {
        const originalFindOne = Model.findOne;
        Model.findOne = function (filter, projection, options) {
            if (debug)
                console.log(`[QueryPatch] findOne() called`);
            try {
                const result = cacheManager.findOne(modelName, filter || {});
                return createQueryChain(result);
            }
            catch (err) {
                if (debug)
                    console.log('[QueryPatch] Cache miss, falling back to MongoDB');
                return originalFindOne.call(this, filter, projection, options);
            }
        };
    }
    /**
     * Patch Model.findById - replaces original method
     */
    static patchFindById(Model, cacheManager, modelName, debug = false) {
        const originalFindById = Model.findById;
        Model.findById = function (id, projection, options) {
            if (debug)
                console.log(`[QueryPatch] findById() called:`, id);
            try {
                const result = cacheManager.findById(modelName, id);
                return createQueryChain(result);
            }
            catch (err) {
                if (debug)
                    console.log('[QueryPatch] Cache miss, falling back to MongoDB');
                return originalFindById.call(this, id, projection, options);
            }
        };
    }
    /**
     * Patch Model.countDocuments - synchronous count
     */
    static patchCountDocuments(Model, cacheManager, modelName, debug = false) {
        const originalCount = Model.countDocuments;
        Model.countDocuments = function (filter, options) {
            if (debug)
                console.log(`[QueryPatch] countDocuments() called`);
            try {
                const count = cacheManager.countDocuments(modelName, filter || {});
                return {
                    exec: () => count,
                    then: (resolve) => Promise.resolve(count).then(resolve),
                    catch: () => ({ then: (resolve) => Promise.resolve(count).then(resolve) }),
                };
            }
            catch (err) {
                if (debug)
                    console.log('[QueryPatch] Cache miss, falling back to MongoDB');
                return originalCount.call(this, filter, options);
            }
        };
    }
    /**
     * Patch Model.exists - synchronous existence check
     */
    static patchExists(Model, cacheManager, modelName, debug = false) {
        const originalExists = Model.exists;
        Model.exists = function (filter) {
            if (debug)
                console.log(`[QueryPatch] exists() called`);
            try {
                const exists = cacheManager.exists(modelName, filter || {});
                const result = exists ? { _id: true } : null;
                return {
                    exec: () => result,
                    then: (resolve) => Promise.resolve(result).then(resolve),
                    catch: () => ({ then: (resolve) => Promise.resolve(result).then(resolve) }),
                };
            }
            catch (err) {
                if (debug)
                    console.log('[QueryPatch] Cache miss, falling back to MongoDB');
                return originalExists.call(this, filter);
            }
        };
    }
}
exports.QueryPatcher = QueryPatcher;
//# sourceMappingURL=query.js.map