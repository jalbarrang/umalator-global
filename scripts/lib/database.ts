/**
 * Database connection utilities for Bun SQLite
 */

import { Database } from 'bun:sqlite';
import type { SQLQueryBindings } from 'bun:sqlite';

/**
 * Open a database connection in readonly mode
 * @param path Path to the database file
 * @returns Database instance
 */
export function openDatabase(path: string): Database {
  try {
    const db = new Database(path, { readonly: true });
    return db;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to open database at ${path}: ${error.message}`);
  }
}

/**
 * Close a database connection
 * @param db Database instance to close
 */
export function closeDatabase(db: Database): void {
  try {
    db.close(false);
  } catch (err) {
    const error = err as Error;
    console.error(`Error closing database: ${error.message}`);
  }
}

/**
 * Execute a query and return all results
 * @param db Database instance
 * @param sql SQL query string
 * @returns Array of result rows
 */
export function queryAll<T>(db: Database, sql: string): Array<T> {
  try {
    return db.query(sql).all() as Array<T>;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Query failed: ${error.message}\nSQL: ${sql}`);
  }
}

/**
 * Execute a prepared query with parameters
 * @param db Database instance
 * @param sql SQL query string
 * @param params Query parameters
 * @returns Array of result rows
 */
export function queryAllWithParams<
  T,
  TParams extends Array<SQLQueryBindings> = Array<SQLQueryBindings>,
>(db: Database, sql: string, ...params: TParams): Array<T> {
  try {
    const stmt = db.query(sql);
    return stmt.all(...params) as Array<T>;
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Query with params failed: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`,
    );
  }
}
