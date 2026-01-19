import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendPasswordSetupEmail } from '../services/emailService.js';
import { decryptFields } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

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
    const allowedRoles = ['urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin'];
    if (!allowedRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse, doctor, department_admin'
      });
    }

    // For urologist or doctor role, ensure Urology department exists and get its ID
    let urologyDepartmentId = null;
    if (role === 'urologist' || role === 'doctor') {
      // Check if Urology department exists
      const urologyDept = await client.query(`
        SELECT id, name, is_active
        FROM departments
        WHERE LOWER(TRIM(name)) = 'urology'
        LIMIT 1
      `);
      
      if (urologyDept.rows.length === 0) {
        // Create Urology department if it doesn't exist
        // Use ON CONFLICT to prevent race conditions if multiple requests try to create it simultaneously
        console.log('📋 [createUser] Urology department not found, creating it...');
        const createDept = await client.query(`
          INSERT INTO departments (name, description, is_active)
          VALUES ($1, $2, true)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `, ['Urology', 'Urology Department - Specialized care for urological conditions']);
        
        // Check if department was created or already existed (due to race condition)
        if (createDept.rows.length === 0) {
          // Department was created by another request, fetch it
          console.log('⚠️ [createUser] Urology department was created by another request, fetching it...');
          const existingDept = await client.query(`
            SELECT id, is_active
            FROM departments
            WHERE LOWER(TRIM(name)) = 'urology'
            LIMIT 1
          `);
          if (existingDept.rows.length > 0) {
            urologyDepartmentId = existingDept.rows[0].id;
            // Ensure it's active
            if (!existingDept.rows[0].is_active) {
              await client.query(`
                UPDATE departments
                SET is_active = true
                WHERE id = $1
              `, [urologyDepartmentId]);
              console.log('✅ [createUser] Urology department reactivated');
            }
            console.log('✅ [createUser] Found existing Urology department with ID:', urologyDepartmentId);
          }
        } else {
          urologyDepartmentId = createDept.rows[0].id;
          console.log('✅ [createUser] Urology department created with ID:', urologyDepartmentId);
        }
      } else {
        urologyDepartmentId = urologyDept.rows[0].id;
        // Ensure it's active
        if (!urologyDept.rows[0].is_active) {
          await client.query(`
            UPDATE departments
            SET is_active = true
            WHERE id = $1
          `, [urologyDepartmentId]);
          console.log('✅ [createUser] Urology department reactivated');
        }
        console.log('✅ [createUser] Found Urology department with ID:', urologyDepartmentId);
      }
    }
    
    // Validate department_id is provided when role is doctor
    // If not provided, use Urology department ID
    let finalDepartmentId = department_id;
    if (role === 'doctor' && !finalDepartmentId) {
      if (urologyDepartmentId) {
        finalDepartmentId = urologyDepartmentId;
        console.log('✅ [createUser] Auto-assigning doctor to Urology department:', finalDepartmentId);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Department is required when role is doctor'
        });
      }
    }
    
    // For urologist role, always use Urology department
    if (role === 'urologist') {
      finalDepartmentId = urologyDepartmentId;
      console.log('✅ [createUser] Assigning urologist to Urology department:', finalDepartmentId);
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

    // If role is doctor or urologist, create doctor record first
    let doctorId = null;
    let finalRole = role; // Default to the role from request
    
    // Use finalDepartmentId (which is set to Urology for urologist/doctor roles)
    if ((role === 'doctor' || role === 'urologist') && finalDepartmentId) {
      // Validate department exists
      const deptResult = await client.query('SELECT id, name FROM departments WHERE id = $1 AND is_active = true', [finalDepartmentId]);
      if (deptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      const specialization = deptResult.rows[0].name;
      const departmentName = deptResult.rows[0].name;

      // If role is 'doctor' and department is urology, change role to 'urologist'
      // If role is already 'urologist', keep it as 'urologist'
      if (role === 'doctor' && departmentName) {
        const deptNameLower = departmentName.toLowerCase().trim();
        // Check if department name is exactly "urology" or starts with "urology" followed by space or end
        if (deptNameLower === 'urology' || /^urology(\s|$)/.test(deptNameLower)) {
          finalRole = 'urologist';
          console.log(`[createUser] Department is urology, changing role from 'doctor' to 'urologist'`);
        }
      } else if (role === 'urologist') {
        // Ensure urologist role is maintained
        finalRole = 'urologist';
        console.log(`[createUser] Role is urologist, maintaining urologist role`);
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

      // Insert into doctors table - use finalDepartmentId (Urology for urologists)
      const doctorResult = await client.query(`
        INSERT INTO doctors (first_name, last_name, email, phone, department_id, specialization)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [firstName, lastName, email, phone, finalDepartmentId, specialization]);

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
          WHEN u.role = 'doctor' OR u.role = 'urologist' THEN (
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

    // Decrypt email and phone fields for all users
    const decryptedUsers = result.rows.map(user => {
      try {
        const decryptedUser = decryptFields(user, USER_ENCRYPTED_FIELDS);
        return {
          ...user,
          email: decryptedUser.email,
          phone: decryptedUser.phone
        };
      } catch (decryptError) {
        console.error('❌ Error decrypting user data:', decryptError);
        // Return original data if decryption fails
        return user;
      }
    });

    res.json({
      success: true,
      data: {
        users: decryptedUsers,
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
        LEFT JOIN users u ON d.email = u.email AND (u.role = 'doctor' OR u.role = 'urologist')
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
    
    // Decrypt email and phone fields for all users
    const decryptedUsers = result.rows.map(user => {
      try {
        const decryptedUser = decryptFields(user, USER_ENCRYPTED_FIELDS);
        return {
          ...user,
          email: decryptedUser.email,
          phone: decryptedUser.phone
        };
      } catch (decryptError) {
        console.error('❌ Error decrypting user data:', decryptError);
        // Return original data if decryption fails
        return user;
      }
    });
    
    res.json({
      success: true,
      data: {
        users: decryptedUsers,
        count: decryptedUsers.length
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

    // Decrypt email and phone fields
    let decryptedUser;
    try {
      decryptedUser = decryptFields(result.rows[0], USER_ENCRYPTED_FIELDS);
    } catch (decryptError) {
      console.error('❌ Error decrypting user data:', decryptError);
      // Return original data if decryption fails
      decryptedUser = result.rows[0];
    }

    res.json({
      success: true,
      data: {
        user: {
          ...result.rows[0],
          email: decryptedUser.email,
          phone: decryptedUser.phone
        }
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
      const allowedRoles = ['urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Allowed roles: urologist, gp, urology_nurse, doctor, department_admin'
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
  let transactionStarted = false;
  
  try {
    let { id } = req.params;
    id = parseInt(id);
    
    console.log(`🗑️  Attempting to delete user with ID: ${id}`);

    // Check if this is a doctor from doctors table (ID > 1000000)
    // Doctors from doctors table have IDs offset by 1000000 to avoid conflicts
    const isDoctorFromDoctorsTable = id > 1000000;
    
    if (isDoctorFromDoctorsTable) {
      // This is a doctor from the doctors table
      // Subtract the offset to get the real doctor ID
      const realDoctorId = id - 1000000;
      
      await client.query('BEGIN'); // Start transaction
      transactionStarted = true;
      
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

      // Get the user ID if a user record exists (for cleanup)
      const userRecord = await client.query(
        'SELECT id FROM users WHERE email = $1 AND role != \'superadmin\'',
        [doctorEmail]
      );
      
      const userId = userRecord.rows.length > 0 ? userRecord.rows[0].id : null;

      // Delete password setup tokens for the user (if exists)
      await client.query(
        'DELETE FROM password_setup_tokens WHERE email = $1',
        [doctorEmail]
      );

      // Clean up related records if user exists
      if (userId) {
        const cleanupQueries = [
          { query: 'DELETE FROM refresh_tokens WHERE user_id = $1', name: 'refresh_tokens' },
          { query: 'DELETE FROM active_sessions WHERE user_id = $1', name: 'active_sessions' },
          { query: 'DELETE FROM otp_verifications WHERE user_id = $1', name: 'otp_verifications' },
          { query: 'DELETE FROM password_reset_tokens WHERE user_id = $1', name: 'password_reset_tokens' },
          { query: 'DELETE FROM password_history WHERE user_id = $1', name: 'password_history' },
          { query: 'DELETE FROM notifications WHERE user_id = $1', name: 'notifications' },
          { query: 'DELETE FROM mdt_team_members WHERE user_id = $1', name: 'mdt_team_members' },
          { query: 'UPDATE patients SET created_by = NULL WHERE created_by = $1', name: 'patients.created_by' },
          { query: 'UPDATE patients SET referred_by_gp_id = NULL WHERE referred_by_gp_id = $1', name: 'patients.referred_by_gp_id' },
          { query: 'UPDATE patient_notes SET author_id = NULL WHERE author_id = $1', name: 'patient_notes.author_id' },
          { query: 'UPDATE investigation_results SET author_id = NULL WHERE author_id = $1', name: 'investigation_results.author_id' },
          { query: 'UPDATE appointments SET urologist_id = NULL WHERE urologist_id = $1', name: 'appointments.urologist_id' },
          { query: 'UPDATE appointments SET created_by = NULL WHERE created_by = $1', name: 'appointments.created_by' },
          { query: 'UPDATE investigation_bookings SET created_by = NULL WHERE created_by = $1', name: 'investigation_bookings.created_by' },
          { query: 'UPDATE mdt_meetings SET created_by = NULL WHERE created_by = $1', name: 'mdt_meetings.created_by' },
          { query: 'UPDATE discharge_summaries SET consultant_id = NULL WHERE consultant_id = $1', name: 'discharge_summaries.consultant_id' },
          { query: 'UPDATE discharge_summaries SET created_by = NULL WHERE created_by = $1', name: 'discharge_summaries.created_by' },
          { query: 'UPDATE discharge_summaries SET updated_by = NULL WHERE updated_by = $1', name: 'discharge_summaries.updated_by' }
        ];
        
        // Execute cleanup queries with savepoints to prevent transaction abortion
        for (const { query, name } of cleanupQueries) {
          const savepointName = `sp_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${userId}`;
          try {
            // Create a savepoint for this cleanup operation
            // If this fails, the transaction is already aborted
            await client.query(`SAVEPOINT ${savepointName}`);
            
            try {
              const result = await client.query(query, [userId]);
              if (result.rowCount > 0) {
                console.log(`✅ Cleaned up ${result.rowCount} record(s) from ${name} for user ${userId}`);
              }
              
              // Release the savepoint on success
              await client.query(`RELEASE SAVEPOINT ${savepointName}`);
            } catch (queryError) {
              // Rollback to savepoint to continue with other cleanup operations
              await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
              console.warn(`Warning: Could not clean up ${name} for user ${userId}:`, queryError.message);
              // Continue with next cleanup query
            }
          } catch (savepointError) {
            // If we can't even create a savepoint, the transaction is aborted
            // Check if it's a transaction abort error
            if (savepointError.message && savepointError.message.includes('aborted')) {
              console.error(`Transaction aborted, cannot create savepoint for ${name}. Rolling back entire transaction.`);
              throw savepointError;
            }
            // For other savepoint errors, log and continue (might be a naming issue)
            console.warn(`Could not create savepoint for ${name}:`, savepointError.message);
          }
        }
      }

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
      transactionStarted = true;
      
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
        
        console.log(`📋 Found doctor record with ID: ${doctorId}, attempting to delete...`);
        
        // Delete password setup tokens for the user
        await client.query(
          'DELETE FROM password_setup_tokens WHERE email = $1',
          [userEmail]
        );
        
        // Check for appointments referencing this doctor
        const appointmentCheck = await client.query(
          'SELECT COUNT(*) as count FROM appointments WHERE urologist_id = $1',
          [doctorId]
        );
        const appointmentCount = parseInt(appointmentCheck.rows[0]?.count || 0);
        
        if (appointmentCount > 0) {
          console.log(`⚠️  Found ${appointmentCount} appointments referencing doctor ${doctorId}. These will be set to NULL.`);
        }
        
        // Delete the doctor record (appointments.urologist_id has ON DELETE SET NULL)
        await client.query(
          'DELETE FROM doctors WHERE id = $1',
          [doctorId]
        );
        
        console.log(`✅ Doctor record ${doctorId} deleted successfully`);
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
      
      console.log(`📊 User ${id} has created ${patientCount.rows[0]?.count || 0} patients`);
      
      // Clean up related records before deleting user
      // Use individual try-catch blocks to handle cases where tables might not exist
      // or have different constraints
      // This comprehensive cleanup handles all possible foreign key references
      const cleanupQueries = [
        { query: 'DELETE FROM refresh_tokens WHERE user_id = $1', name: 'refresh_tokens' },
        { query: 'DELETE FROM active_sessions WHERE user_id = $1', name: 'active_sessions' },
        { query: 'DELETE FROM otp_verifications WHERE user_id = $1', name: 'otp_verifications' },
        { query: 'DELETE FROM password_reset_tokens WHERE user_id = $1', name: 'password_reset_tokens' },
        { query: 'DELETE FROM password_history WHERE user_id = $1', name: 'password_history' },
        { query: 'DELETE FROM notifications WHERE user_id = $1', name: 'notifications' },
        { query: 'DELETE FROM mdt_team_members WHERE user_id = $1', name: 'mdt_team_members' },
        { query: 'UPDATE patients SET created_by = NULL WHERE created_by = $1', name: 'patients.created_by' },
        { query: 'UPDATE patients SET referred_by_gp_id = NULL WHERE referred_by_gp_id = $1', name: 'patients.referred_by_gp_id' },
        { query: 'UPDATE patient_notes SET author_id = NULL WHERE author_id = $1', name: 'patient_notes.author_id' },
        { query: 'UPDATE investigation_results SET author_id = NULL WHERE author_id = $1', name: 'investigation_results.author_id' },
        { query: 'UPDATE appointments SET urologist_id = NULL WHERE urologist_id = $1', name: 'appointments.urologist_id' },
        { query: 'UPDATE appointments SET created_by = NULL WHERE created_by = $1', name: 'appointments.created_by' },
        { query: 'UPDATE investigation_bookings SET created_by = NULL WHERE created_by = $1', name: 'investigation_bookings.created_by' },
        { query: 'UPDATE mdt_meetings SET created_by = NULL WHERE created_by = $1', name: 'mdt_meetings.created_by' },
        { query: 'UPDATE discharge_summaries SET consultant_id = NULL WHERE consultant_id = $1', name: 'discharge_summaries.consultant_id' },
        { query: 'UPDATE discharge_summaries SET created_by = NULL WHERE created_by = $1', name: 'discharge_summaries.created_by' },
        { query: 'UPDATE discharge_summaries SET updated_by = NULL WHERE updated_by = $1', name: 'discharge_summaries.updated_by' },
        { query: 'UPDATE clinical_guideline_checks SET checked_by = NULL WHERE checked_by = $1', name: 'clinical_guideline_checks.checked_by' },
        { query: 'UPDATE pathway_recommendations SET validated_by = NULL WHERE validated_by = $1', name: 'pathway_recommendations.validated_by' },
        { query: 'UPDATE behavioral_anomalies SET reviewed_by = NULL WHERE reviewed_by = $1', name: 'behavioral_anomalies.reviewed_by' },
        { query: 'UPDATE breach_incidents SET reported_by = NULL WHERE reported_by = $1', name: 'breach_incidents.reported_by' },
        { query: 'UPDATE breach_notifications SET sent_by = NULL WHERE sent_by = $1', name: 'breach_notifications.sent_by' },
        { query: 'UPDATE breach_response_actions SET taken_by = NULL WHERE taken_by = $1', name: 'breach_response_actions.taken_by' },
        { query: 'UPDATE security_incidents SET created_by = NULL WHERE created_by = $1', name: 'security_incidents.created_by' }
      ];
      
      // Execute cleanup queries with savepoints to prevent transaction abortion
      for (const { query, name } of cleanupQueries) {
        const savepointName = `sp_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`;
        try {
          // Create a savepoint for this cleanup operation
          // If this fails, the transaction is already aborted
          await client.query(`SAVEPOINT ${savepointName}`);
          
          try {
            const result = await client.query(query, [id]);
            if (result.rowCount > 0) {
              console.log(`✅ Cleaned up ${result.rowCount} record(s) from ${name} for user ${id}`);
            }
            
            // Release the savepoint on success
            await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          } catch (queryError) {
            // Rollback to savepoint to continue with other cleanup operations
            await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            console.warn(`Warning: Could not clean up ${name} for user ${id}:`, queryError.message);
            // Continue with next cleanup query
          }
        } catch (savepointError) {
          // If we can't even create a savepoint, the transaction is aborted
          // Check if it's a transaction abort error
          if (savepointError.message && savepointError.message.includes('aborted')) {
            console.error(`Transaction aborted, cannot create savepoint for ${name}. Rolling back entire transaction.`);
            throw savepointError;
          }
          // For other savepoint errors, log and continue (might be a naming issue)
          console.warn(`Could not create savepoint for ${name}:`, savepointError.message);
        }
      }
      
      // Before deleting, check for any remaining foreign key references
      // This helps identify constraints that might not have been cleaned up
      // Use a savepoint to ensure this doesn't abort the transaction if it fails
      const fkCheckSavepoint = `sp_fk_check_${id}`;
      try {
        await client.query(`SAVEPOINT ${fkCheckSavepoint}`);
        const fkCheck = await client.query(`
          SELECT 
            tc.table_name, 
            kcu.column_name,
            tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
        `);
        
        if (fkCheck.rows.length > 0) {
          console.log(`📋 Found ${fkCheck.rows.length} foreign key constraint(s) referencing users.id`);
          // Log all constraints for debugging
          fkCheck.rows.forEach(fk => {
            console.log(`  - ${fk.table_name}.${fk.column_name} (constraint: ${fk.constraint_name})`);
          });
        }
        await client.query(`RELEASE SAVEPOINT ${fkCheckSavepoint}`);
      } catch (fkCheckError) {
        // Rollback to savepoint and continue - this is non-critical
        try {
          await client.query(`ROLLBACK TO SAVEPOINT ${fkCheckSavepoint}`);
          console.warn('Could not check foreign key constraints:', fkCheckError.message);
        } catch (rollbackError) {
          console.warn('Could not rollback FK check savepoint:', rollbackError.message);
        }
      }
      
      // Delete user (foreign keys with SET NULL will preserve patient records)
      console.log(`🗑️  Attempting to delete user record with ID: ${id}...`);
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      console.log(`✅ User record ${id} deleted successfully`);

      await client.query('COMMIT'); // Commit transaction

      res.json({
        success: true,
        message: 'User deleted successfully. Patient records have been preserved.'
      });
    }

  } catch (error) {
    // Rollback transaction if it was started
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
        console.log('✅ Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('❌ Error rolling back transaction:', rollbackError);
      }
    }
    
    console.error('❌ Delete user error:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('User ID attempted:', req.params.id);
    
    // Check for foreign key constraint errors
    if (error.code === '23503') {
      const constraintInfo = error.detail || error.message || 'Unknown constraint';
      // Log full error details for debugging in production
      console.error('Foreign key constraint violation details:', {
        code: error.code,
        detail: error.detail,
        message: error.message,
        constraint: error.constraint,
        table: error.table,
        schema: error.schema
      });
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user due to existing references in the database. Please ensure all related records are cleaned up first.',
        error: error.detail || error.message || 'Foreign key constraint violation'
      });
    }
    
    // Check for other database errors
    if (error.code && error.code.startsWith('23')) {
      const constraintInfo = error.detail || error.message || 'Unknown constraint violation';
      // Log full error details for debugging in production
      console.error('Database constraint violation details:', {
        code: error.code,
        detail: error.detail,
        message: error.message,
        constraint: error.constraint,
        table: error.table,
        schema: error.schema
      });
      return res.status(400).json({
        success: false,
        message: 'Database constraint violation. Cannot delete user.',
        error: error.detail || error.message || 'Database constraint violation'
      });
    }
    
    // Provide a more informative error message
    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || 'N/A';
    
    // Log full error for debugging in production
    console.error('Delete user error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      schema: error.schema,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete user. Please try again or contact support if the issue persists.',
      error: error.message || 'Internal server error'
    });
  } finally {
    if (client) {
      client.release();
    }
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
