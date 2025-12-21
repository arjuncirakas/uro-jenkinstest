import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordEmail } from '../services/emailService.js';
import { validationResult } from 'express-validator';

// Get all GPs
export const getAllGPs = async (req, res) => {
  const client = await pool.connect();
  
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
    
    // Transform to camelCase format for frontend consistency
    const gps = result.rows.map(gp => ({
      id: gp.id,
      email: gp.email,
      firstName: gp.first_name,
      lastName: gp.last_name,
      fullName: `${gp.first_name} ${gp.last_name}`,
      phone: gp.phone,
      organization: gp.organization,
      role: gp.role,
      isActive: gp.is_active,
      isVerified: gp.is_verified,
      createdAt: gp.created_at,
      lastLoginAt: gp.last_login_at
    }));
    
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
  } finally {
    client.release();
  }
};

// Get GP by ID
export const getGPById = async (req, res) => {
  const client = await pool.connect();
  
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
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching GP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GP'
    });
  } finally {
    client.release();
  }
};

// Create new GP
export const createGP = async (req, res) => {
  const client = await pool.connect();
  
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
    
    const { first_name, last_name, email, phone, organization } = req.body;
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Check if phone number is already in use (if provided)
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );
      
      if (existingPhone.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Phone number is already in use'
        });
      }
    }
    
    // Generate a temporary password
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
    
    // Insert new GP (active and verified by default when created via Add GP modal)
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, first_name, last_name, phone, organization || null, 'gp', true, true]
    );
    
    const newGP = result.rows[0];
    
    // Send password email with auto-generated password
    let emailSent = false;
    let emailError = null;
    try {
      console.log(`📧 Attempting to send password email to ${email} for GP ${first_name} ${last_name}`);
      const emailResult = await sendPasswordEmail(email, first_name, tempPassword);
      emailSent = emailResult.success;
      
      if (emailResult.success) {
        console.log(`✅ Password email sent successfully to ${email}`);
      } else {
        console.error(`❌ Failed to send password email to ${email}:`, emailResult.error || emailResult.message);
        emailError = emailResult.error || emailResult.message;
      }
    } catch (emailError) {
      console.error('❌ Exception while sending password email:', emailError);
      console.error('❌ Error stack:', emailError.stack);
      emailError = emailError.message || 'Unknown error';
    }
    
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
        ? 'GP created successfully. Login credentials have been sent to the email address.'
        : `GP created successfully but email sending failed: ${emailError || 'Unknown error'}. Please contact support.`,
      data: {
        userId: newGP.id,
        email: newGP.email,
        firstName: newGP.first_name,
        lastName: newGP.last_name,
        role: newGP.role,
        emailSent,
        emailError: emailError || null
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
  } finally {
    client.release();
  }
};

// Update GP
export const updateGP = async (req, res) => {
  const client = await pool.connect();
  
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
    const existingGP = await client.query(
      'SELECT email, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'gp']
    );
    
    if (existingGP.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'GP not found'
      });
    }
    
    const oldEmail = existingGP.rows[0].email;
    const finalIsActive = is_active !== undefined ? is_active : existingGP.rows[0].is_active;
    
    // Check if email is being changed and if new email already exists
    if (email && email !== oldEmail) {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
    }
    
    // Check if phone is being changed and if new phone already exists
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM users WHERE phone = $1 AND email != $2',
        [phone, email || oldEmail]
      );
      
      if (existingPhone.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Phone number is already in use'
        });
      }
    }
    
    // Update GP
    const result = await client.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, organization = $5, is_active = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND role = 'gp'
      RETURNING id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at
    `, [first_name, last_name, email, phone, organization || null, finalIsActive, id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'GP updated successfully',
      data: result.rows[0]
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
  } finally {
    client.release();
  }
};

// Delete GP (soft delete)
export const deleteGP = async (req, res) => {
  const client = await pool.connect();
  
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
  } finally {
    client.release();
  }
};

