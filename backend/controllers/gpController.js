import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordSetupEmail } from '../services/emailService.js';
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

// Helper function to send password setup email with logging
const sendPasswordSetupEmailWithLogging = async (email, firstName, setupToken) => {
  let emailSent = false;
  let emailError = null;

  try {
    console.log(`📧 ========== Starting password setup email send process ==========`);
    console.log(`📧 Recipient: ${email}`);
    console.log(`📧 GP Name: ${firstName}`);
    console.log(`📧 Setup token: ${setupToken.substring(0, 8)}...`);

    const emailResult = await sendPasswordSetupEmail(email, firstName, setupToken);
    emailSent = emailResult.success;

    if (emailResult.success) {
      console.log(`✅ ========== Password setup email sent successfully ==========`);
      console.log(`✅ Message ID: ${emailResult.messageId}`);
    } else {
      console.error(`❌ ========== Password setup email send failed ==========`);
      console.error(`❌ Error:`, emailResult.error || emailResult.message);
      emailError = emailResult.error || emailResult.message;
    }
  } catch (error) {
    console.error('❌ ========== Exception during password setup email send ==========');
    console.error('❌ Exception type:', error.constructor.name);
    console.error('❌ Exception message:', error.message);
    console.error('❌ Exception code:', error.code);
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
  // Track if response has been sent to prevent double responses
  let responseSent = false;
  
  const sendResponse = (status, json) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(json);
    }
  };

  // Log incoming request for debugging
  console.log('📝 [createGP] Received request:', {
    body: { ...req.body, email: req.body?.email ? `${req.body.email.substring(0, 3)}***` : 'missing' },
    user: req.user ? { id: req.user.id, role: req.user.role } : 'not authenticated'
  });

  try {
    await withDatabaseClient(async (client) => {
      try {
        await client.query('BEGIN');

        // Validate request
        const validation = validateGPRequest(req, client);
        if (!validation.isValid) {
          await client.query('ROLLBACK');
          return sendResponse(validation.response.status, validation.response.json);
        }

        const { first_name, last_name, email, phone, organization } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !phone) {
          await client.query('ROLLBACK');
          return sendResponse(400, {
            success: false,
            error: 'Missing required fields: first_name, last_name, email, and phone are required'
          });
        }

        // Check if user already exists
        const userCheck = await checkUserExists(client, email, phone);
        if (userCheck.exists) {
          await client.query('ROLLBACK');
          return sendResponse(userCheck.response.status, userCheck.response.json);
        }

        // Generate a temporary password hash (will be changed on first login via password setup)
        let tempPassword;
        let passwordHash;
        try {
          tempPassword = crypto.randomBytes(12).toString('hex');
          const saltRounds = 12;
          passwordHash = await bcrypt.hash(tempPassword, saltRounds);
        } catch (hashError) {
          await client.query('ROLLBACK');
          console.error('❌ Error generating password hash:', hashError);
          return sendResponse(500, {
            success: false,
            error: 'Failed to generate password'
          });
        }

        // Encrypt email and phone
        let encryptedEmail, encryptedPhone, emailHash, phoneHash;
        try {
          encryptedEmail = email ? encrypt(email) : null;
          encryptedPhone = phone ? encrypt(phone) : null;
          
          // Create searchable hashes
          emailHash = email ? createSearchableHash(email) : null;
          phoneHash = phone ? createSearchableHash(phone) : null;
        } catch (encryptError) {
          await client.query('ROLLBACK');
          console.error('❌ Error encrypting data:', encryptError);
          return sendResponse(500, {
            success: false,
            error: 'Failed to encrypt user data'
          });
        }

        // Insert new GP with encrypted data and hashes (not verified yet, will be activated after password setup)
        let result;
        try {
          result = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified, email_hash, phone_hash) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
            [encryptedEmail, passwordHash, first_name, last_name, encryptedPhone, organization || null, 'gp', true, false, emailHash, phoneHash]
          );
        } catch (dbError) {
          await client.query('ROLLBACK');
          console.error('❌ Database error inserting GP:', dbError);
          console.error('❌ Database error code:', dbError.code);
          console.error('❌ Database error detail:', dbError.detail);
          
          if (dbError.code === '23505') {
            return sendResponse(409, {
              success: false,
              error: 'GP with this email or phone already exists'
            });
          }
          
          return sendResponse(500, {
            success: false,
            error: 'Failed to create GP in database',
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          });
        }

        if (!result || !result.rows || result.rows.length === 0) {
          await client.query('ROLLBACK');
          console.error('❌ No rows returned from INSERT query');
          return sendResponse(500, {
            success: false,
            error: 'Failed to create GP - no data returned'
          });
        }

        const newGP = result.rows[0];
        
        // Decrypt for response
        let decryptedGP;
        try {
          decryptedGP = decryptFields(newGP, USER_ENCRYPTED_FIELDS);
        } catch (decryptError) {
          console.error('❌ Error decrypting GP data:', decryptError);
          // Continue anyway - use encrypted data if decryption fails
          decryptedGP = newGP;
        }

        // Generate password setup token
        const setupToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store password setup token
        await client.query(
          'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
          [newGP.id, email, setupToken, expiresAt]
        );

        // Send password setup email - wrap in try-catch to prevent email errors from failing the entire operation
        let emailSent = false;
        let emailError = null;
        try {
          const emailResult = await sendPasswordSetupEmailWithLogging(email, first_name, setupToken);
          emailSent = emailResult.emailSent;
          emailError = emailResult.emailError;
        } catch (emailErr) {
          console.error('❌ Exception during email sending in createGP:', emailErr);
          emailError = emailErr.message || 'Unknown email error';
          // Don't throw - allow GP creation to succeed even if email fails
        }

        await client.query('COMMIT');

        // Log the result
        if (emailSent) {
          console.log(`✅ GP created successfully: ${first_name} ${last_name} (ID: ${newGP.id}), password setup email sent to ${email}`);
        } else {
          console.warn(`⚠️ GP created successfully: ${first_name} ${last_name} (ID: ${newGP.id}), but email failed: ${emailError || 'Unknown error'}`);
        }

        sendResponse(201, {
          success: true,
          message: emailSent
            ? 'GP created successfully. Password setup email sent.'
            : 'GP created successfully but email sending failed. Please contact support.',
          data: {
            userId: decryptedGP.id,
            email: decryptedGP.email || email, // Use decrypted or fallback to original
            firstName: decryptedGP.first_name || first_name,
            lastName: decryptedGP.last_name || last_name,
            role: decryptedGP.role || 'gp',
            emailSent,
            emailError: emailError || null
          }
        });
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('❌ Error during rollback:', rollbackError);
        }
        
        console.error('❌ Error creating GP (inner catch):', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          stack: error.stack
        });
        
        if (error.code === '23505') {
          sendResponse(409, {
            success: false,
            error: 'GP with this email or phone already exists'
          });
        } else {
          sendResponse(500, {
            success: false,
            error: 'Failed to create GP',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      }
    });
  } catch (error) {
    // Handle database connection errors or other errors from withDatabaseClient
    console.error('❌ Error creating GP (outer catch - database connection or other):', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    sendResponse(500, {
      success: false,
      error: 'Failed to create GP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to validate update request
const validateGPUpdate = (errors) => {
  if (!errors.isEmpty()) {
    return {
      isValid: false,
      error: {
        status: 400,
        message: 'Validation failed',
        details: errors.array()
      }
    };
  }
  return { isValid: true };
};

// Helper function to check email uniqueness
const checkEmailUniqueness = async (client, email, oldEmail) => {
  if (!email || email === oldEmail) {
    return { isUnique: true };
  }
  const emailHash = createSearchableHash(email);
  const existingUser = await client.query(
    'SELECT id FROM users WHERE email_hash = $1',
    [emailHash]
  );
  if (existingUser.rows.length > 0) {
    return {
      isUnique: false,
      error: { status: 409, message: 'User with this email already exists' }
    };
  }
  return { isUnique: true };
};

// Helper function to check phone uniqueness
const checkPhoneUniqueness = async (client, phone, oldPhone, email, oldEmail) => {
  if (!phone || phone === oldPhone) {
    return { isUnique: true };
  }
  const phoneHash = createSearchableHash(phone);
  let emailHashForCheck = null;
  if (email) {
    emailHashForCheck = createSearchableHash(email);
  } else if (oldEmail) {
    emailHashForCheck = createSearchableHash(oldEmail);
  }
  const query = emailHashForCheck
    ? 'SELECT id FROM users WHERE phone_hash = $1 AND email_hash != $2'
    : 'SELECT id FROM users WHERE phone_hash = $1';
  const params = emailHashForCheck ? [phoneHash, emailHashForCheck] : [phoneHash];
  const existingPhone = await client.query(query, params);
  if (existingPhone.rows.length > 0) {
    return {
      isUnique: false,
      error: { status: 409, message: 'Phone number is already in use' }
    };
  }
  return { isUnique: true };
};

// Helper function to prepare encrypted data and hashes
const prepareEncryptedData = (email, oldEmail, phone, oldPhone, existingEmail, existingPhone) => {
  const encryptedEmail = email ? encrypt(email) : existingEmail;
  const encryptedPhone = phone ? encrypt(phone) : existingPhone;
  const emailHash = email && email !== oldEmail ? createSearchableHash(email) : null;
  const phoneHash = phone && phone !== oldPhone ? createSearchableHash(phone) : null;
  return { encryptedEmail, encryptedPhone, emailHash, phoneHash };
};

// Helper function to build update query
const buildUpdateQuery = (encryptedEmail, encryptedPhone, organization, finalIsActive, emailHash, phoneHash) => {
  const updateFields = [
    'first_name = $1',
    'last_name = $2',
    'email = $3',
    'phone = $4',
    'organization = $5',
    'is_active = $6',
    'updated_at = CURRENT_TIMESTAMP'
  ];
  const updateValues = [null, null, encryptedEmail, encryptedPhone, organization || null, finalIsActive];
  
  if (emailHash) {
    updateFields.push(`email_hash = $${updateValues.length + 1}`);
    updateValues.push(emailHash);
  }
  if (phoneHash) {
    updateFields.push(`phone_hash = $${updateValues.length + 1}`);
    updateValues.push(phoneHash);
  }
  
  return { updateFields, updateValues };
};

// Update GP
export const updateGP = async (req, res) => {
  await withDatabaseClient(async (client) => {
    try {
      await client.query('BEGIN');

      const errors = validationResult(req);
      const validation = validateGPUpdate(errors);
      if (!validation.isValid) {
        await client.query('ROLLBACK');
        return res.status(validation.error.status).json({
          success: false,
          error: validation.error.message,
          details: validation.error.details
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

      // Check email uniqueness
      const emailCheck = await checkEmailUniqueness(client, email, oldEmail);
      if (!emailCheck.isUnique) {
        await client.query('ROLLBACK');
        return res.status(emailCheck.error.status).json({
          success: false,
          error: emailCheck.error.message
        });
      }

      // Check phone uniqueness
      const phoneCheck = await checkPhoneUniqueness(client, phone, oldPhone, email, oldEmail);
      if (!phoneCheck.isUnique) {
        await client.query('ROLLBACK');
        return res.status(phoneCheck.error.status).json({
          success: false,
          error: phoneCheck.error.message
        });
      }

      // Prepare encrypted data
      const { encryptedEmail, encryptedPhone, emailHash, phoneHash } = prepareEncryptedData(
        email, oldEmail, phone, oldPhone,
        existingGPResult.rows[0].email, existingGPResult.rows[0].phone
      );

      // Build update query
      const { updateFields, updateValues } = buildUpdateQuery(
        encryptedEmail, encryptedPhone, organization, finalIsActive, emailHash, phoneHash
      );
      updateValues[0] = first_name;
      updateValues[1] = last_name;
      updateValues.push(id);

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

