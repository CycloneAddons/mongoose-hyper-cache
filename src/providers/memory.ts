/**
 * In-memory cache provider using LRU cache
 */

import { LRUCache } from 'lru-cache';
import { CacheProvider } from '../types';

export class MemoryProvider implements CacheProvider {
  private cache: LRUCache<string, any>;
  private debug: boolean;

  constructor(maxItems: number = 100000, debug: boolean = false) {
    this.cache = new LRUCache({ max: maxItems });
    this.debug = debug;
  }

  /**
   * Synchronous set - no await needed
   */
  set(key: string, value: any): void {
    if (this.debug) console.log(`[MemoryCache] SET ${key}`);
    this.cache.set(key, value);
  }

  /**
   * Synchronous get - no await needed
   */
  get(key: string): any {
    const value = this.cache.get(key);
    if (this.debug && value) console.log(`[MemoryCache] GET ${key}`);
    return value;
  }

  /**
   * Synchronous delete
   */
  del(key: string): void {
    if (this.debug) console.log(`[MemoryCache] DEL ${key}`);
    this.cache.delete(key);
  }

  /**
   * Synchronous exists check
   */
  exists(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    if (this.debug) console.log(`[MemoryCache] CLEAR`);
    this.cache.clear();
  }

  /**
   * Scan pattern in cache (memory is fast, so we iterate)
   */
  scan(pattern: string): string[] {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const matches: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matches.push(key);
      }
    }
    
    return matches;
  }

  /**
   * Get multiple values synchronously
   */
  getMultiple(keys: string[]): any[] {
    return keys.map(key => this.cache.get(key));
  }

  /**
   * Set multiple values synchronously
   */
  setMultiple(data: Map<string, any>): void {
    data.forEach((value, key) => {
      this.cache.set(key, value);
    });
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}
