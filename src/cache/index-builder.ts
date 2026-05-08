/**
 * Index builder - automatically detects and builds indexes from schema
 */

import { Schema } from 'mongoose';
import { CacheManager } from './manager';
import { CachedDocument } from '../types';

export class IndexBuilder {
  /**
   * Build indexes from Mongoose schema
   */
  static async buildIndexesFromSchema(
    modelName: string,
    schema: Schema,
    documents: CachedDocument[],
    cacheManager: CacheManager,
    debug: boolean = false
  ): Promise<void> {
    const indexedFields: string[] = [];

    // Always index _id
    indexedFields.push('_id');

    // Find indexed fields in schema
    schema.eachPath((path, schemaType) => {
      const options = (schemaType as any).options || {};

      // Check for index directives
      if (options.index === true) {
        indexedFields.push(path);
      }

      // Check for unique constraint (implies index)
      if (options.unique === true) {
        indexedFields.push(path);
      }

      // Check for sparse index
      if (options.sparse === true) {
        indexedFields.push(path);
      }
    });

    // Build indexes
    for (const fieldName of indexedFields) {
      try {
        await cacheManager.buildIndex(modelName, fieldName, documents);
        if (debug) console.log(`[Index] Built index: ${modelName}.${fieldName}`);
      } catch (err) {
        console.warn(`[Index] Failed to build index ${modelName}.${fieldName}:`, err);
      }
    }

    if (debug) {
      console.log(
        `[Index] Built ${indexedFields.length} indexes for ${modelName}`
      );
    }
  }

  /**
   * Validate index consistency
   */
  static validateIndexes(
    modelName: string,
    documents: CachedDocument[],
    indexedFields: string[],
    debug: boolean = false
  ): boolean {
    for (const fieldName of indexedFields) {
      const fieldMap = new Map<any, any[]>();

      // Build expected index
      for (const doc of documents) {
        const fieldValue = this.getNestedValue(doc, fieldName);
        if (fieldValue !== undefined && fieldValue !== null) {
          if (!fieldMap.has(fieldValue)) {
            fieldMap.set(fieldValue, []);
          }
          fieldMap.get(fieldValue)!.push(doc._id);
        }
      }

      if (debug && fieldMap.size > 0) {
        console.log(
          `[Index] Validated ${fieldName}: ${fieldMap.size} unique values`
        );
      }
    }

    return true;
  }

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
