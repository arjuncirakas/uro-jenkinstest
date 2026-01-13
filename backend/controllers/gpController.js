import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordEmail } from '../services/emailService.js';
import { validationResult } from 'express-validator';
import { withDatabaseClient } from '../utils/dbHelper.js';
import { encrypt, decryptFields, createSearchableHash } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

// Helper function to generate secure password
const generateSecurePassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = lowercase + uppercase + numbers + special;

  // Ensure at least one of each required character type using crypto.randomInt
  let password = '';
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill the rest to meet minimum 14 characters requirement
  const remainingLength = 10 + crypto.randomInt(6); // 10-15 more chars = 14-19 total
  for (let i = 0; i < remainingLength; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Secure shuffle using Fisher-Yates algorithm with crypto.randomInt
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  return passwordArray.join('');
};

// Helper function to validate GP request
const validateGPRequest = (req, client) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      isValid: false,
      response: {
        status: 400,
        json: {
          success: false,
          error: 'Validation failed',
          details: errors.array()
        }
      }
    };
  }
  return { isValid: true };
};

// Helper function to check if user exists (using hash for encrypted search)
const checkUserExists = async (client, email, phone) => {
  const emailHash = email ? createSearchableHash(email) : null;
  if (emailHash) {
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [emailHash]
    );

    if (existingUser.rows.length > 0) {
      return {
        exists: true,
        response: {
          status: 409,
          json: {
            success: false,
            error: 'User with this email already exists'
          }
        }
      };
    }
  }

  if (phone) {
    const phoneHash = createSearchableHash(phone);
    const existingPhone = await client.query(
      'SELECT id FROM users WHERE phone_hash = $1',
      [phoneHash]
    );

    if (existingPhone.rows.length > 0) {
      return {
        exists: true,
        response: {
          status: 409,
          json: {
            success: false,
            error: 'Phone number is already in use'
          }
        }
      };
    }
  }

  return { exists: false };
};

// Helper function to send password email with logging
const sendPasswordEmailWithLogging = async (email, firstName, tempPassword) => {
  let emailSent = false;
  let emailError = null;

  try {
    console.log(`📧 ========== Starting email send process ==========`);
    console.log(`📧 Recipient: ${email}`);
    console.log(`📧 GP Name: ${firstName}`);
    console.log(`📧 Password length: ${tempPassword.length} characters`);

    const emailResult = await sendPasswordEmail(email, firstName, tempPassword);
    emailSent = emailResult.success;

    if (emailResult.success) {
      console.log(`✅ ========== Email sent successfully ==========`);
      console.log(`✅ Message ID: ${emailResult.messageId}`);
      console.log(`✅ Accepted recipients:`, emailResult.accepted);
      console.log(`✅ SMTP Response:`, emailResult.response);
    } else {
      console.error(`❌ ========== Email send failed ==========`);
      console.error(`❌ Error:`, emailResult.error || emailResult.message);
      console.error(`❌ Accepted:`, emailResult.accepted);
      console.error(`❌ Rejected:`, emailResult.rejected);
      console.error(`❌ Response:`, emailResult.response);
      emailError = emailResult.error || emailResult.message;
    }
  } catch (error) {
    console.error('❌ ========== Exception during email send ==========');
    console.error('❌ Exception type:', error.constructor.name);
    console.error('❌ Exception message:', error.message);
    console.error('❌ Exception code:', error.code);
    console.error('❌ Exception command:', error.command);
    console.error('❌ Exception response:', error.response);
    console.error('❌ Exception responseCode:', error.responseCode);
    console.error('❌ Error stack:', error.stack);
    emailError = error.message || 'Unknown error';
  }

  return { emailSent, emailError };
};

