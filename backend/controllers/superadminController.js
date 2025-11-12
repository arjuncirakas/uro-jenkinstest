import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';

// Map role to category
const getCategoryFromRole = (role) => {
  const roleToCategoryMap = {
    'doctor': 'doctor',
    'urologist': 'doctor',
    'urology_nurse': 'nurse',
    'gp': 'gp'
  };
  return roleToCategoryMap[role] || role;
};

// Create a new user (superadmin only)
export const createUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    const { email, firstName, lastName, phone, organization, role, department_id } = req.body;

    // Validate role
    const allowedRoles = ['urologist', 'gp', 'urology_nurse', 'doctor'];
    if (!allowedRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse, doctor'
      });
    }

    // Validate department_id is provided when role is doctor
    if (role === 'doctor' && !department_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Department is required when role is doctor'
      });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
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
        await client.query('ROLLBACK');
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

    // If role is doctor, create doctor record first
    let doctorId = null;
    let finalRole = role; // Default to the role from request
    
    if (role === 'doctor' && department_id) {
      // Validate department exists
      const deptResult = await client.query('SELECT id, name FROM departments WHERE id = $1 AND is_active = true', [department_id]);
      if (deptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      const specialization = deptResult.rows[0].name;
      const departmentName = deptResult.rows[0].name;

      // If department is urology, change role from 'doctor' to 'urologist'
      if (departmentName && departmentName.toLowerCase().includes('urology')) {
        finalRole = 'urologist';
        console.log(`[createUser] Department is urology, changing role from 'doctor' to 'urologist'`);
      }

      // Check if doctor already exists with this email
      const existingDoctor = await client.query(
        'SELECT id FROM doctors WHERE email = $1',
        [email]
      );

      if (existingDoctor.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Doctor with this email already exists'
        });
      }

      // Insert into doctors table
      const doctorResult = await client.query(`
        INSERT INTO doctors (first_name, last_name, email, phone, department_id, specialization)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [firstName, lastName, email, phone, department_id, specialization]);

      doctorId = doctorResult.rows[0].id;
    }

    // Insert new user (not verified yet, will be activated after password setup)
    // Use finalRole which may have been changed from 'doctor' to 'urologist' if department is urology
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, organization, role, is_active, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name, last_name, phone, organization, role, created_at`,
      [email, passwordHash, firstName, lastName, phone, organization, finalRole, false, false]
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

    await client.query('COMMIT'); // Commit transaction

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
        category: getCategoryFromRole(newUser.role),
        emailSent: emailResult.success,
        doctorId: doctorId || null
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Map category to roles
const getRolesFromCategory = (category) => {
  const categoryToRolesMap = {
    'doctor': ['doctor', 'urologist'],
    'nurse': ['urology_nurse'],
    'gp': ['gp']
  };
  return categoryToRolesMap[category] || null;
};

// Get all users (superadmin only) - includes users and doctors
export const getAllUsers = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Extract and parse query parameters - CRITICAL: Handle status correctly
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Accept category instead of role
    const category = req.query.category ? String(req.query.category).trim() : null;
    // Keep role for backward compatibility, but prefer category
    const role = req.query.role ? String(req.query.role).trim() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const department_id = req.query.department_id ? String(req.query.department_id).trim() : null;
    
    // Handle status parameter - it must be explicitly checked
    let status = null;
    if (req.query.hasOwnProperty('status') && req.query.status !== undefined && req.query.status !== null) {
      const statusValue = String(req.query.status).trim();
      if (statusValue !== '' && statusValue.toLowerCase() !== 'all') {
        status = statusValue.toLowerCase();
      }
    }
    
    const offset = (page - 1) * limit;

    // Build query parameters
    const queryParams = [];
    let paramIndex = 1;
    let searchParamIndex = null;
    let searchPattern = null;

    // Build WHERE conditions for users table
    let userWhereConditions = ["role != 'superadmin'"];

    // Add category/role filter - map category to roles
    let effectiveCategory = category || (role ? getCategoryFromRole(role) : null);
    let rolesToFilter = null;
    
    if (effectiveCategory && effectiveCategory !== '') {
      rolesToFilter = getRolesFromCategory(effectiveCategory);
      if (rolesToFilter && rolesToFilter.length > 0) {
        // Use IN clause for multiple roles
        const rolePlaceholders = rolesToFilter.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        userWhereConditions.push(`role IN (${rolePlaceholders})`);
        queryParams.push(...rolesToFilter);
        paramIndex += rolesToFilter.length;
      }
    } else if (role && role !== '') {
      // Fallback to role if category not provided (backward compatibility)
      userWhereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    // Add search filter
    if (search && search !== '') {
      const searchClean = search.trim().replace(/\s+/g, '');
      searchPattern = `${searchClean}%`;
      searchParamIndex = paramIndex;
      
      const searchCondition = `(
        CONCAT(first_name, last_name) ILIKE $${paramIndex} OR 
        CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex} OR 
        first_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex}
      )`;
      userWhereConditions.push(searchCondition);
      queryParams.push(searchPattern);
      paramIndex++;
    }

    // Add status filter
    if (status) {
      if (status === 'pending') {
        userWhereConditions.push(`is_verified = false`);
      } else if (status === 'active') {
        userWhereConditions.push(`is_verified = true AND is_active = true`);
      } else if (status === 'inactive') {
        userWhereConditions.push(`is_verified = true AND is_active = false`);
      }
    }
    
    // Filter users with category 'doctor' by department_id if provided
    if (effectiveCategory === 'doctor' && department_id && department_id !== '') {
      const deptParamIndex = paramIndex;
      queryParams.push(parseInt(department_id, 10));
      paramIndex++;
      // For users with category 'doctor', filter by department
      // Only include doctors that have a matching department_id in the doctors table
      userWhereConditions.push(`EXISTS (
        SELECT 1 FROM doctors doc 
        WHERE doc.email = u.email 
        AND doc.department_id = $${deptParamIndex}
      )`);
    }

    // Build WHERE clauses AFTER all conditions are added
    const userWhereClause = userWhereConditions.join(' AND ');

    // Only query users table - exclude doctors from doctors table (those with ID > 1000000)
    // Doctors should only appear if they have a corresponding user account in the users table
    const unionQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.organization,
        u.role,
        u.is_active,
        u.is_verified,
        u.created_at,
        u.last_login_at,
        CASE 
          WHEN u.role = 'doctor' THEN (
            SELECT dept.name 
            FROM doctors doc 
            LEFT JOIN departments dept ON doc.department_id = dept.id
            WHERE doc.email = u.email
            LIMIT 1
          )
          ELSE NULL
        END as department_name
      FROM users u
      WHERE ${userWhereClause}
    `;

    // Build order by clause
    let orderByClause = 'ORDER BY created_at DESC';
    if (search && search !== '' && searchParamIndex !== null) {
      orderByClause = `ORDER BY 
        CASE 
          WHEN CONCAT(first_name, ' ', last_name) ILIKE $${searchParamIndex} THEN 1
          WHEN CONCAT(first_name, last_name) ILIKE $${searchParamIndex} THEN 2
          WHEN first_name ILIKE $${searchParamIndex} THEN 3
          WHEN email ILIKE $${searchParamIndex} THEN 4
          ELSE 5
        END,
        created_at DESC`;
    }

    // Final query with pagination
    const finalQuery = `
      SELECT * FROM (
        ${unionQuery}
      ) combined_users
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);

    const result = await client.query(finalQuery, queryParams);

    // Build count query
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        ${unionQuery}
      ) combined_users
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset

    const countResult = await client.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].total);

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

