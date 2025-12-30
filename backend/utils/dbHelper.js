/**
 * Database helper utilities to reduce code duplication
 * Provides reusable functions for common database operations
 */
import pool from '../config/database.js';

/**
 * Executes a database operation with automatic connection management
 * Handles connection acquisition, error handling, and cleanup
 * 
 * @param {Function} operation - Async function that receives the database client
 * @returns {Promise} Result of the operation
 */
export const withDatabaseClient = async (operation) => {
  const client = await pool.connect();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
};

