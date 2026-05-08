"use strict";
/**
 * Document matcher - filters documents using indexes and query operators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentMatcher = void 0;
const operators_1 = require("./operators");
class DocumentMatcher {
    /**
     * Find documents matching filter
     */
    static find(documents, filter = {}, options = {}) {
        let results = documents.filter(doc => operators_1.QueryOperators.evaluateFilter(doc, filter));
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
    static findOne(documents, filter = {}) {
        const result = documents.find(doc => operators_1.QueryOperators.evaluateFilter(doc, filter));
        return result || null;
    }
    /**
     * Find by ID
     */
    static findById(documents, id) {
        return documents.find(doc => {
            // Handle both ObjectId and string comparison
            const docId = doc._id;
            if (docId === id)
                return true;
            if (docId && docId.toString() === id.toString())
                return true;
            return false;
        }) || null;
    }
    /**
     * Check if any document matches filter
     */
    static exists(documents, filter = {}) {
        return documents.some(doc => operators_1.QueryOperators.evaluateFilter(doc, filter));
    }
    /**
     * Count documents matching filter
     */
    static count(documents, filter = {}) {
        return documents.filter(doc => operators_1.QueryOperators.evaluateFilter(doc, filter)).length;
    }
    /**
     * Sort documents
     */
    static sortDocuments(docs, sort) {
        return [...docs].sort((a, b) => {
            for (const [field, direction] of Object.entries(sort)) {
                const aVal = this.getNestedValue(a, field);
                const bVal = this.getNestedValue(b, field);
                if (aVal === bVal)
                    continue;
                let comparison = 0;
                if (aVal < bVal)
                    comparison = -1;
                else if (aVal > bVal)
                    comparison = 1;
                return direction === 1 ? comparison : -comparison;
            }
            return 0;
        });
    }
    /**
     * Get nested field value using dot notation
     */
    static getNestedValue(obj, path) {
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
exports.DocumentMatcher = DocumentMatcher;
//# sourceMappingURL=matcher.js.map