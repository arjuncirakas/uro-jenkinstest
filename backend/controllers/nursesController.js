import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';
import {
  getAllUsersByRole,
  getUserByIdAndRole,
  checkEmailExists,
  checkPhoneExists,
  hashPassword,
  softDeleteUserByRole,
  getValidationErrors,
  handleUniqueConstraintError,
  createErrorResponse,
  createSuccessResponse
} from './userControllerHelper.js';
import crypto from 'crypto';
import { encrypt, decryptFields, createSearchableHash } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

const ROLE = 'urology_nurse';
const ENTITY_NAME = 'Nurse';

// Get all Nurses
export const getAllNurses = async (req, res) => {
  const { is_active = true } = req.query;
  // Handle both boolean and string "true"
  const isActiveBool = is_active === true || is_active === 'true';
  const result = await getAllUsersByRole(ROLE, isActiveBool);

  if (!result.success) {
    return createErrorResponse(res, 500, result.error);
  }

  return createSuccessResponse(res, { data: result.data, count: result.count });
};

// Get Nurse by ID
export const getNurseById = async (req, res) => {
  const { id } = req.params;
  const result = await getUserByIdAndRole(id, ROLE, ENTITY_NAME);

  if (!result.success) {
    return createErrorResponse(res, result.notFound ? 404 : 500, result.error);
  }

  return createSuccessResponse(res, { data: result.data });
};

// Create new Nurse
export const createNurse = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const validation = getValidationErrors(req);
    if (validation.hasErrors) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.details
      });
    }

    const { first_name, last_name, email, phone, organization } = req.body;

    // Check if user already exists
    if (await checkEmailExists(client, email)) {
      await client.query('ROLLBACK');
      return createErrorResponse(res, 409, 'User with this email already exists');
    }

    // Check if phone is in use
    if (await checkPhoneExists(client, phone)) {
      await client.query('ROLLBACK');
      return createErrorResponse(res, 409, 'Phone number is already in use');
    }

    // Generate temp password and hash it
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    // Encrypt email and phone
    const encryptedEmail = encrypt(email);
    const encryptedPhone = phone ? encrypt(phone) : null;
    const emailHash = createSearchableHash(email);
    const phoneHash = phone ? createSearchableHash(phone) : null;

    // Insert new Nurse with encrypted data
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified, email_hash, phone_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [encryptedEmail, passwordHash, first_name, last_name, encryptedPhone, organization || null, ROLE, false, false, emailHash, phoneHash]
    );

    const newNurse = result.rows[0];
    
    // Decrypt for response
    const decryptedNurse = decryptFields(newNurse, USER_ENCRYPTED_FIELDS);

    // Generate password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
      'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [newNurse.id, email, setupToken, expiresAt]
    );

    // Send password setup email
    let emailSent = false;
    try {
      const emailResult = await sendPasswordSetupEmail(email, first_name, setupToken);
      emailSent = emailResult.success;
    } catch (emailError) {
      console.error('Error sending password setup email:', emailError);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: emailSent
        ? `${ENTITY_NAME} created successfully. Password setup email sent.`
        : `${ENTITY_NAME} created successfully but email sending failed. Please contact support.`,
      data: {
        userId: decryptedNurse.id,
        email: decryptedNurse.email, // Decrypted
        firstName: decryptedNurse.first_name,
        lastName: decryptedNurse.last_name,
        role: decryptedNurse.role,
        emailSent
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error creating ${ENTITY_NAME.toLowerCase()}:`, error);
    const errorInfo = handleUniqueConstraintError(error, ENTITY_NAME);
    return createErrorResponse(res, errorInfo.status, errorInfo.error);
  } finally {
    client.release();
  }
};

// Update Nurse
export const updateNurse = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const validation = getValidationErrors(req);
    if (validation.hasErrors) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.details
      });
    }

    const { id } = req.params;
    const { first_name, last_name, email, phone, organization, is_active } = req.body;

    // Get existing nurse
    const existingNurseResult = await client.query(
      'SELECT email, phone, is_active FROM users WHERE id = $1 AND role = $2',
      [id, ROLE]
    );

    if (existingNurseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return createErrorResponse(res, 404, `${ENTITY_NAME} not found`);
    }

    // Decrypt to compare
    const existingNurse = decryptFields(existingNurseResult.rows[0], USER_ENCRYPTED_FIELDS);
    const oldEmail = existingNurse.email;
    const oldPhone = existingNurse.phone;
    const finalIsActive = is_active !== undefined ? is_active : existingNurseResult.rows[0].is_active;

    // Check email uniqueness
    if (email && email !== oldEmail && await checkEmailExists(client, email)) {
      await client.query('ROLLBACK');
      return createErrorResponse(res, 409, 'User with this email already exists');
    }

    // Check phone uniqueness (only if phone is being changed)
    if (phone && phone !== oldPhone && await checkPhoneExists(client, phone, email || oldEmail)) {
      await client.query('ROLLBACK');
      return createErrorResponse(res, 409, 'Phone number is already in use');
    }

    // Update nurse
    const result = await client.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, organization = $5, is_active = $6,
          email_hash = $7, phone_hash = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND role = $10
      RETURNING id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at
    `, [
      first_name, 
      last_name, 
      encrypt(email), 
      phone ? encrypt(phone) : null, 
      organization || null, 
      finalIsActive,
      createSearchableHash(email),
      phone ? createSearchableHash(phone) : null,
      id, 
      ROLE
    ]);

    await client.query('COMMIT');

    // Decrypt for response
    const decryptedNurse = decryptFields(result.rows[0], USER_ENCRYPTED_FIELDS);

    return createSuccessResponse(res, {
      message: `${ENTITY_NAME} updated successfully`,
      data: decryptedNurse
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error updating ${ENTITY_NAME.toLowerCase()}:`, error);
    const errorInfo = handleUniqueConstraintError(error, ENTITY_NAME);
    return createErrorResponse(res, errorInfo.status, errorInfo.error);
  } finally {
    client.release();
  }
};

// Delete Nurse (soft delete)
export const deleteNurse = async (req, res) => {
  const { id } = req.params;
  const result = await softDeleteUserByRole(id, ROLE, ENTITY_NAME);

  if (!result.success) {
    return createErrorResponse(res, result.notFound ? 404 : 500, result.error);
  }

  return createSuccessResponse(res, { message: result.message });
};
