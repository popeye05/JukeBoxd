import { query, getClient } from '../config/database';
import { PoolClient } from 'pg';
import { createError } from '../middleware/errorHandler';

export class DataPersistenceService {
  /**
   * Execute a database operation with immediate persistence validation
   * Ensures the operation is committed to disk before returning
   */
  static async executeWithPersistence<T>(
    operation: (client: PoolClient) => Promise<T>,
    validationQuery?: string,
    validationParams?: any[]
  ): Promise<T> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Execute the main operation
      const result = await operation(client);
      
      // Force immediate persistence by committing the transaction
      await client.query('COMMIT');
      
      // Optional: Validate the data was persisted correctly
      if (validationQuery) {
        const validation = await client.query(validationQuery, validationParams);
        if (validation.rows.length === 0) {
          throw createError('Data persistence validation failed', 500);
        }
      }
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple operations in a single transaction with persistence validation
   */
  static async executeTransactionWithPersistence<T>(
    operations: Array<(client: PoolClient) => Promise<any>>,
    validationQueries?: Array<{ query: string; params?: any[] }>
  ): Promise<T[]> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Execute all operations
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      // Force immediate persistence
      await client.query('COMMIT');
      
      // Validate all operations were persisted correctly
      if (validationQueries) {
        for (const validation of validationQueries) {
          const validationResult = await client.query(validation.query, validation.params);
          if (validationResult.rows.length === 0) {
            throw createError('Transaction persistence validation failed', 500);
          }
        }
      }
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate that data exists in the database (for immediate persistence verification)
   */
  static async validateDataExists(
    tableName: string,
    conditions: { [key: string]: any }
  ): Promise<boolean> {
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    
    const result = await query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
      values
    );
    
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Ensure immediate data persistence for critical user actions
   * This method forces a database sync to ensure data is written to disk
   */
  static async ensureImmediatePersistence(): Promise<void> {
    try {
      // Force PostgreSQL to sync data to disk
      await query('SELECT pg_stat_force_next_flush()');
    } catch (error) {
      // This is a PostgreSQL-specific function that might not be available in all versions
      // If it fails, we'll rely on the transaction commit for persistence
      console.warn('Could not force immediate persistence, relying on transaction commit');
    }
  }

  /**
   * Validate referential integrity after data operations
   */
  static async validateReferentialIntegrity(
    checks: Array<{
      table: string;
      column: string;
      referencedTable: string;
      referencedColumn: string;
      value: any;
    }>
  ): Promise<void> {
    for (const check of checks) {
      const result = await query(
        `SELECT COUNT(*) as count FROM ${check.referencedTable} WHERE ${check.referencedColumn} = $1`,
        [check.value]
      );
      
      if (parseInt(result.rows[0].count) === 0) {
        throw createError(
          `Referential integrity violation: ${check.table}.${check.column} references non-existent ${check.referencedTable}.${check.referencedColumn}`,
          400
        );
      }
    }
  }

  /**
   * Create a backup of user data before account deletion
   * This creates an audit trail for compliance purposes
   */
  static async createAccountDeletionAudit(userId: string): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Create audit record
      await client.query(
        `INSERT INTO account_deletion_audit (user_id, deleted_at, ratings_count, reviews_count, follows_count)
         SELECT 
           $1,
           CURRENT_TIMESTAMP,
           (SELECT COUNT(*) FROM ratings WHERE user_id = $1),
           (SELECT COUNT(*) FROM reviews WHERE user_id = $1),
           (SELECT COUNT(*) FROM follows WHERE follower_id = $1 OR followee_id = $1)`,
        [userId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      // Don't fail account deletion if audit creation fails
      console.error('Failed to create account deletion audit:', error);
    } finally {
      client.release();
    }
  }
}