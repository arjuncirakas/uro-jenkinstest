import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';

// Create a new user (superadmin only)
export const createUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, firstName, lastName, phone, organization, role } = req.body;

    // Validate role
    const allowedRoles = ['urologist', 'gp', 'urology_nurse'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse'
      });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if phone number is already in use (if provided)
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );
      
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Phone number is already in use'
        });
      }
    }

    // Generate a temporary password (will be changed on first login)
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    // Insert new user (not verified yet, will be activated after password setup)
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, firstName, lastName, phone, organization, role, false, false]
    );

    const newUser = result.rows[0];

    // Generate password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store password setup token
    await client.query(
      'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [newUser.id, email, setupToken, expiresAt]
    );

    // Send password setup email
    const emailResult = await sendPasswordSetupEmail(email, firstName, setupToken);

    res.status(201).json({
      success: true,
      message: emailResult.success 
        ? 'User created successfully. Password setup email sent.'
        : 'User created successfully but email sending failed. Please contact support.',
      data: {
        userId: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        emailSent: emailResult.success
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all users (superadmin only)
export const getAllUsers = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, first_name, last_name, phone, organization, role, 
             is_active, is_verified, created_at, last_login_at
      FROM users 
      WHERE role != 'superadmin'
    `;
    const queryParams = [];
    let paramCount = 0;

    // Add role filter
    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      queryParams.push(role);
    }

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await client.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users WHERE role != \'superadmin\'';
    const countParams = [];
    let countParamCount = 0;

    if (role) {
      countParamCount++;
      countQuery += ` AND role = $${countParamCount}`;
      countParams.push(role);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get user by ID (superadmin only)
export const getUserById = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    const result = await client.query(
      `SELECT id, email, first_name, last_name, phone, organization, role, 
              is_active, is_verified, created_at, last_login_at
       FROM users 
       WHERE id = $1 AND role != 'superadmin'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Update user (superadmin only)
export const updateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, organization, role, isActive } = req.body;

    // Validate role if provided
    if (role) {
      const allowedRoles = ['urologist', 'gp', 'urology_nurse'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse'
        });
      }
    }

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE id = $1 AND role != \'superadmin\'',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if phone number is already in use by another user
    if (phone) {
      const existingPhone = await client.query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, id]
      );
      
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Phone number is already in use by another user'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (firstName !== undefined) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      updateValues.push(firstName);
    }

    if (lastName !== undefined) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      updateValues.push(lastName);
    }

    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(phone);
    }

    if (organization !== undefined) {
      paramCount++;
      updateFields.push(`organization = $${paramCount}`);
      updateValues.push(organization);
    }

    if (role !== undefined) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, updateValues);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete user (superadmin only)
export const deleteUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1 AND role != \'superadmin\'',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = existingUser.rows[0];
    console.log(`🗑️  Deleting user: ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);

    // Check how many patients this user created (for logging purposes)
    const patientCount = await client.query(
      'SELECT COUNT(*) as count FROM patients WHERE created_by = $1',
      [id]
    );
    
    if (patientCount.rows[0].count > 0) {
      console.log(`📊 User has created ${patientCount.rows[0].count} patient(s). These records will be preserved.`);
    }

    // Delete user (foreign keys with SET NULL will preserve patient records)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    console.log(`✅ User deleted successfully. Patient records preserved.`);

    res.json({
      success: true,
      message: 'User deleted successfully. Patient records have been preserved.'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    
    // Check for foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user due to existing references. Please run the database migration script first: npm run fix-user-constraints'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Setup password for new user
export const setupPassword = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token, password } = req.body;

    // Validate password
    if (!password || password.length < 14) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 14 characters long'
      });
    }

    // Find valid token
    const tokenResult = await client.query(
      `SELECT pst.*, u.id, u.email, u.first_name, u.last_name, u.role
       FROM password_setup_tokens pst
       JOIN users u ON pst.user_id = u.id
       WHERE pst.token = $1 AND pst.expires_at > NOW() AND pst.is_used = false`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const tokenData = tokenResult.rows[0];
    const userId = tokenData.user_id;

    // Check if new password matches any of the last 5 passwords
    const passwordHistoryResult = await client.query(
      `SELECT password_hash FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    // Check against last 5 passwords
    for (const historyEntry of passwordHistoryResult.rows) {
      const isMatch = await bcrypt.compare(password, historyEntry.password_hash);
      if (isMatch) {
        return res.status(400).json({
          success: false,
          message: 'You cannot reuse any of your last 5 passwords. Please choose a different password.'
        });
      }
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password and activate account
    await client.query(
      'UPDATE users SET password_hash = $1, is_active = true, is_verified = true, email_verified_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Add to password history
    await client.query(
      'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
      [userId, passwordHash]
    );

    // Keep only last 5 passwords in history
    await client.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5
       )`,
      [userId]
    );

    // Mark token as used
    await client.query(
      'UPDATE password_setup_tokens SET is_used = true WHERE id = $1',
      [tokenData.id]
    );

    res.json({
      success: true,
      message: 'Password setup completed successfully. You can now login.',
      data: {
        userId: tokenData.user_id,
        email: tokenData.email,
        firstName: tokenData.first_name,
        lastName: tokenData.last_name,
        role: tokenData.role
      }
    });

  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Resend password setup email
export const resendPasswordSetupEmail = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Get user details
    const userResult = await client.query(
      'SELECT id, email, first_name FROM users WHERE id = $1 AND role != \'superadmin\'',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Generate new password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store new password setup token
    await client.query(
      'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.email, setupToken, expiresAt]
    );

    // Send password setup email
    const emailResult = await sendPasswordSetupEmail(user.email, user.first_name, setupToken);

    res.json({
      success: true,
      message: emailResult.success 
        ? 'Password setup email resent successfully'
        : 'Password setup email resent but email sending failed. Please contact support.',
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('Resend password setup email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get total users count
    const totalUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role != \'superadmin\''
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get active users count
    const activeUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role != \'superadmin\' AND is_active = true AND is_verified = true'
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // Get pending users count
    const pendingUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role != \'superadmin\' AND is_verified = false'
    );
    const pendingUsers = parseInt(pendingUsersResult.rows[0].count);

    // Get recent users (last 5)
    const recentUsersResult = await client.query(
      `SELECT id, first_name, last_name, role, is_active, is_verified, created_at
       FROM users 
       WHERE role != 'superadmin'
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    const recentUsers = recentUsersResult.rows.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      status: user.is_verified ? (user.is_active ? 'active' : 'inactive') : 'pending',
      createdAt: user.created_at
    }));

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingUsers,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};
