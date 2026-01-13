import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { validationResult } from 'express-validator';
import { createSearchableHash, decryptFields } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

/**
 * Shared user controller utilities to reduce duplication across
 * nursesController, gpController, and doctorsController
 */

// User fields to select (email and phone will be decrypted in controllers)
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
        // Decrypt user data before returning
        const decryptedData = result.rows.map(user => decryptFields(user, USER_ENCRYPTED_FIELDS));
        return { success: true, data: decryptedData, count: decryptedData.length };
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

        // Decrypt user data before returning
        const decryptedUser = decryptFields(result.rows[0], USER_ENCRYPTED_FIELDS);
        return { success: true, data: decryptedUser };
    } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        return { success: false, error: `Failed to fetch ${entityName}` };
    } finally {
        client.release();
    }
};

/**
 * Check if email exists (using hash for encrypted search, fallback to direct email)
 */
export const checkEmailExists = async (client, email) => {
    if (!email) return false;
    const emailHash = createSearchableHash(email);
    
    // Try hash-based search first
    let result = await client.query('SELECT id FROM users WHERE email_hash = $1', [emailHash]);
    
    // Fallback to direct email search for backward compatibility
    if (result.rows.length === 0) {
        result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    }
    
    return result.rows.length > 0;
};

/**
 * Check if phone exists (using hash for encrypted search, fallback to direct phone)
 */
export const checkPhoneExists = async (client, phone, excludeEmail = null) => {
    if (!phone) return false;
    const phoneHash = createSearchableHash(phone);
    
    // Try hash-based search first
    let query, params;
    if (excludeEmail) {
        const emailHash = createSearchableHash(excludeEmail);
        query = 'SELECT id FROM users WHERE phone_hash = $1 AND email_hash != $2';
        params = [phoneHash, emailHash];
    } else {
        query = 'SELECT id FROM users WHERE phone_hash = $1';
        params = [phoneHash];
    }
    
    let result = await client.query(query, params);
    
    // Fallback to direct phone search for backward compatibility
    if (result.rows.length === 0) {
        if (excludeEmail) {
            query = 'SELECT id FROM users WHERE phone = $1 AND email != $2';
            params = [phone, excludeEmail];
        } else {
            query = 'SELECT id FROM users WHERE phone = $1';
            params = [phone];
        }
        result = await client.query(query, params);
    }
    
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