// Get all GPs
export const getAllGPs = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      const { is_active = true } = req.query;

      // When fetching for dropdown, we want all active GPs (regardless of verification status)
      // This ensures newly created GPs appear immediately
      const query = `
        SELECT 
          id, email, first_name, last_name, phone, organization, role,
          is_active, is_verified, created_at, last_login_at
        FROM users 
        WHERE role = 'gp' AND is_active = $1
        ORDER BY first_name, last_name
      `;

      const result = await client.query(query, [is_active === 'true']);

      // Decrypt and transform to camelCase format for frontend consistency
      const gps = result.rows.map(gp => {
        const decryptedGP = decryptFields(gp, USER_ENCRYPTED_FIELDS);
        return {
          id: decryptedGP.id,
          email: decryptedGP.email, // Decrypted
          firstName: decryptedGP.first_name,
          lastName: decryptedGP.last_name,
          fullName: `${decryptedGP.first_name} ${decryptedGP.last_name}`,
          phone: decryptedGP.phone, // Decrypted
          organization: decryptedGP.organization,
          role: decryptedGP.role,
          isActive: decryptedGP.is_active,
          isVerified: decryptedGP.is_verified,
          createdAt: decryptedGP.created_at,
          lastLoginAt: decryptedGP.last_login_at
        };
      });

      console.log(`📋 Returning ${gps.length} active GPs`);

      res.json({
        success: true,
        data: gps,
        count: gps.length
      });
    } catch (error) {
      console.error('Error fetching GPs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GPs'
      });
    }
  });
};