// Filter users with department support (superadmin only)
export const filterUsers = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { role, department_id, status, search } = req.query;
    
    console.log('🔍 Filter users - params:', { role, department_id, status, search });
    
    const params = [];
    let paramIndex = 1;
    
    // Determine if we need to filter by department
    const filterByDepartment = role && role.trim() === 'doctor' && department_id && department_id.trim() !== '';
    const deptId = filterByDepartment ? parseInt(department_id.trim(), 10) : null;
    
    // When filtering by department, start from doctors table (source of truth for departments)
    // Otherwise, start from users table
    let query;
    
    if (filterByDepartment && !isNaN(deptId)) {
      // Start from doctors table when filtering by department
      query = `
        SELECT DISTINCT
          COALESCE(u.id, d.id + 1000000) as id,
          COALESCE(u.email, d.email) as email,
          COALESCE(u.first_name, d.first_name) as first_name,
          COALESCE(u.last_name, d.last_name) as last_name,
          COALESCE(u.phone, d.phone) as phone,
          u.organization,
          COALESCE(u.role, 'doctor') as role,
          COALESCE(u.is_active, d.is_active) as is_active,
          COALESCE(u.is_verified, false) as is_verified,
          COALESCE(u.created_at, d.created_at) as created_at,
          u.last_login_at,
          dept.name as department_name,
          d.department_id
        FROM doctors d
        LEFT JOIN users u ON d.email = u.email AND u.role = 'doctor'
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.department_id = $${paramIndex}
      `;
      params.push(deptId);
      paramIndex++;
      console.log('🔍 Added department filter:', deptId);
    } else {
      // Start from users table when not filtering by department
      query = `
        SELECT DISTINCT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.organization,
          u.role,
          u.is_active,
          u.is_verified,
          u.created_at,
          u.last_login_at,
          dept.name as department_name,
          d.department_id
        FROM users u
        LEFT JOIN doctors d ON u.email = d.email
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE u.role != 'superadmin'
      `;
      
      // Add role filter
      if (role && role.trim() !== '') {
        query += ` AND u.role = $${paramIndex}`;
        params.push(role.trim());
        paramIndex++;
      }
    }
    
    // Add status filter
    if (status && status.trim() !== '' && status.trim() !== 'all') {
      const statusValue = status.trim().toLowerCase();
      if (statusValue === 'pending') {
        query += ` AND COALESCE(u.is_verified, false) = false`;
      } else if (statusValue === 'active') {
        query += ` AND COALESCE(u.is_verified, false) = true AND COALESCE(u.is_active, true) = true`;
      } else if (statusValue === 'inactive') {
        query += ` AND COALESCE(u.is_verified, false) = true AND COALESCE(u.is_active, true) = false`;
      }
    }
    
    // Add search filter
    if (search && search.trim() !== '') {
      const searchClean = search.trim().replace(/\s+/g, '');
      const searchPattern = `${searchClean}%`;
      query += ` AND (
        CONCAT(COALESCE(u.first_name, d.first_name), COALESCE(u.last_name, d.last_name)) ILIKE $${paramIndex} OR 
        CONCAT(COALESCE(u.first_name, d.first_name), ' ', COALESCE(u.last_name, d.last_name)) ILIKE $${paramIndex} OR 
        COALESCE(u.first_name, d.first_name) ILIKE $${paramIndex} OR 
        COALESCE(u.email, d.email) ILIKE $${paramIndex}
      )`;
      params.push(searchPattern);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    console.log('🔍 Final query:', query);
    console.log('🔍 Query params:', params);
    
    const result = await client.query(query, params);
    
    console.log('🔍 Query result count:', result.rows.length);
    
    res.json({
      success: true,
      data: {
        users: result.rows,
        count: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('Filter users error:', error);
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
      const allowedRoles = ['urologist', 'gp', 'urology_nurse', 'doctor'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse, doctor'
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

// Delete user (superadmin only) - handles both users and doctors
export const deleteUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    let { id } = req.params;
    id = parseInt(id);

    // Check if this is a doctor from doctors table (ID > 1000000)
    // Doctors from doctors table have IDs offset by 1000000 to avoid conflicts
    const isDoctorFromDoctorsTable = id > 1000000;
    
    if (isDoctorFromDoctorsTable) {
      // This is a doctor from the doctors table
      // Subtract the offset to get the real doctor ID
      const realDoctorId = id - 1000000;
      
      await client.query('BEGIN'); // Start transaction
      
      // Check if doctor exists
      const existingDoctor = await client.query(
        'SELECT id, email, first_name, last_name FROM doctors WHERE id = $1',
        [realDoctorId]
      );

      if (existingDoctor.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      const doctor = existingDoctor.rows[0];
      const doctorEmail = doctor.email;

      // Delete password setup tokens for the user (if exists)
      await client.query(
        'DELETE FROM password_setup_tokens WHERE email = $1',
        [doctorEmail]
      );

      // Delete the corresponding user record if it exists (but not superadmin)
      await client.query(
        'DELETE FROM users WHERE email = $1 AND role != \'superadmin\'',
        [doctorEmail]
      );

      // Delete the doctor record completely from the database
      await client.query(
        'DELETE FROM doctors WHERE id = $1',
        [realDoctorId]
      );

      await client.query('COMMIT'); // Commit transaction

      res.json({
        success: true,
        message: 'Doctor deleted successfully from the database'
      });
    } else {
      // This is a regular user from the users table
      await client.query('BEGIN'); // Start transaction
      
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1 AND role != \'superadmin\'',
        [id]
      );

      if (existingUser.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = existingUser.rows[0];
      const userEmail = user.email;

      // Check if there's a corresponding doctor record with the same email
      const doctorResult = await client.query(
        'SELECT id FROM doctors WHERE email = $1',
        [userEmail]
      );

      // If doctor record exists, delete it first
      if (doctorResult.rows.length > 0) {
        const doctorId = doctorResult.rows[0].id;
        
        // Delete password setup tokens for the user
        await client.query(
          'DELETE FROM password_setup_tokens WHERE email = $1',
          [userEmail]
        );
        
        // Delete the doctor record
        await client.query(
          'DELETE FROM doctors WHERE id = $1',
          [doctorId]
        );
      } else {
        // Delete password setup tokens for the user (if exists)
        await client.query(
          'DELETE FROM password_setup_tokens WHERE email = $1',
          [userEmail]
        );
      }

      // Check how many patients this user created (for logging purposes)
      const patientCount = await client.query(
        'SELECT COUNT(*) as count FROM patients WHERE created_by = $1',
        [id]
      );
      
      // Delete user (foreign keys with SET NULL will preserve patient records)
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      await client.query('COMMIT'); // Commit transaction

      res.json({
        success: true,
        message: 'User deleted successfully. Patient records have been preserved.'
      });
    }

  } catch (error) {
    // Rollback transaction if it was started
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
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
    // Start transaction
    await client.query('BEGIN');
    
    const { token, password } = req.body;

    // Validate input
    if (!token) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    if (!password || password.length < 14) {
      await client.query('ROLLBACK');
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
      await client.query('ROLLBACK');
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
        await client.query('ROLLBACK');
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

    // Commit transaction
    await client.query('COMMIT');

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
    // Rollback transaction on error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Setup password error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error. Please try again.'
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
