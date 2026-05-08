"use strict";
/**
 * Change stream watcher - sync cache across instances using MongoDB change streams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeStreamWatcher = void 0;
class ChangeStreamWatcher {
    constructor() {
        this.watchers = new Map();
    }
    /**
     * Watch a model for changes from other instances
     */
    async watchModel(modelName, model, cacheManager, debug = false) {
        if (debug)
            console.log(`[ChangeStream] Watching ${modelName}`);
        try {
            const changeStream = model.watch();
            changeStream.on('change', async (change) => {
                try {
                    await this.handleChange(modelName, model, change, cacheManager, debug);
                }
                catch (err) {
                    console.error(`[ChangeStream] Error handling change for ${modelName}:`, err);
                }
            });
            changeStream.on('error', (err) => {
                console.error(`[ChangeStream] Error in ${modelName} watcher:`, err);
            });
            this.watchers.set(modelName, changeStream);
            if (debug)
                console.log(`[ChangeStream] ✓ Watching ${modelName}`);
        }
        catch (err) {
            console.warn(`[ChangeStream] Failed to watch ${modelName}:`, err);
        }
    }
    /**
     * Handle a change stream event
     */
    async handleChange(modelName, model, change, cacheManager, debug) {
        const operationType = change.operationType;
        const documentId = change.documentKey._id;
        if (debug) {
            console.log(`[ChangeStream] ${modelName} ${operationType}: ${documentId}`);
        }
        try {
            switch (operationType) {
                case 'insert': {
                    // Fetch and cache the new document
                    const doc = await model.findById(documentId).lean();
                    if (doc) {
                        await cacheManager.cacheDocument(modelName, doc);
                        await cacheManager.addToCollection(modelName, doc._id);
                    }
                    break;
                }
                case 'update': {
                    // Fetch and sync the updated document
                    const doc = await model.findById(documentId).lean();
                    if (doc) {
                        await cacheManager.cacheDocument(modelName, doc);
                    }
                    break;
                }
                case 'delete': {
                    // Remove from cache
                    await cacheManager.deleteDocument(modelName, documentId);
                    await cacheManager.removeFromCollection(modelName, documentId);
                    break;
                }
                case 'replace': {
                    // Fetch and sync the replaced document
                    const doc = await model.findById(documentId).lean();
                    if (doc) {
                        await cacheManager.cacheDocument(modelName, doc);
                    }
                    break;
                }
                case 'invalidate': {
                    // Collection was cleared/dropped, clear cache
                    await cacheManager.clearCollection(modelName);
                    break;
                }
            }
            if (debug) {
                console.log(`[ChangeStream] ✓ Synced ${modelName}:${documentId}`);
            }
        }
        catch (err) {
            console.error(`[ChangeStream] Failed to sync ${modelName}:${documentId}:`, err);
        }
    }
    /**
     * Stop watching all models
     */
    async stopWatching() {
        for (const [modelName, watcher] of this.watchers) {
            try {
                await watcher.close();
                console.log(`[ChangeStream] Stopped watching ${modelName}`);
            }
            catch (err) {
                console.error(`[ChangeStream] Error closing watcher for ${modelName}:`, err);
            }
        }
        this.watchers.clear();
    }
    /**
     * Get watcher status
     */
    getStatus() {
        const status = {};
        this.watchers.forEach((watcher, modelName) => {
            status[modelName] = !watcher.isClosed();
        });
        return status;
    }
}
exports.ChangeStreamWatcher = ChangeStreamWatcher;
//# sourceMappingURL=change-stream.js.map