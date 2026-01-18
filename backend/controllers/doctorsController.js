import pool from '../config/database.js';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordSetupEmail } from '../services/emailService.js';
import { encrypt, decryptFields, createSearchableHash } from '../services/encryptionService.js';
import { USER_ENCRYPTED_FIELDS } from '../constants/encryptionFields.js';

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const { department_id, is_active = true, verified_only = false } = req.query;
    
    // If verified_only is true, only return doctors that have verified user accounts
    // This ensures consistency with the superadmin panel which only shows doctors with user accounts
    let query = `
      SELECT 
        d.id,
        d.first_name,
        d.last_name,
        d.email,
        d.phone,
        d.department_id,
        d.specialization,
        d.is_active,
        d.created_at,
        d.updated_at,
        dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
    `;
    
    // Add JOIN with users table if verified_only is true
    if (verified_only === 'true' || verified_only === true) {
      query += ` INNER JOIN users u ON d.email = u.email 
                 AND u.is_active = true 
                 AND u.is_verified = true`;
    }
    
    query += ` WHERE d.is_active = $1`;
    
    const params = [is_active === 'true'];
    let paramIndex = 2;
    
    if (department_id) {
      query += ` AND d.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }
    
    query += ' ORDER BY d.first_name, d.last_name';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors'
    });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        d.id,
        d.first_name,
        d.last_name,
        d.email,
        d.phone,
        d.department_id,
        d.specialization,
        d.is_active,
        d.created_at,
        d.updated_at,
        dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor'
    });
  }
};

// Create new doctor
export const createDoctor = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    console.log('Creating doctor with data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { first_name, last_name, email, phone, department_id } = req.body;
    
    // Check if user already exists in users table
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
    
    // Get department name to use as specialization
    let specialization = null;
    let departmentName = null;
    if (department_id) {
      const deptResult = await client.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length > 0) {
        specialization = deptResult.rows[0].name;
        departmentName = deptResult.rows[0].name;
      }
    }
    
    // Determine role based on department name
    // If department is urology (exact match or starts with "urology" followed by space/end), change role to 'urologist'
    // Use word boundary to avoid matching "neurology" which contains "urology"
    let role = 'doctor'; // Default to 'doctor' role
    if (departmentName) {
      const deptNameLower = departmentName.toLowerCase().trim();
      // Check if department name is exactly "urology" or starts with "urology" followed by space or end
      // This prevents matching "neurology" which contains "urology" as a substring
      if (deptNameLower === 'urology' || /^urology(\s|$)/.test(deptNameLower)) {
        role = 'urologist';
        console.log(`[createDoctor] Department is urology, setting role to 'urologist'`);
      } else if (deptNameLower.includes('general') || deptNameLower.includes('gp')) {
        role = 'gp';
      } else if (deptNameLower.includes('nurse')) {
        role = 'urology_nurse';
      }
    }
    
    console.log('Doctor data to insert:', { first_name, last_name, email, phone, department_id, specialization, role });
    
    // Insert into doctors table
    const doctorResult = await client.query(`
      INSERT INTO doctors (first_name, last_name, email, phone, department_id, specialization)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [first_name, last_name, email, phone, department_id, specialization]);
    
    console.log('Doctor created successfully:', doctorResult.rows[0]);
    
    // Generate a temporary password (will be changed on first login)
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
    
    // Encrypt email and phone
    const encryptedEmail = encrypt(email);
    const encryptedPhone = phone ? encrypt(phone) : null;
    const emailHash = createSearchableHash(email);
    const phoneHash = phone ? createSearchableHash(phone) : null;

    // Insert into users table (not verified yet, will be activated after password setup)
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active, is_verified, email_hash, phone_hash) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id, email, first_name, last_name, phone, role, created_at`,
      [encryptedEmail, passwordHash, first_name, last_name, encryptedPhone, role, false, false, emailHash, phoneHash]
    );
    
    const newUser = userResult.rows[0];
    
    // Decrypt for use in token storage and response
    const decryptedUser = decryptFields(newUser, USER_ENCRYPTED_FIELDS);
    
    // Generate password setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store password setup token (use plaintext email for token)
    await client.query(
      'INSERT INTO password_setup_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [newUser.id, email, setupToken, expiresAt]
    );
    
    // Send password setup email
    let emailSent = false;
    try {
      const emailResult = await sendPasswordSetupEmail(email, first_name, setupToken);
      emailSent = emailResult.success;
    } catch (emailError) {
      console.error('Error sending password setup email:', emailError);
      // Don't fail the entire operation if email fails
    }
    
    await client.query('COMMIT'); // Commit transaction
    
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Doctor created successfully. Password setup email sent.'
        : 'Doctor created successfully but email sending failed. Please contact support.',
      data: {
        doctor: doctorResult.rows[0],
        user: {
          userId: decryptedUser.id,
          email: decryptedUser.email, // Decrypted
          firstName: decryptedUser.first_name,
          lastName: decryptedUser.last_name,
          role: decryptedUser.role,
          emailSent
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error creating doctor:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Doctor with this email or phone already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create doctor'
      });
    }
  } finally {
    client.release();
  }
};

// Update doctor
export const updateDoctor = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
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
    const { first_name, last_name, email, phone, department_id, is_active } = req.body;
    
    // Get existing doctor to preserve is_active if not provided
    const existingDoctor = await client.query('SELECT email, is_active FROM doctors WHERE id = $1', [id]);
    if (existingDoctor.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    const oldEmail = existingDoctor.rows[0].email;
    const finalIsActive = is_active !== undefined ? is_active : existingDoctor.rows[0].is_active;
    
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
    if (phone) {
      const phoneHash = createSearchableHash(phone);
      let emailHashForCheck = null;
      if (email) {
        emailHashForCheck = createSearchableHash(email);
      } else if (oldEmail) {
        emailHashForCheck = createSearchableHash(oldEmail);
      }
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
    
    // Get department name to use as specialization
    let specialization = null;
    let departmentName = null;
    if (department_id) {
      const deptResult = await client.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length > 0) {
        specialization = deptResult.rows[0].name;
        departmentName = deptResult.rows[0].name;
      }
    }
    
    // Determine role based on department name
    // Doctors registered under urology department get 'doctor' role but will have urologist permissions
    let role = 'doctor'; // Default to 'doctor' role
    if (departmentName) {
      const deptNameLower = departmentName.toLowerCase();
      if (deptNameLower.includes('urology')) {
        role = 'doctor'; // Doctors in urology department get 'doctor' role (treated as urologist in middleware)
      } else if (deptNameLower.includes('general') || deptNameLower.includes('gp')) {
        role = 'gp';
      } else if (deptNameLower.includes('nurse')) {
        role = 'urology_nurse';
      }
    }
    
    // Update doctors table
    const result = await client.query(`
      UPDATE doctors 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, 
          department_id = $5, specialization = $6, is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [first_name, last_name, email, phone, department_id, specialization, finalIsActive, id]);
    
    // Encrypt email and phone for users table update
    const encryptedEmail = encrypt(email);
    const encryptedPhone = phone ? encrypt(phone) : null;
    const emailHash = createSearchableHash(email);
    const phoneHash = phone ? createSearchableHash(phone) : null;
    const oldEmailHash = createSearchableHash(oldEmail);

    // Update corresponding user in users table if it exists
    const userUpdateResult = await client.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, role = $5, is_active = $6,
          email_hash = $7, phone_hash = $8, updated_at = CURRENT_TIMESTAMP
      WHERE email_hash = $9
      RETURNING id
    `, [first_name, last_name, encryptedEmail, encryptedPhone, role, finalIsActive, emailHash, phoneHash, oldEmailHash]);
    
    // If user doesn't exist, create it (in case doctor was created before this feature)
    if (userUpdateResult.rows.length === 0 && email) {
      // Generate a temporary password
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
      
      // Insert into users table with encrypted data
      await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active, is_verified, email_hash, phone_hash) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING id`,
        [encryptedEmail, passwordHash, first_name, last_name, encryptedPhone, role, finalIsActive, false, emailHash, phoneHash]
      );
    }
    
    await client.query('COMMIT'); // Commit transaction
    
    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error updating doctor:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Doctor with this email or phone already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update doctor'
      });
    }
  } finally {
    client.release();
  }
};

