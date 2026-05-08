/**
 * Core type definitions for mongoose-hyper-cache
 */

export interface HyperCacheOptions {
  /** Provider type: "memory", "redis", or "memory+redis" */
  provider: 'memory' | 'redis' | 'memory+redis';
  
  /** Warm all collections on startup */
  warmOnStartup?: boolean;
  
  /** Collections to warm (if not specified, all are warmed) */
  warmCollections?: string[];
  
  /** Maximum documents to warm per collection */
  maxWarmDocuments?: number;
  
  /** Enable change stream sync across instances */
  watch?: boolean;
  
  /** Redis configuration */
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    family?: 4 | 6;
    connectTimeout?: number;
    retryStrategy?: (retries: number) => number;
  };
  
  /** Memory provider options */
  memory?: {
    /** Maximum items in LRU cache */
    maxItems?: number;
    /** TTL in milliseconds */
    ttl?: number;
  };
  
  /** Enable synchronous reads (no await) */
  syncReads?: boolean;
  
  /** Debug mode */
  debug?: boolean;
}

export interface CacheProvider {
  set(key: string, value: any): Promise<void> | void;
  get(key: string): Promise<any> | any;
  del(key: string): Promise<void> | void;
  exists(key: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
  scan(pattern: string): Promise<string[]> | string[];
  getMultiple(keys: string[]): Promise<any[]> | any[];
  setMultiple(data: Map<string, any>): Promise<void> | void;
}

export interface CachedDocument {
  _id: any;
  [key: string]: any;
}

export interface QueryFilter {
  [key: string]: any;
}

export interface MongooseModel {
  // After warmOnStartup - these are synchronous (no await)
  find(filter?: QueryFilter): CachedDocument[];
  findOne(filter?: QueryFilter): CachedDocument | null;
  findById(id: any): CachedDocument | null;
  updateOne(filter: QueryFilter, update: any): Promise<any>;
  updateMany(filter: QueryFilter, update: any): Promise<any>;
  deleteOne(filter: QueryFilter): Promise<any>;
  deleteMany(filter: QueryFilter): Promise<any>;
  create(data: any): Promise<any>;
  countDocuments(filter?: QueryFilter): number;
  exists(filter?: QueryFilter): boolean;
  [key: string]: any;
}

export interface IndexDefinition {
  fields: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
}

export interface CacheStats {
  totalDocuments: number;
  collections: Record<string, number>;
  indexCount: number;
  memoryUsage: number;
  lastSync: Date;
}
