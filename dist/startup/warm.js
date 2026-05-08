"use strict";
/**
 * Warm startup - preload all documents into cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarmLoader = void 0;
const index_builder_1 = require("../cache/index-builder");
class WarmLoader {
    /**
     * Warm all collections on startup
     */
    static async warmCollections(models, cacheManager, options, debug = false) {
        const results = new Map();
        const warmCollections = options.warmCollections;
        const maxWarmDocuments = options.maxWarmDocuments || Infinity;
        if (debug)
            console.log('[Warm] Starting startup warm...');
        for (const [modelName, model] of models) {
            // Skip if warmCollections is specified and this model isn't in it
            if (warmCollections && !warmCollections.includes(modelName)) {
                if (debug)
                    console.log(`[Warm] Skipping ${modelName} (not in warmCollections)`);
                continue;
            }
            try {
                const count = await this.warmCollection(modelName, model, cacheManager, maxWarmDocuments, debug);
                results.set(modelName, count);
                if (debug) {
                    console.log(`[Warm] ✓ Warmed ${modelName}: ${count} documents`);
                }
            }
            catch (err) {
                console.error(`[Warm] ✗ Failed to warm ${modelName}:`, err);
            }
        }
        if (debug)
            console.log('[Warm] Startup complete');
        return results;
    }
    /**
     * Warm a single collection
     */
    static async warmCollection(modelName, model, cacheManager, maxDocuments, debug = false) {
        if (debug)
            console.log(`[Warm] Loading ${modelName}...`);
        // Load lean documents (no hydration, much faster)
        let query = model.find({}).lean();
        if (maxDocuments !== Infinity) {
            query = query.limit(maxDocuments);
        }
        const documents = await query.exec();
        if (debug)
            console.log(`[Warm] Fetched ${documents.length} documents from ${modelName}`);
        // Cache each document
        let cachedCount = 0;
        for (const doc of documents) {
            try {
                await cacheManager.cacheDocument(modelName, doc);
                await cacheManager.addToCollection(modelName, doc._id);
                cachedCount++;
            }
            catch (err) {
                console.warn(`[Warm] Failed to cache document ${doc._id} in ${modelName}:`, err);
            }
        }
        // Build indexes from schema
        try {
            await index_builder_1.IndexBuilder.buildIndexesFromSchema(modelName, model.schema, documents, cacheManager, debug);
        }
        catch (err) {
            console.warn(`[Warm] Failed to build indexes for ${modelName}:`, err);
        }
        return cachedCount;
    }
    /**
     * Estimate memory usage for warming
     */
    static estimateMemoryUsage(documents) {
        const estimatedBytesPerDoc = 1024; // Conservative estimate
        return documents.length * estimatedBytesPerDoc;
    }
}
exports.WarmLoader = WarmLoader;
//# sourceMappingURL=warm.js.map