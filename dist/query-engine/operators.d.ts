/**
 * Query operators for in-memory MongoDB query evaluation
 * Supports: =, $in, $gt, $gte, $lt, $lte, $or, $and, $ne
 */
export declare class QueryOperators {
    /**
     * Evaluate a single filter condition
     */
    static evaluate(value: any, condition: any): boolean;
    /**
     * Evaluate a specific operator
     */
    private static evaluateOperator;
    /**
     * Evaluate a full query filter document against a document
     */
    static evaluateFilter(doc: any, filter: any): boolean;
    /**
     * Get nested field value using dot notation
     */
    private static getNestedValue;
}
//# sourceMappingURL=operators.d.ts.map