// Get GP by ID
export const getGPById = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      const { id } = req.params;

      const result = await client.query(`
        SELECT 
          id, email, first_name, last_name, phone, organization, role,
          is_active, is_verified, created_at, last_login_at
        FROM users 
        WHERE id = $1 AND role = 'gp'
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'GP not found'
        });
      }

      // Decrypt user data before sending
      const decryptedGP = decryptFields(result.rows[0], USER_ENCRYPTED_FIELDS);

      res.json({
        success: true,
        data: decryptedGP
      });
    } catch (error) {
      console.error('Error fetching GP:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GP'
      });
    }
  });
};

// Create new GP
export const createGP = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      await client.query('BEGIN');

      // Validate request
      const validation = validateGPRequest(req, client);
      if (!validation.isValid) {
        await client.query('ROLLBACK');
        return res.status(validation.response.status).json(validation.response.json);
      }

      const { first_name, last_name, email, phone, organization } = req.body;

      // Check if user already exists
      const userCheck = await checkUserExists(client, email, phone);
      if (userCheck.exists) {
        await client.query('ROLLBACK');
        return res.status(userCheck.response.status).json(userCheck.response.json);
      }

      // Generate password and hash
      const tempPassword = generateSecurePassword();
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

      // Encrypt email and phone
      const encryptedEmail = email ? encrypt(email) : null;
      const encryptedPhone = phone ? encrypt(phone) : null;
      
      // Create searchable hashes
      const emailHash = email ? createSearchableHash(email) : null;
      const phoneHash = phone ? createSearchableHash(phone) : null;

      // Insert new GP with encrypted data and hashes
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified, email_hash, phone_hash) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
         RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
        [encryptedEmail, passwordHash, first_name, last_name, encryptedPhone, organization || null, 'gp', true, true, emailHash, phoneHash]
      );

      const newGP = result.rows[0];
      
      // Decrypt for response
      const decryptedGP = decryptFields(newGP, USER_ENCRYPTED_FIELDS);

      // Send password email
      const { emailSent, emailError } = await sendPasswordEmailWithLogging(email, first_name, tempPassword);

      await client.query('COMMIT');

      // Log the result
      if (emailSent) {
        console.log(`✅ GP created successfully: ${first_name} ${last_name} (ID: ${newGP.id}), email sent to ${email}`);
      } else {
        console.warn(`⚠️ GP created successfully: ${first_name} ${last_name} (ID: ${newGP.id}), but email failed: ${emailError || 'Unknown error'}`);
        console.warn(`⚠️ Temporary password for ${email}: ${tempPassword}`);
      }

      res.status(201).json({
        success: true,
        message: emailSent
          ? 'GP created successfully. Login credentials have been sent to the email address. Please check the inbox and spam folder.'
          : `GP created successfully but email sending failed: ${emailError || 'Unknown error'}. Please contact support.`,
        data: {
          userId: decryptedGP.id,
          email: decryptedGP.email, // Decrypted
          firstName: decryptedGP.first_name,
          lastName: decryptedGP.last_name,
          role: decryptedGP.role,
          emailSent,
          emailError: emailError || null,
          ...(emailSent ? {} : { tempPassword: tempPassword })
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating GP:', error);
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'GP with this email or phone already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create GP'
        });
      }
    }
  });
};

// Update GP
export const updateGP = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      await client.query('BEGIN');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { first_name, last_name, email, phone, organization, is_active } = req.body;

    // Get existing GP
    const existingGPResult = await client.query(
      'SELECT email, phone, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'gp']
    );

    if (existingGPResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'GP not found'
      });
    }

    // Decrypt existing GP data to compare
    const existingGP = decryptFields(existingGPResult.rows[0], USER_ENCRYPTED_FIELDS);
    const oldEmail = existingGP.email;
    const oldPhone = existingGP.phone;
    const finalIsActive = is_active !== undefined ? is_active : existingGPResult.rows[0].is_active;

    // Check if email is being changed and if new email already exists (using hash)
    if (email && email !== oldEmail) {
      const emailHash = createSearchableHash(email);
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email_hash = $1',
        [emailHash]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
    }

    // Check if phone is being changed and if new phone already exists (using hash)
    if (phone && phone !== oldPhone) {
      const phoneHash = createSearchableHash(phone);
      const emailHashForCheck = email ? createSearchableHash(email) : (oldEmail ? createSearchableHash(oldEmail) : null);
      const existingPhone = emailHashForCheck
        ? await client.query(
            'SELECT id FROM users WHERE phone_hash = $1 AND email_hash != $2',
            [phoneHash, emailHashForCheck]
          )
        : await client.query(
            'SELECT id FROM users WHERE phone_hash = $1',
            [phoneHash]
          );

      if (existingPhone.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Phone number is already in use'
        });
      }
    }

    // Encrypt email and phone if they're being updated
    const encryptedEmail = email ? encrypt(email) : existingGPResult.rows[0].email;
    const encryptedPhone = phone ? encrypt(phone) : existingGPResult.rows[0].phone;
    
    // Update hashes if email/phone changed
    const emailHash = email && email !== oldEmail ? createSearchableHash(email) : null;
    const phoneHash = phone && phone !== oldPhone ? createSearchableHash(phone) : null;
    
    // Build update query dynamically
    const updateFields = [
      'first_name = $1',
      'last_name = $2',
      'email = $3',
      'phone = $4',
      'organization = $5',
      'is_active = $6',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    const updateValues = [first_name, last_name, encryptedEmail, encryptedPhone, organization || null, finalIsActive];
    
    // Add hash updates if needed
    if (emailHash) {
      updateFields.push('email_hash = $' + (updateValues.length + 1));
      updateValues.push(emailHash);
    }
    if (phoneHash) {
      updateFields.push('phone_hash = $' + (updateValues.length + 1));
      updateValues.push(phoneHash);
    }
    
    updateValues.push(id); // For WHERE clause

    // Update GP
    const result = await client.query(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length} AND role = 'gp'
      RETURNING id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at
    `, updateValues);

    await client.query('COMMIT');

    // Decrypt for response
    const decryptedGP = decryptFields(result.rows[0], USER_ENCRYPTED_FIELDS);

    res.json({
      success: true,
      message: 'GP updated successfully',
      data: decryptedGP
    });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating GP:', error);
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'GP with this email or phone already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update GP'
        });
      }
    }
  });
};

// Delete GP (soft delete)
export const deleteGP = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      const { id } = req.params;

      const result = await client.query(`
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND role = 'gp'
        RETURNING id, first_name, last_name
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'GP not found'
        });
      }

      res.json({
        success: true,
        message: 'GP deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting GP:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete GP'
      });
    }
  });
};

