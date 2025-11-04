import pool from '../config/database.js';
import { validationResult } from 'express-validator';

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const { department_id, is_active = true } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.first_name,
        d.last_name,
        d.email,
        d.phone,
        d.specialization,
        d.is_active,
        d.created_at,
        d.updated_at,
        dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.is_active = $1
    `;
    
    const params = [is_active === 'true'];
    
    if (department_id) {
      query += ' AND d.department_id = $2';
      params.push(department_id);
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
  try {
    console.log('Creating doctor with data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { first_name, last_name, email, phone, department_id } = req.body;
    
    // Get department name to use as specialization
    let specialization = null;
    if (department_id) {
      const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length > 0) {
        specialization = deptResult.rows[0].name;
      }
    }
    
    console.log('Doctor data to insert:', { first_name, last_name, email, phone, department_id, specialization });
    
    const result = await pool.query(`
      INSERT INTO doctors (first_name, last_name, email, phone, department_id, specialization)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [first_name, last_name, email, phone, department_id, specialization]);
    
    console.log('Doctor created successfully:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating doctor:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Doctor with this email already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create doctor'
      });
    }
  }
};

// Update doctor
export const updateDoctor = async (req, res) => {
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
    const { first_name, last_name, email, phone, department_id, is_active } = req.body;
    
    // Get department name to use as specialization
    let specialization = null;
    if (department_id) {
      const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptResult.rows.length > 0) {
        specialization = deptResult.rows[0].name;
      }
    }
    
    const result = await pool.query(`
      UPDATE doctors 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, 
          department_id = $5, specialization = $6, is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [first_name, last_name, email, phone, department_id, specialization, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        success: false,
        error: 'Doctor with this email already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update doctor'
      });
    }
  }
};

// Delete doctor (soft delete)
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE doctors 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete doctor'
    });
  }
};

// Get all departments
export const getAllDepartments = async (req, res) => {
  try {
    const { is_active = true } = req.query;
    
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
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments'
    });
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { name, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO departments (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [name, description]);
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result.rows[0]
    });
  } catch (error) {
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

// Delete department (soft delete)
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE departments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete department'
    });
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