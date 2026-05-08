/**
 * Document matcher - filters documents using indexes and query operators
 */

import { QueryOperators } from './operators';
import { CachedDocument, QueryFilter } from '../types';

export interface MatcherOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

export class DocumentMatcher {
  /**
   * Find documents matching filter
   */
  static find(
    documents: CachedDocument[],
    filter: QueryFilter = {},
    options: MatcherOptions = {}
  ): CachedDocument[] {
    let results = documents.filter(doc =>
      QueryOperators.evaluateFilter(doc, filter)
    );

    // Apply sorting
    if (options.sort && Object.keys(options.sort).length > 0) {
      results = this.sortDocuments(results, options.sort);
    }

    // Apply skip
    if (options.skip && options.skip > 0) {
      results = results.slice(options.skip);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Find single document
   */
  static findOne(
    documents: CachedDocument[],
    filter: QueryFilter = {}
  ): CachedDocument | null {
    const result = documents.find(doc =>
      QueryOperators.evaluateFilter(doc, filter)
    );
    return result || null;
  }

  /**
   * Find by ID
   */
  static findById(
    documents: CachedDocument[],
    id: any
  ): CachedDocument | null {
    return documents.find(doc => {
      // Handle both ObjectId and string comparison
      const docId = doc._id;
      if (docId === id) return true;
      if (docId && docId.toString() === id.toString()) return true;
      return false;
    }) || null;
  }

  /**
   * Check if any document matches filter
   */
  static exists(
    documents: CachedDocument[],
    filter: QueryFilter = {}
  ): boolean {
    return documents.some(doc =>
      QueryOperators.evaluateFilter(doc, filter)
    );
  }

  /**
   * Count documents matching filter
   */
  static count(
    documents: CachedDocument[],
    filter: QueryFilter = {}
  ): number {
    return documents.filter(doc =>
      QueryOperators.evaluateFilter(doc, filter)
    ).length;
  }

  /**
   * Sort documents
   */
  private static sortDocuments(
    docs: CachedDocument[],
    sort: Record<string, 1 | -1>
  ): CachedDocument[] {
    return [...docs].sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = this.getNestedValue(a, field);
        const bVal = this.getNestedValue(b, field);

        if (aVal === bVal) continue;

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        return direction === 1 ? comparison : -comparison;
      }
      return 0;
    });
  }

  /**
   * Get nested field value using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
