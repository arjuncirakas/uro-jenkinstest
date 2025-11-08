import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';
import { validationResult } from 'express-validator';

// Get all Nurses
export const getAllNurses = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { is_active = true } = req.query;
    
    const query = `
      SELECT 
        id, email, first_name, last_name, phone, organization, role,
        is_active, is_verified, created_at, last_login_at
      FROM users 
      WHERE role = 'urology_nurse' AND is_active = $1
      ORDER BY first_name, last_name
    `;
    
    const result = await client.query(query, [is_active === 'true']);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching nurses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nurses'
    });
  } finally {
    client.release();
  }
};

// Get Nurse by ID
export const getNurseById = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const result = await client.query(`
      SELECT 
        id, email, first_name, last_name, phone, organization, role,
        is_active, is_verified, created_at, last_login_at
      FROM users 
      WHERE id = $1 AND role = 'urology_nurse'
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nurse not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching nurse:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nurse'
    });
  } finally {
    client.release();
  }
};

// Create new Nurse
export const createNurse = async (req, res) => {
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
    
    // Insert new Nurse (not verified yet, will be activated after password setup)
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, first_name, last_name, phone, organization || null, 'urology_nurse', false, false]
    );
    
    const newNurse = result.rows[0];
    
    // Generate password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store password setup token
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
    
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Nurse created successfully. Password setup email sent.'
        : 'Nurse created successfully but email sending failed. Please contact support.',
      data: {
        userId: newNurse.id,
        email: newNurse.email,
        firstName: newNurse.first_name,
        lastName: newNurse.last_name,
        role: newNurse.role,
        emailSent
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating nurse:', error);
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Nurse with this email or phone already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create nurse'
      });
    }
  } finally {
    client.release();
  }
};

// Update Nurse
export const updateNurse = async (req, res) => {
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
    
    // Get existing Nurse
    const existingNurse = await client.query(
      'SELECT email, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'urology_nurse']
    );
    
    if (existingNurse.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Nurse not found'
      });
    }
    
    const oldEmail = existingNurse.rows[0].email;
    const finalIsActive = is_active !== undefined ? is_active : existingNurse.rows[0].is_active;
    
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
    
    // Update Nurse
    const result = await client.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, organization = $5, is_active = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND role = 'urology_nurse'
      RETURNING id, email, first_name, last_name, phone, organization, role, is_active, is_verified, created_at
    `, [first_name, last_name, email, phone, organization || null, finalIsActive, id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Nurse updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating nurse:', error);
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Nurse with this email or phone already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update nurse'
      });
    }
  } finally {
    client.release();
  }
};

// Delete Nurse (soft delete)
export const deleteNurse = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const result = await client.query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND role = 'urology_nurse'
      RETURNING id, first_name, last_name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nurse not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Nurse deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting nurse:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete nurse'
    });
  } finally {
    client.release();
  }
};