// Delete doctor (hard delete - completely remove from database)
export const deleteDoctor = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    const { id } = req.params;
    
    // First check if doctor exists and get email
    const doctorResult = await client.query(
      'SELECT id, email, first_name, last_name FROM doctors WHERE id = $1',
      [id]
    );
    
    if (doctorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    const doctor = doctorResult.rows[0];
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
    const deleteResult = await client.query(
      'DELETE FROM doctors WHERE id = $1 RETURNING *',
      [id]
    );
    
    await client.query('COMMIT'); // Commit transaction
    
    res.json({
      success: true,
      message: 'Doctor deleted successfully from the database'
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error deleting doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete doctor'
    });
  } finally {
    client.release();
  }
};

// Get all departments
export const getAllDepartments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    const { is_active = true } = req.query;
    
    // CRITICAL: Ensure Urology department exists - create it if it doesn't
    const urologyCheck = await client.query(`
      SELECT id, name, description, is_active
      FROM departments
      WHERE LOWER(TRIM(name)) = 'urology'
      LIMIT 1
    `);
    
    if (urologyCheck.rows.length === 0) {
      console.log('📋 [getAllDepartments] Urology department not found, creating it...');
      await client.query(`
        INSERT INTO departments (name, description, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (name) DO NOTHING
      `, ['Urology', 'Urology Department - Specialized care for urological conditions']);
      console.log('✅ [getAllDepartments] Urology department created successfully');
    } else {
      // Ensure it's active
      if (!urologyCheck.rows[0].is_active) {
        await client.query(`
          UPDATE departments
          SET is_active = true
          WHERE LOWER(TRIM(name)) = 'urology'
        `);
        console.log('✅ [getAllDepartments] Urology department reactivated');
      }
    }
    
    await client.query('COMMIT'); // Commit transaction
    
    // Now fetch all departments
    const result = await pool.query(`
      SELECT id, name, description, is_active, created_at, updated_at
      FROM departments
      WHERE is_active = $1
      ORDER BY name
    `, [is_active === 'true']);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  } finally {
    client.release();
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { name, description } = req.body;
    
    // Check if there's already a department with the same name (case-insensitive)
    const existingDept = await client.query(`
      SELECT id, name 
      FROM departments 
      WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      LIMIT 1
    `, [name]);
    
    if (existingDept.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Department with this name already exists'
      });
    }
    
    // Create a new department
    const result = await client.query(`
      INSERT INTO departments (name, description, is_active)
      VALUES ($1, $2, true)
      RETURNING *
    `, [name.trim(), description]);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating department:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Department with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create department'
      });
    }
  } finally {
    client.release();
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { id } = req.params;
    const { name, description } = req.body;
    
    const result = await pool.query(`
      UPDATE departments 
      SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [name, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Department with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update department'
      });
    }
  }
};

// Delete department (hard delete - completely remove from database)
export const deleteDepartment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction
    
    const { id } = req.params;
    
    // First check if department exists
    const checkResult = await client.query(`
      SELECT id, name FROM departments WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    
    // Check if there are any doctors associated with this department
    const doctorsCheck = await client.query(`
      SELECT COUNT(*) as count FROM doctors WHERE department_id = $1
    `, [id]);
    
    if (parseInt(doctorsCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot delete department. There are doctors associated with this department. Please remove or reassign doctors first.'
      });
    }
    
    // Delete the department completely from the database
    const result = await client.query(`
      DELETE FROM departments 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete department'
    });
  } finally {
    client.release();
  }
};

// Get all GPs (General Practitioners)
export const getGPs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        organization
      FROM users
      WHERE role = 'gp' AND is_active = true AND is_verified = true
      ORDER BY first_name, last_name
    `);
    
    const gps = result.rows.map(gp => ({
      id: gp.id,
      firstName: gp.first_name,
      lastName: gp.last_name,
      fullName: `${gp.first_name} ${gp.last_name}`,
      email: gp.email,
      phone: gp.phone,
      organization: gp.organization
    }));
    
    res.json({
      success: true,
      data: {
        gps
      },
      count: gps.length
    });
  } catch (error) {
    console.error('Error fetching GPs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GPs'
    });
  }
};