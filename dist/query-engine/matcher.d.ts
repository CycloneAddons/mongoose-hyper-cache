/**
 * Document matcher - filters documents using indexes and query operators
 */
import { CachedDocument, QueryFilter } from '../types';
export interface MatcherOptions {
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
}
export declare class DocumentMatcher {
    /**
     * Find documents matching filter
     */
    static find(documents: CachedDocument[], filter?: QueryFilter, options?: MatcherOptions): CachedDocument[];
    /**
     * Find single document
     */
    static findOne(documents: CachedDocument[], filter?: QueryFilter): CachedDocument | null;
    /**
     * Find by ID
     */
    static findById(documents: CachedDocument[], id: any): CachedDocument | null;
    /**
     * Check if any document matches filter
     */
    static exists(documents: CachedDocument[], filter?: QueryFilter): boolean;
    /**
     * Count documents matching filter
     */
    static count(documents: CachedDocument[], filter?: QueryFilter): number;
    /**
     * Sort documents
     */
    private static sortDocuments;
    /**
     * Get nested field value using dot notation
     */
    private static getNestedValue;
}
//# sourceMappingURL=matcher.d.ts.map