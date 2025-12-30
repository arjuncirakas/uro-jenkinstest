import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateFilePath } from '../utils/ssrfProtection.js';
import { extractPSADataFromFile } from '../utils/psaFileParser.js';
import { getPSAStatusByAge, getPSAThresholdByAge } from '../utils/psaStatusByAge.js';
import { setCorsHeaders } from '../utils/corsHelper.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/investigations';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, DOC, DOCX, XLS, XLSX, CSV, and image files (PNG, JPEG, JPG)
  const allowedTypes = /pdf|doc|docx|xls|xlsx|csv|png|jpeg|jpg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'text/csv' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg';

  if ((mimetype || extname) && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, XLS, XLSX, CSV, PNG, JPEG, and JPG files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Add PSA result
export const addPSAResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const {
      testDate,
      result,
      referenceRange,
      notes,
      status = 'Normal'
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!testDate || !result) {
      return res.status(400).json({
        success: false,
        message: 'Test date and result are required'
      });
    }

    // Check if patient exists and get age
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name, date_of_birth FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate patient age
    let patientAge = null;
    if (patientCheck.rows[0].date_of_birth) {
      const birthDate = new Date(patientCheck.rows[0].date_of_birth);
      const today = new Date();
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const authorName = userCheck.rows.length > 0
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Handle file upload
    let filePath = null;
    let fileName = null;
    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    // Auto-determine status based on age if not provided
    let finalStatus = status;
    if (!finalStatus && result) {
      finalStatus = getPSAStatusByAge(parseFloat(result), patientAge);
    }

    // Get age-adjusted reference range
    const threshold = getPSAThresholdByAge(patientAge);
    const ageAdjustedReferenceRange = `0.0 - ${threshold}`;

    // Insert PSA result
    const result_query = await client.query(
      `INSERT INTO investigation_results (
        patient_id, test_type, test_name, test_date, result, reference_range, 
        status, notes, file_path, file_name, author_id, author_name, author_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patientId,
        'psa',
        'PSA (Prostate Specific Antigen)',
        testDate,
        result,
        referenceRange || ageAdjustedReferenceRange,
        finalStatus,
        notes || '',
        filePath,
        fileName,
        userId,
        authorName,
        userRole
      ]
    );

    const newResult = result_query.rows[0];

    res.json({
      success: true,
      message: 'PSA result added successfully',
      data: {
        id: newResult.id,
        patientId: newResult.patient_id,
        testType: newResult.test_type,
        testName: newResult.test_name,
        testDate: newResult.test_date,
        result: newResult.result,
        referenceRange: newResult.reference_range,
        status: newResult.status,
        notes: newResult.notes,
        filePath: newResult.file_path,
        fileName: newResult.file_name,
        authorName: newResult.author_name,
        authorRole: newResult.author_role,
        createdAt: newResult.created_at,
        updatedAt: newResult.updated_at
      }
    });

  } catch (error) {
    console.error('Add PSA result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Update PSA result
export const updatePSAResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { resultId } = req.params;
    const {
      testDate,
      result,
      referenceRange,
      notes,
      status
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate resultId
    const parsedResultId = parseInt(resultId, 10);
    if (isNaN(parsedResultId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID'
      });
    }

    // Validate required fields
    if (!testDate || result === undefined || result === null || result === '') {
      return res.status(400).json({
        success: false,
        message: 'Test date and result are required'
      });
    }

    // Check if result exists and get patient info
    const resultCheck = await client.query(
      `SELECT ir.id, ir.patient_id, ir.file_path, p.date_of_birth 
       FROM investigation_results ir
       JOIN patients p ON ir.patient_id = p.id
       WHERE ir.id = $1`,
      [parsedResultId]
    );

    if (resultCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PSA result not found'
      });
    }

    const existingResult = resultCheck.rows[0];

    // Calculate patient age
    let patientAge = null;
    if (existingResult.date_of_birth) {
      const birthDate = new Date(existingResult.date_of_birth);
      const today = new Date();
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
    }

    // Handle file upload - if new file is uploaded, replace old one
    let filePath = existingResult.file_path;
    let fileName = null;

    if (req.file) {
      // Delete old file if it exists
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error deleting old file:', err);
        }
      }
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    // Auto-determine status based on age if not provided
    let finalStatus = status;
    if (!finalStatus && result) {
      finalStatus = getPSAStatusByAge(parseFloat(result), patientAge);
    }

    // Get age-adjusted reference range
    const threshold = getPSAThresholdByAge(patientAge);
    const ageAdjustedReferenceRange = `0.0 - ${threshold}`;

    // Ensure result is a string for database
    const resultString = result ? String(result) : null;

    // Prepare update parameters
    const updateParams = [
      testDate,
      resultString,
      referenceRange || ageAdjustedReferenceRange || null, // Use age-adjusted range if not provided
      finalStatus || null,
      notes || null,
      filePath !== existingResult.file_path ? filePath : null,
      fileName || null,
      parsedResultId
    ];

    console.log('Update PSA result params:', {
      resultId: parsedResultId,
      testDate,
      result: resultString,
      finalStatus,
      hasNewFile: filePath !== existingResult.file_path,
      fileName
    });

    // Update PSA result
    const updateQuery = await client.query(
      `UPDATE investigation_results 
       SET test_date = $1, 
           result = $2, 
           reference_range = COALESCE($3, reference_range),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           file_path = CASE WHEN $6::VARCHAR IS NOT NULL THEN $6::VARCHAR ELSE file_path END,
           file_name = CASE WHEN $6::VARCHAR IS NOT NULL THEN $7::VARCHAR ELSE file_name END,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      updateParams
    );

    const updatedResult = updateQuery.rows[0];

    res.json({
      success: true,
      message: 'PSA result updated successfully',
      data: {
        id: updatedResult.id,
        patientId: updatedResult.patient_id,
        testType: updatedResult.test_type,
        testName: updatedResult.test_name,
        testDate: updatedResult.test_date,
        result: updatedResult.result,
        referenceRange: updatedResult.reference_range,
        status: updatedResult.status,
        notes: updatedResult.notes,
        filePath: updatedResult.file_path,
        fileName: updatedResult.file_name,
        authorName: updatedResult.author_name,
        authorRole: updatedResult.author_role,
        createdAt: updatedResult.created_at,
        updatedAt: updatedResult.updated_at
      }
    });

  } catch (error) {
    console.error('Update PSA result error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Add other test result with file upload
export const addOtherTestResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const {
      testName,
      testDate,
      notes
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!testName || !testDate) {
      return res.status(400).json({
        success: false,
        message: 'Test name and test date are required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const authorName = userCheck.rows.length > 0
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Handle file upload
    let filePath = null;
    let fileName = null;
    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    // Insert test result
    const result_query = await client.query(
      `INSERT INTO investigation_results (
        patient_id, test_type, test_name, test_date, result, reference_range, 
        status, notes, file_path, file_name, author_id, author_name, author_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patientId,
        testName, // Use testName as testType
        testName, // Use testName as testName
        testDate,
        req.body.result || '', // Result if provided
        '', // Empty reference range for non-PSA tests
        req.body.status || 'Normal', // Status if provided
        notes || '',
        filePath,
        fileName,
        userId,
        authorName,
        userRole
      ]
    );

    const newResult = result_query.rows[0];

    res.json({
      success: true,
      message: 'Test result added successfully',
      data: {
        id: newResult.id,
        patientId: newResult.patient_id,
        testType: newResult.test_type,
        testName: newResult.test_name,
        testDate: newResult.test_date,
        result: newResult.result,
        referenceRange: newResult.reference_range,
        status: newResult.status,
        notes: newResult.notes,
        filePath: newResult.file_path,
        fileName: newResult.file_name,
        authorName: newResult.author_name,
        authorRole: newResult.author_role,
        createdAt: newResult.created_at,
        updatedAt: newResult.updated_at
      }
    });

  } catch (error) {
    console.error('Add test result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get investigation results for a patient
export const getInvestigationResults = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const { testType } = req.query; // Optional filter by test type

    // Check if patient exists and get initial PSA if available
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name, initial_psa, initial_psa_date, date_of_birth FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientCheck.rows[0];

    // Calculate patient age
    let patientAge = null;
    if (patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth);
      const today = new Date();
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
    }

    // Build query with optional test type filter
    let query = `
      SELECT 
        id,
        test_type,
        test_name,
        test_date,
        result,
        reference_range,
        status,
        notes,
        file_path,
        file_name,
        author_name,
        author_role,
        created_at,
        updated_at
      FROM investigation_results
      WHERE patient_id = $1
    `;

    const queryParams = [patientId];

    if (testType) {
      query += ' AND LOWER(test_type) = LOWER($2)';
      queryParams.push(testType);
    }

    query += ' ORDER BY test_date DESC, created_at DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    let formattedResults = result.rows.map(row => ({
      id: row.id,
      testType: row.test_type,
      testName: row.test_name,
      testDate: row.test_date,
      result: row.result,
      referenceRange: row.reference_range,
      status: row.status,
      notes: row.notes,
      filePath: row.file_path,
      fileName: row.file_name,
      authorName: row.author_name,
      authorRole: row.author_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.test_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }));

    // If no PSA results exist and patient has initial PSA, include it as a PSA result
    if ((!testType || testType.toLowerCase() === 'psa') && formattedResults.length === 0 && patient.initial_psa && patient.initial_psa_date) {
      // Determine status based on age-adjusted PSA value
      const psaValue = parseFloat(patient.initial_psa);
      const status = getPSAStatusByAge(psaValue, patientAge);
      const threshold = getPSAThresholdByAge(patientAge);
      const referenceRange = `0.0 - ${threshold}`;

      // Add initial PSA as a result
      formattedResults.push({
        id: null, // No database ID since it's from patient record
        testType: 'psa',
        testName: 'PSA (Prostate Specific Antigen)',
        testDate: patient.initial_psa_date,
        result: patient.initial_psa.toString(),
        referenceRange: referenceRange,
        status: status,
        notes: 'Initial PSA value from patient registration',
        filePath: null,
        fileName: null,
        authorName: 'System',
        authorRole: null,
        createdAt: patient.initial_psa_date,
        updatedAt: patient.initial_psa_date,
        formattedDate: new Date(patient.initial_psa_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        isInitialPSA: true // Flag to identify this as initial PSA from patient record
      });
    } else if ((!testType || testType.toLowerCase() === 'psa') && formattedResults.length > 0 && patient.initial_psa && patient.initial_psa_date) {
      // Check if initial PSA is already in the results (by comparing date and value)
      const hasInitialPSA = formattedResults.some(r =>
        r.testDate && patient.initial_psa_date &&
        new Date(r.testDate).toISOString().split('T')[0] === new Date(patient.initial_psa_date).toISOString().split('T')[0] &&
        parseFloat(r.result) === parseFloat(patient.initial_psa)
      );

      // If initial PSA is not in results, add it
      if (!hasInitialPSA) {
        const psaValue = parseFloat(patient.initial_psa);
        const status = getPSAStatusByAge(psaValue, patientAge);
        const threshold = getPSAThresholdByAge(patientAge);
        const referenceRange = `0.0 - ${threshold}`;

        formattedResults.push({
          id: null,
          testType: 'psa',
          testName: 'PSA (Prostate Specific Antigen)',
          testDate: patient.initial_psa_date,
          result: patient.initial_psa.toString(),
          referenceRange: referenceRange,
          status: status,
          notes: 'Initial PSA value from patient registration',
          filePath: null,
          fileName: null,
          authorName: 'System',
          authorRole: null,
          createdAt: patient.initial_psa_date,
          updatedAt: patient.initial_psa_date,
          formattedDate: new Date(patient.initial_psa_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          isInitialPSA: true
        });

        // Re-sort by date descending
        formattedResults.sort((a, b) => {
          const dateA = new Date(a.testDate);
          const dateB = new Date(b.testDate);
          return dateB.getTime() - dateA.getTime();
        });
      }
    }

    res.json({
      success: true,
      message: 'Investigation results retrieved successfully',
      data: {
        results: formattedResults,
        count: formattedResults.length
      }
    });

  } catch (error) {
    console.error('Get investigation results error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete investigation result
export const deleteInvestigationResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    // Check if result exists and user has permission
    const resultCheck = await client.query(
      'SELECT id, author_id, file_path FROM investigation_results WHERE id = $1',
      [resultId]
    );

    if (resultCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investigation result not found'
      });
    }

    // Check if user is the author (or admin)
    if (resultCheck.rows[0].author_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own investigation results'
      });
    }

    // Delete associated file if it exists
    const filePath = resultCheck.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await client.query('DELETE FROM investigation_results WHERE id = $1', [resultId]);

    res.json({
      success: true,
      message: 'Investigation result deleted successfully'
    });

  } catch (error) {
    console.error('Delete investigation result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all investigations with patient details
export const getAllInvestigations = async (req, res) => {
  const client = await pool.connect();

  try {
    const { testType, status } = req.query; // Optional filters

    // Build query to get all patients with investigation bookings
    // This includes both patients with scheduled investigations and those with results
    let query = `
      SELECT DISTINCT
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as initial_psa,
        -- Get investigation booking details (primary source for investigation management)
        ib.scheduled_date as appointment_date,
        ib.scheduled_time as appointment_time,
        ib.investigation_name as urologist,
        ib.created_at as booking_created_at
      FROM patients p
      INNER JOIN investigation_bookings ib ON p.id = ib.patient_id 
        AND ib.status IN ('scheduled', 'confirmed', 'completed')
      WHERE ib.id IS NOT NULL
      ORDER BY ib.created_at DESC
    `;

    const result = await client.query(query);

    // Get all investigation results to determine test status and latest PSA
    let resultsQuery = { rows: [] };
    let latestPSAQuery = { rows: [] };
    let bookingStatusQuery = { rows: [] };

    if (result.rows.length > 0) {
      const patientIds = result.rows.map(r => r.patient_id);

      resultsQuery = await client.query(`
        SELECT 
          patient_id,
          test_type,
          test_name
        FROM investigation_results
        WHERE patient_id = ANY($1)
      `, [patientIds]);

      // Get investigation booking statuses for MRI, Biopsy, TRUS (most recent status for each test per patient)
      bookingStatusQuery = await client.query(`
        SELECT DISTINCT ON (patient_id, LOWER(investigation_name))
          patient_id,
          investigation_name,
          status
        FROM investigation_bookings
        WHERE patient_id = ANY($1)
          AND LOWER(investigation_name) IN ('mri', 'biopsy', 'trus')
        ORDER BY patient_id, LOWER(investigation_name), created_at DESC
      `, [patientIds]);

      // Get latest PSA for each patient
      latestPSAQuery = await client.query(
        `SELECT DISTINCT ON (patient_id) 
          patient_id, result, test_date
         FROM investigation_results 
         WHERE patient_id = ANY($1) 
           AND (test_type ILIKE 'psa' OR test_name ILIKE '%PSA%')
         ORDER BY patient_id, test_date DESC, created_at DESC`,
        [patientIds]
      );
    }

    // Create a map of patient test results
    const patientResults = {};
    resultsQuery.rows.forEach(row => {
      if (!patientResults[row.patient_id]) {
        patientResults[row.patient_id] = {
          mri: false,
          biopsy: false,
          trus: false
        };
      }
      const testType = (row.test_type || row.test_name || '').toLowerCase().trim();
      // Only match exact test names to avoid matching custom tests like "MRI PELVIS"
      // This ensures only the standard MRI, BIOPSY, and TRUS tests from investigation booking are matched
      if (testType === 'mri') {
        patientResults[row.patient_id].mri = true;
      } else if (testType === 'biopsy') {
        patientResults[row.patient_id].biopsy = true;
      } else if (testType === 'trus') {
        patientResults[row.patient_id].trus = true;
      }
    });

    // Create a map of investigation booking statuses
    const patientBookingStatuses = {};
    if (bookingStatusQuery && bookingStatusQuery.rows) {
      bookingStatusQuery.rows.forEach(row => {
        if (!patientBookingStatuses[row.patient_id]) {
          patientBookingStatuses[row.patient_id] = {
            mri: null,
            biopsy: null,
            trus: null
          };
        }
        const testName = (row.investigation_name || '').toLowerCase();
        if (testName === 'mri') {
          patientBookingStatuses[row.patient_id].mri = row.status;
        } else if (testName === 'biopsy') {
          patientBookingStatuses[row.patient_id].biopsy = row.status;
        } else if (testName === 'trus') {
          patientBookingStatuses[row.patient_id].trus = row.status;
        }
      });
    }

    // Create a map of latest PSA values
    const latestPSAMap = {};
    latestPSAQuery.rows.forEach(row => {
      latestPSAMap[row.patient_id] = row.result;
    });

    // Helper function to format date
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Date formatting error:', error);
        return null;
      }
    };

    // Helper function to format time
    const formatTime = (timeValue) => {
      if (!timeValue) return null;
      try {
        // If it's already in HH:MM format, return as is
        if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}/)) {
          return timeValue.substring(0, 5); // Return HH:MM
        }
        return timeValue;
      } catch (error) {
        console.error('Time formatting error:', error);
        return null;
      }
    };

    // Group results by patient and determine test status
    const patientTests = {};

    result.rows.forEach(row => {
      const patientId = row.patient_id;
      if (!patientTests[patientId]) {
        const results = patientResults[patientId] || { mri: false, biopsy: false, trus: false };
        // Use latest PSA from investigation_results, fallback to initial_psa
        const displayPSA = latestPSAMap[patientId] || row.initial_psa;

        // Get booking statuses for this patient
        const bookingStatuses = patientBookingStatuses[patientId] || { mri: null, biopsy: null, trus: null };

        // Determine status: completed if results exist, otherwise use booking status
        const getTestStatus = (hasResult, bookingStatus) => {
          if (hasResult) return 'completed';
          if (bookingStatus === 'results_awaited') return 'results_awaited';
          if (bookingStatus === 'not_required') return 'not_required';
          return 'pending';
        };

        patientTests[patientId] = {
          id: patientId,
          patientName: `${row.first_name} ${row.last_name}`,
          upi: row.upi,
          age: row.age,
          gender: row.gender,
          psa: displayPSA,
          appointmentDate: formatDate(row.appointment_date),
          appointmentTime: formatTime(row.appointment_time),
          urologist: row.urologist || 'Not Assigned',
          mri: getTestStatus(results.mri, bookingStatuses.mri),
          biopsy: getTestStatus(results.biopsy, bookingStatuses.biopsy),
          trus: getTestStatus(results.trus, bookingStatuses.trus),
          lastUpdated: row.booking_created_at
        };
      }
    });

    // Convert to array and filter out patients where all three main investigations (MRI, TRUS, Biopsy) have results
    const investigations = Object.values(patientTests).filter(patient => {
      // Get the results for this patient
      const results = patientResults[patient.id] || { mri: false, biopsy: false, trus: false };

      // If all three main investigations have results, exclude this patient from the list
      // Only check MRI, TRUS, and Biopsy - ignore other clinical investigations
      const allMainTestsCompleted = results.mri && results.biopsy && results.trus;

      // Return false to exclude if all three are completed, true to include otherwise
      return !allMainTestsCompleted;
    });

    res.json({
      success: true,
      message: 'Investigations retrieved successfully',
      data: {
        investigations,
        count: investigations.length
      }
    });

  } catch (error) {
    console.error('Get all investigations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Create investigation request
export const createInvestigationRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const {
      investigationType,
      testName, // Can be string or array
      testNames, // Array of test names (for multi-select)
      customTestName,
      priority = 'routine',
      notes,
      scheduledDate,
      scheduledTime
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!investigationType) {
      return res.status(400).json({
        success: false,
        message: 'Investigation type is required'
      });
    }

    // Handle multiple test names - support both single testName and array testNames
    let testNamesArray = [];
    if (investigationType === 'custom') {
      if (customTestName && customTestName.trim() !== '') {
        testNamesArray = [customTestName.trim()];
      }
    } else {
      // Support both testName (single/string) and testNames (array)
      if (testNames && Array.isArray(testNames) && testNames.length > 0) {
        testNamesArray = testNames.filter(name => name && name.trim() !== '' && name !== 'other');
      } else if (testName) {
        // Backward compatibility: single testName
        if (typeof testName === 'string' && testName.trim() !== '') {
          testNamesArray = [testName.trim()];
        } else if (Array.isArray(testName)) {
          testNamesArray = testName.filter(name => name && name.trim() !== '' && name !== 'other');
        }
      }
    }

    if (testNamesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one test name is required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const creatorName = userCheck.rows.length > 0
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Only create a booking if scheduledDate is explicitly provided and not empty
    // If no scheduledDate, create a request (not a booking) so it doesn't appear in appointments
    // This is different from "Book Investigation" which always requires a date
    const hasScheduledDate = scheduledDate &&
      typeof scheduledDate === 'string' &&
      scheduledDate.trim() !== '' &&
      scheduledDate !== 'null' &&
      scheduledDate !== 'undefined';

    console.log('🔍 [createInvestigationRequest] Scheduled date check:', {
      scheduledDate,
      hasScheduledDate,
      type: typeof scheduledDate
    });

    // Determine status based on whether it's scheduled or just a request
    let finalStatus;
    if (hasScheduledDate) {
      // Only mark as 'scheduled' or 'urgent' if there's an actual scheduled date
      finalStatus = priority === 'urgent' ? 'urgent' : 'scheduled';
      console.log('✅ [createInvestigationRequest] Creating scheduled appointment with date:', scheduledDate);
    } else {
      // This is just a request, not a scheduled appointment
      // These should NOT appear in the appointments list
      finalStatus = priority === 'urgent' ? 'requested_urgent' : 'requested';
      console.log('📋 [createInvestigationRequest] Creating investigation request (no appointment) with status:', finalStatus);
    }

    // Create multiple investigation requests - one for each test name
    const createdRequests = [];

    for (const testNameItem of testNamesArray) {
      const result = await client.query(
        `INSERT INTO investigation_bookings (
          patient_id, investigation_type, investigation_name, 
          scheduled_date, scheduled_time, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          patientId,
          investigationType,
          testNameItem, // Individual test name
          hasScheduledDate ? scheduledDate : null, // NULL if no scheduled date
          hasScheduledDate ? (scheduledTime || '09:00:00') : null, // NULL if no scheduled date
          finalStatus,
          notes || '',
          userId
        ]
      );

      createdRequests.push(result.rows[0]);
    }

    const newRequest = createdRequests[0]; // Use first one for response

    // Create a clinical note for the investigation request with all test names
    // BUT skip creating notes for automatically created requests from investigation management
    const isAutomaticRequest = notes && notes.includes('Automatically created from investigation management');

    if (!isAutomaticRequest) {
      try {
        const formattedDate = scheduledDate
          ? new Date(scheduledDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          : null;

        // Format test names - if multiple, show as comma-separated list
        const testNamesDisplay = testNamesArray.join(', ');

        const noteContent = `
INVESTIGATION REQUEST

Investigation Type: ${investigationType.toUpperCase()}
Test/Procedure Name: ${testNamesDisplay}
Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}
${formattedDate ? `Scheduled Date: ${formattedDate}` : 'Scheduled Date: Not scheduled'}
${notes ? `Clinical Notes:\n${notes}` : ''}
        `.trim();

        await client.query(
          `INSERT INTO patient_notes (
            patient_id, note_content, note_type, author_id, author_name, author_role
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [patientId, noteContent, 'investigation_request', userId, creatorName, req.user.role]
        );

        console.log('✅ Clinical note created for investigation request');
      } catch (noteError) {
        console.error('❌ Error creating clinical note:', noteError);
        // Don't fail the request if note creation fails
      }
    } else {
      console.log('⏭️ Skipping clinical note creation for automatic investigation request');
    }

    res.json({
      success: true,
      message: testNamesArray.length === 1
        ? 'Investigation request created successfully'
        : `${testNamesArray.length} investigation requests created successfully`,
      data: {
        // Return all created requests
        requests: createdRequests.map(req => ({
          id: req.id,
          patientId: req.patient_id,
          investigationType: req.investigation_type,
          investigationName: req.investigation_name,
          scheduledDate: req.scheduled_date,
          scheduledTime: req.scheduled_time,
          status: req.status,
          notes: req.notes,
          createdAt: req.created_at,
          updatedAt: req.updated_at
        })),
        // For backward compatibility, also return the first request
        id: newRequest.id,
        patientId: newRequest.patient_id,
        investigationType: newRequest.investigation_type,
        investigationName: newRequest.investigation_name,
        scheduledDate: newRequest.scheduled_date,
        scheduledTime: newRequest.scheduled_time,
        status: newRequest.status,
        notes: newRequest.notes,
        createdAt: newRequest.created_at,
        updatedAt: newRequest.updated_at
      }
    });

  } catch (error) {
    console.error('Create investigation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get investigation requests for a patient
export const getInvestigationRequests = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const { status } = req.query; // Optional filter by status

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with optional status filter
    // Exclude doctor appointments - these are consultations, not test results
    // Filter out: appointment, consultation, urologist types and entries that look like person names
    let query = `
      SELECT 
        id,
        investigation_type,
        investigation_name,
        scheduled_date,
        scheduled_time,
        status,
        notes,
        created_at,
        updated_at
      FROM investigation_bookings
      WHERE patient_id = $1
        -- Exclude doctor appointments (consultations)
        AND LOWER(investigation_type) NOT IN ('appointment', 'consultation', 'urologist')
        -- Exclude entries that look like person names (doctor names)
        -- Person names typically have spaces and don't contain common test keywords
        AND NOT (
          -- Check if investigation_name has 2+ words (likely a person name)
          (LENGTH(investigation_name) - LENGTH(REPLACE(investigation_name, ' ', '')) + 1) >= 2
          -- And doesn't contain common test names
          AND UPPER(investigation_name) NOT LIKE '%MRI%'
          AND UPPER(investigation_name) NOT LIKE '%TRUS%'
          AND UPPER(investigation_name) NOT LIKE '%BIOPSY%'
          AND UPPER(investigation_name) NOT LIKE '%PSA%'
          AND UPPER(investigation_name) NOT LIKE '%ULTRASOUND%'
          AND UPPER(investigation_name) NOT LIKE '%CT%'
          AND UPPER(investigation_name) NOT LIKE '%X-RAY%'
          AND UPPER(investigation_name) NOT LIKE '%XRAY%'
          AND UPPER(investigation_name) NOT LIKE '%BLOOD%'
          AND UPPER(investigation_name) NOT LIKE '%URINE%'
          AND UPPER(investigation_name) NOT LIKE '%TEST%'
        )
        -- Exclude "TEST DOCTOR" entries
        AND UPPER(investigation_name) != 'TEST DOCTOR'
        AND UPPER(investigation_name) NOT LIKE '%TEST DOCTOR%'
    `;

    const queryParams = [patientId];

    if (status) {
      query += ' AND status = $2';
      queryParams.push(status);
    }

    query += ' ORDER BY scheduled_date DESC, created_at DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      investigationType: row.investigation_type,
      investigationName: row.investigation_name,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.scheduled_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));

    res.json({
      success: true,
      message: 'Investigation requests retrieved successfully',
      data: {
        requests: formattedRequests,
        count: formattedRequests.length
      }
    });

  } catch (error) {
    console.error('Get investigation requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Update investigation request status
export const updateInvestigationRequestStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['requested', 'requested_urgent', 'scheduled', 'urgent', 'pending', 'results_awaited', 'not_required', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    // Check if request exists
    const requestCheck = await client.query(
      'SELECT id, patient_id FROM investigation_bookings WHERE id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investigation request not found'
      });
    }

    // Update status
    const updateResult = await client.query(
      `UPDATE investigation_bookings 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, requestId]
    );

    const updatedRequest = updateResult.rows[0];

    res.json({
      success: true,
      message: 'Investigation request status updated successfully',
      data: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        updatedAt: updatedRequest.updated_at
      }
    });

  } catch (error) {
    console.error('Update investigation request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete investigation request
export const deleteInvestigationRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    // Check if request exists
    const requestCheck = await client.query(
      'SELECT id, created_by FROM investigation_bookings WHERE id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investigation request not found'
      });
    }

    // Check if user is the creator (or admin/superadmin/urologist/doctor)
    if (requestCheck.rows[0].created_by !== userId &&
      !['superadmin', 'urologist', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own investigation requests'
      });
    }

    // Delete from database
    await client.query('DELETE FROM investigation_bookings WHERE id = $1', [requestId]);

    res.json({
      success: true,
      message: 'Investigation request deleted successfully'
    });

  } catch (error) {
    console.error('Delete investigation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};



// Serve investigation files
export const serveFile = async (req, res) => {
  try {
    console.log('📁 [serveFile] ==========================================');
    console.log('📁 [serveFile] Request received');
    console.log('📁 [serveFile] Method:', req.method);
    console.log('📁 [serveFile] Original URL:', req.originalUrl);
    console.log('📁 [serveFile] Path:', req.path);
    console.log('📁 [serveFile] Params:', req.params);
    console.log('📁 [serveFile] Params.filePath:', req.params.filePath);
    console.log('📁 [serveFile] Headers:', JSON.stringify(req.headers, null, 2));

    // Get the validated file path from middleware (already normalized and validated)
    const fullPath = req.validatedFilePath;

    console.log('📁 [serveFile] Step 1 - validatedFilePath from middleware:', fullPath);

    if (!fullPath) {
      console.log('📁 [serveFile] ERROR - No validated file path from middleware');
      setCorsHeaders(req, res);
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    console.log('📁 [serveFile] Step 2 - Requested file path (raw):', req.params.filePath);
    console.log('📁 [serveFile] Step 2 - Using validated path from middleware:', fullPath);
    console.log('📁 [serveFile] Step 2 - Full path type:', typeof fullPath);
    console.log('📁 [serveFile] Step 2 - Full path length:', fullPath?.length);

    // Set CORS headers explicitly for file responses
    setCorsHeaders(req, res);
    console.log('📁 [serveFile] Step 3 - CORS headers set');
    console.log('📁 [serveFile] Step 3 - Validated file path:', fullPath);
    console.log('📁 [serveFile] Step 3 - File exists check:', fs.existsSync(fullPath));

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('📁 [serveFile] ERROR - File not found:', fullPath);
      console.log('📁 [serveFile] ERROR - Current working directory:', process.cwd());
      console.log('📁 [serveFile] ERROR - Uploads directory exists:', fs.existsSync('uploads'));
      console.log('📁 [serveFile] ERROR - Uploads/investigations directory exists:', fs.existsSync('uploads/investigations'));
      
      // Try to list files in uploads/investigations for debugging
      try {
        if (fs.existsSync('uploads/investigations')) {
          const files = fs.readdirSync('uploads/investigations');
          console.log('📁 [serveFile] ERROR - Files in uploads/investigations:', files.slice(0, 10));
        }
      } catch (listError) {
        console.log('📁 [serveFile] ERROR - Could not list files:', listError);
      }
      
      // Ensure CORS headers are set even in error responses
      setCorsHeaders(req, res);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    console.log('📁 [serveFile] Step 4 - File exists, preparing to serve');
    console.log('📁 [serveFile] Step 4 - Serving file:', fullPath);

    // Set appropriate headers for file download/viewing
    const ext = path.extname(fullPath).toLowerCase();
    console.log('📁 [serveFile] Step 5 - File extension:', ext);
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    console.log('📁 [serveFile] Step 5 - MIME type:', mimeType);
    console.log('📁 [serveFile] Step 5 - Setting Content-Type header:', mimeType);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    console.log('📁 [serveFile] Step 5 - Headers set:', {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
      'Cache-Control': 'no-cache'
    });

    // Get file stats for logging
    const stats = fs.statSync(fullPath);
    console.log('📁 [serveFile] Step 6 - File stats:', {
      size: stats.size,
      sizeInKB: (stats.size / 1024).toFixed(2) + ' KB',
      created: stats.birthtime,
      modified: stats.mtime
    });

    // Stream the file with error handling
    console.log('📁 [serveFile] Step 7 - Creating file stream');
    const fileStream = fs.createReadStream(fullPath);

    fileStream.on('error', (error) => {
      console.error('📁 [serveFile] ERROR - Error reading file stream:', error);
      console.error('📁 [serveFile] ERROR - Error details:', {
        code: error.code,
        message: error.message,
        path: error.path
      });
      if (!res.headersSent) {
        setCorsHeaders(req, res);
        res.status(500).json({
          success: false,
          message: 'Error reading file'
        });
      }
    });

    fileStream.on('open', () => {
      console.log('📁 [serveFile] Step 8 - File stream opened successfully');
    });

    fileStream.on('data', (chunk) => {
      console.log('📁 [serveFile] Step 9 - Streaming chunk, size:', chunk.length, 'bytes');
    });

    fileStream.on('end', () => {
      console.log('📁 [serveFile] Step 10 - File stream ended');
    });

    res.on('close', () => {
      console.log('📁 [serveFile] Step 11 - Response closed, destroying file stream');
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });

    console.log('📁 [serveFile] Step 7 - Piping file stream to response');
    fileStream.pipe(res);
    console.log('📁 [serveFile] Step 7 - File stream piped, response should start streaming');

  } catch (error) {
    console.error('📁 [serveFile] ERROR - Exception caught:', error);
    console.error('📁 [serveFile] ERROR - Error stack:', error.stack);
    console.error('📁 [serveFile] ERROR - Error message:', error.message);
    // Ensure CORS headers are set even in error responses
    setCorsHeaders(req, res);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};

// Parse PSA file and extract values
export const parsePSAFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    console.log('Parsing PSA file:', req.file.originalname, 'Type:', fileType);

    // Extract PSA data from file
    const result = await extractPSADataFromFile(filePath, fileType);

    // Clean up uploaded file after parsing (optional - you might want to keep it)
    // fs.unlinkSync(filePath);

    if (result.success) {
      res.json({
        success: true,
        message: `Extracted ${result.count} PSA result(s) from file`,
        data: {
          psaEntries: result.psaEntries,
          count: result.count,
          extractedText: result.text // For debugging
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to parse file',
        data: {
          psaEntries: [],
          count: 0
        }
      });
    }
  } catch (error) {
    console.error('Parse PSA file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing PSA file',
      error: error.message
    });
  }
};
