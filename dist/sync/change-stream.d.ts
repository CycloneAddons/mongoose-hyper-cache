/**
 * Change stream watcher - sync cache across instances using MongoDB change streams
 */
import { Model } from 'mongoose';
import { CacheManager } from '../cache/manager';
export declare class ChangeStreamWatcher {
    private watchers;
    /**
     * Watch a model for changes from other instances
     */
    watchModel(modelName: string, model: Model<any>, cacheManager: CacheManager, debug?: boolean): Promise<void>;
    /**
     * Handle a change stream event
     */
    private handleChange;
    /**
     * Stop watching all models
     */
    stopWatching(): Promise<void>;
    /**
     * Get watcher status
     */
    getStatus(): Record<string, boolean>;
}
//# sourceMappingURL=change-stream.d.ts.map