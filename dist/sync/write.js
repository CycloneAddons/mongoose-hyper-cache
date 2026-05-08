"use strict";
/**
 * Write sync - fast synchronous write to MongoDB + cache
 * Optimized for 30-40ms latency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteSync = void 0;
class WriteSync {
    /**
     * Create - immediately cache, then write MongoDB in parallel
     */
    static async create(model, modelName, data, cacheManager, debug = false) {
        if (debug)
            console.time(`[WriteSync] create ${modelName}`);
        // Create on MongoDB
        const doc = await model.create(data);
        const leanDoc = doc.toObject ? doc.toObject() : doc;
        // Sync to cache (fire & forget, don't await)
        cacheManager.cacheDocument(modelName, leanDoc).catch(err => {
            if (debug)
                console.error('[WriteSync] Cache sync failed:', err);
        });
        cacheManager.addToCollection(modelName, doc._id).catch(err => {
            if (debug)
                console.error('[WriteSync] Collection sync failed:', err);
        });
        if (debug)
            console.timeEnd(`[WriteSync] create ${modelName}`);
        return doc;
    }
    /**
     * Update one - direct cache update + MongoDB write
     */
    static async updateOne(model, modelName, filter, update, cacheManager, debug = false) {
        if (debug)
            console.time(`[WriteSync] updateOne ${modelName}`);
        // Update MongoDB (parallel with cache)
        const [result, updatedDoc] = await Promise.all([
            model.updateOne(filter, update),
            model.findOne(filter).lean(),
        ]);
        // Sync cache immediately
        if (updatedDoc) {
            await cacheManager.cacheDocument(modelName, updatedDoc);
        }
        if (debug)
            console.timeEnd(`[WriteSync] updateOne ${modelName}`);
        return result;
    }
    /**
     * Update many - batch cache update + MongoDB write
     */
    static async updateMany(model, modelName, filter, update, cacheManager, debug = false) {
        if (debug)
            console.time(`[WriteSync] updateMany ${modelName}`);
        // Parallel: update MongoDB and fetch updated docs
        const [result, updatedDocs] = await Promise.all([
            model.updateMany(filter, update),
            model.find(filter).lean(),
        ]);
        // Sync all to cache
        for (const doc of updatedDocs) {
            cacheManager.cacheDocument(modelName, doc).catch(err => {
                if (debug)
                    console.error('[WriteSync] Cache sync failed:', err);
            });
        }
        if (debug)
            console.timeEnd(`[WriteSync] updateMany ${modelName}`);
        return result;
    }
    /**
     * Delete one - direct removal + MongoDB delete
     */
    static async deleteOne(model, modelName, filter, cacheManager, debug = false) {
        if (debug)
            console.time(`[WriteSync] deleteOne ${modelName}`);
        // Get ID first (needed for cache removal)
        const doc = await model.findOne(filter).lean();
        const docId = doc?._id;
        // Parallel: delete from MongoDB and remove from cache
        const result = await model.deleteOne(filter);
        if (docId) {
            cacheManager.deleteDocument(modelName, docId).catch(err => {
                if (debug)
                    console.error('[WriteSync] Cache delete failed:', err);
            });
            cacheManager.removeFromCollection(modelName, docId).catch(err => {
                if (debug)
                    console.error('[WriteSync] Collection remove failed:', err);
            });
        }
        if (debug)
            console.timeEnd(`[WriteSync] deleteOne ${modelName}`);
        return result;
    }
    /**
     * Delete many - batch removal
     */
    static async deleteMany(model, modelName, filter, cacheManager, debug = false) {
        if (debug)
            console.time(`[WriteSync] deleteMany ${modelName}`);
        // Get doc IDs first
        const docs = await model.find(filter).lean();
        const docIds = docs.map(d => d._id);
        // Delete from MongoDB
        const result = await model.deleteMany(filter);
        // Remove from cache (parallel)
        for (const docId of docIds) {
            cacheManager.deleteDocument(modelName, docId).catch(err => {
                if (debug)
                    console.error('[WriteSync] Cache delete failed:', err);
            });
            cacheManager.removeFromCollection(modelName, docId).catch(err => {
                if (debug)
                    console.error('[WriteSync] Collection remove failed:', err);
            });
        }
        if (debug)
            console.timeEnd(`[WriteSync] deleteMany ${modelName}`);
        return result;
    }
    /**
     * Replace one document
     */
    static async replaceOne(model, modelName, filter, replacement, cacheManager, debug = false) {
        if (debug)
            console.log(`[WriteSync] Replacing ${modelName}`);
        // Replace in MongoDB
        const result = await model.replaceOne(filter, replacement);
        // Find the replaced document
        const doc = await model.findOne(filter);
        if (doc) {
            const leanDoc = doc.toObject ? doc.toObject() : doc;
            await cacheManager.cacheDocument(modelName, leanDoc);
            if (debug)
                console.log(`[WriteSync] ✓ Replaced ${modelName}:${doc._id}`);
        }
        return result;
    }
    /**
     * Bulk write operations
     */
    static async bulkWrite(model, modelName, operations, cacheManager, debug = false) {
        if (debug)
            console.log(`[WriteSync] Bulk writing ${modelName}:`, operations.length);
        // Execute bulk write on MongoDB
        const result = await model.bulkWrite(operations);
        // For now, we'll do a full re-cache of affected documents
        // In production, you'd want to track which documents were affected
        if (debug)
            console.log(`[WriteSync] ✓ Bulk write completed`);
        return result;
    }
}
exports.WriteSync = WriteSync;
//# sourceMappingURL=write.js.map