/**
 * Query operators for in-memory MongoDB query evaluation
 * Supports: =, $in, $gt, $gte, $lt, $lte, $or, $and, $ne
 */

export class QueryOperators {
  /**
   * Evaluate a single filter condition
   */
  static evaluate(value: any, condition: any): boolean {
    // If condition is a plain value, do equality check
    if (typeof condition !== 'object' || condition === null) {
      return value === condition;
    }

    // Handle operator conditions
    for (const [op, operand] of Object.entries(condition)) {
      if (!this.evaluateOperator(value, op, operand)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a specific operator
   */
  private static evaluateOperator(value: any, op: string, operand: any): boolean {
    switch (op) {
      case '$eq':
        return value === operand;

      case '$ne':
        return value !== operand;

      case '$in':
        return Array.isArray(operand) && operand.includes(value);

      case '$nin':
        return !Array.isArray(operand) || !operand.includes(value);

      case '$gt':
        return value > operand;

      case '$gte':
        return value >= operand;

      case '$lt':
        return value < operand;

      case '$lte':
        return value <= operand;

      case '$exists':
        if (operand) {
          return value !== undefined && value !== null;
        } else {
          return value === undefined || value === null;
        }

      case '$type': {
        const typeMap: Record<string, string> = {
          'double': 'number',
          'string': 'string',
          'object': 'object',
          'array': 'array',
          'binData': 'object',
          'objectId': 'object',
          'bool': 'boolean',
          'date': 'object',
          'null': 'null',
          'int': 'number',
          'long': 'number',
          'decimal': 'number',
        };
        return typeof value === typeMap[operand];
      }

      case '$regex': {
        if (typeof value !== 'string') return false;
        const regex = new RegExp(operand);
        return regex.test(value);
      }

      case '$options':
        // $options is used with $regex, handled above
        return true;

      case '$elemMatch':
        if (!Array.isArray(value)) return false;
        return value.some(item => this.evaluate(item, operand));

      case '$size':
        return Array.isArray(value) && value.length === operand;

      case '$all':
        if (!Array.isArray(value)) return false;
        return Array.isArray(operand) && operand.every(item => value.includes(item));

      default:
        // Unknown operator, assume it doesn't match
        return false;
    }
  }

  /**
   * Evaluate a full query filter document against a document
   */
  static evaluateFilter(doc: any, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }

    for (const [key, condition] of Object.entries(filter)) {
      if (key === '$and') {
        // $and: all conditions must match
        const conditions = Array.isArray(condition) ? condition : [condition];
        if (!conditions.every(cond => this.evaluateFilter(doc, cond))) {
          return false;
        }
      } else if (key === '$or') {
        // $or: at least one condition must match
        const conditions = Array.isArray(condition) ? condition : [condition];
        if (!conditions.some(cond => this.evaluateFilter(doc, cond))) {
          return false;
        }
      } else if (key === '$nor') {
        // $nor: none of the conditions must match
        const conditions = Array.isArray(condition) ? condition : [condition];
        if (conditions.some(cond => this.evaluateFilter(doc, cond))) {
          return false;
        }
      } else if (key === '$not') {
        // $not: negate the condition
        if (this.evaluate(this.getNestedValue(doc, key), condition)) {
          return false;
        }
      } else {
        // Regular field condition
        const value = this.getNestedValue(doc, key);
        if (!this.evaluate(value, condition)) {
          return false;
        }
      }
    }

    return true;
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
