import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { validationResult } from 'express-validator';

/**
 * Shared user controller utilities to reduce duplication across
 * nursesController, gpController, and doctorsController
 */

// User fields to select
const USER_SELECT_FIELDS = `
  id, email, first_name, last_name, phone, organization, role,
  is_active, is_verified, created_at, last_login_at
`;

/**
 * Get all users of a specific role
 */
export const getAllUsersByRole = async (roleName, roleFilter = true) => {
    const client = await pool.connect();
    try {
        const query = `
      SELECT ${USER_SELECT_FIELDS}
      FROM users 
      WHERE role = $1 AND is_active = $2
      ORDER BY first_name, last_name
    `;
        const result = await client.query(query, [roleName, roleFilter]);
        return { success: true, data: result.rows, count: result.rows.length };
    } catch (error) {
        console.error(`Error fetching ${roleName}s:`, error);
        return { success: false, error: `Failed to fetch ${roleName}s` };
    } finally {
        client.release();
    }
};

/**
 * Get user by ID with role check
 */
export const getUserByIdAndRole = async (id, roleName, entityName) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
      SELECT ${USER_SELECT_FIELDS}
      FROM users 
      WHERE id = $1 AND role = $2
    `, [id, roleName]);

        if (result.rows.length === 0) {
            return { success: false, notFound: true, error: `${entityName} not found` };
        }

        return { success: true, data: result.rows[0] };
    } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        return { success: false, error: `Failed to fetch ${entityName}` };
    } finally {
        client.release();
    }
};

/**
 * Check if email exists
 */
export const checkEmailExists = async (client, email) => {
    const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0;
};

/**
 * Check if phone exists
 */
export const checkPhoneExists = async (client, phone, excludeEmail = null) => {
    if (!phone) return false;
    const query = excludeEmail
        ? 'SELECT id FROM users WHERE phone = $1 AND email != $2'
        : 'SELECT id FROM users WHERE phone = $1';
    const params = excludeEmail ? [phone, excludeEmail] : [phone];
    const result = await client.query(query, params);
    return result.rows.length > 0;
};

/**
 * Generate secure password
 */
export const generateSecurePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;

    let password = '';
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];

    const remainingLength = 10 + crypto.randomInt(6);
    for (let i = 0; i < remainingLength; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }

    // Fisher-Yates shuffle
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    return passwordArray.join('');
};

/**
 * Hash password with bcrypt
 */
export const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Soft delete user by ID
 */
export const softDeleteUserByRole = async (id, roleName, entityName) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND role = $2
      RETURNING id, first_name, last_name
    `, [id, roleName]);

        if (result.rows.length === 0) {
            return { success: false, notFound: true, error: `${entityName} not found` };
        }

        return { success: true, message: `${entityName} deleted successfully` };
    } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        return { success: false, error: `Failed to delete ${entityName}` };
    } finally {
        client.release();
    }
};

/**
 * Validate request errors
 */
export const getValidationErrors = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return { hasErrors: true, details: errors.array() };
    }
    return { hasErrors: false };
};

/**
 * Handle unique constraint violation error
 */
export const handleUniqueConstraintError = (error, entityName) => {
    if (error && error.code === '23505') {
        return { status: 409, error: `${entityName} with this email or phone already exists` };
    }
    return { status: 500, error: `Failed to process ${entityName}` };
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (res, status, message) => {
    return res.status(status).json({ success: false, error: message });
};

/**
 * Create standardized success response
 */
export const createSuccessResponse = (res, data, status = 200) => {
    return res.status(status).json({ success: true, ...data });
};
