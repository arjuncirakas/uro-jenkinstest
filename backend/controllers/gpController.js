import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';
import { validationResult } from 'express-validator';

// Get all GPs
export const getAllGPs = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { is_active = true } = req.query;
    
    const query = `
      SELECT 
        id, email, first_name, last_name, phone, organization, role,
        is_active, is_verified, created_at, last_login_at
      FROM users 
      WHERE role = 'gp' AND is_active = $1
      ORDER BY first_name, last_name
    `;
    
    const result = await client.query(query, [is_active === 'true']);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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
    
    // Insert new GP (not verified yet, will be activated after password setup)
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, first_name, last_name, phone, organization || null, 'gp', false, false]
    );
    
    const newGP = result.rows[0];
    
    // Generate password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store password setup token
    await client.query(
      'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [newGP.id, email, setupToken, expiresAt]
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
    
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'GP created successfully. Password setup email sent.'
        : 'GP created successfully but email sending failed. Please contact support.',
      data: {
        userId: newGP.id,
        email: newGP.email,
        firstName: newGP.first_name,
        lastName: newGP.last_name,
        role: newGP.role,
        emailSent
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

